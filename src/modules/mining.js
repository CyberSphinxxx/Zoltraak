const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');
const { digWithTimeout } = require('../utils/block');
const { collectNearbyDrops } = require('./lumber');

const ORE_NAMES = [
  'coal_ore', 'deepslate_coal_ore',
  'iron_ore', 'deepslate_iron_ore',
  'copper_ore', 'deepslate_copper_ore',
  'gold_ore', 'deepslate_gold_ore',
  'redstone_ore', 'deepslate_redstone_ore',
  'lapis_ore', 'deepslate_lapis_ore',
  'diamond_ore', 'deepslate_diamond_ore',
  'emerald_ore', 'deepslate_emerald_ore',
  'nether_quartz_ore', 'nether_gold_ore', 'ancient_debris'
];

const PICKAXE_TIERS = {
  netherite_pickaxe: 5,
  diamond_pickaxe: 4,
  iron_pickaxe: 3,
  golden_pickaxe: 2,
  stone_pickaxe: 2,
  wooden_pickaxe: 1
};

async function equipBestPickaxe(bot, targetOreName = '') {
  if (!bot || !bot.inventory) return;
  const picks = bot.inventory.items().filter(i => i.name.endsWith('_pickaxe'));
  if (picks.length === 0) return;

  picks.sort((a, b) => (PICKAXE_TIERS[b.name] || 0) - (PICKAXE_TIERS[a.name] || 0));

  // Determine minimum pickaxe requirement
  let minTier = 1;
  if (targetOreName.includes('iron') || targetOreName.includes('lapis') || targetOreName.includes('copper')) {
    minTier = 2; // Stone pickaxe or better
  } else if (targetOreName.includes('diamond') || targetOreName.includes('gold') || targetOreName.includes('redstone') || targetOreName.includes('emerald')) {
    minTier = 3; // Iron pickaxe or better
  } else if (targetOreName.includes('ancient_debris') || targetOreName.includes('obsidian')) {
    minTier = 4; // Diamond pickaxe or better
  }

  const validPick = picks.find(p => (PICKAXE_TIERS[p.name] || 0) >= minTier) || picks[0];
  if (validPick) {
    try {
      await bot.equip(validPick, 'hand');
    } catch (e) {}
  }
}

async function placeTorchIfDark(bot) {
  if (!bot || !bot.entity) return;
  const currentPos = bot.entity.position.floored();
  const currentBlock = bot.blockAt(currentPos);
  if (!currentBlock || currentBlock.light > 6) return;

  const torch = bot.inventory.items().find(i => i.name === 'torch');
  if (!torch) return;

  // Try placing on floor or adjacent solid block
  const floorPos = currentPos.offset(0, -1, 0);
  const floorBlock = bot.blockAt(floorPos);
  if (floorBlock && floorBlock.boundingBox === 'block' && currentBlock.name === 'air') {
    try {
      await bot.equip(torch, 'hand');
      await bot.placeBlock(floorBlock, new Vec3(0, 1, 0));
      console.log('[Zoltraak Mining] Placed illumination torch.');
    } catch (e) {}
  }
}

async function mineTargetOre(ctx, oreQuery = 'all') {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || state.isMining) return false;

  const normalizedQuery = oreQuery.toLowerCase();
  const matchFilter = (block) => {
    if (!block || !block.name) return false;
    if (normalizedQuery === 'all' || normalizedQuery === 'ore' || normalizedQuery === 'ores') {
      return ORE_NAMES.includes(block.name);
    }
    return ORE_NAMES.some(ore => ore.includes(normalizedQuery) && block.name === ore);
  };

  const oreBlock = bot.findBlock({
    matching: matchFilter,
    maxDistance: 24
  });

  if (!oreBlock) {
    return false;
  }

  state.isMining = true;
  console.log(`[Zoltraak Mining] Found target ore: ${oreBlock.name} at ${oreBlock.position}`);

  try {
    await equipBestPickaxe(bot, oreBlock.name);
    await bot.pathfinder.goto(new goals.GoalNear(oreBlock.position.x, oreBlock.position.y, oreBlock.position.z, 2));

    // Check vein (adjacent ores in 3x3x3)
    const veinBlocks = [oreBlock];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const neighbor = bot.blockAt(oreBlock.position.offset(dx, dy, dz));
          if (neighbor && neighbor.name === oreBlock.name && !veinBlocks.some(b => b.position.equals(neighbor.position))) {
            veinBlocks.push(neighbor);
          }
        }
      }
    }

    for (const block of veinBlocks) {
      // Check for safety (avoid lava directly adjacent)
      const hazards = [new Vec3(0, 1, 0), new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      let dangerous = false;
      for (const h of hazards) {
        const checkB = bot.blockAt(block.position.plus(h));
        if (checkB && (checkB.name.includes('lava') || checkB.name.includes('fire'))) {
          dangerous = true;
          break;
        }
      }

      if (dangerous) {
        console.log('[Zoltraak Mining] Skipping ore due to nearby hazard: ' + block.position);
        continue;
      }

      if (bot.entity.position.distanceTo(block.position) > 4) {
        try {
          await bot.pathfinder.goto(new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2));
        } catch (e) {}
      }

      await equipBestPickaxe(bot, block.name);
      await digWithTimeout(bot, block, 4000);
      await bot.waitForTicks(2);
    }

    await collectNearbyDrops(bot, 4);
    await placeTorchIfDark(bot);

    state.isMining = false;
    return true;

  } catch (err) {
    console.log('[Zoltraak Mining] Error: ' + err.message);
    state.isMining = false;
    return false;
  }
}

async function digTunnel(ctx, steps = null) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity || state.isMining) return;

  const actualSteps = steps || config?.automation?.mineBranchLength || 16;
  const torchInterval = config?.automation?.mineTorchSpacing || 6;

  state.isMining = true;
  console.log(`[Zoltraak Mining] Starting 1x2 tunnel excavation (${actualSteps} blocks forward)...`);

  try {
    // Determine forward vector based on bot yaw rounded to 90 degrees
    const forwardX = -Math.round(Math.sin(yaw));
    const forwardZ = -Math.round(Math.cos(yaw));
    const forwardDir = new Vec3(forwardX, 0, forwardZ);

    if (forwardDir.x === 0 && forwardDir.z === 0) {
      forwardDir.z = 1; // Default fallback
    }

    for (let step = 0; step < actualSteps; step++) {
      if (state.currentState !== 'MINING') break;

      const feetPos = bot.entity.position.floored();
      const targetLower = feetPos.plus(forwardDir);
      const targetUpper = targetLower.offset(0, 1, 0);
      const targetRoof = targetLower.offset(0, 2, 0);

      // Check for hazards above (gravel, sand, lava)
      const roofBlock = bot.blockAt(targetRoof);
      if (roofBlock && (roofBlock.name.includes('lava') || roofBlock.name.includes('water'))) {
        console.log('[Zoltraak Mining] Tunnel stopped: fluid detected overhead.');
        break;
      }

      // Dig upper then lower block
      const upperBlock = bot.blockAt(targetUpper);
      if (upperBlock && upperBlock.name !== 'air') {
        await equipBestPickaxe(bot, upperBlock.name);
        await digWithTimeout(bot, upperBlock, 3000);
      }

      const lowerBlock = bot.blockAt(targetLower);
      if (lowerBlock && lowerBlock.name !== 'air') {
        await equipBestPickaxe(bot, lowerBlock.name);
        await digWithTimeout(bot, lowerBlock, 3000);
      }

      // Walk forward into dug space
      await bot.pathfinder.goto(new goals.GoalNear(targetLower.x, targetLower.y, targetLower.z, 0.8));

      // Place torch based on configured interval
      if (step % torchInterval === 0) {
        await placeTorchIfDark(bot);
      }

      await bot.waitForTicks(4);
    }

    await collectNearbyDrops(bot, 4);
    console.log('[Zoltraak Mining] Tunnel sequence complete.');

  } catch (err) {
    console.log('[Zoltraak Mining] Tunnel error: ' + err.message);
  }

  state.isMining = false;
}

module.exports = {
  ORE_NAMES,
  PICKAXE_TIERS,
  equipBestPickaxe,
  placeTorchIfDark,
  mineTargetOre,
  digTunnel
};
