const { Movements, goals } = require('mineflayer-pathfinder');

let stuckWatchdog = null;
let followInterval = null;
let guardFollowInterval = null;
let lastJumpTime = 0;

// ============================================================
// Movement Setup
// ============================================================
function setupMovements(bot, mcData, config = {}) {
  const defaultMove = new Movements(bot, mcData);
  defaultMove.canDig = false;          // Never punch player structures
  defaultMove.allowParkour = true;     // Allow gap-jumps (needed for guard + terrain)
  defaultMove.allowSprinting = bot.food === undefined || bot.food > 6;
  defaultMove.canOpenDoors = true;
  bot.pathfinder.setMovements(defaultMove);

  // Dynamically synchronize sprinting capability with hunger level
  bot.on('health', () => {
    if (bot.pathfinder?.movements) {
      bot.pathfinder.movements.allowSprinting = bot.food === undefined || bot.food > 6;
    }
  });

  // ── Auto-Jump Assistant & Aquatic Traversal ──────────────────
  bot.on('physicsTick', () => {
    if (!bot.entity) return;

    const inWater = bot.entity.isInWater || (bot.blockAt(bot.entity.position)?.name === 'water');
    const isMoving = bot.pathfinder && bot.pathfinder.isMoving();
    const movingForward = bot.controlState?.forward || isMoving;

    // ── Aquatic Traversal & Anti-Drowning ──
    if (inWater) {
      // 1. Emergency anti-drowning: If oxygen is low, swim upward immediately
      if (bot.oxygenLevel !== null && bot.oxygenLevel !== undefined && bot.oxygenLevel < 15) {
        bot.setControlState('jump', true);
        return;
      }

      // 2. Buoyancy: Maintain surface swimming whenever moving
      if (movingForward) {
        bot.setControlState('jump', true);
      }

      // 3. Shore Step-Up: If bumping against underwater shore edge, boost forward + jump
      if (bot.entity.isCollidedHorizontally && movingForward) {
        bot.setControlState('forward', true);
        bot.setControlState('jump', true);
      }
      return;
    }

    // ── Auto-Jump Assistant (Land) ──
    if (config.navigation?.autoJumpAssist === false) return;

    const now = Date.now();
    const cooldown = 300; // ms between auto-jumps to avoid slope bouncing
    if (now - lastJumpTime < cooldown) return;
    if (!movingForward || !bot.entity.onGround) return;

    const pos = bot.entity.position;
    const vel = bot.entity.velocity;
    const horizSpeed = Math.hypot(vel.x, vel.z);

    // Use movement velocity vector if active, otherwise fallback to entity yaw
    let moveAngle = bot.entity.yaw;
    if (horizSpeed > 0.05) {
      moveAngle = Math.atan2(-vel.x, -vel.z);
    }

    const frontDx = -Math.sin(moveAngle);
    const frontDz = -Math.cos(moveAngle);

    const frontBlock = bot.blockAt(pos.offset(frontDx * 0.75, 0, frontDz * 0.75));
    const stepBlock = bot.blockAt(pos.offset(frontDx * 0.75, 1, frontDz * 0.75));
    const stepHeadBlock = bot.blockAt(pos.offset(frontDx * 0.75, 2, frontDz * 0.75));
    const overheadBlock = bot.blockAt(pos.offset(0, 2, 0));

    const stepIsBlocker = frontBlock && frontBlock.boundingBox === 'block';
    const stepTopIsOpen = !stepBlock || stepBlock.boundingBox !== 'block';
    const stepHeadIsOpen = !stepHeadBlock || stepHeadBlock.boundingBox !== 'block';
    const overheadIsOpen = !overheadBlock || overheadBlock.boundingBox !== 'block';
    const collidedAndMoving = bot.entity.isCollidedHorizontally && isMoving;

    // Only auto-jump if there is a 1-block obstacle with adequate clearance for head and landing
    if (((stepIsBlocker && stepTopIsOpen && stepHeadIsOpen) || (collidedAndMoving && stepTopIsOpen)) && overheadIsOpen) {
      lastJumpTime = now;
      bot.setControlState('jump', true);
      setTimeout(() => {
        if (bot && bot.entity) {
          bot.setControlState('jump', false);
        }
      }, 220);
    }
  });

  // ── Progressive Multi-Tier Anti-Stuck Watchdog ────────────────
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

        if (dist < 0.08) {
          stuckCounter++;

          const inWater = bot.entity.isInWater || (bot.blockAt(bot.entity.position)?.name === 'water');

          if (stuckCounter === 2) {
            // Tier 1 (~1.0s): Micro-hop to clear carpets, trapdoors, or slight steps
            if (bot.entity.onGround || inWater) {
              bot.setControlState('jump', true);
              setTimeout(() => { if (bot?.entity) bot.setControlState('jump', false); }, 200);
            }
          } else if (stuckCounter === 4) {
            // Tier 2 (~2.0s): Micro-strafe wiggle to unclip from corners/fences
            const strafeDir = (stuckCounter % 4 === 0) ? 'left' : 'right';
            bot.setControlState(strafeDir, true);
            setTimeout(() => {
              if (bot?.entity) bot.setControlState(strafeDir, false);
            }, 180);
          } else if (stuckCounter === 6) {
            // Tier 3 (~3.0s): Proactive door/gate/trapdoor interaction
            const yaw = bot.entity.yaw;
            const frontDx = -Math.sin(yaw);
            const frontDz = -Math.cos(yaw);
            const scanOffsets = [
              currentPos.offset(0, 0, 0),
              currentPos.offset(0, 1, 0),
              currentPos.offset(frontDx, 0, frontDz),
              currentPos.offset(frontDx, 1, frontDz)
            ];

            for (const offset of scanOffsets) {
              const b = bot.blockAt(offset);
              if (b && (b.name.includes('door') || b.name.includes('gate') || b.name.includes('trapdoor'))) {
                try { bot.activateBlock(b).catch(() => {}); } catch (e) {}
                break;
              }
            }
            bot.setControlState('jump', true);
            setTimeout(() => { if (bot?.entity) bot.setControlState('jump', false); }, 220);
          } else if (stuckCounter === 8) {
            // Tier 4 (~4.0s): Backward nudge + non-destructive goal re-pathing
            console.log('[Zoltraak Nav] Path obstructed — nudging back and recalculating route...');
            bot.setControlState('back', true);
            setTimeout(() => {
              if (bot?.entity) {
                bot.setControlState('back', false);
                const activeGoal = bot.pathfinder?.goal;
                if (activeGoal && bot.pathfinder) {
                  // Re-path from new stance without rejecting promises or stopping pathfinder
                  bot.pathfinder.setGoal(activeGoal, true);
                }
              }
            }, 250);
          } else if (stuckCounter >= 12) {
            // Tier 5 (~6.0s): Persistent hard-stuck fail-safe
            console.log('[Zoltraak Nav] Obstacle impassable after recovery attempts. Resetting pathfinder state cleanly.');
            bot.clearControlStates();
            try {
              bot.pathfinder.stop();
            } catch (e) {}
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
// Unified Follow Engine (Follow & Guard Modes)
// ============================================================
function startFollow(ctx, targetPlayer, mode = 'FOLLOW') {
  stopFollow(); // Clear any existing follow interval

  const { bot, config, state } = ctx;
  const followDist = config.navigation?.followDistance || 2;
  const sprintThreshold = 6;

  followInterval = setInterval(() => {
    if (!bot || !bot.entity || !targetPlayer || !targetPlayer.isValid) {
      stopFollow();
      return;
    }

    // Stop if the bot's state changed away from the expected follow mode
    if (state && state.currentState !== mode) {
      stopFollow();
      return;
    }

    const dist = bot.entity.position.distanceTo(targetPlayer.position);

    // Distance-adaptive sprinting (only sprint if hunger allows)
    const canSprint = bot.food === undefined || bot.food > 6;
    if (dist > sprintThreshold && canSprint) {
      bot.setControlState('sprint', true);
    } else if (dist <= followDist + 1.2) {
      bot.setControlState('sprint', false);
    }

    // Refresh goal to dynamically adjust to target's movement
    bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer, followDist), true);

    // Teleport / extreme distance failsafe
    if (dist > 64) {
      console.log(`[Zoltraak ${mode}] Target player too far (${Math.round(dist)}m) — holding position.`);
      bot.pathfinder.setGoal(null);
      bot.clearControlStates();
    }
  }, 600);
}

function stopFollow() {
  if (followInterval) {
    clearInterval(followInterval);
    followInterval = null;
  }
  if (guardFollowInterval) {
    clearInterval(guardFollowInterval);
    guardFollowInterval = null;
  }
}

function startGuardFollow(ctx, targetPlayer) {
  return startFollow(ctx, targetPlayer, 'GUARD');
}

function stopGuardFollow() {
  return stopFollow();
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
  startFollow,
  stopFollow,
  startGuardFollow,
  stopGuardFollow,
  performLifeLikeRoaming
};

