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
const { checkPlayerShiftGreetings, lookAtNearbyPlayers } = require('./modules/social');
const {
  scanAndDefendAgainstMobs,
  performBodyguardLogic,
  equipBestWeapon,
  detectAndParryProjectiles,
  performArcherCombat,
  raiseShield
} = require('./modules/combat');
const { checkAndFarmCrops } = require('./modules/farming');
const { startFishingLoop } = require('./modules/fishing');
const { depositIntoChest, fetchToolFromChest, dropInventory } = require('./modules/chest');
const { checkAndLumber } = require('./modules/lumber');
const { mineTargetOre, digTunnel } = require('./modules/mining');
const { operateSmelter } = require('./modules/smelter');
const { breedAnimals } = require('./modules/rancher');
const { performPatrolStep, addPatrolWaypoint, clearPatrolWaypoints } = require('./modules/patrol');
const { craftItem, autoReplenishTool } = require('./modules/crafting');
const { deliverItemToOwner } = require('./modules/courier');
const { handleDeath, recoverCorpse } = require('./modules/death');
const { startWebServer, stopWebServer, addLog } = require('./modules/web/server');

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
  sendReply: (text, isWhisper = true, minDelay = 300, maxDelay = 600) => {
    addLog(config?.privacy?.audienceMode === 'public_chat' ? 'chat' : 'whisper', bot?.username || 'Zoltraak', text);
    return sendReply(bot, config, text, isWhisper, minDelay, maxDelay);
  },
  saveConfig: () => saveConfig(config),
  depositIntoChest: () => depositIntoChest(ctx),
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
  startFishingLoop: (isWhisper) => startFishingLoop(ctx, isWhisper),
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
  deliverItemToOwner: (itemName, count, isWhisper) => deliverItemToOwner(ctx, itemName, count, isWhisper),
  handleDeath: () => handleDeath(ctx),
  recoverCorpse: (isWhisper) => recoverCorpse(ctx, isWhisper)
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

    if (!state.homePos) {
      state.setHome(bot.entity.position);
      config.home = { x: Math.round(state.homePos.x), y: Math.round(state.homePos.y), z: Math.round(state.homePos.z) };
      ctx.saveConfig();
      console.log('[Zoltraak] Home anchor set to: ' + JSON.stringify(config.home));
    }

    const mcData = require('minecraft-data')(bot.version);
    ctx.mcData = mcData;

    setupMovements(bot, mcData, config);

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
    handleCommand(ctx, username, message, true);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    addLog('chat', username, message);

    const lower = message.trim().toLowerCase();

    if (lower.includes('zoltraak') || lower === 'hi' || lower === 'yo' || lower === 'sup') {
      if (lower.includes('zoltraak') || lower.includes('hi zoltraak') || lower.includes('yo zoltraak')) {
        const isAuthorized = username === config.owner || (config.privacy?.whitelist && config.privacy.whitelist.includes(username));
        if (isAuthorized) {
          const casualReplies = ['yo', 'sup', 'hey', 'o/', 'hi'];
          const reply = casualReplies[Math.floor(Math.random() * casualReplies.length)];
          ctx.sendReply(reply, true);
        }
        return;
      }
    }

    if (message.startsWith('!')) {
      handleCommand(ctx, username, message, false);
    }
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
