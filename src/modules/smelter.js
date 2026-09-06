const { goals } = require('mineflayer-pathfinder');

const SMELTABLES = [
  'raw_iron', 'raw_copper', 'raw_gold',
  'iron_ore', 'deepslate_iron_ore', 'copper_ore', 'deepslate_copper_ore', 'gold_ore', 'deepslate_gold_ore',
  'ancient_debris',
  'beef', 'porkchop', 'mutton', 'chicken', 'rabbit', 'salmon', 'cod', 'potato', 'kelp',
  'cobblestone', 'sand', 'clay_ball', 'wet_sponge', 'netherrack'
];

const FUELS = [
  'coal', 'charcoal', 'blaze_rod', 'coal_block', 'lava_bucket',
  'dried_kelp_block', 'oak_planks', 'spruce_planks', 'birch_planks', 'planks', 'stick', 'oak_log'
];

async function operateSmelter(ctx) {
  const { bot, state } = ctx;
  if (!bot || state.isSmelting) return false;

  const furnaceBlock = bot.findBlock({
    matching: block => ['furnace', 'blast_furnace', 'smoker'].includes(block.name),
    maxDistance: 16
  });

  if (!furnaceBlock) {
    console.log('[Zoltraak Smelter] No furnace found nearby.');
    return false;
  }

  state.isSmelting = true;
  const prev = state.currentState;
  state.currentState = 'SMELTING';

  try {
    await bot.pathfinder.goto(new goals.GoalNear(furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 2));
    const furnaceWindow = await bot.openContainer(furnaceBlock);
    await bot.waitForTicks(6);

    // Slot 2 in standard furnace window is output
    const outputSlot = furnaceWindow.slots[2];
    if (outputSlot && outputSlot.count > 0) {
      console.log(`[Zoltraak Smelter] Collected ${outputSlot.count}x ${outputSlot.name} from furnace.`);
      // Withdraw output
      try {
        await furnaceWindow.withdraw(outputSlot.type, null, outputSlot.count);
        await bot.waitForTicks(4);
      } catch (e) {}
    }

    // Check inventory for fuel
    const fuelItem = bot.inventory.items().find(i => FUELS.includes(i.name) || i.name.endsWith('_planks'));
    const fuelSlot = furnaceWindow.slots[1];
    if (fuelItem && (!fuelSlot || fuelSlot.count < 32)) {
      const depositAmount = Math.min(fuelItem.count, 16);
      try {
        // In furnace container: slot 1 is fuel
        await bot.clickWindow(fuelItem.slot, 0, 0);
        await bot.waitForTicks(2);
        await bot.clickWindow(1, 0, 0);
        await bot.waitForTicks(2);
        console.log(`[Zoltraak Smelter] Loaded ${depositAmount}x ${fuelItem.name} as fuel.`);
      } catch (e) {}
    }

    // Check inventory for smeltable inputs
    const inputItem = bot.inventory.items().find(i => SMELTABLES.includes(i.name));
    const inputSlot = furnaceWindow.slots[0];
    if (inputItem && (!inputSlot || inputSlot.name === inputItem.name)) {
      const depositAmount = Math.min(inputItem.count, 32);
      try {
        // Slot 0 is input
        await bot.clickWindow(inputItem.slot, 0, 0);
        await bot.waitForTicks(2);
        await bot.clickWindow(0, 0, 0);
        await bot.waitForTicks(2);
        console.log(`[Zoltraak Smelter] Loaded ${depositAmount}x ${inputItem.name} for smelting.`);
      } catch (e) {}
    }

    await bot.waitForTicks(4);
    furnaceWindow.close();

  } catch (err) {
    console.log('[Zoltraak Smelter] Error: ' + err.message);
  }

  state.isSmelting = false;
  state.currentState = prev === 'SMELTING' ? 'ROAM' : prev;
  return true;
}

module.exports = {
  SMELTABLES,
  FUELS,
  operateSmelter
};
