// Zoltraak Tactical Web Dashboard & Configuration Center
const radarCanvas = document.getElementById('radarCanvas');
const ctx = radarCanvas ? radarCanvas.getContext('2d') : null;

let latestTelemetry = null;
let latestConfig = null;
let radarRange = 24; // Default range in meters

// Top Bar Elements
const stateBadge = document.getElementById('stateBadge');
const connIndicator = document.getElementById('connIndicator');
const connText = document.getElementById('connText');
const serverInfo = document.getElementById('serverInfo');
const ownerInfo = document.getElementById('ownerInfo');
const headerAudienceBadge = document.getElementById('headerAudienceBadge');

// HUD Elements
const dimensionBadge = document.getElementById('dimensionBadge');
const hpBar = document.getElementById('hpBar');
const hpText = document.getElementById('hpText');
const foodBar = document.getElementById('foodBar');
const foodText = document.getElementById('foodText');
const coordX = document.getElementById('coordX');
const coordY = document.getElementById('coordY');
const coordZ = document.getElementById('coordZ');
const copyCoordsBtn = document.getElementById('copyCoordsBtn');
const invCountBadge = document.getElementById('invCountBadge');
const mainInvGrid = document.getElementById('mainInvGrid');
const hotbarGrid = document.getElementById('hotbarGrid');
const consoleFeed = document.getElementById('consoleFeed');
const cmdForm = document.getElementById('cmdForm');
const cmdInput = document.getElementById('cmdInput');
const clearConsoleBtn = document.getElementById('clearConsoleBtn');
const radarRangeSelect = document.getElementById('radarRange');

// Sensory & Perception Elements
const gazeTargetName = document.getElementById('gazeTargetName');
const envBiome = document.getElementById('envBiome');
const envLight = document.getElementById('envLight');
const envWeather = document.getElementById('envWeather');
const envGround = document.getElementById('envGround');
const envFacing = document.getElementById('envFacing');
const envCrosshair = document.getElementById('envCrosshair');
const sightCountBadge = document.getElementById('sightCountBadge');
const entitiesSightList = document.getElementById('entitiesSightList');
const perceptionFeed = document.getElementById('perceptionFeed');
const clearPerceptionBtn = document.getElementById('clearPerceptionBtn');
const perceptionFilterBtns = document.querySelectorAll('.filter-pill[data-filter]');

let activePerceptionFilter = 'all';
let allPerceptionEntries = [];

// Tab Navigation Elements
const navTabs = document.querySelectorAll('.nav-tab');
const tabPages = document.querySelectorAll('.tab-page');

// Whitelist Manager Elements
const whitelistInput = document.getElementById('whitelistInput');
const addWhitelistBtn = document.getElementById('addWhitelistBtn');
const whitelistTags = document.getElementById('whitelistTags');
let currentWhitelist = ['Owner'];

// Settings Forms
const privacyForm = document.getElementById('privacyForm');
const combatForm = document.getElementById('combatForm');
const automationForm = document.getElementById('automationForm');
const serverForm = document.getElementById('serverForm');

// ==========================================
// 1. Toast Notification System
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  const icon = type === 'error'
    ? '<svg viewBox="0 0 24 24" class="ui-icon toast-svg toast-err"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    : '<svg viewBox="0 0 24 24" class="ui-icon toast-svg toast-suc"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 4200);
}

// ==========================================
// 2. Tab Navigation & Hash Routing
// ==========================================
function switchTab(tabId) {
  navTabs.forEach(tab => {
    if (tab.getAttribute('data-tab') === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  tabPages.forEach(page => {
    if (page.id === `page-${tabId}`) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });

  // Keep radar crisp if switching back to HUD
  if (tabId === 'hud' && latestTelemetry && ctx) {
    renderRadar(latestTelemetry);
  }
}

navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.getAttribute('data-tab');
    if (tabId) {
      window.location.hash = tabId;
      switchTab(tabId);
    }
  });
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(`page-${hash}`)) {
    switchTab(hash);
  }
});

// Initial tab on page load
if (window.location.hash) {
  const initHash = window.location.hash.replace('#', '');
  if (document.getElementById(`page-${initHash}`)) {
    switchTab(initHash);
  }
}

// ==========================================
// 3. Minecraft Inventory Grid Setup
// ==========================================
const ITEM_ICONS = {
  sword: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/></svg>',
  pickaxe: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><path d="m14 13-9.5 9.5a2.12 2.12 0 1 1-3-3L11 10"/><path d="m14 10 3-3a5 5 0 0 0 0-7l-1 1a5 5 0 0 1 0 7l-2 2z"/></svg>',
  axe: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7z"/></svg>',
  shovel: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><path d="m14 14-8 8a2.12 2.12 0 0 1-3-3l8-8"/><path d="m15 11 4-4a4 4 0 0 0-6-6l-4 4 6 6z"/></svg>',
  hoe: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><path d="M7 20h10"/><path d="M10 20c0-4.4 3.6-8 8-8"/></svg>',
  bow: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  crossbow: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>',
  shield: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  totem_of_undying: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-totem"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" class="ui-icon item-svg"><line x1="5" x2="19" y1="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>',
  bread: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-food"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z"/><path d="M15 5 9.5 10.5a5 5 0 0 0-1.4 4.5l-4.6 4.6a2.12 2.12 0 1 0 3 3l4.6-4.6a5 5 0 0 0 4.5-1.4L21 11"/></svg>',
  beef: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-food"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z"/><path d="M15 5 9.5 10.5a5 5 0 0 0-1.4 4.5l-4.6 4.6a2.12 2.12 0 1 0 3 3l4.6-4.6a5 5 0 0 0 4.5-1.4L21 11"/></svg>',
  porkchop: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-food"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z"/><path d="M15 5 9.5 10.5a5 5 0 0 0-1.4 4.5l-4.6 4.6a2.12 2.12 0 1 0 3 3l4.6-4.6a5 5 0 0 0 4.5-1.4L21 11"/></svg>',
  golden_carrot: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-gold"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z"/></svg>',
  carrot: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-food"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z"/></svg>',
  potato: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-food"><circle cx="12" cy="12" r="7"/></svg>',
  baked_potato: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-food"><circle cx="12" cy="12" r="7"/></svg>',
  apple: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-redstone"><circle cx="12" cy="12" r="7"/></svg>',
  wheat: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-gold"><path d="M7 20h10"/><path d="M10 20c0-4.4 3.6-8 8-8"/></svg>',
  coal: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-coal"><circle cx="12" cy="12" r="7"/></svg>',
  charcoal: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-coal"><circle cx="12" cy="12" r="7"/></svg>',
  iron: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-iron"><polygon points="6 3 18 3 22 9 12 21 2 9 6 3"/></svg>',
  gold: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-gold"><polygon points="6 3 18 3 22 9 12 21 2 9 6 3"/></svg>',
  diamond: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-diamond"><polygon points="6 3 18 3 22 9 12 21 2 9 6 3"/><line x1="2" x2="22" y1="9" y2="9"/></svg>',
  emerald: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-emerald"><polygon points="12 2 21 8.5 17.5 19 6.5 19 3 8.5 12 2"/></svg>',
  lapis: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-lapis"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/></svg>',
  redstone: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-redstone"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  log: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-wood"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/></svg>',
  planks: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-wood"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/></svg>',
  cobblestone: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-coal"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
  dirt: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-wood"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
  torch: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-torch"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/></svg>',
  water_bucket: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-water"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  bucket: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-water"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  chest: '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-chest"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
};

const DEFAULT_ITEM_SVG = '<svg viewBox="0 0 24 24" class="ui-icon item-svg item-chest"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';

function getItemIcon(name) {
  if (!name) return DEFAULT_ITEM_SVG;
  const lower = name.toLowerCase();
  for (const [key, iconSvg] of Object.entries(ITEM_ICONS)) {
    if (lower.includes(key)) return iconSvg;
  }
  return DEFAULT_ITEM_SVG;
}

function initInventoryGrid() {
  if (!mainInvGrid || !hotbarGrid) return;
  mainInvGrid.innerHTML = '';
  hotbarGrid.innerHTML = '';

  for (let i = 9; i <= 35; i++) {
    const slotWrap = document.createElement('div');
    slotWrap.className = 'slot-wrap';
    slotWrap.setAttribute('data-slot', i);
    slotWrap.innerHTML = `<div id="slot-${i}" class="inv-slot"></div>`;
    mainInvGrid.appendChild(slotWrap);
  }

  for (let i = 36; i <= 44; i++) {
    const slotWrap = document.createElement('div');
    slotWrap.className = 'slot-wrap';
    slotWrap.setAttribute('data-slot', i);
    slotWrap.innerHTML = `<div id="slot-${i}" class="inv-slot"></div>`;
    hotbarGrid.appendChild(slotWrap);
  }
}

initInventoryGrid();

// ==========================================
// 4. Live Sliders & Value Display Sync
// ==========================================
function bindSlider(sliderId, badgeId, formatFn) {
  const slider = document.getElementById(sliderId);
  const badge = document.getElementById(badgeId);
  if (!slider || !badge) return;

  const update = () => {
    badge.textContent = formatFn(slider.value);
  };
  slider.addEventListener('input', update);
  update();
}

bindSlider('cfgParryDist', 'parryDistVal', v => `${v}m`);
bindSlider('cfgArcherKite', 'archerKiteVal', v => `${v}m`);
bindSlider('cfgTotemHp', 'totemHpVal', v => `${v} HP`);
bindSlider('cfgAutoEat', 'autoEatVal', v => `${v} / 20`);
bindSlider('cfgBranchLen', 'branchLenVal', v => `${v} blocks`);
bindSlider('cfgTorchSpacing', 'torchSpacingVal', v => `${v} blocks`);
bindSlider('cfgBreedLimit', 'breedLimitVal', v => `${v} animals`);
bindSlider('cfgFollowDist', 'followDistVal', v => `${parseFloat(v).toFixed(1)}m`);
bindSlider('cfgRoamRadius', 'roamRadiusVal', v => `${v}m`);
bindSlider('cfgStuckTimeout', 'stuckTimeoutVal', v => `${v}ms`);

// ==========================================
// 5. Interactive Whitelist Manager
// ==========================================
function renderWhitelistTags() {
  if (!whitelistTags) return;
  whitelistTags.innerHTML = '';

  const owner = latestConfig?.owner || (latestTelemetry?.ownerName) || 'Owner';

  currentWhitelist.forEach(user => {
    const chip = document.createElement('div');
    chip.className = 'whitelist-chip';

    const isOwner = user.toLowerCase() === owner.toLowerCase();
    chip.innerHTML = `
      <span>${escapeHtml(user)}</span>
      ${isOwner ? '<span class="chip-owner-tag">Owner</span>' : `<button type="button" class="chip-remove-btn" title="Remove ${user}" data-user="${escapeHtml(user)}">&times;</button>`}
    `;

    whitelistTags.appendChild(chip);
  });

  // Attach removal listeners
  whitelistTags.querySelectorAll('.chip-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetUser = btn.getAttribute('data-user');
      currentWhitelist = currentWhitelist.filter(u => u.toLowerCase() !== targetUser.toLowerCase());
      renderWhitelistTags();
    });
  });
}

function handleAddWhitelistPlayer() {
  if (!whitelistInput) return;
  const username = whitelistInput.value.trim();
  if (!username) return;

  const exists = currentWhitelist.some(u => u.toLowerCase() === username.toLowerCase());
  if (!exists) {
    currentWhitelist.push(username);
    renderWhitelistTags();
    whitelistInput.value = '';
  } else {
    showToast(`${username} is already in the whitelist`, 'error');
  }
}

if (addWhitelistBtn) addWhitelistBtn.addEventListener('click', handleAddWhitelistPlayer);
if (whitelistInput) {
  whitelistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddWhitelistPlayer();
    }
  });
}

// ==========================================
// 6. Populate Settings Forms from Config
// ==========================================
function populateConfigForms(cfg) {
  if (!cfg) return;
  latestConfig = cfg;

  // Header Audience Badge
  if (headerAudienceBadge && cfg.privacy?.audienceMode) {
    const mode = cfg.privacy.audienceMode;
    headerAudienceBadge.textContent = mode === 'dynamic' ? 'Dynamic Channel' : mode === 'whisper_only' ? 'Whisper Only' : mode === 'whitelist_whisper' ? 'Whitelisted Whispers' : 'Public Chat';
  }

  // 1. Privacy Form
  if (cfg.privacy) {
    const modeRadios = document.querySelectorAll('input[name="audienceMode"]');
    modeRadios.forEach(radio => {
      radio.checked = radio.value === (cfg.privacy.audienceMode || 'whisper_only');
    });

    const prefixEl = document.getElementById('cfgBotPrefix');
    if (prefixEl && cfg.privacy.botPrefix !== undefined) prefixEl.value = cfg.privacy.botPrefix;

    const silentEl = document.getElementById('cfgSilentMode');
    if (silentEl && cfg.privacy.silentMode !== undefined) silentEl.checked = !!cfg.privacy.silentMode;

    if (Array.isArray(cfg.privacy.whitelist)) {
      currentWhitelist = [...cfg.privacy.whitelist];
      if (cfg.owner && !currentWhitelist.includes(cfg.owner)) {
        currentWhitelist.unshift(cfg.owner);
      }
      renderWhitelistTags();
    }
  }

  // 2. Combat Form
  if (cfg.combat) {
    const prioEl = document.getElementById('cfgTargetPriority');
    if (prioEl && cfg.combat.targetPriority) prioEl.value = cfg.combat.targetPriority;

    const parryEl = document.getElementById('cfgShieldParry');
    if (parryEl && cfg.combat.shieldParry !== undefined) parryEl.checked = !!cfg.combat.shieldParry;

    const creepEl = document.getElementById('cfgCreeperAvoid');
    if (creepEl && cfg.combat.creeperAvoidance !== undefined) creepEl.checked = !!cfg.combat.creeperAvoidance;

    const pDistEl = document.getElementById('cfgParryDist');
    if (pDistEl && cfg.combat.shieldParryDistance !== undefined) {
      pDistEl.value = cfg.combat.shieldParryDistance;
      pDistEl.dispatchEvent(new Event('input'));
    }

    const kiteEl = document.getElementById('cfgArcherKite');
    if (kiteEl && cfg.combat.archerKiteDistance !== undefined) {
      kiteEl.value = cfg.combat.archerKiteDistance;
      kiteEl.dispatchEvent(new Event('input'));
    }

    const totemEl = document.getElementById('cfgTotemHp');
    if (totemEl && cfg.combat.totemThreshold !== undefined) {
      totemEl.value = cfg.combat.totemThreshold;
      totemEl.dispatchEvent(new Event('input'));
    }
  }

  // 3. Automation Form
  if (cfg.automation) {
    const eatEl = document.getElementById('cfgAutoEat');
    if (eatEl && cfg.automation.autoEatThreshold !== undefined) {
      eatEl.value = cfg.automation.autoEatThreshold;
      eatEl.dispatchEvent(new Event('input'));
    }

    const sleepEl = document.getElementById('cfgAutoSleep');
    if (sleepEl && cfg.autoSleep !== undefined) sleepEl.checked = !!cfg.autoSleep;

    const farmEl = document.getElementById('cfgAutoFarm');
    if (farmEl && cfg.autoFarm !== undefined) farmEl.checked = !!cfg.autoFarm;

    const replantEl = document.getElementById('cfgReplant');
    if (replantEl && cfg.automation.autoReplantSaplings !== undefined) replantEl.checked = !!cfg.automation.autoReplantSaplings;

    const bLenEl = document.getElementById('cfgBranchLen');
    if (bLenEl && cfg.automation.mineBranchLength !== undefined) {
      bLenEl.value = cfg.automation.mineBranchLength;
      bLenEl.dispatchEvent(new Event('input'));
    }

    const torchEl = document.getElementById('cfgTorchSpacing');
    if (torchEl && cfg.automation.mineTorchSpacing !== undefined) {
      torchEl.value = cfg.automation.mineTorchSpacing;
      torchEl.dispatchEvent(new Event('input'));
    }

    const breedEl = document.getElementById('cfgBreedLimit');
    if (breedEl && cfg.automation.breedLimit !== undefined) {
      breedEl.value = cfg.automation.breedLimit;
      breedEl.dispatchEvent(new Event('input'));
    }
  }

  // 4. Server & Movement Form
  const hostEl = document.getElementById('cfgHost');
  if (hostEl && cfg.host) hostEl.value = cfg.host;

  const portEl = document.getElementById('cfgPort');
  if (portEl && cfg.port) portEl.value = cfg.port;

  const verEl = document.getElementById('cfgVersion');
  if (verEl && cfg.version) verEl.value = cfg.version;

  const userEl = document.getElementById('cfgUsername');
  if (userEl && cfg.username) userEl.value = cfg.username;

  const ownerEl = document.getElementById('cfgOwner');
  if (ownerEl && cfg.owner) ownerEl.value = cfg.owner;

  if (cfg.navigation) {
    const fDistEl = document.getElementById('cfgFollowDist');
    if (fDistEl && cfg.navigation.followDistance !== undefined) {
      fDistEl.value = cfg.navigation.followDistance;
      fDistEl.dispatchEvent(new Event('input'));
    }

    const rRadEl = document.getElementById('cfgRoamRadius');
    if (rRadEl && cfg.roamRadius !== undefined) {
      rRadEl.value = cfg.roamRadius;
      rRadEl.dispatchEvent(new Event('input'));
    }

    const stuckEl = document.getElementById('cfgStuckTimeout');
    if (stuckEl && cfg.navigation.antiStuckTimeout !== undefined) {
      stuckEl.value = cfg.navigation.antiStuckTimeout;
      stuckEl.dispatchEvent(new Event('input'));
    }

    const jumpEl = document.getElementById('cfgAutoJump');
    if (jumpEl && cfg.navigation.autoJumpAssist !== undefined) jumpEl.checked = !!cfg.navigation.autoJumpAssist;

    const sprintEl = document.getElementById('cfgSprinting');
    if (sprintEl && cfg.navigation.allowSprinting !== undefined) sprintEl.checked = !!cfg.navigation.allowSprinting;
  }
}

// Fetch config on startup
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success && data.config) {
      populateConfigForms(data.config);
    }
  } catch (e) {
    console.warn('Could not fetch /api/config', e);
  }
}

fetchConfig();

// ==========================================
// 7. Save Settings API Handler
// ==========================================
async function saveSettings(payload, submitBtn, successNotice) {
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      if (result.config) populateConfigForms(result.config);

      if (result.reconnected) {
        showToast(`Server updated to ${result.config.host}:${result.config.port}. Reconnecting bot...`);
        serverInfo.textContent = `${result.config.host}:${result.config.port}`;
        ownerInfo.textContent = result.config.owner;
      } else {
        showToast(successNotice || 'Settings saved & applied live at runtime!');
      }

      if (submitBtn) {
        submitBtn.textContent = 'Saved!';
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitBtn.getAttribute('data-orig') || 'Save Settings';
        }, 1000);
      }
    } else {
      showToast(result.error || 'Failed to save settings', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.getAttribute('data-orig') || 'Save Settings';
      }
    }
  } catch (err) {
    showToast('Failed to contact server API', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtn.getAttribute('data-orig') || 'Save Settings';
    }
  }
}

// 1. Privacy Form Submission
if (privacyForm) {
  const btn = privacyForm.querySelector('button[type="submit"]');
  if (btn) btn.setAttribute('data-orig', btn.innerHTML);

  privacyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const modeEl = document.querySelector('input[name="audienceMode"]:checked');
    const audienceMode = modeEl ? modeEl.value : 'whisper_only';
    const botPrefix = document.getElementById('cfgBotPrefix')?.value || '';
    const silentMode = !!document.getElementById('cfgSilentMode')?.checked;

    saveSettings({
      privacy: {
        audienceMode,
        whitelist: currentWhitelist,
        silentMode,
        botPrefix
      }
    }, btn, 'Privacy & Audience settings updated live!');
  });
}

// 2. Combat Form Submission
if (combatForm) {
  const btn = combatForm.querySelector('button[type="submit"]');
  if (btn) btn.setAttribute('data-orig', btn.innerHTML);

  combatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetPriority = document.getElementById('cfgTargetPriority')?.value || 'hostiles_only';
    const shieldParry = !!document.getElementById('cfgShieldParry')?.checked;
    const creeperAvoidance = !!document.getElementById('cfgCreeperAvoid')?.checked;
    const shieldParryDistance = parseFloat(document.getElementById('cfgParryDist')?.value) || 10;
    const archerKiteDistance = parseFloat(document.getElementById('cfgArcherKite')?.value) || 8;
    const totemThreshold = parseFloat(document.getElementById('cfgTotemHp')?.value) || 12;

    saveSettings({
      combat: {
        targetPriority,
        shieldParry,
        creeperAvoidance,
        shieldParryDistance,
        archerKiteDistance,
        totemThreshold
      }
    }, btn, 'Combat & Tactical Defense settings updated live!');
  });
}

// 3. Automation Form Submission
if (automationForm) {
  const btn = automationForm.querySelector('button[type="submit"]');
  if (btn) btn.setAttribute('data-orig', btn.innerHTML);

  automationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const autoEatThreshold = parseInt(document.getElementById('cfgAutoEat')?.value, 10) || 15;
    const autoSleep = !!document.getElementById('cfgAutoSleep')?.checked;
    const autoFarm = !!document.getElementById('cfgAutoFarm')?.checked;
    const autoReplantSaplings = !!document.getElementById('cfgReplant')?.checked;
    const mineBranchLength = parseInt(document.getElementById('cfgBranchLen')?.value, 10) || 16;
    const mineTorchSpacing = parseInt(document.getElementById('cfgTorchSpacing')?.value, 10) || 6;
    const breedLimit = parseInt(document.getElementById('cfgBreedLimit')?.value, 10) || 12;

    saveSettings({
      autoSleep,
      autoFarm,
      automation: {
        autoEatThreshold,
        autoReplantSaplings,
        mineBranchLength,
        mineTorchSpacing,
        breedLimit
      }
    }, btn, 'Automation & Survival routines updated live!');
  });
}

// 4. Server & Movement Form Submission
if (serverForm) {
  const btn = serverForm.querySelector('button[type="submit"]');
  if (btn) btn.setAttribute('data-orig', btn.innerHTML);

  serverForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const host = document.getElementById('cfgHost')?.value.trim() || 'localhost';
    const port = parseInt(document.getElementById('cfgPort')?.value, 10) || 25565;
    const version = document.getElementById('cfgVersion')?.value.trim() || '1.21.2';
    const username = document.getElementById('cfgUsername')?.value.trim() || 'Zoltraak';
    const owner = document.getElementById('cfgOwner')?.value.trim() || 'Owner';

    const followDistance = parseFloat(document.getElementById('cfgFollowDist')?.value) || 3;
    const roamRadius = parseInt(document.getElementById('cfgRoamRadius')?.value, 10) || 16;
    const antiStuckTimeout = parseInt(document.getElementById('cfgStuckTimeout')?.value, 10) || 600;
    const autoJumpAssist = !!document.getElementById('cfgAutoJump')?.checked;
    const allowSprinting = !!document.getElementById('cfgSprinting')?.checked;

    saveSettings({
      host,
      port,
      version,
      username,
      owner,
      roamRadius,
      navigation: {
        followDistance,
        antiStuckTimeout,
        autoJumpAssist,
        allowSprinting
      }
    }, btn, 'Server & Movement settings saved!');
  });
}

// ==========================================
// 8. Server-Sent Events (SSE) Telemetry
// ==========================================
function connectSSE() {
  const evtSource = new EventSource('/api/events');

  evtSource.onopen = () => {
    connIndicator.className = 'pulse-beacon beacon-online';
    connText.textContent = 'Connected';
  };

  evtSource.addEventListener('telemetry', (e) => {
    try {
      const data = JSON.parse(e.data);
      latestTelemetry = data;
      renderTelemetry(data);
      renderRadar(data);

      // If telemetry included config and we haven't loaded it yet
      if (data.config && !latestConfig) {
        populateConfigForms(data.config);
      }
    } catch (err) {
      console.error('Failed to parse telemetry:', err);
    }
  });

  evtSource.addEventListener('log', (e) => {
    try {
      const entry = JSON.parse(e.data);
      appendLogEntry(entry);
    } catch (err) {
      console.error('Failed to parse log:', err);
    }
  });

  evtSource.addEventListener('perceptionLog', (e) => {
    try {
      const entry = JSON.parse(e.data);
      appendPerceptionLogEntry(entry);
    } catch (err) {
      console.error('Failed to parse perception log:', err);
    }
  });

  evtSource.onerror = () => {
    connIndicator.className = 'pulse-beacon beacon-offline';
    connText.textContent = 'Reconnecting...';
  };
}

connectSSE();

// ==========================================
// 9. Render Telemetry Data into HUD
// ==========================================
function renderTelemetry(data) {
  if (!data) return;

  // Header info
  if (data.ownerName) ownerInfo.textContent = data.ownerName;
  if (data.serverHost && data.serverPort) {
    serverInfo.textContent = `${data.serverHost}:${data.serverPort}`;
  }

  if (data.state) {
    stateBadge.textContent = data.state;
    stateBadge.className = 'badge mode-' + data.state.toLowerCase();
  }

  if (!data.connected) return;

  // Vitals
  const hp = Math.max(0, Math.min(20, data.health || 0));
  const hpPct = (hp / 20) * 100;
  hpBar.style.width = hpPct + '%';
  hpText.textContent = `${hp} / 20`;

  const food = Math.max(0, Math.min(20, data.food || 0));
  const foodPct = (food / 20) * 100;
  foodBar.style.width = foodPct + '%';
  foodText.textContent = `${food} / 20`;

  // Coordinates
  coordX.textContent = data.x !== undefined ? data.x.toFixed(1) : '0.0';
  coordY.textContent = data.y !== undefined ? data.y.toFixed(1) : '64.0';
  coordZ.textContent = data.z !== undefined ? data.z.toFixed(1) : '0.0';

  if (data.dimension) {
    dimensionBadge.textContent = data.dimension.toUpperCase().replace('MINECRAFT:', '');
  }

  // Sensory & Environmental Strip
  if (data.environment) {
    if (envBiome) envBiome.textContent = data.environment.biome || 'Scanning...';
    if (envLight) {
      const total = data.environment.light !== undefined ? data.environment.light : 15;
      const blk = data.environment.blockLight !== undefined ? data.environment.blockLight : 0;
      const sky = data.environment.skyLight !== undefined ? data.environment.skyLight : 15;
      envLight.textContent = `${total} (Sky: ${sky}, Blk: ${blk})`;
      envLight.className = 'env-val ' + (blk === 0 && (data.environment.solarPhase === 'Night') ? 'env-danger' : (total < 7 ? 'env-dim' : 'env-safe'));
    }
    if (envWeather) {
      const solar = data.environment.solarPhase || 'Day';
      const weather = data.environment.weather || 'Clear';
      envWeather.textContent = `${solar} • ${weather}`;
    }
    if (envGround) {
      envGround.textContent = data.environment.groundBlock || 'grass_block';
    }
  } else {
    // Graceful fallback for prior bot instance
    if (envBiome) envBiome.textContent = (data.dimension || 'Overworld').toUpperCase().replace('MINECRAFT:', '');
    const isNight = (data.timeOfDay >= 13000 && data.timeOfDay <= 23000);
    if (envLight) {
      envLight.textContent = isNight ? '0 (Night • Danger)' : '15 (Day • Safe)';
      envLight.className = 'env-val ' + (isNight ? 'env-danger' : 'env-safe');
    }
    if (envWeather) {
      envWeather.textContent = `${isNight ? 'Night' : 'Day'} • ${data.isRaining ? 'Rain' : 'Clear'}`;
    }
    if (envGround) {
      envGround.textContent = 'Detected (Solid)';
    }
  }

  // Gaze & Line of sight
  if (data.gaze) {
    const gazeStr = data.gaze.name + (data.gaze.dist !== null && data.gaze.dist !== undefined ? ` (${data.gaze.dist}m)` : '');
    if (gazeTargetName) gazeTargetName.textContent = gazeStr;
    if (envCrosshair) envCrosshair.textContent = gazeStr;
  }

  // Facing orientation
  if (envFacing) {
    if (data.facing) {
      envFacing.textContent = `${data.facing.cardinal} (Yaw ${data.facing.yawDeg}°, Pitch ${data.facing.pitchDeg}°)`;
    } else if (data.yaw !== undefined) {
      const yawDeg = Math.round(((data.yaw * 180 / Math.PI) % 360 + 360) % 360);
      envFacing.textContent = `Facing (Yaw ${yawDeg}°)`;
    }
  }

  // Render Visible Entities in Sight
  renderVisibleEntities(data.visibleEntities || data.entities || []);

  // Initial perception logs
  if (data.perceptionLogs && perceptionFeed && allPerceptionEntries.length === 0) {
    perceptionFeed.innerHTML = '';
    data.perceptionLogs.forEach(entry => appendPerceptionLogEntry(entry, false));
  }

  // Inventory render
  renderInventory(data.inventory || []);

  // Update logs if initial
  if (data.recentLogs && consoleFeed && consoleFeed.children.length <= 1) {
    consoleFeed.innerHTML = '';
    data.recentLogs.forEach(appendLogEntry);
  }
}

const ARMOR_PLACEHOLDERS = {
  5: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M12 2a8 8 0 0 0-8 8v4c0 3 2 6 8 8 6-2 8-5 8-8v-4a8 8 0 0 0-8-8z"/><path d="M4 10h16"/></svg>',
  6: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M6 4 2 8v4l4 2v6h12v-6l4-2V8l-4-4-4 3h-4z"/></svg>',
  7: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M6 3h12v7l-2 11h-3.5L12 11l-.5 10H8L6 10z"/></svg>',
  8: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M4 4h6v9l3 2v5H4zm10 0h6v9l-3 2v5h-6z"/></svg>',
  45: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
};

function renderInventory(items) {
  for (let i = 5; i <= 8; i++) {
    const el = document.getElementById(`slot-${i}`);
    if (el) el.innerHTML = ARMOR_PLACEHOLDERS[i] || '';
  }
  const offEl = document.getElementById('slot-45');
  if (offEl) offEl.innerHTML = ARMOR_PLACEHOLDERS[45] || '';

  for (let i = 9; i <= 44; i++) {
    const el = document.getElementById(`slot-${i}`);
    if (el) {
      el.innerHTML = '';
      el.removeAttribute('title');
    }
  }

  let filledCount = 0;
  items.forEach(item => {
    const el = document.getElementById(`slot-${item.slot}`);
    if (el) {
      filledCount++;
      const icon = getItemIcon(item.name);
      el.innerHTML = `${icon}<span class="item-count">${item.count > 1 ? item.count : ''}</span>`;
      el.setAttribute('title', `${item.displayName || item.name} (x${item.count})`);
    }
  });

  if (invCountBadge) {
    invCountBadge.textContent = `${filledCount} / 36 slots`;
  }
}

// ==========================================
// 10. Render 2D Tactical Radar Canvas
// ==========================================
function renderRadar(data) {
  if (!ctx || !radarCanvas) return;
  const width = radarCanvas.width;
  const height = radarCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width / 2 - 8;

  ctx.clearRect(0, 0, width, height);

  // Background circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#0a1020';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Concentric range rings
  const ringSteps = [0.33, 0.66, 1.0];
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  ringSteps.forEach(step => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * step, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '9px monospace';
    const meters = Math.round(radarRange * step);
    ctx.fillText(`${meters}m`, centerX + 4, centerY - (radius * step) + 12);
  });

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!data || data.x === undefined) {
    ctx.restore();
    return;
  }

  const botX = data.x;
  const botZ = data.z;
  const scale = radius / radarRange;

  // Draw Patrol Path if active
  if (data.patrolWaypoints && data.patrolWaypoints.length > 1) {
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    data.patrolWaypoints.forEach((wp, idx) => {
      const dx = (wp.x - botX) * scale;
      const dz = (wp.z - botZ) * scale;
      const screenX = centerX + dx;
      const screenY = centerY + dz;
      if (idx === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Registered Chests
  const chestList = data.chests && Object.keys(data.chests).length > 0
    ? Object.entries(data.chests)
    : (data.chest ? [['default', data.chest]] : []);

  const CHEST_COLORS = {
    ores: '#38bdf8',
    food: '#22c55e',
    wood: '#f59e0b',
    mob: '#ef4444',
    building: '#a855f7',
    default: '#ffcc00'
  };

  chestList.forEach(([cat, pos]) => {
    if (!pos) return;
    const cdx = (pos.x - botX) * scale;
    const cdz = (pos.z - botZ) * scale;
    const cDist = Math.hypot(cdx, cdz);
    if (cDist < radius) {
      ctx.fillStyle = CHEST_COLORS[cat.toLowerCase()] || '#ffcc00';
      ctx.fillRect(centerX + cdx - 4, centerY + cdz - 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px sans-serif';
      ctx.fillText(cat.toUpperCase(), centerX + cdx + 6, centerY + cdz + 4);
    }
  });

  // Draw Home position
  if (data.home) {
    const hdx = (data.home.x - botX) * scale;
    const hdz = (data.home.z - botZ) * scale;
    const hDist = Math.hypot(hdx, hdz);
    if (hDist < radius) {
      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.arc(centerX + hdx, centerY + hdz, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw Entities
  if (data.entities) {
    data.entities.forEach(ent => {
      const dx = (ent.x - botX) * scale;
      const dz = (ent.z - botZ) * scale;
      const dist = Math.hypot(dx, dz);

      if (dist < radius) {
        ctx.beginPath();
        ctx.arc(centerX + dx, centerY + dz, 4, 0, Math.PI * 2);

        if (ent.isPlayer) {
          ctx.fillStyle = ent.name === data.ownerName ? '#38bdf8' : '#10b981';
        } else if (ent.isHostile) {
          ctx.fillStyle = '#ff3366';
        } else {
          ctx.fillStyle = '#a3e635';
        }
        ctx.fill();

        if (ent.isPlayer) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.fillText(ent.name, centerX + dx + 6, centerY + dz + 3);
        }
      }
    });
  }

  // Draw Bot View Cone
  const yaw = data.yaw || 0;
  const angle = yaw + Math.PI / 2;
  const fov = Math.PI / 4;

  const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius * 0.75);
  grad.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
  grad.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius * 0.75, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
  ctx.fill();

  // Draw Bot Center Dot
  ctx.fillStyle = '#00f2fe';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ==========================================
// 11. Console Logging & Command Dispatch
// ==========================================
function appendLogEntry(entry) {
  if (!consoleFeed) return;
  const el = document.createElement('div');
  el.className = `log-entry ${entry.type || 'system'}`;
  el.innerHTML = `<span class="log-time">${entry.time}</span><span class="log-sender">[${entry.sender}]</span> ${escapeHtml(entry.message)}`;
  consoleFeed.appendChild(el);
  consoleFeed.scrollTop = consoleFeed.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Quick action buttons
document.querySelectorAll('.cmd-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.getAttribute('data-cmd');
    if (cmd) dispatchCommand(cmd);
  });
});

// Console command form
if (cmdForm) {
  cmdForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cmd = cmdInput.value.trim();
    if (cmd) {
      dispatchCommand(cmd);
      cmdInput.value = '';
    }
  });
}

async function dispatchCommand(command) {
  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const result = await res.json();
    if (!result.success) {
      appendLogEntry({ time: new Date().toLocaleTimeString(), type: 'system', sender: 'Error', message: result.error });
    }
  } catch (err) {
    appendLogEntry({ time: new Date().toLocaleTimeString(), type: 'system', sender: 'Error', message: 'Failed to send command' });
  }
}

if (radarRangeSelect) {
  radarRangeSelect.addEventListener('change', (e) => {
    radarRange = parseInt(e.target.value, 10) || 24;
    if (latestTelemetry) renderRadar(latestTelemetry);
  });
}

if (clearConsoleBtn) {
  clearConsoleBtn.addEventListener('click', () => {
    if (consoleFeed) consoleFeed.innerHTML = '';
  });
}

if (copyCoordsBtn) {
  copyCoordsBtn.addEventListener('click', () => {
    if (latestTelemetry) {
      const str = `/tp ${Math.round(latestTelemetry.x)} ${Math.round(latestTelemetry.y)} ${Math.round(latestTelemetry.z)}`;
      navigator.clipboard.writeText(str).then(() => {
        copyCoordsBtn.innerHTML = '<svg viewBox="0 0 24 24" class="ui-icon mini-icon"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        setTimeout(() => {
          copyCoordsBtn.innerHTML = '<svg viewBox="0 0 24 24" class="ui-icon mini-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy';
        }, 1500);
      });
    }
  });
}

// ==========================================
// 12. Visual Perception & Entities in Sight
// ==========================================
function renderVisibleEntities(entities) {
  if (!entitiesSightList) return;

  if (sightCountBadge) {
    sightCountBadge.textContent = `${entities.length} visible`;
  }

  if (!entities || entities.length === 0) {
    entitiesSightList.innerHTML = `
      <div class="sight-empty-state">
        <span class="empty-icon"><svg viewBox="0 0 24 24" class="ui-icon"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg></span>
        <span>No entities in direct sight line</span>
      </div>
    `;
    return;
  }

  entitiesSightList.innerHTML = '';
  entities.forEach(ent => {
    const card = document.createElement('div');
    const isThreat = !!ent.isHostile;
    const isOwner = !!ent.isOwner;
    card.className = `entity-sight-card ${isThreat ? 'is-threat' : ''} ${isOwner ? 'is-owner' : ''}`;

    let iconSvg = '<svg viewBox="0 0 24 24" class="ui-icon ent-icon ent-passive"><path d="M12 2a4 4 0 0 0-4 4c0 2 2 3.5 4 6 2-2.5 4-4 4-6a4 4 0 0 0-4-4z"/><circle cx="12" cy="18" r="3"/></svg>';
    if (ent.isPlayer) {
      iconSvg = isOwner
        ? '<svg viewBox="0 0 24 24" class="ui-icon ent-icon ent-owner"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
        : '<svg viewBox="0 0 24 24" class="ui-icon ent-icon ent-player"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    } else if (isThreat) {
      iconSvg = '<svg viewBox="0 0 24 24" class="ui-icon ent-icon ent-threat"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>';
    } else if (ent.type === 'object' || (ent.name && (ent.name.includes('arrow') || ent.name.includes('item')))) {
      iconSvg = '<svg viewBox="0 0 24 24" class="ui-icon ent-icon ent-item"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>';
    }

    let inFov = ent.inFov;
    let bearing = ent.bearing;

    if (bearing === undefined && latestTelemetry && latestTelemetry.x !== undefined && ent.x !== undefined) {
      const yaw = latestTelemetry.yaw || 0;
      const viewDirX = -Math.sin(yaw);
      const viewDirZ = -Math.cos(yaw);
      const dx = ent.x - latestTelemetry.x;
      const dz = ent.z - latestTelemetry.z;
      const d = ent.dist || Math.hypot(dx, dz) || 1;
      const dot = viewDirX * (dx / d) + viewDirZ * (dz / d);
      const cross = viewDirX * (dz / d) - viewDirZ * (dx / d);
      const angleDiff = Math.round(Math.atan2(cross, dot) * 180 / Math.PI);
      inFov = Math.abs(angleDiff) <= 45;
      if (Math.abs(angleDiff) <= 25) bearing = 'Directly Ahead';
      else if (angleDiff > 25 && angleDiff <= 110) bearing = 'Right';
      else if (angleDiff < -25 && angleDiff >= -110) bearing = 'Left';
      else bearing = 'Behind';
    }

    let fovClass = 'fov-peripheral';
    let fovText = bearing || 'Peripheral';
    if (inFov) {
      fovClass = 'fov-direct';
      fovText = `In View (${bearing || 'Ahead'})`;
    } else if (bearing === 'Behind') {
      fovClass = 'fov-behind';
    }

    card.innerHTML = `
      <div class="entity-card-left">
        <span class="entity-icon">${iconSvg}</span>
        <div>
          <div class="entity-card-name">${escapeHtml(ent.name)}</div>
          <div class="entity-card-dist">${ent.dist !== undefined ? ent.dist + 'm' : ''}</div>
        </div>
      </div>
      <div class="entity-card-right">
        <span class="entity-fov-badge ${fovClass}">${fovText}</span>
        ${isThreat ? '<span class="entity-tag-threat">THREAT</span>' : ''}
        ${isOwner ? '<span class="chip-owner-tag">Owner</span>' : ''}
      </div>
    `;
    entitiesSightList.appendChild(card);
  });
}

// ==========================================
// 13. Sensory & Perception Stream Logging
// ==========================================
function appendPerceptionLogEntry(entry, shouldScroll = true) {
  if (!perceptionFeed) return;
  allPerceptionEntries.push(entry);
  if (allPerceptionEntries.length > 100) allPerceptionEntries.shift();

  if (!matchesPerceptionFilter(entry, activePerceptionFilter)) return;

  const el = createPerceptionLogElement(entry);
  perceptionFeed.appendChild(el);

  while (perceptionFeed.children.length > 100) {
    perceptionFeed.removeChild(perceptionFeed.firstChild);
  }

  if (shouldScroll) {
    perceptionFeed.scrollTop = perceptionFeed.scrollHeight;
  }
}

function createPerceptionLogElement(entry) {
  const el = document.createElement('div');
  const cat = (entry.category || 'SENSORY').toLowerCase();
  el.className = `perceive-entry cat-${cat}`;

  let badgeClass = 'badge-sensory';
  if (cat === 'threat') badgeClass = 'badge-threat';
  else if (cat === 'sight') badgeClass = 'badge-sight';
  else if (cat === 'focus') badgeClass = 'badge-focus';
  else if (cat === 'env' || cat === 'environment') badgeClass = 'badge-env';
  else if (cat === 'tactical') badgeClass = 'badge-tactical';
  else if (cat === 'sys' || cat === 'system') badgeClass = 'badge-sys';

  el.innerHTML = `
    <span class="perceive-time">${entry.time || '--:--:--'}</span>
    <span class="perceive-badge ${badgeClass}">[${(entry.category || 'SENSORY').toUpperCase()}]</span>
    <span class="perceive-text">${escapeHtml(entry.message)}</span>
  `;
  return el;
}

function matchesPerceptionFilter(entry, filter) {
  if (!filter || filter === 'all') return true;
  const cat = (entry.category || '').toLowerCase();
  if (filter === 'sight') {
    return cat === 'sight' || cat === 'threat' || cat === 'focus' || cat === 'tactical';
  }
  if (filter === 'env') {
    return cat === 'env' || cat === 'environment' || cat === 'sensory';
  }
  return true;
}

function reapplyPerceptionFilter() {
  if (!perceptionFeed) return;
  perceptionFeed.innerHTML = '';
  allPerceptionEntries.forEach(entry => {
    if (matchesPerceptionFilter(entry, activePerceptionFilter)) {
      perceptionFeed.appendChild(createPerceptionLogElement(entry));
    }
  });
  perceptionFeed.scrollTop = perceptionFeed.scrollHeight;
}

// Perception filter pill clicks
perceptionFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    perceptionFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePerceptionFilter = btn.getAttribute('data-filter') || 'all';
    reapplyPerceptionFilter();
  });
});

// Clear perception stream
if (clearPerceptionBtn) {
  clearPerceptionBtn.addEventListener('click', () => {
    allPerceptionEntries = [];
    if (perceptionFeed) perceptionFeed.innerHTML = '';
  });
}

