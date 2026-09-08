const { goals } = require('mineflayer-pathfinder');
const { collectNearbyDrops } = require('./lumber');
const { equipBestWeapon } = require('./combat');

function handleDeath(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity) return;

  const pos = bot.entity.position.floored();
  const dimension = (bot.game && bot.game.dimension) ? bot.game.dimension : 'overworld';
  const time = Date.now();
  const invItems = bot.inventory ? bot.inventory.items().map(i => `${i.count}x ${i.name}`) : [];

  state.deathPos = pos;
  state.deathDimension = dimension;
  state.deathTime = time;
  state.deathInventory = invItems;

  const alert = `💀 I died at X: ${pos.x}, Y: ${pos.y}, Z: ${pos.z} in ${dimension}! Say '!recover' to have me retrieve my dropped items.`;
  console.log(`[Zoltraak Death] ${alert}`);
  ctx.sendReply(alert, true);
}

async function recoverCorpse(ctx, isWhisper = true, targetPlayer = null) {
  const { bot, state } = ctx;
  if (!bot) return;

  if (!state.deathPos) {
    ctx.sendReply('I do not have a recorded death location to recover!', isWhisper, targetPlayer);
    return;
  }

  const currentDim = (bot.game && bot.game.dimension) ? bot.game.dimension : 'overworld';
  if (state.deathDimension && state.deathDimension !== currentDim) {
    ctx.sendReply(`I died in ${state.deathDimension}, but I am currently in ${currentDim}! I need to travel through a portal first.`, isWhisper, targetPlayer);
    return;
  }

  state.isRetrieving = true;
  const prev = state.currentState;
  state.currentState = 'RETRIEVING';

  const { x, y, z } = state.deathPos;
  ctx.sendReply(`Heading to death coordinates at (${x}, ${y}, ${z}) to recover dropped items...`, isWhisper, targetPlayer);

  try {
    await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2));
    await bot.waitForTicks(10);

    // Collect all dropped items in radius
    await collectNearbyDrops(bot, 8);
    await bot.waitForTicks(10);

    // Equip recovered weapon and trigger armor manager
    await equipBestWeapon(ctx);
    if (bot.armorManager) {
      bot.armorManager.equipAll();
    }

    ctx.sendReply('Corpse recovered! Gathered dropped items and re-equipped.', isWhisper, targetPlayer);
    console.log('[Zoltraak Death] Corpse recovery routine completed successfully.');

  } catch (err) {
    console.log('[Zoltraak Death] Recovery path error: ' + err.message);
    ctx.sendReply('Encountered an obstacle reaching the death location.', isWhisper, targetPlayer);
  } finally {
    state.isRetrieving = false;
    state.currentState = prev === 'RETRIEVING' ? 'ROAM' : prev;
  }
}

module.exports = {
  handleDeath,
  recoverCorpse
};
