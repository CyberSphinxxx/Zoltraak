const { goals } = require('mineflayer-pathfinder');

const HOSTILE_MOBS = [
  'zombie', 'skeleton', 'spider', 'cave_spider', 'creeper',
  'witch', 'drowned', 'husk', 'stray', 'enderman', 'phantom',
  'pillager', 'vindicator', 'ravager', 'evoker', 'piglin_brute', 'warden'
];

const PROJECTILE_NAMES = [
  'arrow', 'spectral_arrow', 'trident', 'small_fireball', 'fireball', 'shulker_bullet', 'wind_charge'
];

let isShieldActive = false;

async function equipBestWeapon(ctx) {
  const { bot } = ctx;
  if (!bot || !bot.inventory) return;

  const swords = bot.inventory.items().filter(item => item.name.includes('sword') || item.name.includes('axe'));
  if (swords.length > 0) {
    swords.sort((a, b) => {
      const score = name => (name.includes('netherite') ? 4 : name.includes('diamond') ? 3 : name.includes('iron') ? 2 : 1);
      return score(b.name) - score(a.name);
    });
    try {
      await bot.equip(swords[0], 'hand');
    } catch (e) {}
  }
}

async function equipRangedWeapon(ctx) {
  const { bot } = ctx;
  if (!bot || !bot.inventory) return false;

  const ranged = bot.inventory.items().find(i => i.name === 'crossbow' || i.name === 'bow');
  const arrows = bot.inventory.items().find(i => i.name.includes('arrow'));

  if (ranged && arrows) {
    try {
      await bot.equip(ranged, 'hand');
      return true;
    } catch (e) {}
  }
  return false;
}

async function raiseShield(bot, durationMs = 1200) {
  if (!bot || !bot.inventory || isShieldActive) return;

  const offhand = bot.inventory.slots[45];
  const shield = bot.inventory.items().find(i => i.name === 'shield');

  if (!offhand || offhand.name !== 'shield') {
    if (shield) {
      try {
        await bot.equip(shield, 'off-hand');
      } catch (e) {}
    } else {
      return;
    }
  }

  isShieldActive = true;
  bot.activateItem(true);

  setTimeout(() => {
    if (bot && isShieldActive) {
      bot.deactivateItem();
      isShieldActive = false;
    }
  }, durationMs);
}

function detectAndParryProjectiles(ctx) {
  const { bot, config } = ctx;
  if (!bot || !bot.entities || isShieldActive) return;

  const shieldParryEnabled = config?.combat?.shieldParry !== false;
  if (!shieldParryEnabled) return;

  const parryDist = config?.combat?.shieldParryDistance || 10;

  for (const id in bot.entities) {
    const ent = bot.entities[id];
    if (ent && PROJECTILE_NAMES.includes(ent.name) && ent.position) {
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist < parryDist) {
        // Look towards the projectile and raise shield
        bot.lookAt(ent.position);
        raiseShield(bot, 1000);
        return;
      }
    }
  }
}

function scanAndDefendAgainstMobs(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity || !bot.entities) return;

  // 1. Creeper tactical retreat & blast deflection
  const creeperAvoid = config?.combat?.creeperAvoidance !== false;
  if (creeperAvoid) {
    for (const id in bot.entities) {
      const entity = bot.entities[id];
      if (entity && entity.name === 'creeper') {
        const dist = bot.entity.position.distanceTo(entity.position);
        if (dist < 6) {
          bot.pathfinder.setGoal(null);
          bot.pvp.stop();
          bot.lookAt(entity.position.offset(0, 1, 0));
          raiseShield(bot, 1500);
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
  }

  // 2. Shield parry against skeleton arrows
  if (state.currentState === 'COMBAT' && state.combatTarget && state.combatTarget.isValid) {
    if (state.combatTarget.name === 'skeleton') {
      raiseShield(bot, 800);
    }
  }

  // Target Priority Filter
  const priority = config?.combat?.targetPriority || 'hostiles_only';
  if (priority === 'player_defense' && !state.combatTarget) {
    // Only engage if already retaliating or in bodyguard mode
    return;
  }

  // 3. Scan for nearest target mob
  let nearestHostile = null;
  let nearestDist = 10;

  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (!entity || !entity.name) continue;

    const isHostile = HOSTILE_MOBS.includes(entity.name.toLowerCase());
    const isTarget = priority === 'all_mobs' ? (isHostile || (entity.type === 'mob' && entity.name !== 'armor_stand')) : isHostile;

    if (isTarget) {
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

async function performArcherCombat(ctx) {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || state.currentState !== 'ARCHER') return;

  const hasRanged = await equipRangedWeapon(ctx);
  if (!hasRanged) {
    console.log('[Zoltraak Archer] Missing bow or arrows. Defaulting to melee defense.');
    state.currentState = 'COMBAT';
    await equipBestWeapon(ctx);
    return;
  }

  // Find nearest hostile mob within 24 blocks
  let target = null;
  let minDist = 24;
  for (const id in bot.entities) {
    const ent = bot.entities[id];
    if (ent && ent.name && HOSTILE_MOBS.includes(ent.name.toLowerCase())) {
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist < minDist) {
        minDist = dist;
        target = ent;
      }
    }
  }

  if (!target) return;

  const dist = bot.entity.position.distanceTo(target.position);

  // Tactical kiting: back up if too close
  const kiteDist = ctx.config?.combat?.archerKiteDistance || 8;
  if (dist < kiteDist) {
    const awayVector = bot.entity.position.minus(target.position).normalize();
    const kiteGoal = bot.entity.position.plus(awayVector.scaled(4));
    bot.pathfinder.setGoal(new goals.GoalNear(kiteGoal.x, kiteGoal.y, kiteGoal.z, 1));
  } else {
    bot.pathfinder.setGoal(null);
  }

  // Aim with pitch elevation to account for arrow drop
  const aimPos = target.position.offset(0, target.height * 0.85 + (dist * 0.05), 0);
  await bot.lookAt(aimPos, true);

  // Draw bow and release
  bot.activateItem();
  setTimeout(async () => {
    if (bot && state.currentState === 'ARCHER') {
      if (target && target.isValid) {
        await bot.lookAt(target.position.offset(0, target.height * 0.85 + (dist * 0.05), 0), true);
      }
      bot.deactivateItem();
    }
  }, 1200);
}

module.exports = {
  HOSTILE_MOBS,
  PROJECTILE_NAMES,
  equipBestWeapon,
  equipRangedWeapon,
  raiseShield,
  detectAndParryProjectiles,
  scanAndDefendAgainstMobs,
  performBodyguardLogic,
  performArcherCombat
};
