const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');
const { digWithTimeout } = require('../utils/block');

const LOG_TYPES = [
  'oak_log', 'birch_log', 'spruce_log', 'jungle_log',
  'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'
];

const SAPLING_MAP = {
  oak_log: 'oak_sapling',
  birch_log: 'birch_sapling',
  spruce_log: 'spruce_sapling',
  jungle_log: 'jungle_sapling',
  acacia_log: 'acacia_sapling',
  dark_oak_log: 'dark_oak_sapling',
  cherry_log: 'cherry_sapling',
  mangrove_log: 'mangrove_propagule'
};

const SOIL_TYPES = ['dirt', 'grass_block', 'podzol', 'coarse_dirt', 'rooted_dirt', 'mud'];

async function equipBestAxe(bot) {
  if (!bot || !bot.inventory) return;
  const axes = bot.inventory.items().filter(item => item.name.endsWith('_axe'));
  if (axes.length > 0) {
    const tierScore = name => {
      if (name.includes('netherite')) return 5;
      if (name.includes('diamond')) return 4;
      if (name.includes('iron')) return 3;
      if (name.includes('stone')) return 2;
      if (name.includes('golden')) return 1;
      return 0;
    };
    axes.sort((a, b) => tierScore(b.name) - tierScore(a.name));
    try {
      await bot.equip(axes[0], 'hand');
    } catch (e) {}
  }
}

async function collectNearbyDrops(bot, radius = 4) {
  if (!bot || !bot.entity) return;
  for (const id in bot.entities) {
    const ent = bot.entities[id];
    if (ent && (ent.name === 'item' || ent.type === 'object') && ent.position) {
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist <= radius) {
        try {
          await bot.pathfinder.goto(new goals.GoalNear(ent.position.x, ent.position.y, ent.position.z, 0.8));
          await bot.waitForTicks(4);
        } catch (e) {}
      }
    }
  }
}

async function checkAndLumber(ctx) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || state.isLumbering) return false;

  const logBlock = bot.findBlock({
    matching: block => LOG_TYPES.includes(block.name),
    maxDistance: 24
  });

  if (!logBlock) return false;

  state.isLumbering = true;
  console.log(`[Zoltraak Lumber] Found ${logBlock.name} at ${logBlock.position}`);

  try {
    await equipBestAxe(bot);
    await bot.pathfinder.goto(new goals.GoalNear(logBlock.position.x, logBlock.position.y, logBlock.position.z, 2));

    // Find all connected vertical logs in this tree trunk (within +-1 horizontal and up to 8 blocks vertical)
    const logsToChop = [];
    for (let dy = -1; dy <= 12; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const candidatePos = logBlock.position.offset(dx, dy, dz);
          const block = bot.blockAt(candidatePos);
          if (block && LOG_TYPES.includes(block.name)) {
            logsToChop.push(block);
          }
        }
      }
    }

    // Sort logs from lowest to highest for stability
    logsToChop.sort((a, b) => a.position.y - b.position.y);

    let lowestLogPos = null;
    let choppedType = logBlock.name;

    for (const log of logsToChop) {
      if (bot.entity.position.distanceTo(log.position) > 4.5) {
        try {
          await bot.pathfinder.goto(new goals.GoalNear(log.position.x, log.position.y, log.position.z, 2));
        } catch (e) {}
      }
      try {
        if (!lowestLogPos) lowestLogPos = log.position.clone();
        choppedType = log.name;
        await digWithTimeout(bot, log, 3500);
        await bot.waitForTicks(2);
      } catch (err) {
        console.log('[Zoltraak Lumber] Dig log failed: ' + err.message);
      }
    }

    // Collect dropped saplings, sticks, and logs
    await collectNearbyDrops(bot, 5);

    // Replant sapling if enabled and appropriate soil is beneath the stump
    const autoReplant = ctx.config?.automation?.autoReplantSaplings !== false;
    if (lowestLogPos && autoReplant) {
      const soilPos = lowestLogPos.offset(0, -1, 0);
      const soilBlock = bot.blockAt(soilPos);
      const saplingName = SAPLING_MAP[choppedType] || 'oak_sapling';
      const saplingItem = bot.inventory.items().find(i => i.name === saplingName || i.name.endsWith('_sapling'));

      if (soilBlock && SOIL_TYPES.includes(soilBlock.name) && saplingItem) {
        const airPos = lowestLogPos;
        const currentAir = bot.blockAt(airPos);
        if (currentAir && currentAir.name === 'air') {
          try {
            await bot.equip(saplingItem, 'hand');
            await bot.placeBlock(soilBlock, new Vec3(0, 1, 0));
            console.log(`[Zoltraak Lumber] Replanted ${saplingItem.name} at ${airPos}`);
          } catch (e) {}
        }
      }
    }

    state.isLumbering = false;
    return true;

  } catch (err) {
    console.log('[Zoltraak Lumber] Error: ' + err.message);
    state.isLumbering = false;
    return false;
  }
}

module.exports = {
  LOG_TYPES,
  SAPLING_MAP,
  equipBestAxe,
  collectNearbyDrops,
  checkAndLumber
};
