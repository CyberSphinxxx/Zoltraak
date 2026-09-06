const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');

const DEPOSIT_ITEMS = [
  'wheat', 'beetroot',
  'cod', 'salmon', 'tropical_fish', 'pufferfish', 'bow', 'enchanted_book', 'saddle', 'nautilus_shell',
  'rotten_flesh', 'bone', 'arrow', 'string', 'spider_eye', 'gunpowder',
  'cobblestone', 'dirt'
];

async function depositIntoChest(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || state.isDepositing) return;

  const cPos = state.chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
  if (!cPos) return;

  state.isDepositing = true;
  const prev = state.currentState;
  state.currentState = 'DEPOSITING';

  try {
    await bot.pathfinder.goto(new goals.GoalNear(cPos.x, cPos.y, cPos.z, 2));
    const chestBlock = bot.blockAt(cPos);
    if (!chestBlock) {
      state.isDepositing = false;
      state.currentState = prev;
      return;
    }

    const chestWindow = await bot.openContainer(chestBlock);
    await bot.waitForTicks(8);

    for (const item of bot.inventory.items()) {
      if (item.name === 'carrot' || item.name === 'potato') {
        // Keep 16 carrots and 16 potatoes for replanting & food
        if (item.count > 16) {
          try {
            await chestWindow.deposit(item.type, null, item.count - 16);
            await bot.waitForTicks(3);
          } catch (e) {}
        }
      } else if (DEPOSIT_ITEMS.includes(item.name)) {
        try {
          await chestWindow.deposit(item.type, null, item.count);
          await bot.waitForTicks(3);
        } catch (e) {}
      } else if (item.name.includes('seed')) {
        // Keep 32 seeds, deposit the rest
        if (item.count > 32) {
          try {
            await chestWindow.deposit(item.type, null, item.count - 32);
            await bot.waitForTicks(3);
          } catch (e) {}
        }
      }
    }

    await bot.waitForTicks(6);
    chestWindow.close();
    console.log('[Zoltraak] Deposited items into chest.');

  } catch (err) {
    console.log('[Zoltraak] Deposit error: ' + err.message);
  }

  state.isDepositing = false;
  state.currentState = prev === 'DEPOSITING' ? 'ROAM' : prev;
}

async function fetchToolFromChest(ctx, toolName) {
  const { bot, state, config } = ctx;
  const cPos = state.chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
  if (!cPos) return null;

  try {
    await bot.pathfinder.goto(new goals.GoalNear(cPos.x, cPos.y, cPos.z, 2));
    const chestBlock = bot.blockAt(cPos);
    if (!chestBlock) return null;

    const chestWindow = await bot.openContainer(chestBlock);
    await bot.waitForTicks(8);

    const replacement = chestWindow.containerItems().find(i => i.name.includes(toolName));
    if (replacement) {
      await chestWindow.withdraw(replacement.type, null, 1);
      await bot.waitForTicks(4);
      chestWindow.close();
      console.log('[Zoltraak] Restocked ' + toolName + ' from base chest.');
      return bot.inventory.items().find(i => i.name.includes(toolName));
    }
    chestWindow.close();
  } catch (e) {}
  return null;
}

async function dropInventory(ctx) {
  const { bot, config } = ctx;
  if (!bot || !bot.inventory) return;
  if (bot.whisper) bot.whisper(config.owner, 'here');
  const items = bot.inventory.items();
  for (const item of items) {
    try {
      await bot.tossStack(item);
    } catch (e) {}
  }
}

module.exports = {
  DEPOSIT_ITEMS,
  depositIntoChest,
  fetchToolFromChest,
  dropInventory
};
