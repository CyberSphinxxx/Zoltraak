function checkPlayerShiftGreetings(ctx) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity) return;
  if (state.isReplyingShift) return;

  for (const name in bot.players) {
    if (name === bot.username) continue;
    const player = bot.players[name];
    if (!player || !player.entity) continue;

    const dist = bot.entity.position.distanceTo(player.entity.position);
    if (dist > 5) continue;

    const isSneaking = (player.entity.metadata && (player.entity.metadata[0] & 0x02) !== 0) || player.entity.height < 1.65;

    const now = Date.now();
    if (!state.playerShiftHistory[name]) {
      state.playerShiftHistory[name] = { lastState: false, shifts: [] };
    }

    const hist = state.playerShiftHistory[name];
    if (isSneaking && !hist.lastState) {
      hist.shifts.push(now);
      hist.shifts = hist.shifts.filter(t => now - t <= 2500);

      if (hist.shifts.length >= 2) {
        hist.shifts = [];
        executeShiftGreeting(ctx, player.entity);
        break;
      }
    }
    hist.lastState = isSneaking;
  }
}

async function executeShiftGreeting(ctx, targetPlayer) {
  const { bot, state } = ctx;
  state.isReplyingShift = true;
  try {
    bot.lookAt(targetPlayer.position.offset(0, 1.5, 0));
    bot.setControlState('sneak', true);
    await bot.waitForTicks(5);
    bot.setControlState('sneak', false);
    await bot.waitForTicks(3);
    bot.setControlState('sneak', true);
    await bot.waitForTicks(5);
    bot.setControlState('sneak', false);
    bot.swingArm();
  } catch (e) {}

  setTimeout(() => {
    state.isReplyingShift = false;
  }, 2000);
}

function lookAtNearbyPlayers(ctx) {
  const { bot } = ctx;
  if (!bot || !bot.entity) return;

  let closestPlayer = null;
  let closestDist = 8;

  for (const name in bot.players) {
    if (name === bot.username) continue;
    const player = bot.players[name];
    if (player && player.entity) {
      const dist = bot.entity.position.distanceTo(player.entity.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = player.entity;
      }
    }
  }

  if (closestPlayer) {
    bot.lookAt(closestPlayer.position.offset(0, 1.6, 0));
  }
}

module.exports = {
  checkPlayerShiftGreetings,
  executeShiftGreeting,
  lookAtNearbyPlayers
};
