const { goals } = require('mineflayer-pathfinder');

const HOSTILE_MOBS = [
  'zombie', 'skeleton', 'spider', 'cave_spider', 'creeper',
  'witch', 'drowned', 'husk', 'stray', 'enderman', 'phantom',
  'pillager', 'vindicator', 'ravager', 'evoker', 'piglin_brute', 'warden'
];

// Neutral mobs that only become hostile when provoked —
// we track their IDs reactively via entityHurt events.
const NEUTRAL_MOBS = [
  'zombie_piglin', 'zombified_piglin', 'piglin', 'wolf', 'bee', 'enderman'
];

const PROJECTILE_NAMES = [
  'arrow', 'spectral_arrow', 'trident', 'small_fireball', 'fireball', 'shulker_bullet', 'wind_charge'
];

// Blocks that should NOT occlude line-of-sight
const TRANSPARENT_BLOCKS = new Set([
  'air', 'cave_air', 'void_air', 'water', 'lava',
  'glass', 'glass_pane', 'iron_bars',
  'oak_leaves', 'birch_leaves', 'spruce_leaves', 'jungle_leaves',
  'acacia_leaves', 'dark_oak_leaves', 'azalea_leaves', 'flowering_azalea_leaves',
  'mangrove_leaves', 'cherry_leaves',
  'grass', 'tall_grass', 'fern', 'large_fern', 'dead_bush',
  'wheat', 'carrots', 'potatoes', 'beetroots',
  'torch', 'wall_torch', 'soul_torch', 'redstone_torch',
  'lantern', 'soul_lantern', 'vine', 'ladder',
  'snow', 'string', 'cobweb'
]);

let isShieldActive = false;

// Aggressor memory: entity IDs that have attacked the owner or bot recently.
// Maps entity.id -> timestamp of last aggression. TTL: 20 seconds.
const aggressors = new Map();
const AGGRESSOR_TTL = 20000;

// ============================================================
// Line-of-Sight Check
// ============================================================
// Multi-point raycast: checks feet, center, and head of entity.
// Returns true if ANY of the 3 rays reach the target unobstructed.
function isEntityVisible(bot, entity) {
  if (!bot.world || !entity.position) return true; // Fallback: assume visible

  const eyePos = bot.entity.position.offset(0, bot.entity.height * 0.9, 0);
  const eHeight = entity.height || 1.8;

  const checkPoints = [
    entity.position.offset(0, 0.1, 0),              // Feet
    entity.position.offset(0, eHeight / 2, 0),      // Center
    entity.position.offset(0, eHeight * 0.85, 0)    // Head
  ];

  for (const target of checkPoints) {
    const dir = target.minus(eyePos).normalize();
    const dist = eyePos.distanceTo(target);

    let blocked = false;
    try {
      const hit = bot.world.raycast(eyePos, dir, dist + 0.5, (block) => {
        if (!block || !block.name) return false;
        return !TRANSPARENT_BLOCKS.has(block.name.replace('minecraft:', ''));
      });

      // If no block was hit, or hit block is past the target, line is clear
      if (hit && eyePos.distanceTo(hit.position) < dist - 0.5) {
        blocked = true;
      }
    } catch (e) {
      // If raycast fails, assume visible to avoid false negatives
      return true;
    }

    if (!blocked) return true; // At least one clear ray found
  }

  return false; // All rays blocked
}

// ============================================================
// Aggressor Memory — register entities that attack
// ============================================================
function registerAggressor(entityId) {
  aggressors.set(entityId, Date.now());
}

function isAggressor(entityId) {
  const t = aggressors.get(entityId);
  if (!t) return false;
  if (Date.now() - t > AGGRESSOR_TTL) {
    aggressors.delete(entityId);
    return false;
  }
  return true;
}

function cleanupAggressors() {
  const now = Date.now();
  for (const [id, t] of aggressors.entries()) {
    if (now - t > AGGRESSOR_TTL) aggressors.delete(id);
  }
}

// ============================================================
// Weapon Equipment
// ============================================================
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

// ============================================================
// Shield Management
// ============================================================
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
        bot.lookAt(ent.position);
        raiseShield(bot, 1000);
        return;
      }
    }
  }
}

// ============================================================
// Helper: run a combat engagement with cleanup
// ============================================================
function engageTarget(ctx, target, returnStateTo) {
  const { bot, state } = ctx;
  const prev = returnStateTo || state.currentState;
  state.combatTarget = target;
  state.currentState = 'COMBAT';

  equipBestWeapon(ctx).then(() => {
    if (target && target.isValid) bot.pvp.attack(target);
  });

  const checkDead = setInterval(() => {
    if (!target || !target.isValid || target.health <= 0) {
      clearInterval(checkDead);
      bot.pvp.stop();
      state.combatTarget = null;
      state.currentState = prev === 'COMBAT' ? 'ROAM' : prev;
    }
  }, 400);
}

// ============================================================
// Auto-Defense: Scan for nearby hostiles with LOS check
// ============================================================
function scanAndDefendAgainstMobs(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity || !bot.entities) return;

  // 1. Creeper tactical retreat
  const creeperAvoid = config?.combat?.creeperAvoidance !== false;
  if (creeperAvoid) {
    for (const id in bot.entities) {
      const entity = bot.entities[id];
      if (entity && entity.name === 'creeper') {
        const dist = bot.entity.position.distanceTo(entity.position);
        if (dist < 6 && isEntityVisible(bot, entity)) {
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

  // 2. Shield parry against skeletons during combat
  if (state.currentState === 'COMBAT' && state.combatTarget?.isValid) {
    if (state.combatTarget.name === 'skeleton') {
      raiseShield(bot, 800);
    }
  }

  const priority = config?.combat?.targetPriority || 'hostiles_only';
  if (priority === 'player_defense' && !state.combatTarget) return;

  // 3. Scan nearest visible hostile within 12m
  let nearestHostile = null;
  let nearestDist = 12;

  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (!entity || !entity.name) continue;

    const isHostile = HOSTILE_MOBS.includes(entity.name.toLowerCase());
    const isTarget = priority === 'all_mobs'
      ? (isHostile || (entity.type === 'mob' && entity.name !== 'armor_stand'))
      : isHostile;

    if (isTarget) {
      const dist = bot.entity.position.distanceTo(entity.position);
      if (dist < nearestDist && isEntityVisible(bot, entity)) {
        nearestDist = dist;
        nearestHostile = entity;
      }
    }
  }

  if (nearestHostile && state.currentState !== 'COMBAT') {
    engageTarget(ctx, nearestHostile, 'ROAM');
  }

  // Cleanup old aggressor entries periodically
  cleanupAggressors();
}

// ============================================================
// Bodyguard Logic (GUARD mode)
// ============================================================
// Engages: (a) always-hostile mobs near owner,
//          (b) reactive neutral mobs (zombie piglins etc.)
//             that have been recorded as aggressors via entityHurt
function performBodyguardLogic(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.players) return;

  const owner = bot.players[config.owner]?.entity;
  if (!owner) return;

  // If already fighting, let the current combat resolve
  if (state.currentState === 'COMBAT') return;

  let threat = null;
  let threatDist = 16; // Extended guard radius (was 8)

  for (const id in bot.entities) {
    const entity = bot.entities[id];
    if (!entity || !entity.name) continue;

    const name = entity.name.toLowerCase();
    const isAlwaysHostile = HOSTILE_MOBS.includes(name);
    // Neutral mob is a threat ONLY if it has previously attacked (reactive)
    const isReactiveNeutral = NEUTRAL_MOBS.includes(name) && isAggressor(entity.id);

    if (isAlwaysHostile || isReactiveNeutral) {
      const distToOwner = owner.position.distanceTo(entity.position);
      const distToBot = bot.entity.position.distanceTo(entity.position);
      // Prioritize by proximity to owner, but also require it to be in a reasonable range
      const effectiveDist = Math.min(distToOwner, distToBot);
      if (effectiveDist < threatDist && isEntityVisible(bot, entity)) {
        threatDist = effectiveDist;
        threat = entity;
      }
    }
  }

  if (threat) {
    console.log(`[Zoltraak Guard] Intercepting threat to ${config.owner}: ${threat.name} (dist: ${threatDist.toFixed(1)}m)`);
    engageTarget(ctx, threat, 'GUARD');
    return;
  }

  // No threat: watch owner's back by facing away from them
  const ownerSpeed = owner.velocity
    ? Math.sqrt(owner.velocity.x ** 2 + owner.velocity.z ** 2)
    : 0;
  if (ownerSpeed < 0.05 && bot.pathfinder && !bot.pathfinder.isMoving()) {
    const awayYaw = (owner.yaw || 0) + Math.PI;
    bot.look(awayYaw, 0);
  }
}

// ============================================================
// Setup aggressor event listener (call once on bot init)
// ============================================================
function setupAggressorTracking(ctx) {
  const { bot, config } = ctx;
  if (!bot) return;

  // Track any entity that hurts the bot or the owner
  bot.on('entityHurt', (entity) => {
    if (!entity) return;
    // We can't easily get "who caused the damage" from entityHurt alone,
    // so we use a proximity heuristic: any nearby hostile/neutral mob
    // when the player/bot takes damage is flagged as a potential aggressor.
  });

  // When the bot itself takes damage, flag nearby neutral mobs
  bot.on('health', () => {
    if (!bot.entity) return;
    for (const id in bot.entities) {
      const ent = bot.entities[id];
      if (!ent || !ent.name) continue;
      if (!NEUTRAL_MOBS.includes(ent.name.toLowerCase())) continue;
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist < 10 && isEntityVisible(bot, ent)) {
        registerAggressor(ent.id);
        console.log(`[Zoltraak Combat] Flagged ${ent.name} as aggressor (reactive)`);
      }
    }
  });

  // Track owner taking damage: flag nearby neutrals
  bot.on('entityHurt', (entity) => {
    const owner = bot.players?.[config.owner]?.entity;
    if (!owner || !entity || !bot.entity) return;

    const name = (entity.name || '').toLowerCase();

    // If a neutral mob near the owner took a hit action (entity moved toward owner)
    if (NEUTRAL_MOBS.includes(name)) {
      const distToOwner = owner.position.distanceTo(entity.position);
      if (distToOwner < 12) {
        registerAggressor(entity.id);
        console.log(`[Zoltraak Guard] Reactive: ${entity.name} flagged as aggressor near ${config.owner}`);
      }
    }
  });
}

// ============================================================
// Archer Combat Mode
// ============================================================
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

  let target = null;
  let minDist = 24;
  for (const id in bot.entities) {
    const ent = bot.entities[id];
    if (ent && ent.name && HOSTILE_MOBS.includes(ent.name.toLowerCase())) {
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist < minDist && isEntityVisible(bot, ent)) {
        minDist = dist;
        target = ent;
      }
    }
  }

  if (!target) return;

  const dist = bot.entity.position.distanceTo(target.position);
  const kiteDist = ctx.config?.combat?.archerKiteDistance || 8;

  if (dist < kiteDist) {
    const awayVector = bot.entity.position.minus(target.position).normalize();
    const kiteGoal = bot.entity.position.plus(awayVector.scaled(4));
    bot.pathfinder.setGoal(new goals.GoalNear(kiteGoal.x, kiteGoal.y, kiteGoal.z, 1));
  } else {
    bot.pathfinder.setGoal(null);
  }

  const aimPos = target.position.offset(0, target.height * 0.85 + (dist * 0.05), 0);
  await bot.lookAt(aimPos, true);

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
  NEUTRAL_MOBS,
  PROJECTILE_NAMES,
  equipBestWeapon,
  equipRangedWeapon,
  raiseShield,
  detectAndParryProjectiles,
  scanAndDefendAgainstMobs,
  performBodyguardLogic,
  performArcherCombat,
  setupAggressorTracking,
  registerAggressor,
  isEntityVisible
};
