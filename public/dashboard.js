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
  const icon = type === 'error' ? '❌' : '✨';
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
  sword: '⚔️',
  pickaxe: '⛏️',
  axe: '🪓',
  shovel: '🥄',
  hoe: '🌱',
  bow: '🏹',
  crossbow: '🎯',
  shield: '🛡️',
  totem_of_undying: '🔮',
  arrow: '🏹',
  bread: '🍞',
  beef: '🥩',
  porkchop: '🥓',
  golden_carrot: '🥕',
  carrot: '🥕',
  potato: '🥔',
  baked_potato: '🥔',
  apple: '🍎',
  wheat: '🌾',
  seed: '🌰',
  coal: '⚫',
  charcoal: '⚫',
  iron: '⚪',
  gold: '🟡',
  diamond: '💎',
  emerald: '🟢',
  lapis: '🔵',
  redstone: '🔴',
  log: '🪵',
  planks: '🪵',
  cobblestone: '🪨',
  dirt: '🟫',
  torch: '🔦',
  water_bucket: '🪣',
  bucket: '🪣',
  chest: '📦'
};

function getItemIcon(name) {
  if (!name) return '📦';
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(ITEM_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '📦';
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
    headerAudienceBadge.textContent = mode === 'whisper_only' ? 'Whisper Only' : mode === 'whitelist_whisper' ? 'Whitelisted Whispers' : 'Public Chat';
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
          submitBtn.textContent = submitBtn.getAttribute('data-orig') || '💾 Save Settings';
        }, 1000);
      }
    } else {
      showToast(result.error || 'Failed to save settings', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.getAttribute('data-orig') || '💾 Save Settings';
      }
    }
  } catch (err) {
    showToast('Failed to contact server API', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.getAttribute('data-orig') || '💾 Save Settings';
    }
  }
}

// 1. Privacy Form Submission
if (privacyForm) {
  const btn = privacyForm.querySelector('button[type="submit"]');
  if (btn) btn.setAttribute('data-orig', btn.textContent);

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
  if (btn) btn.setAttribute('data-orig', btn.textContent);

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
  if (btn) btn.setAttribute('data-orig', btn.textContent);

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
  if (btn) btn.setAttribute('data-orig', btn.textContent);

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

  // Inventory render
  renderInventory(data.inventory || []);

  // Update logs if initial
  if (data.recentLogs && consoleFeed && consoleFeed.children.length <= 1) {
    consoleFeed.innerHTML = '';
    data.recentLogs.forEach(appendLogEntry);
  }
}

function renderInventory(items) {
  for (let i = 5; i <= 8; i++) {
    const el = document.getElementById(`slot-${i}`);
    if (el) el.innerHTML = i === 5 ? '🪖' : i === 6 ? '👕' : i === 7 ? '👖' : '🥾';
  }
  const offEl = document.getElementById('slot-45');
  if (offEl) offEl.innerHTML = '🛡️';

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

  // Draw Chest position
  if (data.chest) {
    const cdx = (data.chest.x - botX) * scale;
    const cdz = (data.chest.z - botZ) * scale;
    const cDist = Math.hypot(cdx, cdz);
    if (cDist < radius) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(centerX + cdx - 4, centerY + cdz - 4, 8, 8);
    }
  }

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
        copyCoordsBtn.textContent = 'Copied!';
        setTimeout(() => copyCoordsBtn.textContent = '📋 Copy', 1500);
      });
    }
  });
}
