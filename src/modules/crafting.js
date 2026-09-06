const { goals } = require('mineflayer-pathfinder');

async function craftItem(ctx, itemName, count = 1) {
  const { bot, state, mcData } = ctx;
  if (!bot || !bot.inventory || state.isCrafting) return false;

  const itemDef = mcData.itemsByName[itemName.toLowerCase()];
  if (!itemDef) {
    console.log(`[Zoltraak Crafting] Unknown item name: ${itemName}`);
    return false;
  }

  state.isCrafting = true;
  const prev = state.currentState;
  state.currentState = 'CRAFTING';

  try {
    // Check for nearby crafting table
    const craftingTable = bot.findBlock({
      matching: block => block.name === 'crafting_table',
      maxDistance: 16
    });

    const recipes = bot.recipesFor(itemDef.id, null, count, craftingTable);
    if (!recipes || recipes.length === 0) {
      // Check if we can craft in 2x2 without table
      const recipes2x2 = bot.recipesFor(itemDef.id, null, count, null);
      if (!recipes2x2 || recipes2x2.length === 0) {
        console.log(`[Zoltraak Crafting] No valid recipe or missing ingredients for ${itemName}.`);
        state.isCrafting = false;
        state.currentState = prev === 'CRAFTING' ? 'ROAM' : prev;
        return false;
      }
      console.log(`[Zoltraak Crafting] Crafting ${count}x ${itemName} in 2x2 grid...`);
      await bot.craft(recipes2x2[0], count, null);
      console.log(`[Zoltraak Crafting] Successfully crafted ${count}x ${itemName}.`);
      state.isCrafting = false;
      state.currentState = prev === 'CRAFTING' ? 'ROAM' : prev;
      return true;
    }

    if (recipes[0].requiresTable) {
      if (!craftingTable) {
        console.log(`[Zoltraak Crafting] ${itemName} requires a crafting table, but none found nearby.`);
        state.isCrafting = false;
        state.currentState = prev === 'CRAFTING' ? 'ROAM' : prev;
        return false;
      }
      await bot.pathfinder.goto(new goals.GoalNear(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z, 2));
      console.log(`[Zoltraak Crafting] Crafting ${count}x ${itemName} at workbench...`);
      await bot.craft(recipes[0], count, craftingTable);
    } else {
      await bot.craft(recipes[0], count, null);
    }

    console.log(`[Zoltraak Crafting] Finished crafting ${count}x ${itemName}!`);
    state.isCrafting = false;
    state.currentState = prev === 'CRAFTING' ? 'ROAM' : prev;
    return true;

  } catch (err) {
    console.log('[Zoltraak Crafting] Craft error: ' + err.message);
    state.isCrafting = false;
    state.currentState = prev === 'CRAFTING' ? 'ROAM' : prev;
    return false;
  }
}

async function autoReplenishTool(ctx, toolType = 'pickaxe') {
  const { bot } = ctx;
  if (!bot || !bot.inventory) return;

  const currentTool = bot.inventory.items().find(i => i.name.endsWith(`_${toolType}`));
  if (currentTool) return; // Tool is still available

  console.log(`[Zoltraak Crafting] ${toolType} missing from inventory. Attempting autonomous replenishment...`);

  // Check if we have sticks, if not craft sticks from planks
  const sticks = bot.inventory.items().find(i => i.name === 'stick');
  if (!sticks) {
    await craftItem(ctx, 'stick', 1);
  }

  // Attempt to craft stone tool first, then wooden tool
  const stoneCrafted = await craftItem(ctx, `stone_${toolType}`, 1);
  if (!stoneCrafted) {
    await craftItem(ctx, `wooden_${toolType}`, 1);
  }
}

module.exports = {
  craftItem,
  autoReplenishTool
};
