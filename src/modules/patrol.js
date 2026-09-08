const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');
const { HOSTILE_MOBS, equipBestWeapon } = require('./combat');

function generatePerimeterWaypoints(center, radius = 14) {
  if (!center) return [];
  const cx = Math.round(center.x);
  const cy = Math.round(center.y);
  const cz = Math.round(center.z);

  return [
    new Vec3(cx + radius, cy, cz + radius),
    new Vec3(cx + radius, cy, cz - radius),
    new Vec3(cx - radius, cy, cz - radius),
    new Vec3(cx - radius, cy, cz + radius)
  ];
}

async function performPatrolStep(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity || state.currentState !== 'PATROL') return;

  // 1. Sentry Radar: Scan for nearby hostile threats
  let detectedThreat = null;
  let minThreatDist = 14;

  for (const id in bot.entities) {
    const ent = bot.entities[id];
    if (ent && ent.name && HOSTILE_MOBS.includes(ent.name.toLowerCase())) {
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist < minThreatDist) {
        minThreatDist = dist;
        detectedThreat = ent;
      }
    }
  }

  if (detectedThreat) {
    console.log(`[Zoltraak Patrol] Threat detected at perimeter: ${detectedThreat.name}`);
    ctx.sendReply(`[Sentry Alert] Hostile ${detectedThreat.name} detected near perimeter! Intercepting...`, true);
    state.combatTarget = detectedThreat;
    state.currentState = 'COMBAT';

    await equipBestWeapon(ctx);
    bot.pvp.attack(detectedThreat);

    const checkDead = setInterval(() => {
      if (!detectedThreat || !detectedThreat.isValid || detectedThreat.health <= 0) {
        clearInterval(checkDead);
        bot.pvp.stop();
        state.combatTarget = null;
        state.currentState = 'PATROL';
        console.log('[Zoltraak Patrol] Threat neutralized. Resuming sentry perimeter.');
      }
    }, 500);
    return;
  }

  // 2. Waypoint progression
  if (bot.pathfinder.isMoving()) return;

  if (!state.patrolWaypoints || state.patrolWaypoints.length === 0) {
    const anchor = state.homePos || bot.entity.position;
    state.patrolWaypoints = generatePerimeterWaypoints(anchor, 14);
    state.currentPatrolIndex = 0;
  }

  const currentWp = state.patrolWaypoints[state.currentPatrolIndex];
  if (!currentWp) return;

  const dx = bot.entity.position.x - currentWp.x;
  const dz = bot.entity.position.z - currentWp.z;
  const horizDist = Math.hypot(dx, dz);

  if (horizDist <= 3.0) {
    // Advance to next waypoint
    state.currentPatrolIndex = (state.currentPatrolIndex + 1) % state.patrolWaypoints.length;
    const nextWp = state.patrolWaypoints[state.currentPatrolIndex];
    bot.pathfinder.setGoal(new goals.GoalNearXZ(nextWp.x, nextWp.z, 2.0));
  } else {
    bot.pathfinder.setGoal(new goals.GoalNearXZ(currentWp.x, currentWp.z, 2.0));
  }
}

function addPatrolWaypoint(ctx, pos) {
  const { state } = ctx;
  if (!state.patrolWaypoints) state.patrolWaypoints = [];
  const pt = pos.floored();
  state.patrolWaypoints.push(pt);
  return state.patrolWaypoints.length;
}

function clearPatrolWaypoints(ctx) {
  const { state } = ctx;
  state.patrolWaypoints = [];
  state.currentPatrolIndex = 0;
}

module.exports = {
  generatePerimeterWaypoints,
  performPatrolStep,
  addPatrolWaypoint,
  clearPatrolWaypoints
};
