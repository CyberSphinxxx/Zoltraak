let activeIntervals = [];

function stopAutonomousLoops() {
  for (const interval of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals = [];
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
    ctx.scanAndDefendAgainstMobs();
  }, 800);
  activeIntervals.push(i2);

  // 4. Bodyguard Threat Scanner every 1 second
  const i3 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState !== 'GUARD') return;
    ctx.performBodyguardLogic();
  }, 1000);
  activeIntervals.push(i3);

  // 5. Shift-Greeting Detection every 500ms
  const i4 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    ctx.checkPlayerShiftGreetings();
  }, 500);
  activeIntervals.push(i4);

  // 6. Offhand & Shield / Totem Manager every 3 seconds
  const i5 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    ctx.manageOffhandItems();
  }, 3000);
  activeIntervals.push(i5);

  // 7. Autonomous Farming Loop every 8 seconds
  const i6 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping) return;
    if (['COMBAT', 'DEPOSITING', 'GUARD', 'FISHING'].includes(state.currentState)) return;

    if (config.autoFarm && (state.currentState === 'ROAM' || state.currentState === 'FARM')) {
      if (bot.inventory.emptySlotCount() <= 3 && (state.chestPos || config.chest)) {
        ctx.depositIntoChest();
      } else {
        ctx.checkAndFarmCrops();
      }
    }
  }, 8000);
  activeIntervals.push(i6);

  // 8. Natural Base Roaming every 12 seconds
  const i7 = setInterval(() => {
    if (!bot || !bot.entity || state.isSleeping || state.currentState !== 'ROAM') return;
    if (bot.pathfinder && bot.pathfinder.isMoving()) return;
    ctx.performLifeLikeRoaming();
  }, 12000);
  activeIntervals.push(i7);

  // 9. Social Eye Gaze every 3 seconds
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
