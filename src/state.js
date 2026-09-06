const { Vec3 } = require('vec3');

class BotState {
  constructor(config) {
    this.reset(config);
  }

  reset(config = {}) {
    this.currentState = 'ROAM'; // ROAM, FOLLOW, GUARD, FARM, FISHING, COMBAT, SLEEPING, IDLE, DEPOSITING, LUMBER, MINING, SMELTING, RANCHING, ARCHER, PATROL, COURIER, RETRIEVING, CRAFTING
    this.homePos = config.home ? new Vec3(config.home.x, config.home.y, config.home.z) : null;
    this.chestPos = config.chest ? new Vec3(config.chest.x, config.chest.y, config.chest.z) : null;
    this.followTarget = null;
    this.combatTarget = null;
    this.isFarming = false;
    this.isFishing = false;
    this.isSleeping = false;
    this.isDepositing = false;
    this.isLumbering = false;
    this.isMining = false;
    this.isSmelting = false;
    this.isBreeding = false;
    this.isPatrolling = false;
    this.isCrafting = false;
    this.isDelivering = false;
    this.isRetrieving = false;
    this.isArchering = false;
    this.patrolWaypoints = [];
    this.currentPatrolIndex = 0;
    this.deathPos = null;
    this.deathDimension = null;
    this.deathTime = null;
    this.deathInventory = [];
    this.playerShiftHistory = {};
    this.isReplyingShift = false;
  }

  setState(newState) {
    this.currentState = newState;
  }

  getState() {
    return this.currentState;
  }

  setHome(vec) {
    this.homePos = vec ? new Vec3(vec.x, vec.y, vec.z) : null;
  }

  setChest(vec) {
    this.chestPos = vec ? new Vec3(vec.x, vec.y, vec.z) : null;
  }
}

module.exports = {
  BotState
};
