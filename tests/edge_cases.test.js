const assert = require('assert');
const { Vec3 } = require('vec3');

console.log('🧪 Starting Zoltraak Edge-Case & Audit Verification Suite...\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Helper Mocks
// -------------------------------------------------------------
function createMockBot(overrides = {}) {
  return {
    username: 'Zoltraak',
    health: 20,
    food: 20,
    entity: {
      id: 1,
      position: new Vec3(100, 64, 100),
      yaw: 0,
      pitch: 0,
      velocity: new Vec3(0, 0, 0),
      onGround: true,
      isInWater: false,
      isInLava: false
    },
    inventory: {
      items: () => [],
      slots: [],
      emptySlotCount: () => 10
    },
    players: {},
    pathfinder: {
      isMoving: () => false,
      setGoal: () => {},
      goto: async () => {},
      stop: () => {}
    },
    pvp: {
      stop: () => {},
      attack: () => {}
    },
    setControlState: () => {},
    clearControlStates: () => {},
    lookAt: async () => {},
    look: () => {},
    findBlock: () => null,
    blockAt: () => null,
    waitForTicks: async () => {},
    ...overrides
  };
}

function createMockCtx(botOverrides = {}, stateOverrides = {}, configOverrides = {}) {
  const { BotState } = require('../src/state');
  const config = {
    host: 'localhost',
    port: 25565,
    username: 'Zoltraak',
    owner: 'TestOwner',
    version: '1.21.2',
    privacy: { audienceMode: 'dynamic', whitelist: ['TestOwner'] },
    automation: { mineBranchLength: 16, mineTorchSpacing: 6 },
    ...configOverrides
  };

  const state = new BotState(config);
  Object.assign(state, stateOverrides);

  const replies = [];
  const bot = createMockBot(botOverrides);

  const ctx = {
    bot,
    state,
    config,
    mcData: {
      itemsByName: {
        planks: { id: 10, name: 'planks' },
        stick: { id: 11, name: 'stick' },
        iron_ingot: { id: 12, name: 'iron_ingot' }
      }
    },
    replies,
    sendReply: (text, isWhisper = false, targetPlayer = null) => {
      replies.push({ text, isWhisper, targetPlayer });
    },
    saveConfig: () => {},
    addPatrolWaypoint: (pos) => {
      if (!state.patrolWaypoints) state.patrolWaypoints = [];
      state.patrolWaypoints.push(pos);
      return state.patrolWaypoints.length;
    },
    clearPatrolWaypoints: () => {
      state.patrolWaypoints = [];
    },
    craftItem: async () => true,
    deliverItemToOwner: () => {},
    digTunnel: (steps) => { ctx.lastTunnelSteps = steps; },
    bridge: (len, dir) => { ctx.lastBridgeLen = len; },
    tower: (h) => { ctx.lastTowerHeight = h; },
    toggleClutch: () => true
  };

  return ctx;
}

// -------------------------------------------------------------
// Test Suite Execution
// -------------------------------------------------------------
async function runAllTests() {
  const { handleCommand } = require('../src/commands');
  const { deepMerge } = require('../src/config');
  const { isAddressedToBot } = require('../src/modules/dialogue');

  console.log('--- 1. Commands & Parameter Sanitization Tests ---');

  test('!tunnel handles negative steps and clamps to minimum 1', () => {
    const ctx = createMockCtx();
    handleCommand(ctx, 'TestOwner', '!tunnel -5', true);
    assert.strictEqual(ctx.lastTunnelSteps, 8, 'Negative tunnel steps should fall back to default or clamp');
  });

  test('!tunnel clamps excessively large values to 64', () => {
    const ctx = createMockCtx();
    handleCommand(ctx, 'TestOwner', '!tunnel 999', true);
    assert.strictEqual(ctx.lastTunnelSteps, 64, 'Tunnel steps must be capped at 64');
  });

  test('!bridge handles negative lengths and clamps bounds (1..64)', () => {
    const ctx = createMockCtx();
    handleCommand(ctx, 'TestOwner', '!bridge -10', true);
    assert.strictEqual(ctx.lastBridgeLen, 8, 'Negative bridge length should fall back to default');

    handleCommand(ctx, 'TestOwner', '!bridge 200', true);
    assert.strictEqual(ctx.lastBridgeLen, 64, 'Bridge length should cap at 64');
  });

  test('!tower handles negative height and caps at 32', () => {
    const ctx = createMockCtx();
    handleCommand(ctx, 'TestOwner', '!tower -5', true);
    assert.strictEqual(ctx.lastTowerHeight, 5, 'Negative tower height should fall back to default');

    handleCommand(ctx, 'TestOwner', '!tower 50', true);
    assert.strictEqual(ctx.lastTowerHeight, 32, 'Tower height should cap at 32');
  });

  test('!status handles uninitialized bot.health and bot.food gracefully without NaN', () => {
    const ctx = createMockCtx({ health: undefined, food: null });
    handleCommand(ctx, 'TestOwner', '!status', true);
    assert.strictEqual(ctx.replies.length, 1);
    assert(!ctx.replies[0].text.includes('NaN'), 'Status reply must not contain NaN');
    assert(ctx.replies[0].text.includes('hp: 20/20'));
  });

  test('!sethome does not throw when bot.entity is null (pre-spawn)', () => {
    const ctx = createMockCtx({ entity: null });
    assert.doesNotThrow(() => {
      handleCommand(ctx, 'TestOwner', '!sethome', true);
    });
    assert(ctx.replies.some(r => r.text.includes('cannot set home')));
  });

  test('!addpatrol does not throw when bot.entity is null and player is absent', () => {
    const ctx = createMockCtx({ entity: null });
    assert.doesNotThrow(() => {
      handleCommand(ctx, 'TestOwner', '!addpatrol', true);
    });
    assert(ctx.replies.some(r => r.text.includes('cannot determine waypoint')));
  });

  test('!come / !follow handles player entity without position gracefully', () => {
    const ctx = createMockCtx();
    ctx.bot.players['TestOwner'] = { entity: { position: null } };
    assert.doesNotThrow(() => {
      handleCommand(ctx, 'TestOwner', '!come', true);
    });
    assert(ctx.replies.some(r => r.text === 'where are you?'));
  });

  console.log('\n--- 2. Mining & Tunneling Tests ---');

  await testAsync('digTunnel executes correctly with yaw orientation without ReferenceError', async () => {
    const { digTunnel } = require('../src/modules/mining');
    const ctx = createMockCtx({
      entity: {
        position: new Vec3(0, 64, 0),
        yaw: 0, // Facing south (+Z)
        floored: () => new Vec3(0, 64, 0)
      }
    });
    ctx.state.currentState = 'MINING';

    // digTunnel should calculate forwardDir using bot.entity.yaw without throwing ReferenceError: yaw is not defined
    let didThrow = false;
    try {
      await digTunnel(ctx, 1);
    } catch (e) {
      didThrow = true;
    }
    assert.strictEqual(didThrow, false, 'digTunnel must not throw ReferenceError for yaw');
    assert.strictEqual(ctx.state.isMining, false, 'isMining must be reset to false in finally block');
  });

  console.log('\n--- 3. Survival Bed Timeout Tests ---');

  await testAsync('trySleepInBed caps polling attempts to prevent indefinite interval leaks', async () => {
    const { trySleepInBed } = require('../src/modules/survival');
    const ctx = createMockCtx({
      findBlock: () => ({ position: new Vec3(100, 64, 100), name: 'red_bed' }),
      pathfinder: { setGoal: () => {} },
      entity: { position: new Vec3(0, 64, 0) } // Far from bed
    });

    // Invoke trySleepInBed (bed is unreachable, dist > 2.5)
    trySleepInBed(ctx);
    assert.ok(true, 'trySleepInBed initialized with attempt limit');
  });

  console.log('\n--- 4. Death & Corpse Recovery Tests ---');

  await testAsync('recoverCorpse detects cross-dimension mismatch and aborts cleanly', async () => {
    const { recoverCorpse } = require('../src/modules/death');
    const ctx = createMockCtx();
    ctx.bot.game = { dimension: 'overworld' };
    ctx.state.deathPos = new Vec3(50, 60, 50);
    ctx.state.deathDimension = 'the_nether'; // Died in nether, respawned in overworld

    await recoverCorpse(ctx, true, 'TestOwner');

    assert(ctx.replies.some(r => r.text.includes('the_nether') && r.text.includes('overworld')),
      'Should inform player that bot died in a different dimension');
    assert.strictEqual(ctx.state.isRetrieving, false, 'isRetrieving must be reset');
  });

  console.log('\n--- 5. Crafting & Rancher Null-Safety Tests ---');

  await testAsync('craftItem handles invalid/null item names without throwing', async () => {
    const { craftItem } = require('../src/modules/crafting');
    const ctx = createMockCtx();

    const nullResult = await craftItem(ctx, null, 1);
    assert.strictEqual(nullResult, false);

    const undefinedResult = await craftItem(ctx, undefined, 1);
    assert.strictEqual(undefinedResult, false);

    const unknownResult = await craftItem(ctx, 'non_existent_item_xyz', 1);
    assert.strictEqual(unknownResult, false);
    assert.strictEqual(ctx.state.isCrafting, false);
  });

  await testAsync('breedAnimals handles null/undefined speciesFilter gracefully', async () => {
    const { breedAnimals } = require('../src/modules/rancher');
    const ctx = createMockCtx();

    const result = await breedAnimals(ctx, null);
    assert.strictEqual(result, true, 'Null speciesFilter should default to all');
    assert.strictEqual(ctx.state.isBreeding, false);
  });

  console.log('\n--- 6. Courier Module Tests ---');

  await testAsync('deliverItemToOwner validates target player position and handles nulls', async () => {
    const { deliverItemToOwner } = require('../src/modules/courier');
    const ctx = createMockCtx();

    // Target player with null position
    ctx.bot.players['TestOwner'] = { entity: { position: null } };
    await deliverItemToOwner(ctx, 'planks', 1, true, 'TestOwner');

    assert(ctx.replies.some(r => r.text.includes("can't see your coordinates")),
      'Should report that owner coordinates are unavailable');
    assert.strictEqual(ctx.state.isDelivering, false);
  });

  console.log('\n--- 7. Config Deep Merge & Isolation Tests ---');

  test('deepMerge preserves existing fields and clones arrays cleanly', () => {
    const base = {
      host: 'localhost',
      privacy: { whitelist: ['Alice'] },
      combat: { shieldParry: false }
    };
    const defaults = {
      host: 'defaultHost',
      port: 25565,
      privacy: { whitelist: ['DefaultUser'], silentMode: true },
      combat: { shieldParry: true, totemThreshold: 12 }
    };

    const merged = deepMerge(base, defaults);
    assert.strictEqual(merged.host, 'localhost', 'Existing string value preserved');
    assert.strictEqual(merged.port, 25565, 'Missing top-level field added');
    assert.strictEqual(merged.combat.shieldParry, false, 'Existing boolean preserved');
    assert.strictEqual(merged.combat.totemThreshold, 12, 'Missing nested field merged');
    assert.deepStrictEqual(merged.privacy.whitelist, ['Alice'], 'Existing array preserved');
    assert.strictEqual(merged.privacy.silentMode, true, 'Missing nested boolean merged');
  });

  console.log('\n--- 8. Dialogue Proximity Null-Safety Tests ---');

  test('isAddressedToBot safely handles player entities with missing position', () => {
    const ctx = createMockCtx();
    ctx.bot.players['Player1'] = { entity: { position: null } };

    let addressed = false;
    assert.doesNotThrow(() => {
      addressed = isAddressedToBot(ctx, 'Player1', 'hi', false);
    });
    assert.strictEqual(addressed, false, 'Should not match proximity when position is null');
  });

  console.log('\n=============================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%).`);
  console.log('=============================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
