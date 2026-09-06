// Zoltraak Social & Human Interaction Module
// Handles player crouching/shift greetings, eye contact tracking, and gestures

const playerTracker = new Map(); // username -> { lastSneak, shifts, sneakStartTime, lastReplyTime }

function waitTicks(bot, count = 1) {
  if (typeof bot?.waitForTicks === 'function') {
    return Promise.race([
      bot.waitForTicks(count),
      new Promise(res => setTimeout(res, count * 50 + 100))
    ]);
  }
  return new Promise(res => setTimeout(res, count * 50));
}

function isPlayerSneaking(entity) {
  if (!entity || !entity.metadata) return false;

  const meta = entity.metadata;

  // 1. Check shared_flags (metadata index 0) bit 1 (0x02)
  const flags = meta[0];
  if (typeof flags === 'number' && (flags & 0x02) !== 0) {
    return true;
  }
  if (flags && typeof flags.value === 'number' && (flags.value & 0x02) !== 0) {
    return true;
  }

  // 2. Check pose (metadata index 6): 5 is CROUCHING / SNEAKING
  const pose = meta[6];
  if (pose === 5 || pose === 'crouching' || pose === 'sneaking') {
    return true;
  }
  if (pose && (pose.value === 5 || pose.value === 'crouching' || pose.value === 'sneaking')) {
    return true;
  }

  // 3. Scan metadata array if formatted as [{ key, value }]
  if (Array.isArray(meta)) {
    for (let i = 0; i < meta.length; i++) {
      const item = meta[i];
      if (item && typeof item === 'object') {
        if (item.key === 0 && typeof item.value === 'number' && (item.value & 0x02) !== 0) {
          return true;
        }
        if (item.key === 6 && (item.value === 5 || item.value === 'crouching' || item.value === 'sneaking')) {
          return true;
        }
      }
    }
  }

  // 4. Hitbox & eye height check
  if (typeof entity.height === 'number' && entity.height > 0 && entity.height < 1.65) {
    return true;
  }
  if (typeof entity.eyeHeight === 'number' && entity.eyeHeight > 0 && entity.eyeHeight < 1.45) {
    return true;
  }

  return false;
}

function isPlayerFacingBot(playerEntity, botEntity) {
  if (!playerEntity || !playerEntity.position || !botEntity || !botEntity.position) return true;
  const dx = botEntity.position.x - playerEntity.position.x;
  const dz = botEntity.position.z - playerEntity.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.2) return true; // Very close, direction doesn't matter

  const pyaw = playerEntity.yaw || 0;
  const pDirX = -Math.sin(pyaw);
  const pDirZ = -Math.cos(pyaw);

  const toBotX = dx / dist;
  const toBotZ = dz / dist;

  const dot = pDirX * toBotX + pDirZ * toBotZ;
  return dot > 0.15; // Within ~81 degrees of facing Zoltraak
}

function checkSinglePlayerShift(ctx, playerEntity) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || !playerEntity || !playerEntity.position) return;
  if (state.isReplyingShift || state.currentState === 'COMBAT') return;

  const username = playerEntity.username;
  if (!username || username === bot.username) return;

  const now = Date.now();
  if (!playerTracker.has(username)) {
    playerTracker.set(username, {
      lastSneak: false,
      shifts: [],
      sneakStartTime: 0,
      lastReplyTime: 0
    });
  }

  const tracker = playerTracker.get(username);

  // 1. Cooldown check: don't reply to same player more than once every 3.5s
  if (now - tracker.lastReplyTime < 3500) {
    return;
  }

  // 2. Distance check: within 8.5 blocks
  const dist = bot.entity.position.distanceTo(playerEntity.position);
  if (dist > 8.5) {
    tracker.lastSneak = false;
    tracker.sneakStartTime = 0;
    return;
  }

  // 3. Sneak status
  const isSneaking = isPlayerSneaking(playerEntity);
  const facing = isPlayerFacingBot(playerEntity, bot.entity);

  // Case A: Transition from standing to sneaking
  if (isSneaking && !tracker.lastSneak) {
    tracker.sneakStartTime = now;
    tracker.shifts.push(now);
    tracker.shifts = tracker.shifts.filter(t => now - t <= 2500);

    // If double-crouch detected while facing Zoltraak
    if (tracker.shifts.length >= 2 && facing) {
      triggerGreeting(ctx, playerEntity, tracker, now, 'double-shift');
      return;
    }
  }

  // Case B: Holding crouch while facing Zoltraak (prolonged bow greeting)
  if (isSneaking && tracker.lastSneak && facing && tracker.sneakStartTime > 0) {
    const holdDuration = now - tracker.sneakStartTime;
    if (holdDuration >= 350 && tracker.shifts.length >= 1) {
      triggerGreeting(ctx, playerEntity, tracker, now, 'held-shift');
      return;
    }
  }

  // Case C: Released crouch
  if (!isSneaking && tracker.lastSneak) {
    tracker.sneakStartTime = 0;
  }

  tracker.lastSneak = isSneaking;
}

function triggerGreeting(ctx, playerEntity, tracker, now, reason) {
  tracker.shifts = [];
  tracker.sneakStartTime = 0;
  tracker.lastSneak = true;
  tracker.lastReplyTime = now;
  executeShiftGreeting(ctx, playerEntity, reason);
}

function checkPlayerShiftGreetings(ctx) {
  const { bot } = ctx;
  if (!bot || !bot.entity) return;

  for (const name in bot.players) {
    if (name === bot.username) continue;
    const player = bot.players[name];
    if (player && player.entity) {
      checkSinglePlayerShift(ctx, player.entity);
    }
  }
}

async function executeShiftGreeting(ctx, targetPlayer, reason = 'crouch') {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || state.isReplyingShift) return;
  state.isReplyingShift = true;

  const playerName = targetPlayer.username || 'friend';
  console.log(`[Zoltraak Social] Crouch greeting detected from ${playerName} (${reason}). Returning shift greeting!`);
  if (ctx.addPerceptionLog) {
    ctx.addPerceptionLog('SIGHT', `Player ${playerName} crouched in greeting - returning shift bow`);
  }

  // Temporarily pause pathfinding movement so pathfinder doesn't reset sneak
  const pathfinderActive = bot.pathfinder && bot.pathfinder.isMoving();
  if (pathfinderActive) {
    try {
      bot.pathfinder.stop();
    } catch (e) {}
  }

  try {
    // 1. Look at player's eye level
    const targetHeadPos = targetPlayer.position.offset(0, (targetPlayer.height || 1.8) * 0.85, 0);
    bot.lookAt(targetHeadPos, true);

    // 2. First crouch (~150ms)
    bot.setControlState('sneak', true);
    await waitTicks(bot, 3);

    // 3. Stand up briefly (~100ms)
    bot.setControlState('sneak', false);
    await waitTicks(bot, 2);

    // 4. Second crouch (~150ms)
    bot.setControlState('sneak', true);
    await waitTicks(bot, 3);

    // 5. Stand up & friendly arm swing
    bot.setControlState('sneak', false);
    bot.swingArm();
  } catch (err) {
    console.log('[Zoltraak Social] Shift greeting notice:', err.message);
  } finally {
    // Ensure sneak is released
    try { bot.setControlState('sneak', false); } catch (e) {}
    setTimeout(() => {
      state.isReplyingShift = false;
    }, 1500);
  }
}

function lookAtNearbyPlayers(ctx) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || state.isReplyingShift || state.currentState === 'COMBAT') return;

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

function setupSocialListeners(ctx) {
  const { bot } = ctx;
  if (!bot) return;

  // Event-driven metadata updates: fires immediately on crouch/sneak packets
  bot.on('entityUpdate', (entity) => {
    if (entity && entity.type === 'player' && entity.username !== bot.username) {
      checkSinglePlayerShift(ctx, entity);
    }
  });

  console.log('[Zoltraak Social] Event-driven crouch greeting listener registered.');
}

module.exports = {
  checkPlayerShiftGreetings,
  executeShiftGreeting,
  lookAtNearbyPlayers,
  setupSocialListeners,
  isPlayerSneaking
};
