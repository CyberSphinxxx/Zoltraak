const { goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

async function startFishingLoop(ctx, isWhisper = false) {
  const { bot, state, config } = ctx;
  if (!bot || state.isFishing) return;

  let rod = bot.inventory.items().find(i => i.name === 'fishing_rod');
  if (!rod) {
    rod = await ctx.fetchToolFromChest('fishing_rod');
    if (!rod) {
      if (bot.whisper) bot.whisper(config.owner, 'no fishing rod found');
      state.currentState = 'ROAM';
      return;
    }
  }

  const waterBlock = bot.findBlock({
    matching: b => b.name === 'water',
    maxDistance: 15
  });

  if (!waterBlock) {
    if (bot.whisper) bot.whisper(config.owner, 'no water nearby to fish');
    state.currentState = 'ROAM';
    return;
  }

  state.isFishing = true;
  console.log('[Zoltraak] Moving to water for fishing...');

  try {
    await bot.pathfinder.goto(new goals.GoalNear(waterBlock.position.x, waterBlock.position.y + 1, waterBlock.position.z, 2));
    await bot.equip(rod, 'hand');
    await bot.lookAt(waterBlock.position.offset(0.5, 0.8, 0.5));

    console.log('[Zoltraak] Fishing line cast.');

    while (state.currentState === 'FISHING') {
      try {
        await bot.equip(rod, 'hand');
        await bot.lookAt(waterBlock.position.offset(0.5, 0.8, 0.5));
        await bot.fish();
        await bot.waitForTicks(20);

        const cPos = state.chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
        if (bot.inventory.emptySlotCount() <= 2 && cPos) {
          await ctx.depositIntoChest();
          await bot.pathfinder.goto(new goals.GoalNear(waterBlock.position.x, waterBlock.position.y + 1, waterBlock.position.z, 2));
        }
      } catch (fishErr) {
        await bot.waitForTicks(30);
      }
    }
  } catch (err) {
    console.log('[Zoltraak] Fishing error: ' + err.message);
  }

  state.isFishing = false;
}

module.exports = {
  startFishingLoop
};
