const { Vec3 } = require('vec3');

const BUILDING_BLOCKS = [
  'cobblestone', 'cobbled_deepslate', 'dirt', 'stone', 'deepslate',
  'diorite', 'granite', 'andesite', 'netherrack', 'sandstone', 'tuff',
  'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks',
  'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks',
  'bamboo_planks', 'planks', 'blackstone', 'basalt'
];

function getBuildingBlock(bot) {
  return bot.inventory.items().find(i => BUILDING_BLOCKS.includes(i.name));
}

function getDirectionVector(bot, requestedDir) {
  const dir = (requestedDir || 'forward').toLowerCase();

  if (dir === 'north') return new Vec3(0, 0, -1);
  if (dir === 'south') return new Vec3(0, 0, 1);
  if (dir === 'east')  return new Vec3(1, 0, 0);
  if (dir === 'west')  return new Vec3(-1, 0, 0);

  // Derive from bot's current yaw facing angle
  const yaw = bot.entity.yaw;
  const sin = -Math.sin(yaw);
  const cos = -Math.cos(yaw);

  if (Math.abs(sin) > Math.abs(cos)) {
    return new Vec3(sin > 0 ? 1 : -1, 0, 0);
  } else {
    return new Vec3(0, 0, cos > 0 ? 1 : -1);
  }
}

async function bridge(ctx, length = 8, requestedDir = 'forward', isWhisper = true, targetPlayer = null) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity) return false;

  const steps = Math.min(Math.max(1, parseInt(length, 10) || 8), 64);
  const dirVec = getDirectionVector(bot, requestedDir);

  let initialBlock = getBuildingBlock(bot);
  if (!initialBlock) {
    ctx.sendReply('No building blocks (cobblestone/dirt/planks) in inventory!', isWhisper, targetPlayer);
    return false;
  }

  const prev = state.currentState;
  state.currentState = 'BRIDGING';
  if (bot.pathfinder) bot.pathfinder.setGoal(null);

  ctx.sendReply(`Bridging ${steps} blocks...`, isWhisper, targetPlayer);

  let placedCount = 0;

  try {
    // 1. Enable sneak so bot cannot fall off block edges
    bot.setControlState('sneak', true);
    await bot.waitForTicks(3);

    for (let i = 0; i < steps; i++) {
      let blockItem = getBuildingBlock(bot);
      if (!blockItem) {
        ctx.sendReply(`Ran out of blocks after bridging ${placedCount} blocks!`, isWhisper);
        break;
      }

      await bot.equip(blockItem, 'hand');

      // Find block directly under feet
      const footPos = bot.entity.position.offset(0, -0.5, 0).floored();
      const currentUnder = bot.blockAt(footPos);
      if (!currentUnder) break;

      const targetPos = currentUnder.position.offset(dirVec.x, 0, dirVec.z);
      const targetBlock = bot.blockAt(targetPos);

      // If target already has a solid block, step forward onto it
      if (targetBlock && targetBlock.boundingBox === 'block') {
        await stepOnto(bot, targetPos);
        continue;
      }

      // Approach edge of currentUnder block in direction of placement
      bot.setControlState('forward', true);
      await bot.lookAt(targetPos.offset(0.5, 0.5, 0.5), true);
      await bot.waitForTicks(4);
      bot.setControlState('forward', false);

      // Look back at the face of currentUnder block to attach the new block
      const faceLookPos = currentUnder.position.offset(
        0.5 + dirVec.x * 0.5,
        0.5,
        0.5 + dirVec.z * 0.5
      );
      await bot.lookAt(faceLookPos, true);

      try {
        await bot.placeBlock(currentUnder, dirVec);
        placedCount++;
      } catch (placeErr) {
        // Retry with small micro-adjustment
        bot.setControlState('back', true);
        await bot.waitForTicks(2);
        bot.setControlState('back', false);
        try {
          await bot.placeBlock(currentUnder, dirVec);
          placedCount++;
        } catch (e) {}
      }

      // Step forward onto the newly placed block
      await stepOnto(bot, targetPos);
      await bot.waitForTicks(2);
    }

    ctx.sendReply(`Bridging complete! Placed ${placedCount} blocks.`, isWhisper, targetPlayer);

  } catch (err) {
    console.log('[Zoltraak Scaffold] Bridge error:', err.message);
    ctx.sendReply(`Bridge halted: ${err.message}`, isWhisper, targetPlayer);
  } finally {
    bot.setControlState('sneak', false);
    bot.clearControlStates();
    state.currentState = prev === 'BRIDGING' ? 'ROAM' : prev;
  }

  return true;
}

async function stepOnto(bot, targetPos) {
  const lookTarget = targetPos.offset(0.5, 1.5, 0.5);
  await bot.lookAt(lookTarget, true);
  bot.setControlState('forward', true);
  await bot.waitForTicks(5);
  bot.setControlState('forward', false);
}

async function tower(ctx, height = 5, isWhisper = true, targetPlayer = null) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity) return false;

  const targetHeight = Math.min(Math.max(1, parseInt(height, 10) || 5), 32);

  let initialBlock = getBuildingBlock(bot);
  if (!initialBlock) {
    ctx.sendReply('No building blocks in inventory to tower with!', isWhisper, targetPlayer);
    return false;
  }

  const prev = state.currentState;
  state.currentState = 'TOWERING';
  if (bot.pathfinder) bot.pathfinder.setGoal(null);

  ctx.sendReply(`Towering ${targetHeight} blocks up...`, isWhisper, targetPlayer);

  let toweredCount = 0;

  try {
    for (let i = 0; i < targetHeight; i++) {
      let blockItem = getBuildingBlock(bot);
      if (!blockItem) {
        ctx.sendReply(`Ran out of building blocks after towering ${toweredCount} blocks.`, isWhisper, targetPlayer);
        break;
      }

      await bot.equip(blockItem, 'hand');

      const groundBlock = bot.blockAt(bot.entity.position.offset(0, -0.5, 0).floored());
      if (!groundBlock) break;

      // Look directly straight down
      await bot.lookAt(groundBlock.position.offset(0.5, 1.0, 0.5), true);

      // Jump and place at apex
      bot.setControlState('jump', true);
      await bot.waitForTicks(6);

      try {
        await bot.placeBlock(groundBlock, new Vec3(0, 1, 0));
        toweredCount++;
      } catch (placeErr) {}

      bot.setControlState('jump', false);
      await bot.waitForTicks(4);
    }

    ctx.sendReply(`Towering complete! Reached +${toweredCount} blocks elevation.`, isWhisper, targetPlayer);

  } catch (err) {
    console.log('[Zoltraak Scaffold] Tower error:', err.message);
  } finally {
    bot.clearControlStates();
    state.currentState = prev === 'TOWERING' ? 'ROAM' : prev;
  }

  return true;
}

module.exports = {
  BUILDING_BLOCKS,
  bridge,
  tower
};
