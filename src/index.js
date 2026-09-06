const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const autoeat = require('mineflayer-auto-eat').loader;
const armorManager = require('mineflayer-armor-manager');

const { getConfig, saveConfig } = require('./config');
const { BotState } = require('./state');
const { sendReply } = require('./utils/chat');

const { setupMovements, performLifeLikeRoaming } = require('./modules/navigation');
const { eatIfHungry, manageOffhandItems, trySleepInBed } = require('./modules/survival');
const { checkPlayerShiftGreetings, lookAtNearbyPlayers, setupSocialListeners } = require('./modules/social');
const {
  scanAndDefendAgainstMobs,
  performBodyguardLogic,
  equipBestWeapon,
  detectAndParryProjectiles,
  performArcherCombat,
  raiseShield,
  setupAggressorTracking
} = require('./modules/combat');
const { checkAndFarmCrops } = require('./modules/farming');
const { startFishingLoop } = require('./modules/fishing');
const { registerChest, listChests, sortBase, depositIntoChest, fetchToolFromChest, dropInventory } = require('./modules/chest');
const { setupClutchListener, toggleClutch, isClutchEnabled } = require('./modules/clutch');
const { bridge, tower } = require('./modules/scaffold');
const { checkAndLumber } = require('./modules/lumber');
const { mineTargetOre, digTunnel } = require('./modules/mining');
const { operateSmelter } = require('./modules/smelter');
const { breedAnimals } = require('./modules/rancher');
const { performPatrolStep, addPatrolWaypoint, clearPatrolWaypoints } = require('./modules/patrol');
const { craftItem, autoReplenishTool } = require('./modules/crafting');
const { deliverItemToOwner } = require('./modules/courier');
const { handleDeath, recoverCorpse } = require('./modules/death');
const { startWebServer, stopWebServer, addLog, addPerceptionLog } = require('./modules/web/server');
const { handleDialogue } = require('./modules/dialogue');

const { handleCommand } = require('./commands');
const { startAutonomousLoops, stopAutonomousLoops } = require('./loops');

let bot = null;
let state = null;
let config = null;

const ctx = {
  get bot() { return bot; },
  get state() { return state; },
  get config() { return config; },
  mcData: null,
  addLog,
  addPerceptionLog,
  sendReply: (text, isWhisper = false, targetPlayerOrMinDelay = null, minDelayOrMaxDelay = 300, maybeMaxDelay = 600) => {
    const isWhisperBool = !!isWhisper;
    addLog(isWhisperBool ? 'whisper' : 'chat', bot?.username || 'Zoltraak', text);
    return sendReply(bot, config, text, isWhisperBool, targetPlayerOrMinDelay, minDelayOrMaxDelay, maybeMaxDelay);
  },
  saveConfig: () => saveConfig(config),
  registerChest: (category, isWhisper, targetPlayer) => registerChest(ctx, category, isWhisper, targetPlayer),
  listChests: (isWhisper, targetPlayer) => listChests(ctx, isWhisper, targetPlayer),
  sortBase: (isWhisper, targetPlayer) => sortBase(ctx, isWhisper, targetPlayer),
  depositIntoChest: () => depositIntoChest(ctx),
  bridge: (length, dir, isWhisper, targetPlayer) => bridge(ctx, length, dir, isWhisper, targetPlayer),
  tower: (height, isWhisper, targetPlayer) => tower(ctx, height, isWhisper, targetPlayer),
  toggleClutch: (enabled) => toggleClutch(enabled),
  isClutchEnabled: () => isClutchEnabled(),
  fetchToolFromChest: (toolName) => fetchToolFromChest(ctx, toolName),
  dropInventory: () => dropInventory(ctx),
  eatIfHungry: (force = false) => eatIfHungry(ctx, force),
  manageOffhandItems: () => manageOffhandItems(ctx),
  trySleepInBed: () => trySleepInBed(ctx),
  performLifeLikeRoaming: () => performLifeLikeRoaming(ctx),
  checkPlayerShiftGreetings: () => checkPlayerShiftGreetings(ctx),
  lookAtNearbyPlayers: () => lookAtNearbyPlayers(ctx),
  scanAndDefendAgainstMobs: () => scanAndDefendAgainstMobs(ctx),
  performBodyguardLogic: () => performBodyguardLogic(ctx),
  equipBestWeapon: () => equipBestWeapon(ctx),
  detectAndParryProjectiles: () => detectAndParryProjectiles(ctx),
  performArcherCombat: () => performArcherCombat(ctx),
  raiseShield: (durationMs) => raiseShield(bot, durationMs),
  checkAndFarmCrops: (mcData) => checkAndFarmCrops(ctx, mcData || ctx.mcData),
  startFishingLoop: (isWhisper, targetPlayer) => startFishingLoop(ctx, isWhisper, targetPlayer),
  checkAndLumber: () => checkAndLumber(ctx),
  mineTargetOre: (oreQuery) => mineTargetOre(ctx, oreQuery),
  digTunnel: (steps) => digTunnel(ctx, steps),
  operateSmelter: () => operateSmelter(ctx),
  breedAnimals: (species) => breedAnimals(ctx, species),
  performPatrolStep: () => performPatrolStep(ctx),
  addPatrolWaypoint: (pos) => addPatrolWaypoint(ctx, pos),
  clearPatrolWaypoints: () => clearPatrolWaypoints(ctx),
  craftItem: (itemName, count) => craftItem(ctx, itemName, count),
  autoReplenishTool: (toolType) => autoReplenishTool(ctx, toolType),
  deliverItemToOwner: (itemName, count, isWhisper, targetPlayer) => deliverItemToOwner(ctx, itemName, count, isWhisper, targetPlayer),
  handleDeath: () => handleDeath(ctx),
  recoverCorpse: (isWhisper, targetPlayer) => recoverCorpse(ctx, isWhisper, targetPlayer)
};

function createBot() {
  stopAutonomousLoops();

  config = getConfig();
  if (!state) {
    state = new BotState(config);
  } else {
    state.reset(config);
  }

  console.log('[Zoltraak] Connecting to ' + config.host + ':' + config.port + ' as ' + config.username + '...');

  startWebServer(ctx);

  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version,
    checkTimeoutInterval: 90000
  });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(autoeat);
  bot.loadPlugin(armorManager);

  bot.once('spawn', () => {
    console.log('[Zoltraak] Spawned in the world!');
    addPerceptionLog('SENSORY', `Sensory cortex initialized. Visual perception online at [x: ${Math.round(bot.entity.position.x)}, y: ${Math.round(bot.entity.position.y)}, z: ${Math.round(bot.entity.position.z)}]`);

    if (!state.homePos) {
      state.setHome(bot.entity.position);
      config.home = { x: Math.round(state.homePos.x), y: Math.round(state.homePos.y), z: Math.round(state.homePos.z) };
      ctx.saveConfig();
      console.log('[Zoltraak] Home anchor set to: ' + JSON.stringify(config.home));
    }

    const mcData = require('minecraft-data')(bot.version);
    ctx.mcData = mcData;

    setupMovements(bot, mcData, config);
    setupAggressorTracking(ctx); // Register reactive aggro event listeners

    // Setup mineflayer-auto-eat plugin
    bot.autoEat.setOpts({
      minHunger: 15,
      minHealth: 15,
      priority: 'foodPoints',
      bannedFood: ['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish']
    });
    bot.autoEat.enableAuto();

    // Anti-Spam bypass: single jump on spawn satisfies GriefPrevention pre-movement check
    setTimeout(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 250);
    }, 1000);

    setTimeout(() => {
      bot.chat('/skin set Frieren');
    }, 2000);

    setupClutchListener(ctx);
    setupSocialListeners(ctx);
    startAutonomousLoops(ctx);
  });

  bot.on('death', () => {
    handleDeath(ctx);
  });

  bot.on('respawn', () => {
    console.log('[Zoltraak] Respawned back into the world.');
    state.currentState = 'ROAM';
  });

  bot.on('whisper', (username, message) => {
    if (username === bot.username) return;
    addLog('whisper', username, message);

    const handled = handleCommand(ctx, username, message, true);
    if (!handled) {
      handleDialogue(ctx, username, message, true);
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    addLog('chat', username, message);

    // 1. Check if message is a command (!cmd or addressed "zoltraak <cmd>")
    // If it is a command, handleCommand executes it, whispers the reply to the sender, and returns true
    const handled = handleCommand(ctx, username, message, false);
    if (handled) return;

    // 2. Natural conversation handling with anti-interruption filter (replies in all-chat)
    handleDialogue(ctx, username, message, false);
  });

  bot.on('sleep', () => {
    state.isSleeping = true;
    state.currentState = 'SLEEPING';
  });

  bot.on('wake', () => {
    state.isSleeping = false;
    state.currentState = 'ROAM';
  });

  bot.on('kicked', (reason) => {
    console.log('[Zoltraak] Kicked: ' + reason);
  });

  bot.on('error', (err) => {
    console.log('[Zoltraak] Socket Error: ' + (err.message || ''));
  });

  bot.on('end', () => {
    console.log('[Zoltraak] Disconnected. Cleaning intervals and reconnecting in 5s...');
    stopAutonomousLoops();
    setTimeout(createBot, 5000);
  });

  return bot;
}

module.exports = {
  createBot,
  ctx
};
