const { Movements, goals } = require('mineflayer-pathfinder');

let stuckWatchdog = null;

function setupMovements(bot, mcData, config = {}) {
  const defaultMove = new Movements(bot, mcData);
  defaultMove.canDig = false; // Never punch player structures/walls
  defaultMove.allowParkour = false; // Prevent risky sprint-gap jumps that stall on slopes
  defaultMove.allowSprinting = !!(config.navigation?.allowSprinting); // Sprinting toggle
  defaultMove.canOpenDoors = true;
  bot.pathfinder.setMovements(defaultMove);

  // 1. Auto-Jump Assistant: Automatically jump when walking into a 1-block elevation
  bot.on('physicsTick', () => {
    if (!bot.entity) return;
    if (config.navigation?.autoJumpAssist === false) return;

    if (bot.entity.isCollidedHorizontally && (bot.controlState.forward || (bot.pathfinder && bot.pathfinder.isMoving()))) {
      // Ensure overhead space is clear before jumping
      const headPos = bot.entity.position.offset(0, 2, 0).floored();
      const headBlock = bot.blockAt(headPos);
      const isHeadClear = !headBlock || headBlock.boundingBox !== 'block';

      if (isHeadClear && bot.entity.onGround) {
        bot.setControlState('jump', true);
        setTimeout(() => {
          if (bot && bot.entity) bot.setControlState('jump', false);
        }, 150);
      }
    }
  });

  // 2. Active Anti-Stuck Watchdog: Detects if the bot is running into a wall without moving
  if (stuckWatchdog) clearInterval(stuckWatchdog);
  let lastPos = null;
  let stuckCounter = 0;
  const watchdogInterval = config.navigation?.antiStuckTimeout || 600;

  stuckWatchdog = setInterval(() => {
    if (!bot || !bot.entity) return;

    if (bot.pathfinder && bot.pathfinder.isMoving()) {
      const currentPos = bot.entity.position;
      if (lastPos) {
        const dist = currentPos.distanceTo(lastPos);
        // If trying to move but position changed less than 8cm in interval
        if (dist < 0.08) {
          stuckCounter++;

          if (stuckCounter === 2) {
            // Attempt an unstuck hop
            bot.setControlState('jump', true);
            setTimeout(() => { if (bot) bot.setControlState('jump', false); }, 200);
          } else if (stuckCounter >= 4) {
            console.log('[Zoltraak Nav] Path obstructed. Unsticking: clearing controls and stepping back...');
            bot.pathfinder.stop();
            bot.clearControlStates();

            // Take a small step backward to clear collision
            bot.setControlState('back', true);
            setTimeout(() => {
              if (bot) {
                bot.clearControlStates();
                stuckCounter = 0;
              }
            }, 400);
          }
        } else {
          stuckCounter = 0;
        }
      }
      lastPos = currentPos.clone();
    } else {
      stuckCounter = 0;
      lastPos = null;
    }
  }, watchdogInterval);
}

function performLifeLikeRoaming(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity || !state.homePos) return;

  bot.clearControlStates();

  const radius = config.roamRadius || 14;
  const dx = (Math.random() - 0.5) * 2 * radius;
  const dz = (Math.random() - 0.5) * 2 * radius;
  const targetX = Math.round(state.homePos.x + dx);
  const targetZ = Math.round(state.homePos.z + dz);

  if (Math.random() < 0.2) {
    bot.setControlState('sneak', true);
    setTimeout(() => {
      if (bot) bot.setControlState('sneak', false);
    }, 500);
  }

  // Set goal with a 2.5m tolerance
  bot.pathfinder.setGoal(new goals.GoalNearXZ(targetX, targetZ, 2.5));
}

module.exports = {
  setupMovements,
  performLifeLikeRoaming
};
