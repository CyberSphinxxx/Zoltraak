const { Vec3 } = require('vec3');

let clutchEnabled = true;
let isExecutingClutch = false;

function setupClutchListener(ctx) {
  const { bot } = ctx;
  if (!bot) return;

  bot.on('physicsTick', async () => {
    if (!clutchEnabled || isExecutingClutch || !bot.entity) return;

    // Trigger check: bot must be airborne, descending rapidly, and accumulating fall distance
    const vy = bot.entity.velocity ? bot.entity.velocity.y : 0;
    const fallDist = bot.entity.fallDistance || 0;

    if (bot.entity.onGround || vy >= -0.55 || fallDist < 2.2) return;

    // Check if in fluid already
    if (bot.entity.isInWater || bot.entity.isInLava) return;

    // Check for water bucket in inventory
    const waterBucket = bot.inventory.items().find(i => i.name === 'water_bucket');
    if (!waterBucket) return;

    // Raycast/scan downwards 1 to 4 blocks for solid impact surface
    const currentPos = bot.entity.position;
    let solidBlock = null;
    let distanceToGround = 999;

    for (let dy = 1; dy <= 4; dy++) {
      const checkPos = currentPos.offset(0, -dy, 0).floored();
      const block = bot.blockAt(checkPos);
      if (block && block.boundingBox === 'block') {
        solidBlock = block;
        distanceToGround = currentPos.y - (checkPos.y + 1);
        break;
      }
    }

    // Must be about to hit the ground (within 0.4 to 2.4 blocks)
    if (!solidBlock || distanceToGround < 0.2 || distanceToGround > 2.6) return;

    const placePos = solidBlock.position.offset(0, 1, 0);
    const placeBlock = bot.blockAt(placePos);
    // Ensure target block is air or replaceable
    if (placeBlock && placeBlock.boundingBox === 'block') return;

    isExecutingClutch = true;
    console.log(`[Zoltraak Clutch] Fall detected (dist: ${fallDist.toFixed(1)}, groundDist: ${distanceToGround.toFixed(2)}). Executing Water MLG!`);
    if (ctx.addPerceptionLog) {
      ctx.addPerceptionLog('TACTICAL', `Freefall detected (${fallDist.toFixed(1)}m)! Executing Water Bucket MLG Clutch.`);
    }

    try {
      // 1. Quick-equip water bucket into main hand
      await bot.equip(waterBucket, 'hand');

      // 2. Look straight down at the top face of the solid block
      await bot.lookAt(solidBlock.position.offset(0.5, 1, 0.5), true);

      // 3. Place water onto the top face (up vector: 0, 1, 0)
      await bot.placeBlock(solidBlock, new Vec3(0, 1, 0));
      console.log('[Zoltraak Clutch] Water placed successfully!');

      // 4. Wait for the bot to hit the water / ground to cancel fall damage
      setTimeout(async () => {
        try {
          // Find empty bucket to scoop water back up
          const emptyBucket = bot.inventory.items().find(i => i.name === 'bucket');
          if (emptyBucket) {
            await bot.equip(emptyBucket, 'hand');
            const waterBlock = bot.blockAt(placePos);
            if (waterBlock && (waterBlock.name === 'water' || waterBlock.name.includes('water'))) {
              await bot.lookAt(placePos.offset(0.5, 0.5, 0.5), true);
              await bot.activateItem(false);
              console.log('[Zoltraak Clutch] Water retrieved back into bucket.');
              if (ctx.addPerceptionLog) {
                ctx.addPerceptionLog('TACTICAL', 'Water retrieved back into bucket. Fall neutralized.');
              }
            }
          }
        } catch (pickupErr) {
          console.log('[Zoltraak Clutch] Water retrieval notice:', pickupErr.message);
        } finally {
          isExecutingClutch = false;
        }
      }, 350);

    } catch (clutchErr) {
      console.log('[Zoltraak Clutch] Clutch execution error:', clutchErr.message);
      // Failsafe recovery after short delay
      setTimeout(() => {
        isExecutingClutch = false;
      }, 800);
    }
  });
}

function toggleClutch(enabled) {
  if (enabled !== undefined) {
    clutchEnabled = !!enabled;
  } else {
    clutchEnabled = !clutchEnabled;
  }
  return clutchEnabled;
}

function isClutchEnabled() {
  return clutchEnabled;
}

module.exports = {
  setupClutchListener,
  toggleClutch,
  isClutchEnabled
};
