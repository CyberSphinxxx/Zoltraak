const HOSTILE_MOBS = [
  'zombie', 'skeleton', 'spider', 'cave_spider', 'creeper',
  'witch', 'drowned', 'husk', 'stray', 'enderman', 'phantom'
];

async function equipBestWeapon(ctx) {
  const { bot } = ctx;
  if (!bot || !bot.inventory) return;

  const swords = bot.inventory.items().filter(item => item.name.includes('sword') || item.name.includes('axe'));
  if (swords.length > 0) {
    swords.sort((a, b) => {
      const score = name => (name.includes('netherite') ? 3 : name.includes('diamond') ? 2 : name.includes('iron') ? 1 : 0);
      return score(b.name) - score(a.name);
    });
    try {
      await bot.equip(swords[0], 'hand');
    } catch (e) {}
  }
}

function scanAndDefendAgainstMobs(ctx) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || !bot.entities) return;

  // 1. Creeper tactical retreat
  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (entity && entity.name === 'creeper') {
      const dist = bot.entity.position.distanceTo(entity.position);
      if (dist < 6) {
        bot.pathfinder.setGoal(null);
        bot.pvp.stop();
        bot.lookAt(entity.position.offset(0, 1, 0));
        bot.setControlState('sprint', true);
        bot.setControlState('back', true);
        setTimeout(() => {
          bot.setControlState('sprint', false);
          bot.setControlState('back', false);
        }, 1200);
        return;
      }
    }
  }

  // 2. Shield parry against skeleton arrows
  if (state.currentState === 'COMBAT' && state.combatTarget && state.combatTarget.isValid) {
    if (state.combatTarget.name === 'skeleton') {
      const offhand = bot.inventory.slots[45];
      if (offhand && offhand.name === 'shield') {
        bot.activateItem(true);
        setTimeout(() => {
          if (bot) bot.deactivateItem();
        }, 800);
      }
    }
    return;
  }

  // 3. Scan for nearest hostile mob
  let nearestHostile = null;
  let nearestDist = 10;

  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (!entity || !entity.name) continue;

    if (HOSTILE_MOBS.includes(entity.name.toLowerCase())) {
      const dist = bot.entity.position.distanceTo(entity.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestHostile = entity;
      }
    }
  }

  if (nearestHostile) {
    state.combatTarget = nearestHostile;
    const prev = state.currentState;
    state.currentState = 'COMBAT';

    equipBestWeapon(ctx).then(() => {
      bot.pvp.attack(nearestHostile);
    });

    const checkDead = setInterval(() => {
      if (!nearestHostile || !nearestHostile.isValid || nearestHostile.health <= 0) {
        clearInterval(checkDead);
        bot.pvp.stop();
        state.combatTarget = null;
        state.currentState = prev === 'COMBAT' ? 'ROAM' : prev;
      }
    }, 500);
  }
}

function performBodyguardLogic(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.players) return;

  const owner = bot.players[config.owner]?.entity;
  if (!owner) return;

  let threat = null;
  let threatDist = 8;

  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (!entity || !entity.name) continue;
    if (HOSTILE_MOBS.includes(entity.name.toLowerCase())) {
      const distToOwner = owner.position.distanceTo(entity.position);
      if (distToOwner < threatDist) {
        threatDist = distToOwner;
        threat = entity;
      }
    }
  }

  if (threat) {
    state.combatTarget = threat;
    state.currentState = 'COMBAT';
    console.log('[Zoltraak] Bodyguard intercepting threat to ' + config.owner + ': ' + threat.name);

    equipBestWeapon(ctx).then(() => {
      bot.pvp.attack(threat);
    });

    const checkDead = setInterval(() => {
      if (!threat || !threat.isValid || threat.health <= 0) {
        clearInterval(checkDead);
        bot.pvp.stop();
        state.combatTarget = null;
        state.currentState = 'GUARD';
      }
    }, 500);
    return;
  }

  // If owner is stationary, watch their back
  const ownerSpeed = owner.velocity ? Math.sqrt(owner.velocity.x * owner.velocity.x + owner.velocity.z * owner.velocity.z) : 0;
  if (ownerSpeed < 0.05 && !bot.pathfinder.isMoving()) {
    const awayYaw = (owner.yaw || 0) + Math.PI;
    bot.look(awayYaw, 0);
  }
}

module.exports = {
  HOSTILE_MOBS,
  equipBestWeapon,
  scanAndDefendAgainstMobs,
  performBodyguardLogic
};
