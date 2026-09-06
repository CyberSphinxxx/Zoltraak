// ==========================================================================
// Zoltraak Settings & Configuration Manager Component
// Dynamic Slider Sync, Whitelist Manager, and Settings Persistence
// ==========================================================================

import { saveSettingsAPI } from '../api.js';
import { showToast } from '../ui/toast.js';

let currentWhitelist = ['Owner'];
let latestConfig = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

export function initSettings(onConfigSaved) {
  // Bind live sliders
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

  // Whitelist manager listeners
  const addWhitelistBtn = document.getElementById('addWhitelistBtn');
  const whitelistInput = document.getElementById('whitelistInput');

  if (addWhitelistBtn) addWhitelistBtn.addEventListener('click', handleAddWhitelistPlayer);
  if (whitelistInput) {
    whitelistInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddWhitelistPlayer();
      }
    });
  }

  // 1. Privacy Form
  const privacyForm = document.getElementById('privacyForm');
  if (privacyForm) {
    const btn = privacyForm.querySelector('button[type="submit"]');
    if (btn) btn.setAttribute('data-orig', btn.innerHTML);

    privacyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const modeEl = document.querySelector('input[name="audienceMode"]:checked');
      const audienceMode = modeEl ? modeEl.value : 'whisper_only';
      const botPrefix = document.getElementById('cfgBotPrefix')?.value || '';
      const silentMode = !!document.getElementById('cfgSilentMode')?.checked;

      saveSettingsAPI({
        privacy: {
          audienceMode,
          whitelist: currentWhitelist,
          silentMode,
          botPrefix
        }
      }, btn, 'Privacy & Audience settings updated live!', onConfigSaved);
    });
  }

  // 2. Combat Form
  const combatForm = document.getElementById('combatForm');
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

      saveSettingsAPI({
        combat: {
          targetPriority,
          shieldParry,
          creeperAvoidance,
          shieldParryDistance,
          archerKiteDistance,
          totemThreshold
        }
      }, btn, 'Combat & Tactical Defense settings updated live!', onConfigSaved);
    });
  }

  // 3. Automation Form
  const automationForm = document.getElementById('automationForm');
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

      saveSettingsAPI({
        autoSleep,
        autoFarm,
        automation: {
          autoEatThreshold,
          autoReplantSaplings,
          mineBranchLength,
          mineTorchSpacing,
          breedLimit
        }
      }, btn, 'Automation & Survival routines updated live!', onConfigSaved);
    });
  }

  // 4. Server & Movement Form
  const serverForm = document.getElementById('serverForm');
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

      saveSettingsAPI({
        host,
        port,
        version,
        username,
        owner,
        roamRadius,
        navigation: {
          followDistance,
          roamRadius,
          antiStuckTimeout,
          autoJumpAssist
        }
      }, btn, 'Server connection & navigation settings updated live!', onConfigSaved);
    });
  }
}

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

function handleAddWhitelistPlayer() {
  const input = document.getElementById('whitelistInput');
  if (!input) return;
  const username = input.value.trim();
  if (!username) return;

  const exists = currentWhitelist.some(u => u.toLowerCase() === username.toLowerCase());
  if (!exists) {
    currentWhitelist.push(username);
    renderWhitelistTags();
    input.value = '';
  } else {
    showToast(`${username} is already in the whitelist`, 'error');
  }
}

function renderWhitelistTags() {
  const container = document.getElementById('whitelistTags');
  if (!container) return;
  container.innerHTML = '';

  const owner = latestConfig?.owner || 'Owner';

  currentWhitelist.forEach(user => {
    const chip = document.createElement('div');
    chip.className = 'whitelist-chip';
    const isOwner = user.toLowerCase() === owner.toLowerCase();
    chip.innerHTML = `
      <span>${escapeHtml(user)}</span>
      ${isOwner ? '<span class="chip-owner-tag">Owner</span>' : `<button type="button" class="chip-remove-btn" title="Remove ${user}" data-user="${escapeHtml(user)}">&times;</button>`}
    `;
    container.appendChild(chip);
  });

  container.querySelectorAll('.chip-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetUser = btn.getAttribute('data-user');
      currentWhitelist = currentWhitelist.filter(u => u.toLowerCase() !== targetUser.toLowerCase());
      renderWhitelistTags();
    });
  });
}

export function populateConfigForms(cfg) {
  if (!cfg) return;
  latestConfig = cfg;

  // Header Audience Badge
  const headerAudienceBadge = document.getElementById('headerAudienceBadge');
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
  const autoEatEl = document.getElementById('cfgAutoEat');
  if (autoEatEl && cfg.automation?.autoEatThreshold !== undefined) {
    autoEatEl.value = cfg.automation.autoEatThreshold;
    autoEatEl.dispatchEvent(new Event('input'));
  }

  const autoSleepEl = document.getElementById('cfgAutoSleep');
  if (autoSleepEl && cfg.autoSleep !== undefined) autoSleepEl.checked = !!cfg.autoSleep;

  const autoFarmEl = document.getElementById('cfgAutoFarm');
  if (autoFarmEl && cfg.autoFarm !== undefined) autoFarmEl.checked = !!cfg.autoFarm;

  const replantEl = document.getElementById('cfgReplant');
  if (replantEl && cfg.automation?.autoReplantSaplings !== undefined) replantEl.checked = !!cfg.automation.autoReplantSaplings;

  const bLenEl = document.getElementById('cfgBranchLen');
  if (bLenEl && cfg.automation?.mineBranchLength !== undefined) {
    bLenEl.value = cfg.automation.mineBranchLength;
    bLenEl.dispatchEvent(new Event('input'));
  }

  const torchEl = document.getElementById('cfgTorchSpacing');
  if (torchEl && cfg.automation?.mineTorchSpacing !== undefined) {
    torchEl.value = cfg.automation.mineTorchSpacing;
    torchEl.dispatchEvent(new Event('input'));
  }

  const breedEl = document.getElementById('cfgBreedLimit');
  if (breedEl && cfg.automation?.breedLimit !== undefined) {
    breedEl.value = cfg.automation.breedLimit;
    breedEl.dispatchEvent(new Event('input'));
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

  const followEl = document.getElementById('cfgFollowDist');
  if (followEl && cfg.navigation?.followDistance !== undefined) {
    followEl.value = cfg.navigation.followDistance;
    followEl.dispatchEvent(new Event('input'));
  }

  const roamEl = document.getElementById('cfgRoamRadius');
  if (roamEl && (cfg.navigation?.roamRadius !== undefined || cfg.roamRadius !== undefined)) {
    roamEl.value = cfg.navigation?.roamRadius || cfg.roamRadius;
    roamEl.dispatchEvent(new Event('input'));
  }

  const stuckEl = document.getElementById('cfgStuckTimeout');
  if (stuckEl && cfg.navigation?.antiStuckTimeout !== undefined) {
    stuckEl.value = cfg.navigation.antiStuckTimeout;
    stuckEl.dispatchEvent(new Event('input'));
  }

  const jumpEl = document.getElementById('cfgAutoJump');
  if (jumpEl && cfg.navigation?.autoJumpAssist !== undefined) {
    jumpEl.checked = !!cfg.navigation.autoJumpAssist;
  }
}
