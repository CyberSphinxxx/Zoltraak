const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');
const { digWithTimeout } = require('../utils/block');

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

async function checkAndFarmCrops(ctx, mcData) {
  const { bot, state, config } = ctx;
  if (!bot || state.isFarming) return;
  if (['COMBAT', 'DEPOSITING', 'GUARD', 'FISHING'].includes(state.currentState)) return;

  const data = mcData || ctx.mcData;
  if (!data) return;

  const cPos = state.chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
  if (bot.inventory.emptySlotCount() <= 2 && cPos) {
    await ctx.depositIntoChest();
  }

  // Fast O(1) Block ID search using palette lookups
  const cropIds = [
    data.blocksByName.wheat?.id,
    data.blocksByName.carrots?.id,
    data.blocksByName.potatoes?.id,
    data.blocksByName.beetroots?.id
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

  state.isFarming = true;

  try {
    // Navigate within reach (2 blocks) without stepping directly on top of the farmland
    await bot.pathfinder.goto(new goals.GoalNear(matureCropPos.x, matureCropPos.y, matureCropPos.z, 2));

    const freshBlock = bot.blockAt(matureCropPos);
    if (!isMatureCrop(freshBlock)) {
      state.isFarming = false;
      return;
    }

    const cropType = freshBlock.name;
    const seedName = CROP_MAP[cropType]?.seedName;
    const farmlandPos = freshBlock.position.offset(0, -1, 0);

    // Look and safely harvest with timeout protection
    await bot.lookAt(freshBlock.position.offset(0.5, 0.5, 0.5));
    try {
      await digWithTimeout(bot, freshBlock, 2500);
    } catch (digErr) {
      console.log('[Zoltraak] Dig aborted/timed out:', digErr.message);
      state.isFarming = false;
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
        } catch (plantErr) { }
      }
    }

    // Eat if crops provided edible food
    if (bot.food < 18) {
      ctx.eatIfHungry();
    }

    // Continue to next available crop smoothly
    setTimeout(() => {
      state.isFarming = false;
      checkAndFarmCrops(ctx, data);
    }, 400);

  } catch (err) {
    state.isFarming = false;
  }
}

module.exports = {
  CROP_MAP,
  isMatureCrop,
  checkAndFarmCrops
};
