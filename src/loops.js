const { stopGuardFollow } = require('./modules/navigation');

let activeIntervals = [];

function stopAutonomousLoops() {
  for (const interval of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals = [];
  stopGuardFollow(); // Always kill guard follow on full loop stop
}

function startAutonomousLoops(ctx) {
  stopAutonomousLoops();

  const { bot, state, config } = ctx;

  // 1. Bedtime & Night Check every 8 seconds
  const i1 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState === 'COMBAT' || state.currentState === 'DEPOSITING') return;

    const isNight = bot.time && bot.time.timeOfDay >= 12541 && bot.time.timeOfDay <= 23458;
    const isStorm = bot.isRaining;

    if ((isNight || isStorm) && config.autoSleep) {
      if (state.currentState !== 'SLEEPING') {
        ctx.trySleepInBed();
      }
    }
  }, 8000);
  activeIntervals.push(i1);

  // 2. Active Food Consumer every 3 seconds
  const iEat = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    if (bot.food < 18) {
      ctx.eatIfHungry();
    }
  }, 3000);
  activeIntervals.push(iEat);

  // 3. Pro Combat & Self-Defense every 800ms
  const i2 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || !config.autoDefend) return;
    if (state.currentState === 'ARCHER') return;
    ctx.scanAndDefendAgainstMobs();
  }, 800);
  activeIntervals.push(i2);

  // 4. Bodyguard Threat Scanner every 1 second
  const i3 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState !== 'GUARD') return;
    ctx.performBodyguardLogic();
  }, 1000);
  activeIntervals.push(i3);

  // 5. Shift-Greeting Detection loop every 100ms (rapid responsiveness)
  const i4 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    ctx.checkPlayerShiftGreetings();
  }, 100);
  activeIntervals.push(i4);

  // 6. Offhand & Shield / Totem Manager every 3 seconds
  const i5 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    ctx.manageOffhandItems();
  }, 3000);
  activeIntervals.push(i5);

  // 7. Reactive Shield Projectile Interceptor every 300ms
  const iShield = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    if (ctx.detectAndParryProjectiles) {
      ctx.detectAndParryProjectiles();
    }
  }, 300);
  activeIntervals.push(iShield);

  // 8. Perimeter Patrol Sentry Loop every 2.5 seconds
  const iPatrol = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState !== 'PATROL') return;
    if (ctx.performPatrolStep) {
      ctx.performPatrolStep();
    }
  }, 2500);
  activeIntervals.push(iPatrol);

  // 9. Ranged Archer Combat Loop every 1.5 seconds
  const iArcher = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState !== 'ARCHER') return;
    if (ctx.performArcherCombat) {
      ctx.performArcherCombat();
    }
  }, 1500);
  activeIntervals.push(iArcher);

  // 10. Autonomous Farming Loop every 8 seconds
  const i6 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    if (['COMBAT', 'DEPOSITING', 'GUARD', 'FISHING', 'LUMBER', 'MINING', 'SMELTING', 'PATROL', 'ARCHER', 'COURIER'].includes(state.currentState)) return;

    if (config.autoFarm && (state.currentState === 'ROAM' || state.currentState === 'FARM')) {
      if (bot.inventory.emptySlotCount() <= 3 && (state.chestPos || config.chest)) {
        ctx.depositIntoChest();
      } else {
        ctx.checkAndFarmCrops();
      }
    }
  }, 8000);
  activeIntervals.push(i6);

  // 11. Autonomous Lumberjack Loop every 5 seconds
  const iLumber = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState !== 'LUMBER') return;
    if (bot.pathfinder && bot.pathfinder.isMoving()) return;
    if (ctx.checkAndLumber) {
      ctx.checkAndLumber();
    }
  }, 5000);
  activeIntervals.push(iLumber);

  // 12. Tool Replenishment Check every 20 seconds
  const iTool = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    if (['LUMBER', 'MINING', 'FARM'].includes(state.currentState) && ctx.autoReplenishTool) {
      const toolType = state.currentState === 'LUMBER' ? 'axe' : state.currentState === 'MINING' ? 'pickaxe' : 'hoe';
      ctx.autoReplenishTool(toolType);
    }
  }, 20000);
  activeIntervals.push(iTool);

  // 13. Natural Base Roaming every 12 seconds
  const i7 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState !== 'ROAM') return;
    if (bot.pathfinder && bot.pathfinder.isMoving()) return;
    ctx.performLifeLikeRoaming();
  }, 12000);
  activeIntervals.push(i7);

  // 14. Social Eye Gaze every 3 seconds
  const i8 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || (bot.pathfinder && bot.pathfinder.isMoving()) || state.currentState === 'FISHING') return;
    ctx.lookAtNearbyPlayers();
  }, 3000);
  activeIntervals.push(i8);
}

module.exports = {
  startAutonomousLoops,
  stopAutonomousLoops
};
