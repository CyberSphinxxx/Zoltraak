// ==========================================================================
// Zoltraak Visual Perception & Sensory Observation Feed Component
// Live Environment Tracking, Entity Sight Cards, and Sensory Stream
// ==========================================================================

let activeFilter = 'all';
const allPerceptionEntries = [];
let currentTelemetry = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

export function initSensory() {
  const filterBtns = document.querySelectorAll('.filter-pill[data-filter]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      reapplyPerceptionFilter();
    });
  });

  const clearBtn = document.getElementById('clearPerceptionBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      allPerceptionEntries.length = 0;
      const feed = document.getElementById('perceptionFeed');
      if (feed) feed.innerHTML = '';
    });
  }
}

export function renderSensory(data) {
  if (!data) return;
  currentTelemetry = data;

  // 1. Environmental Sensors
  const envBiome = document.getElementById('envBiome');
  const envLight = document.getElementById('envLight');
  const envWeather = document.getElementById('envWeather');
  const envGround = document.getElementById('envGround');
  const envFacing = document.getElementById('envFacing');
  const envCrosshair = document.getElementById('envCrosshair');
  const gazeTargetName = document.getElementById('gazeTargetName');

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
  }

  // Gaze & Crosshair
  if (data.gaze) {
    const gazeStr = data.gaze.name + (data.gaze.dist !== null && data.gaze.dist !== undefined ? ` (${data.gaze.dist}m)` : '');
    if (gazeTargetName) gazeTargetName.textContent = gazeStr;
    if (envCrosshair) envCrosshair.textContent = gazeStr;
  }

  // Facing Direction
  if (envFacing) {
    if (data.facing) {
      envFacing.textContent = `${data.facing.cardinal} (Yaw ${data.facing.yawDeg}°, Pitch ${data.facing.pitchDeg}°)`;
    } else if (data.yaw !== undefined) {
      const yawDeg = Math.round(((data.yaw * 180 / Math.PI) % 360 + 360) % 360);
      envFacing.textContent = `Facing (Yaw ${yawDeg}°)`;
    }
  }

  // 2. Visible Entities
  renderVisibleEntities(data.visibleEntities || data.entities || []);
}

function renderVisibleEntities(entities) {
  const listEl = document.getElementById('entitiesSightList');
  const countBadge = document.getElementById('sightCountBadge');
  if (!listEl) return;

  if (countBadge) {
    countBadge.textContent = `${entities.length} visible`;
  }

  if (!entities || entities.length === 0) {
    listEl.innerHTML = `
      <div class="sight-empty-state">
        <span class="empty-icon"><svg viewBox="0 0 24 24" class="ui-icon"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg></span>
        <span>No entities in direct sight line</span>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
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

    if (bearing === undefined && currentTelemetry && currentTelemetry.x !== undefined && ent.x !== undefined) {
      const yaw = currentTelemetry.yaw || 0;
      const viewDirX = -Math.sin(yaw);
      const viewDirZ = -Math.cos(yaw);
      const dx = ent.x - currentTelemetry.x;
      const dz = ent.z - currentTelemetry.z;
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
    listEl.appendChild(card);
  });
}

export function appendPerceptionLogEntry(entry, shouldScroll = true) {
  const feed = document.getElementById('perceptionFeed');
  if (!feed) return;

  allPerceptionEntries.push(entry);
  if (allPerceptionEntries.length > 100) allPerceptionEntries.shift();

  if (!matchesPerceptionFilter(entry, activeFilter)) return;

  const el = createPerceptionLogElement(entry);
  feed.appendChild(el);

  while (feed.children.length > 100) {
    feed.removeChild(feed.firstChild);
  }

  if (shouldScroll) {
    feed.scrollTop = feed.scrollHeight;
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
    <span class="perceive-text">${escapeHtml(entry.message || '')}</span>
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
  const feed = document.getElementById('perceptionFeed');
  if (!feed) return;
  feed.innerHTML = '';
  allPerceptionEntries.forEach(entry => {
    if (matchesPerceptionFilter(entry, activeFilter)) {
      feed.appendChild(createPerceptionLogElement(entry));
    }
  });
  feed.scrollTop = feed.scrollHeight;
}
