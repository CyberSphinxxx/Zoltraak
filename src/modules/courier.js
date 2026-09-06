const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');

async function deliverItemToOwner(ctx, itemName, count = 1, isWhisper = true, targetPlayer = null) {
  const { bot, state, config } = ctx;
  if (!bot || state.isDelivering) return;

  const ownerName = targetPlayer || config.owner;
  const owner = bot.players[ownerName]?.entity;
  if (!owner) {
    ctx.sendReply("I can't see your coordinates right now. Come closer so I can find you!", isWhisper, targetPlayer);
    return;
  }

  state.isDelivering = true;
  const prev = state.currentState;
  state.currentState = 'COURIER';
  ctx.sendReply(`Got it, fetching ${count}x ${itemName} for you...`, isWhisper, targetPlayer);

  try {
    const query = itemName.toLowerCase();
    let foundInInv = bot.inventory.items().filter(i => i.name.includes(query));
    let invTotal = foundInInv.reduce((sum, item) => sum + item.count, 0);

    // If not enough in inventory, try fetching from base chest
    if (invTotal < count) {
      const cPos = state.chestPos || (config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null);
      if (cPos) {
        console.log(`[Zoltraak Courier] Fetching ${itemName} from chest at ${cPos}...`);
        await bot.pathfinder.goto(new goals.GoalNear(cPos.x, cPos.y, cPos.z, 2));
        const chestBlock = bot.blockAt(cPos);
        if (chestBlock) {
          const chestWindow = await bot.openContainer(chestBlock);
          await bot.waitForTicks(8);
          const match = chestWindow.containerItems().find(i => i.name.includes(query));
          if (match) {
            const need = Math.min(count - invTotal, match.count);
            await chestWindow.withdraw(match.type, null, need);
            await bot.waitForTicks(4);
            console.log(`[Zoltraak Courier] Withdrew ${need}x ${match.name} from chest.`);
          }
          chestWindow.close();
        }
      }
    }

    // Re-check inventory
    foundInInv = bot.inventory.items().filter(i => i.name.includes(query));
    invTotal = foundInInv.reduce((sum, item) => sum + item.count, 0);

    if (invTotal === 0) {
      ctx.sendReply(`Sorry, couldn't find any ${itemName} in my bag or base storage!`, isWhisper, targetPlayer);
      state.isDelivering = false;
      state.currentState = prev === 'COURIER' ? 'ROAM' : prev;
      return;
    }

    // Path to owner's current position
    console.log(`[Zoltraak Courier] Delivering to ${ownerName}...`);
    await bot.pathfinder.goto(new goals.GoalFollow(owner, 2));

    // Look at owner and drop item
    await bot.lookAt(owner.position.offset(0, 1, 0));
    let remainingToDrop = Math.min(count, invTotal);

    for (const item of foundInInv) {
      if (remainingToDrop <= 0) break;
      const dropCount = Math.min(item.count, remainingToDrop);
      await bot.toss(item.type, null, dropCount);
      remainingToDrop -= dropCount;
      await bot.waitForTicks(3);
    }

    ctx.sendReply('Here you go!', isWhisper, targetPlayer);
    console.log(`[Zoltraak Courier] Delivered ${count}x ${itemName} to ${ownerName}.`);

  } catch (err) {
    console.log('[Zoltraak Courier] Delivery error: ' + err.message);
  }

  state.isDelivering = false;
  state.currentState = prev === 'COURIER' ? 'ROAM' : prev;
}

module.exports = {
  deliverItemToOwner
};
