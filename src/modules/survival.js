const { goals } = require('mineflayer-pathfinder');

const EDIBLE_FOODS = [
  'golden_carrot', 'cooked_beef', 'cooked_porkchop', 'cooked_mutton',
  'cooked_salmon', 'cooked_chicken', 'bread', 'baked_potato', 'carrot', 'apple'
];

async function eatIfHungry(ctx, force = false) {
  const { bot, config } = ctx;
  if (!bot || !bot.inventory) return;

  const threshold = config?.automation?.autoEatThreshold || 15;
  if (!force && bot.food >= threshold) return;
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

async function manageOffhandItems(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.inventory) return;

  const offhandItem = bot.inventory.slots[45];

  const totemThreshold = config?.combat?.totemThreshold || 12;
  const totem = bot.inventory.items().find(i => i.name === 'totem_of_undying');
  if (totem && (bot.health < totemThreshold || state.currentState === 'COMBAT')) {
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

function trySleepInBed(ctx) {
  const { bot } = ctx;
  if (!bot || !bot.entity) return;

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

module.exports = {
  EDIBLE_FOODS,
  eatIfHungry,
  manageOffhandItems,
  trySleepInBed
};
