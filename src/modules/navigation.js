const { Movements, goals } = require('mineflayer-pathfinder');

function setupMovements(bot, mcData) {
  const defaultMove = new Movements(bot, mcData);
  defaultMove.canDig = false; // Never punch player structures/walls!
  defaultMove.allowParkour = true;
  defaultMove.allowSprinting = true;
  defaultMove.canOpenDoors = true;
  bot.pathfinder.setMovements(defaultMove);

  // Dynamically throttle sprinting if starved to prevent sprint particle stuttering
  bot.on('physicsTick', () => {
    if (bot.pathfinder && bot.pathfinder.movements) {
      bot.pathfinder.movements.allowSprinting = (bot.food > 6);
    }
  });
}

function performLifeLikeRoaming(ctx) {
  const { bot, state, config } = ctx;
  if (!state.homePos) return;

  const radius = config.roamRadius || 14;
  const dx = (Math.random() - 0.5) * 2 * radius;
  const dz = (Math.random() - 0.5) * 2 * radius;
  const targetX = Math.round(state.homePos.x + dx);
  const targetZ = Math.round(state.homePos.z + dz);

  if (Math.random() < 0.2) {
    bot.setControlState('sneak', true);
    setTimeout(() => bot.setControlState('sneak', false), 500);
  }

  // Use GoalNearXZ to navigate seamlessly without being stuck on rigid elevation changes
  bot.pathfinder.setGoal(new goals.GoalNearXZ(targetX, targetZ, 2));
}

module.exports = {
  setupMovements,
  performLifeLikeRoaming
};
