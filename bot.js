const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const autoeat = require('mineflayer-auto-eat').loader;
const armorManager = require('mineflayer-armor-manager');
const Vec3 = require('vec3').Vec3;
const fs = require('fs');
const path = require('path');

// Safety: prevent unhandled exceptions or promise rejections from crashing the bot
process.on('uncaughtException', (err) => {
  console.log('[Zoltraak Safety] Caught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.log('[Zoltraak Safety] Caught Rejection:', reason);
});

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

let bot;
let currentState = 'ROAM'; // ROAM, FOLLOW, GUARD, FARM, FISHING, COMBAT, SLEEPING, IDLE, DEPOSITING
let homePos = config.home ? new Vec3(config.home.x, config.home.y, config.home.z) : null;
let chestPos = config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null;
let followTarget = null;
let isFarming = false;
let isFishing = false;
let isSleeping = false;
let isDepositing = false;
let combatTarget = null;
let activeIntervals = [];

// Shift-Greeting tracking
const playerShiftHistory = {};

function createBot() {
  // Clear any existing intervals
  for (const interval of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals = [];

  console.log('[Zoltraak] Connecting to ' + config.host + ':' + config.port + ' as ' + config.username + '...');
  
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
    
    if (!homePos) {
      homePos = bot.entity.position.clone();
      config.home = { x: Math.round(homePos.x), y: Math.round(homePos.y), z: Math.round(homePos.z) };
      saveConfig();
      console.log('[Zoltraak] Home anchor set to: ' + JSON.stringify(config.home));
    }

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    defaultMove.canDig = false; // Never punch player structures/walls!
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    defaultMove.canOpenDoors = true;
    bot.pathfinder.setMovements(defaultMove);

    // Setup mineflayer-auto-eat plugin properly
    bot.autoEat.setOpts({
      minHunger: 15,
      minHealth: 15,
      priority: 'foodPoints',
      bannedFood: ['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish']
    });
    bot.autoEat.enableAuto();

    // Dynamically throttle sprinting if starved to prevent sprint particle stuttering
    bot.on('physicsTick', () => {
      if (bot.pathfinder && bot.pathfinder.movements) {
        bot.pathfinder.movements.allowSprinting = (bot.food > 6);
      }
    });

    // Anti-Spam bypass: single jump on spawn satisfies GriefPrevention pre-movement check
    setTimeout(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 250);
    }, 1000);

    setTimeout(() => {
      bot.chat('/skin set Frieren');
    }, 2000);

    startAutonomousLoops(mcData);
  });

  function sendReply(text, isWhisper = false, minDelay = 400, maxDelay = 800) {
    const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
    setTimeout(() => {
      if (!bot || !bot.entity) return;
      if (isWhisper) {
        bot.whisper(config.owner, text);
      } else {
        bot.chat(text);
      }
    }, delay);
  }

  function handleCommand(username, message, isWhisper = false) {
    if (username !== config.owner) {
      if (message.startsWith('!') || isWhisper) {
        if (Math.random() < 0.25) sendReply('?', isWhisper);
      }
      return;
    }

    let clean = message.trim();
    if (clean.startsWith('!')) clean = clean.substring(1);
    const args = clean.split(' ');
    const command = args[0].toLowerCase();

    console.log('[Zoltraak] ' + (isWhisper ? '[WHISPER]' : '[CHAT]') + ' Command from ' + username + ': ' + clean);

    switch (command) {
      case 'come':
      case 'follow': {
        const player = bot.players[username]?.entity;
        if (!player) {
          sendReply('where are you?', isWhisper);
          return;
        }
        currentState = 'FOLLOW';
        followTarget = player;
        bot.pathfinder.setGoal(new goals.GoalFollow(player, 2), true);
        const followReplies = ['k', 'coming', 'on my way', 'gotchu'];
        sendReply(followReplies[Math.floor(Math.random() * followReplies.length)], isWhisper);
        break;
      }

      case 'guard':
      case 'bodyguard': {
        const player = bot.players[username]?.entity;
        if (!player) {
          sendReply('where are you?', isWhisper);
          return;
        }
        currentState = 'GUARD';
        followTarget = player;
        bot.pathfinder.setGoal(new goals.GoalFollow(player, 3), true);
        sendReply('got your back', isWhisper);
        break;
      }

      case 'stay':
      case 'stop': {
        currentState = 'IDLE';
        followTarget = null;
        bot.pathfinder.setGoal(null);
        bot.pvp.stop();
        sendReply('k', isWhisper);
        break;
      }

      case 'roam': {
        currentState = 'ROAM';
        followTarget = null;
        sendReply('alright', isWhisper);
        performLifeLikeRoaming();
        break;
      }

      case 'sethome': {
        homePos = bot.entity.position.clone();
        config.home = { x: Math.round(homePos.x), y: Math.round(homePos.y), z: Math.round(homePos.z) };
        saveConfig();
        sendReply('home set here', isWhisper);
        break;
      }

      case 'setchest': {
        const chest = bot.findBlock({
          matching: block => block.name.includes('chest') || block.name.includes('barrel') || block.name.includes('shulker'),
          maxDistance: 6
        });
        if (chest) {
          chestPos = chest.position.clone();
          config.chest = { x: chestPos.x, y: chestPos.y, z: chestPos.z };
          saveConfig();
          sendReply('chest registered', isWhisper);
        } else {
          sendReply('stand near a chest first', isWhisper);
        }
        break;
      }

      case 'deposit': {
        sendReply('depositing...', isWhisper);
        depositIntoChest();
        break;
      }

      case 'farm': {
        currentState = 'FARM';
        sendReply('on it', isWhisper);
        const mcData = require('minecraft-data')(bot.version);
        checkAndFarmCrops(mcData);
        break;
      }

      case 'fish':
      case 'fishing': {
        currentState = 'FISHING';
        sendReply('heading to fish', isWhisper);
        startFishingLoop(isWhisper);
        break;
      }

      case 'eat': {
        eatIfHungry(true);
        sendReply('eating', isWhisper);
        break;
      }

      case 'sleep': {
        sendReply('sec finding bed', isWhisper);
        trySleepInBed();
        break;
      }

      case 'drop': {
        dropInventory();
        break;
      }

      case 'skin': {
        if (args[1]) {
          bot.chat('/skin set ' + args[1]);
          sendReply('k', isWhisper);
        }
        break;
      }

      case 'status': {
        const hp = Math.round(bot.health);
        const food = Math.round(bot.food);
        sendReply('hp: ' + hp + '/20 | food: ' + food + '/20 | ' + currentState.toLowerCase(), isWhisper);
        break;
      }

      case 'help': {
        sendReply('follow, guard, stop, roam, farm, fish, eat, sleep, setchest, deposit, drop, status', isWhisper);
        break;
      }
    }
  }

  bot.on('whisper', (username, message) => {
    if (username === bot.username) return;
    handleCommand(username, message, true);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;

    const lower = message.trim().toLowerCase();

    if (lower.includes('zoltraak') || lower === 'hi' || lower === 'yo' || lower === 'sup') {
      if (lower.includes('zoltraak') || lower.includes('hi zoltraak') || lower.includes('yo zoltraak')) {
        const casualReplies = ['yo', 'sup', 'hey', 'o/', 'hi'];
        const reply = casualReplies[Math.floor(Math.random() * casualReplies.length)];
        sendReply(reply, false);
        return;
      }
    }

    if (message.startsWith('!')) {
      handleCommand(username, message, false);
    }
  });

  bot.on('sleep', () => {
    isSleeping = true;
    currentState = 'SLEEPING';
  });

  bot.on('wake', () => {
    isSleeping = false;
    currentState = 'ROAM';
  });

  bot.on('kicked', (reason) => {
    console.log('[Zoltraak] Kicked: ' + reason);
  });

  bot.on('error', (err) => {
    console.log('[Zoltraak] Socket Error: ' + err.message);
  });

  bot.on('end', () => {
    console.log('[Zoltraak] Disconnected. Cleaning intervals and reconnecting in 5s...');
    for (const interval of activeIntervals) {
      clearInterval(interval);
    }
    activeIntervals = [];
    setTimeout(createBot, 5000);
  });
}

function startAutonomousLoops(mcData) {
  // 1. Bedtime & Night Check every 8 seconds
  const i1 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping || currentState === 'COMBAT' || currentState === 'DEPOSITING') return;
    
    const isNight = bot.time.timeOfDay >= 12541 && bot.time.timeOfDay <= 23458;
    const isStorm = bot.isRaining;
    
    if ((isNight || isStorm) && config.autoSleep) {
      if (currentState !== 'SLEEPING') {
        trySleepInBed();
      }
    }
  }, 8000);
  activeIntervals.push(i1);

  // 2. Active Food Consumer every 3 seconds (guarantees eating immediately when hungry)
  const iEat = setInterval(() => {
    if (!bot || !bot.entity || isSleeping) return;
    if (bot.food < 18) {
      eatIfHungry();
    }
  }, 3000);
  activeIntervals.push(iEat);

  // 3. Pro Combat & Self-Defense every 800ms
  const i2 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping || !config.autoDefend) return;
    scanAndDefendAgainstMobs();
  }, 800);
  activeIntervals.push(i2);

  // 4. Bodyguard Threat Scanner (when in GUARD mode) every 1 second
  const i3 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping || currentState !== 'GUARD') return;
    performBodyguardLogic();
  }, 1000);
  activeIntervals.push(i3);

  // 5. Shift-Greeting Detection every 500ms
  const i4 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping) return;
    checkPlayerShiftGreetings();
  }, 500);
  activeIntervals.push(i4);

  // 6. Offhand & Shield / Totem Manager every 3 seconds
  const i5 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping) return;
    manageOffhandItems();
  }, 3000);
  activeIntervals.push(i5);

  // 7. Autonomous Farming Loop every 8 seconds (ROAM or FARM mode)
  const i6 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping || currentState === 'COMBAT' || currentState === 'DEPOSITING' || currentState === 'GUARD' || currentState === 'FISHING') return;
    if (config.autoFarm && (currentState === 'ROAM' || currentState === 'FARM')) {
      if (bot.inventory.emptySlotCount() <= 3 && (chestPos || config.chest)) {
        depositIntoChest();
      } else {
        checkAndFarmCrops(mcData);
      }
    }
  }, 8000);
  activeIntervals.push(i6);

  // 8. Natural Base Roaming every 12 seconds
  const i7 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping || currentState !== 'ROAM') return;
    if (bot.pathfinder.isMoving()) return;
    performLifeLikeRoaming();
  }, 12000);
  activeIntervals.push(i7);

  // 9. Social Eye Gaze every 3 seconds
  const i8 = setInterval(() => {
    if (!bot || !bot.entity || isSleeping || bot.pathfinder.isMoving() || currentState === 'FISHING') return;
    lookAtNearbyPlayers();
  }, 3000);
  activeIntervals.push(i8);
}

const EDIBLE_FOODS = [
  'golden_carrot', 'cooked_beef', 'cooked_porkchop', 'cooked_mutton',
  'cooked_salmon', 'cooked_chicken', 'bread', 'baked_potato', 'carrot', 'apple'
];

async function eatIfHungry(force = false) {
  if (!bot || !bot.inventory) return;
  if (!force && bot.food >= 18) return;
  if (bot.autoEat && bot.autoEat.isEating) return;

  const foodItem = bot.inventory.items().find(i => EDIBLE_FOODS.includes(i.name));
  if (foodItem) {
    try {
      console.log('[Zoltraak] Eating ' + foodItem.name + ' (food: ' + bot.food + '/20)');
      await bot.equip(foodItem, 'hand');
      await bot.consume();
    } catch (e) {}
  }
}

let isReplyingShift = false;

function checkPlayerShiftGreetings() {
  if (isReplyingShift) return;

  for (const name in bot.players) {
    if (name === bot.username) continue;
    const player = bot.players[name];
    if (!player || !player.entity) continue;

    const dist = bot.entity.position.distanceTo(player.entity.position);
    if (dist > 5) continue;

    const isSneaking = (player.entity.metadata && (player.entity.metadata[0] & 0x02) !== 0) || player.entity.height < 1.65;

    const now = Date.now();
    if (!playerShiftHistory[name]) {
      playerShiftHistory[name] = { lastState: false, shifts: [] };
    }

    const hist = playerShiftHistory[name];
    if (isSneaking && !hist.lastState) {
      hist.shifts.push(now);
      hist.shifts = hist.shifts.filter(t => now - t <= 2500);

      if (hist.shifts.length >= 2) {
        hist.shifts = [];
        executeShiftGreeting(player.entity);
        break;
      }
    }
    hist.lastState = isSneaking;
  }
}

async function executeShiftGreeting(targetPlayer) {
  isReplyingShift = true;
  try {
    bot.lookAt(targetPlayer.position.offset(0, 1.5, 0));
    bot.setControlState('sneak', true);
    await bot.waitForTicks(5);
    bot.setControlState('sneak', false);
    await bot.waitForTicks(3);
    bot.setControlState('sneak', true);
    await bot.waitForTicks(5);
    bot.setControlState('sneak', false);
    bot.swingArm();
  } catch (e) {}

  setTimeout(() => {
    isReplyingShift = false;
  }, 2000);
}

function performBodyguardLogic() {
  const owner = bot.players[config.owner]?.entity;
  if (!owner) return;

  let threat = null;
  let threatDist = 8;

  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (!entity || !entity.name) continue;
    if (HOSTILE_MOBS.includes(entity.name.toLowerCase())) {
      const distToOwner = owner.position.distanceTo(entity.position);
      if (distToOwner < threatDist) {
        threatDist = distToOwner;
        threat = entity;
      }
    }
  }

  if (threat) {
    combatTarget = threat;
    const prev = currentState;
    currentState = 'COMBAT';
    console.log('[Zoltraak] Bodyguard intercepting threat to ' + config.owner + ': ' + threat.name);

    equipBestWeapon().then(() => {
      bot.pvp.attack(threat);
    });

    const checkDead = setInterval(() => {
      if (!threat || !threat.isValid || threat.health <= 0) {
        clearInterval(checkDead);
        bot.pvp.stop();
        combatTarget = null;
        currentState = 'GUARD';
      }
    }, 500);
    return;
  }

  const ownerSpeed = owner.velocity ? Math.sqrt(owner.velocity.x * owner.velocity.x + owner.velocity.z * owner.velocity.z) : 0;
  if (ownerSpeed < 0.05 && !bot.pathfinder.isMoving()) {
    const awayYaw = (owner.yaw || 0) + Math.PI;
    bot.look(awayYaw, 0);
  }
}

async function startFishingLoop(isWhisper) {
  if (isFishing) return;

  let rod = bot.inventory.items().find(i => i.name === 'fishing_rod');
  if (!rod) {
    rod = await fetchToolFromChest('fishing_rod');
    if (!rod) {
      if (bot.whisper) bot.whisper(config.owner, 'no fishing rod found');
      currentState = 'ROAM';
      return;
    }
  }

  const waterBlock = bot.findBlock({
    matching: b => b.name === 'water',
    maxDistance: 15
  });

  if (!waterBlock) {
    if (bot.whisper) bot.whisper(config.owner, 'no water nearby to fish');
    currentState = 'ROAM';
    return;
  }

  isFishing = true;
  console.log('[Zoltraak] Moving to water for fishing...');

  try {
    await bot.pathfinder.goto(new goals.GoalNear(waterBlock.position.x, waterBlock.position.y + 1, waterBlock.position.z, 2));
    await bot.equip(rod, 'hand');
    await bot.lookAt(waterBlock.position.offset(0.5, 0.8, 0.5));

    console.log('[Zoltraak] Fishing line cast.');

    while (currentState === 'FISHING') {
      try {
        await bot.equip(rod, 'hand');
        await bot.lookAt(waterBlock.position.offset(0.5, 0.8, 0.5));
        await bot.fish();
        await bot.waitForTicks(20);

        if (bot.inventory.emptySlotCount() <= 2 && (chestPos || config.chest)) {
          await depositIntoChest();
          await bot.pathfinder.goto(new goals.GoalNear(waterBlock.position.x, waterBlock.position.y + 1, waterBlock.position.z, 2));
        }
      } catch (fishErr) {
        await bot.waitForTicks(30);
      }
    }
  } catch (err) {
    console.log('[Zoltraak] Fishing error: ' + err.message);
  }

  isFishing = false;
}

async function fetchToolFromChest(toolName) {
  const cPos = chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
  if (!cPos) return null;

  try {
    await bot.pathfinder.goto(new goals.GoalNear(cPos.x, cPos.y, cPos.z, 2));
    const chestBlock = bot.blockAt(cPos);
    if (!chestBlock) return null;

    const chestWindow = await bot.openContainer(chestBlock);
    await bot.waitForTicks(8);

    const replacement = chestWindow.containerItems().find(i => i.name.includes(toolName));
    if (replacement) {
      await chestWindow.withdraw(replacement.type, null, 1);
      await bot.waitForTicks(4);
      chestWindow.close();
      console.log('[Zoltraak] Restocked ' + toolName + ' from base chest.');
      return bot.inventory.items().find(i => i.name.includes(toolName));
    }
    chestWindow.close();
  } catch (e) {}
  return null;
}

async function manageOffhandItems() {
  const offhandItem = bot.inventory.slots[45];
  
  const totem = bot.inventory.items().find(i => i.name === 'totem_of_undying');
  if (totem && (bot.health < 12 || currentState === 'COMBAT')) {
    if (!offhandItem || offhandItem.name !== 'totem_of_undying') {
      try {
        await bot.equip(totem, 'off-hand');
      } catch (e) {}
    }
    return;
  }

  const shield = bot.inventory.items().find(i => i.name === 'shield');
  if (shield) {
    if (!offhandItem || offhandItem.name !== 'shield') {
      try {
        await bot.equip(shield, 'off-hand');
      } catch (e) {}
    }
  }
}

function performLifeLikeRoaming() {
  if (!homePos) return;
  
  const radius = config.roamRadius || 14;
  const dx = (Math.random() - 0.5) * 2 * radius;
  const dz = (Math.random() - 0.5) * 2 * radius;
  const targetX = Math.round(homePos.x + dx);
  const targetZ = Math.round(homePos.z + dz);

  if (Math.random() < 0.2) {
    bot.setControlState('sneak', true);
    setTimeout(() => bot.setControlState('sneak', false), 500);
  }

  // Use GoalNearXZ to navigate seamlessly without being stuck on rigid elevation changes
  bot.pathfinder.setGoal(new goals.GoalNearXZ(targetX, targetZ, 2));
}

function lookAtNearbyPlayers() {
  let closestPlayer = null;
  let closestDist = 8;

  for (const name in bot.players) {
    if (name === bot.username) continue;
    const player = bot.players[name];
    if (player && player.entity) {
      const dist = bot.entity.position.distanceTo(player.entity.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = player.entity;
      }
    }
  }

  if (closestPlayer) {
    bot.lookAt(closestPlayer.position.offset(0, 1.6, 0));
  }
}

function trySleepInBed() {
  const bedBlock = bot.findBlock({
    matching: block => block.name.includes('bed'),
    maxDistance: 30
  });

  if (!bedBlock) return;

  bot.pathfinder.setGoal(new goals.GoalGetToBlock(bedBlock.position.x, bedBlock.position.y, bedBlock.position.z));

  const checkNearBed = setInterval(async () => {
    if (!bot.entity) {
      clearInterval(checkNearBed);
      return;
    }
    const dist = bot.entity.position.distanceTo(bedBlock.position);
    if (dist <= 2.5) {
      clearInterval(checkNearBed);
      try {
        await bot.sleep(bedBlock);
      } catch (err) {}
    }
  }, 500);
}

const HOSTILE_MOBS = ['zombie', 'skeleton', 'spider', 'cave_spider', 'creeper', 'witch', 'drowned', 'husk', 'stray', 'enderman', 'phantom'];

function scanAndDefendAgainstMobs() {
  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (entity && entity.name === 'creeper') {
      const dist = bot.entity.position.distanceTo(entity.position);
      if (dist < 6) {
        bot.pathfinder.setGoal(null);
        bot.pvp.stop();
        bot.lookAt(entity.position.offset(0, 1, 0));
        bot.setControlState('sprint', true);
        bot.setControlState('back', true);
        setTimeout(() => {
          bot.setControlState('sprint', false);
          bot.setControlState('back', false);
        }, 1200);
        return;
      }
    }
  }

  if (currentState === 'COMBAT' && combatTarget && combatTarget.isValid) {
    if (combatTarget.name === 'skeleton') {
      const offhand = bot.inventory.slots[45];
      if (offhand && offhand.name === 'shield') {
        bot.activateItem(true);
        setTimeout(() => {
          if (bot) bot.deactivateItem();
        }, 800);
      }
    }
    return;
  }

  let nearestHostile = null;
  let nearestDist = 10;

  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (!entity || !entity.name) continue;
    
    if (HOSTILE_MOBS.includes(entity.name.toLowerCase())) {
      const dist = bot.entity.position.distanceTo(entity.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestHostile = entity;
      }
    }
  }

  if (nearestHostile) {
    combatTarget = nearestHostile;
    const prev = currentState;
    currentState = 'COMBAT';

    equipBestWeapon().then(() => {
      bot.pvp.attack(nearestHostile);
    });

    const checkDead = setInterval(() => {
      if (!nearestHostile || !nearestHostile.isValid || nearestHostile.health <= 0) {
        clearInterval(checkDead);
        bot.pvp.stop();
        combatTarget = null;
        currentState = prev === 'COMBAT' ? 'ROAM' : prev;
      }
    }, 500);
  }
}

async function equipBestWeapon() {
  const swords = bot.inventory.items().filter(item => item.name.includes('sword') || item.name.includes('axe'));
  if (swords.length > 0) {
    swords.sort((a, b) => (b.name.includes('netherite') ? 3 : b.name.includes('diamond') ? 2 : b.name.includes('iron') ? 1 : 0) - (a.name.includes('netherite') ? 3 : a.name.includes('diamond') ? 2 : a.name.includes('iron') ? 1 : 0));
    try {
      await bot.equip(swords[0], 'hand');
    } catch (e) {}
  }
}

const CROP_MAP = {
  wheat: { matureAge: 7, seedName: 'wheat_seeds' },
  carrots: { matureAge: 7, seedName: 'carrot' },
  potatoes: { matureAge: 7, seedName: 'potato' },
  beetroots: { matureAge: 3, seedName: 'beetroot_seeds' }
};

function isMatureCrop(block) {
  if (!block) return false;
  const info = CROP_MAP[block.name];
  if (!info) return false;

  let age = -1;
  if (block._properties && block._properties.age !== undefined) {
    age = parseInt(block._properties.age, 10);
  } else if (block.metadata !== undefined) {
    age = block.metadata;
  }

  return age >= info.matureAge;
}

function digWithTimeout(block, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try { bot.stopDigging(); } catch (e) {}
      reject(new Error('Digging timed out'));
    }, timeoutMs);

    bot.dig(block).then(() => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve();
    }).catch((err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function checkAndFarmCrops(mcData) {
  if (isFarming || currentState === 'COMBAT' || currentState === 'DEPOSITING' || currentState === 'GUARD' || currentState === 'FISHING') return;

  const cPos = chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
  if (bot.inventory.emptySlotCount() <= 2 && cPos) {
    await depositIntoChest();
  }

  // Fast O(1) Block ID search using palette lookups
  const cropIds = [
    mcData.blocksByName.wheat?.id,
    mcData.blocksByName.carrots?.id,
    mcData.blocksByName.potatoes?.id,
    mcData.blocksByName.beetroots?.id
  ].filter(Boolean);

  const foundPosArray = bot.findBlocks({
    matching: cropIds,
    maxDistance: 16,
    count: 10
  });

  let matureCropPos = null;
  for (const pos of foundPosArray) {
    const b = bot.blockAt(pos);
    if (isMatureCrop(b)) {
      matureCropPos = pos;
      break;
    }
  }

  if (!matureCropPos) return;

  isFarming = true;

  try {
    // Navigate within reach (2 blocks) without stepping directly on top of the farmland
    await bot.pathfinder.goto(new goals.GoalNear(matureCropPos.x, matureCropPos.y, matureCropPos.z, 2));
    
    const freshBlock = bot.blockAt(matureCropPos);
    if (!isMatureCrop(freshBlock)) {
      isFarming = false;
      return;
    }

    const cropType = freshBlock.name;
    const seedName = CROP_MAP[cropType]?.seedName;
    const farmlandPos = freshBlock.position.offset(0, -1, 0);

    // Look and safely harvest with timeout protection
    await bot.lookAt(freshBlock.position.offset(0.5, 0.5, 0.5));
    try {
      await digWithTimeout(freshBlock, 2500);
    } catch (digErr) {
      console.log('[Zoltraak] Dig aborted/timed out:', digErr.message);
      isFarming = false;
      return;
    }

    await bot.waitForTicks(5);

    // Replant immediately from position
    if (seedName) {
      const seedItem = bot.inventory.items().find(i => i.name === seedName);
      if (seedItem) {
        try {
          await bot.equip(seedItem, 'hand');
          const farmland = bot.blockAt(farmlandPos);
          if (farmland) {
            await bot.placeBlock(farmland, new Vec3(0, 1, 0));
          }
        } catch (plantErr) {}
      }
    }

    // Eat if crops provided edible food
    if (bot.food < 18) {
      eatIfHungry();
    }

    // Continue to next available crop smoothly
    setTimeout(() => {
      isFarming = false;
      checkAndFarmCrops(mcData);
    }, 400);

  } catch (err) {
    isFarming = false;
  }
}

const DEPOSIT_ITEMS = [
  'wheat', 'beetroot',
  'cod', 'salmon', 'tropical_fish', 'pufferfish', 'bow', 'enchanted_book', 'saddle', 'nautilus_shell',
  'rotten_flesh', 'bone', 'arrow', 'string', 'spider_eye', 'gunpowder',
  'cobblestone', 'dirt'
];

async function depositIntoChest() {
  if (isDepositing) return;
  
  const cPos = chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
  if (!cPos) return;

  isDepositing = true;
  const prev = currentState;
  currentState = 'DEPOSITING';

  try {
    await bot.pathfinder.goto(new goals.GoalNear(cPos.x, cPos.y, cPos.z, 2));
    const chestBlock = bot.blockAt(cPos);
    if (!chestBlock) {
      isDepositing = false;
      currentState = prev;
      return;
    }

    const chestWindow = await bot.openContainer(chestBlock);
    await bot.waitForTicks(8);

    for (const item of bot.inventory.items()) {
      if (item.name === 'carrot' || item.name === 'potato') {
        // Keep 16 carrots and 16 potatoes for replanting & food!
        if (item.count > 16) {
          try {
            await chestWindow.deposit(item.type, null, item.count - 16);
            await bot.waitForTicks(3);
          } catch (e) {}
        }
      } else if (DEPOSIT_ITEMS.includes(item.name)) {
        try {
          await chestWindow.deposit(item.type, null, item.count);
          await bot.waitForTicks(3);
        } catch (e) {}
      } else if (item.name.includes('seed')) {
        // Keep 32 seeds, deposit the rest
        if (item.count > 32) {
          try {
            await chestWindow.deposit(item.type, null, item.count - 32);
            await bot.waitForTicks(3);
          } catch (e) {}
        }
      }
    }

    await bot.waitForTicks(6);
    chestWindow.close();
    console.log('[Zoltraak] Deposited items into chest.');

  } catch (err) {
    console.log('[Zoltraak] Deposit error: ' + err.message);
  }

  isDepositing = false;
  currentState = prev === 'DEPOSITING' ? 'ROAM' : prev;
}

async function dropInventory() {
  if (bot.whisper) bot.whisper(config.owner, 'here');
  const items = bot.inventory.items();
  for (const item of items) {
    try {
      await bot.tossStack(item);
    } catch (e) {}
  }
}

createBot();
