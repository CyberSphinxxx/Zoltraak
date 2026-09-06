// ==========================================================================
// Zoltraak Vitals, Coordinates & Inventory HUD Component
// Vector Item SVGs, Equipment Armor Management & Item Actions
// ==========================================================================

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

const ARMOR_PLACEHOLDERS = {
  5: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M12 2a8 8 0 0 0-8 8v4c0 3 2 6 8 8 6-2 8-5 8-8v-4a8 8 0 0 0-8-8z"/><path d="M4 10h16"/></svg>',
  6: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M6 4 2 8v4l4 2v6h12v-6l4-2V8l-4-4-4 3h-4z"/></svg>',
  7: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M6 3h12v7l-2 11h-3.5L12 11l-.5 10H8L6 10z"/></svg>',
  8: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M4 4h6v9l3 2v5H4zm10 0h6v9l-3 2v5h-6z"/></svg>',
  45: '<svg viewBox="0 0 24 24" class="ui-icon armor-icon-ph"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
};

export function getItemIcon(name) {
  if (!name) return DEFAULT_ITEM_SVG;
  const lower = name.toLowerCase();
  for (const [key, iconSvg] of Object.entries(ITEM_ICONS)) {
    if (lower.includes(key)) return iconSvg;
  }
  return DEFAULT_ITEM_SVG;
}

// ==========================================================================
// Item Action Popup (context menu)
// ==========================================================================

let popup = null;
let popupItem = null; // { slot, name, displayName, count }

function createPopup() {
  const el = document.createElement('div');
  el.id = 'itemActionPopup';
  el.className = 'item-action-popup';
  el.style.display = 'none';
  el.innerHTML = `
    <div class="popup-header">
      <span class="popup-item-icon" id="popupItemIcon"></span>
      <div class="popup-item-info">
        <span class="popup-item-name" id="popupItemName">—</span>
        <span class="popup-item-count" id="popupItemCount"></span>
      </div>
      <button class="popup-close-btn" id="popupCloseBtn">
        <svg viewBox="0 0 24 24" class="ui-icon mini-icon"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="popup-actions">
      <button class="popup-action-btn" id="popupDrop1">
        <svg viewBox="0 0 24 24" class="ui-icon mini-icon"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M5 21h14"/></svg>
        Drop 1
      </button>
      <button class="popup-action-btn" id="popupDropAll">
        <svg viewBox="0 0 24 24" class="ui-icon mini-icon"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M5 21h14"/></svg>
        Drop All
      </button>
      <div class="popup-divider"></div>
      <button class="popup-action-btn" id="popupEquipHand">
        <svg viewBox="0 0 24 24" class="ui-icon mini-icon"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M6 14a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-2.5"/></svg>
        Equip (Main Hand)
      </button>
      <button class="popup-action-btn" id="popupEquipOffhand">
        <svg viewBox="0 0 24 24" class="ui-icon mini-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Equip (Off Hand)
      </button>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

function showPopup(item, anchorEl) {
  if (!popup) popup = createPopup();
  popupItem = item;

  document.getElementById('popupItemIcon').innerHTML = getItemIcon(item.name);
  document.getElementById('popupItemName').textContent = item.displayName || item.name;
  document.getElementById('popupItemCount').textContent = `x${item.count} · Slot ${item.slot}`;

  // Position near the clicked slot
  const rect = anchorEl.getBoundingClientRect();
  popup.style.display = 'block';
  const pw = popup.offsetWidth || 220;
  const ph = popup.offsetHeight || 180;
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 6;

  // Flip if overflowing viewport
  if (left + pw > window.innerWidth) left = window.innerWidth - pw - 8;
  if (top + ph > window.innerHeight) top = rect.top + window.scrollY - ph - 6;

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function hidePopup() {
  if (popup) popup.style.display = 'none';
  popupItem = null;
}

async function apiInventoryAction(endpoint, body) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function initPopupListeners() {
  document.getElementById('popupCloseBtn').addEventListener('click', hidePopup);

  document.getElementById('popupDrop1').addEventListener('click', async () => {
    if (!popupItem) return;
    const result = await apiInventoryAction('/api/inventory/drop', { slot: popupItem.slot, count: 1 });
    hidePopup();
    showSlotFeedback(popupItem.slot, result.success ? 'success' : 'error');
  });

  document.getElementById('popupDropAll').addEventListener('click', async () => {
    if (!popupItem) return;
    const result = await apiInventoryAction('/api/inventory/drop', { slot: popupItem.slot, count: 'all' });
    hidePopup();
    showSlotFeedback(popupItem.slot, result.success ? 'success' : 'error');
  });

  document.getElementById('popupEquipHand').addEventListener('click', async () => {
    if (!popupItem) return;
    const result = await apiInventoryAction('/api/inventory/equip', { slot: popupItem.slot, destination: 'hand' });
    hidePopup();
    showSlotFeedback(popupItem.slot, result.success ? 'success' : 'error');
  });

  document.getElementById('popupEquipOffhand').addEventListener('click', async () => {
    if (!popupItem) return;
    const result = await apiInventoryAction('/api/inventory/equip', { slot: popupItem.slot, destination: 'off-hand' });
    hidePopup();
    showSlotFeedback(popupItem.slot, result.success ? 'success' : 'error');
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (popup && popup.style.display !== 'none' && !popup.contains(e.target)) {
      hidePopup();
    }
  }, true);
}

// Briefly flash a slot green/red to confirm the action
function showSlotFeedback(slot, type) {
  const el = document.getElementById(`slot-${slot}`);
  if (!el) return;
  el.classList.add(`slot-feedback-${type}`);
  setTimeout(() => el.classList.remove(`slot-feedback-${type}`), 700);
}

// ==========================================================================
// Keep track of current inventory items for popup reference
// ==========================================================================
let currentInventoryItems = [];

// ==========================================================================
// HUD Init
// ==========================================================================
let latestTelemetryCoords = null;

export function initHUD() {
  const mainInvGrid = document.getElementById('mainInvGrid');
  const hotbarGrid = document.getElementById('hotbarGrid');

  if (mainInvGrid && hotbarGrid) {
    mainInvGrid.innerHTML = '';
    hotbarGrid.innerHTML = '';

    for (let i = 9; i <= 35; i++) {
      const slotWrap = document.createElement('div');
      slotWrap.className = 'slot-wrap';
      slotWrap.setAttribute('data-slot', i);
      slotWrap.innerHTML = `<div id="slot-${i}" class="inv-slot" data-slot="${i}"></div>`;
      mainInvGrid.appendChild(slotWrap);
    }

    for (let i = 36; i <= 44; i++) {
      const slotWrap = document.createElement('div');
      slotWrap.className = 'slot-wrap';
      slotWrap.setAttribute('data-slot', i);
      slotWrap.innerHTML = `<div id="slot-${i}" class="inv-slot" data-slot="${i}"></div>`;
      hotbarGrid.appendChild(slotWrap);
    }
  }

  // Slot click handler — delegate from container level
  const invContainer = document.querySelector('.inventory-container');
  if (invContainer) {
    invContainer.addEventListener('click', (e) => {
      const slotEl = e.target.closest('.inv-slot');
      if (!slotEl) return;
      const slotIndex = parseInt(slotEl.getAttribute('data-slot'), 10);
      const item = currentInventoryItems.find(it => it.slot === slotIndex);
      if (item) {
        e.stopPropagation();
        showPopup(item, slotEl);
      }
    });
  }

  // Create the popup and bind its buttons once
  popup = createPopup();
  initPopupListeners();

  const copyCoordsBtn = document.getElementById('copyCoordsBtn');
  if (copyCoordsBtn) {
    copyCoordsBtn.addEventListener('click', () => {
      if (latestTelemetryCoords) {
        const str = `/tp ${Math.round(latestTelemetryCoords.x)} ${Math.round(latestTelemetryCoords.y)} ${Math.round(latestTelemetryCoords.z)}`;
        navigator.clipboard.writeText(str).then(() => {
          copyCoordsBtn.innerHTML = '<svg viewBox="0 0 24 24" class="ui-icon mini-icon"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
          setTimeout(() => {
            copyCoordsBtn.innerHTML = '<svg viewBox="0 0 24 24" class="ui-icon mini-icon"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy';
          }, 1500);
        });
      }
    });
  }
}

export function renderHUD(data) {
  if (!data) return;
  latestTelemetryCoords = data;

  // Vitals
  const hp = Math.max(0, Math.min(20, data.health || 0));
  const hpPct = (hp / 20) * 100;
  const hpBar = document.getElementById('hpBar');
  const hpText = document.getElementById('hpText');
  if (hpBar) hpBar.style.width = hpPct + '%';
  if (hpText) hpText.textContent = `${hp} / 20`;

  const food = Math.max(0, Math.min(20, data.food || 0));
  const foodPct = (food / 20) * 100;
  const foodBar = document.getElementById('foodBar');
  const foodText = document.getElementById('foodText');
  if (foodBar) foodBar.style.width = foodPct + '%';
  if (foodText) foodText.textContent = `${food} / 20`;

  // Coordinates
  const coordX = document.getElementById('coordX');
  const coordY = document.getElementById('coordY');
  const coordZ = document.getElementById('coordZ');
  if (coordX) coordX.textContent = data.x !== undefined ? data.x.toFixed(1) : '0.0';
  if (coordY) coordY.textContent = data.y !== undefined ? data.y.toFixed(1) : '64.0';
  if (coordZ) coordZ.textContent = data.z !== undefined ? data.z.toFixed(1) : '0.0';

  const dimensionBadge = document.getElementById('dimensionBadge');
  if (dimensionBadge && data.dimension) {
    dimensionBadge.textContent = data.dimension.toUpperCase().replace('MINECRAFT:', '');
  }

  // Inventory
  currentInventoryItems = data.inventory || [];
  renderInventory(currentInventoryItems);
}

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
      el.classList.remove('inv-slot-filled');
    }
  }

  let filledCount = 0;
  items.forEach(item => {
    const el = document.getElementById(`slot-${item.slot}`);
    if (el) {
      filledCount++;
      const icon = getItemIcon(item.name);
      el.innerHTML = `${icon}<span class="item-count">${item.count > 1 ? item.count : ''}</span>`;
      el.setAttribute('title', `${item.displayName || item.name} (x${item.count}) — Click to manage`);
      el.classList.add('inv-slot-filled');
    }
  });

  const invCountBadge = document.getElementById('invCountBadge');
  if (invCountBadge) {
    invCountBadge.textContent = `${filledCount} / 36 slots`;
  }
}
