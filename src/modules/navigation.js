const { Movements, goals } = require('mineflayer-pathfinder');

let stuckWatchdog = null;
let guardFollowInterval = null;
let lastJumpTime = 0;

// ============================================================
// Movement Setup
// ============================================================
function setupMovements(bot, mcData, config = {}) {
  const defaultMove = new Movements(bot, mcData);
  defaultMove.canDig = false;          // Never punch player structures
  defaultMove.allowParkour = true;     // Allow gap-jumps (needed for guard + terrain)
  defaultMove.allowSprinting = true;   // Always sprint — guard mode needs it
  defaultMove.canOpenDoors = true;
  bot.pathfinder.setMovements(defaultMove);

  // ── Auto-Jump Assistant ──────────────────────────────────────
  // Proactively detects a 1-block step ahead and jumps before
  // hitting it, making movement feel smooth and natural.
  bot.on('physicsTick', () => {
    if (!bot.entity) return;
    if (config.navigation?.autoJumpAssist === false) return;

    const now = Date.now();
    const cooldown = 300; // ms between jumps to prevent spam on slopes
    if (now - lastJumpTime < cooldown) return;

    const pos = bot.entity.position;
    const yaw = bot.entity.yaw;
    const isMoving = bot.pathfinder && bot.pathfinder.isMoving();
    const movingForward = bot.controlState?.forward || isMoving;

    if (!movingForward) return;

    // Check the block directly in front (1m ahead, projected by yaw)
    const frontDx = -Math.sin(yaw);
    const frontDz = -Math.cos(yaw);
    const frontBlock = bot.blockAt(pos.offset(frontDx * 0.8, 0, frontDz * 0.8));
    const stepBlock = bot.blockAt(pos.offset(frontDx * 0.8, 1, frontDz * 0.8));
    const headClear = bot.blockAt(pos.offset(0, 2, 0));

    const stepIsBlocker = frontBlock && frontBlock.boundingBox === 'block';
    const stepTopIsOpen = !stepBlock || stepBlock.boundingBox !== 'block';
    const headIsClear = !headClear || headClear.boundingBox !== 'block';

    // Also trigger on horizontal collision (fallback)
    const collidedAndMoving = bot.entity.isCollidedHorizontally && isMoving;

    if ((stepIsBlocker && stepTopIsOpen && headIsClear) || (collidedAndMoving && headIsClear)) {
      if (bot.entity.onGround) {
        lastJumpTime = now;
        bot.setControlState('jump', true);
        setTimeout(() => {
          if (bot && bot.entity) bot.setControlState('jump', false);
        }, 250); // 250ms hold to fully clear a 1-block step
      }
    }
  });

  // ── Anti-Stuck Watchdog ───────────────────────────────────────
  // Checks every 500ms if the bot is supposed to be moving but isn't.
  if (stuckWatchdog) clearInterval(stuckWatchdog);
  let lastPos = null;
  let stuckCounter = 0;
  const watchdogInterval = config.navigation?.antiStuckTimeout || 500;

  stuckWatchdog = setInterval(() => {
    if (!bot || !bot.entity) return;

    if (bot.pathfinder && bot.pathfinder.isMoving()) {
      const currentPos = bot.entity.position;
      if (lastPos) {
        const dist = currentPos.distanceTo(lastPos);

        if (dist < 0.06) { // Moved less than 6cm — likely stuck
          stuckCounter++;

          if (stuckCounter === 1) {
            // First miss: try a jump to hop over obstacle
            bot.setControlState('jump', true);
            setTimeout(() => { if (bot) bot.setControlState('jump', false); }, 250);
          } else if (stuckCounter === 3) {
            // Still stuck after 3 intervals: step back and recalculate
            console.log('[Zoltraak Nav] Path obstructed — stepping back to unstick...');
            bot.pathfinder.stop();
            bot.clearControlStates();
            bot.setControlState('back', true);
            setTimeout(() => {
              if (bot) {
                bot.clearControlStates();
                stuckCounter = 0;
              }
            }, 350);
          } else if (stuckCounter >= 6) {
            // Hard stuck: full reset
            bot.clearControlStates();
            bot.pathfinder.stop();
            stuckCounter = 0;
            lastPos = null;
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

// ============================================================
// Guard Follow — Dynamic GoalFollow with sprint-on-distance
// ============================================================
// Updates GoalFollow position every 600ms, enables sprinting
// when the player is far, and stops sprinting when close.
function startGuardFollow(ctx, targetPlayer) {
  stopGuardFollow(); // Kill any existing guard interval first

  const { bot, config } = ctx;
  const followDist = config.navigation?.followDistance || 2;
  const sprintThreshold = 6; // Distance (blocks) at which to start sprinting

  guardFollowInterval = setInterval(() => {
    if (!bot || !bot.entity || !targetPlayer || !targetPlayer.isValid) return;
    if (ctx.state?.currentState !== 'GUARD') {
      stopGuardFollow();
      return;
    }

    const dist = bot.entity.position.distanceTo(targetPlayer.position);

    // Distance-adaptive sprinting
    if (dist > sprintThreshold) {
      bot.setControlState('sprint', true);
    } else if (dist <= followDist + 1) {
      bot.setControlState('sprint', false);
    }

    // Refresh the goal position so pathfinder re-routes around new obstacles
    bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer, followDist), true);

    // If player is way too far (disconnected area / teleport) — stop sprinting
    // to avoid resource waste and let pathfinder recalculate cleanly
    if (dist > 60) {
      console.log('[Zoltraak Guard] Owner very far away — holding position.');
      bot.pathfinder.setGoal(null);
      bot.clearControlStates();
    }
  }, 600);
}

function stopGuardFollow() {
  if (guardFollowInterval) {
    clearInterval(guardFollowInterval);
    guardFollowInterval = null;
  }
}

// ============================================================
// Natural Roaming
// ============================================================
function performLifeLikeRoaming(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity || !state.homePos) return;

  bot.clearControlStates();
  bot.setControlState('sprint', false); // Roaming is casual — no sprinting

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

  bot.pathfinder.setGoal(new goals.GoalNearXZ(targetX, targetZ, 2.5));
}

module.exports = {
  setupMovements,
  startGuardFollow,
  stopGuardFollow,
  performLifeLikeRoaming
};
