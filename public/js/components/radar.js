// ==========================================================================
// Zoltraak Tactical 2D Radar Canvas Component
// Theme-Reactive Multi-Entity & FOV Radar Map
// ==========================================================================

import { onThemeChange } from '../theme.js';

let radarCanvas = null;
let ctx = null;
let radarRange = 24;
let lastTelemetry = null;

const CHEST_COLORS = {
  ores: '#00f2fe',
  valuables: '#00f2fe',
  tools: '#38bdf8',
  weapons: '#ff3366',
  armor: '#a855f7',
  food: '#22c55e',
  wood: '#f59e0b',
  mob: '#ef4444',
  building: '#a855f7',
  default: '#ffcc00'
};

function getThemeColor(cssVar, fallback) {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return val || fallback;
  } catch (e) {
    return fallback;
  }
}

export function initRadar() {
  radarCanvas = document.getElementById('radarCanvas');
  if (radarCanvas) {
    ctx = radarCanvas.getContext('2d');
  }

  const rangeSelect = document.getElementById('radarRange');
  if (rangeSelect) {
    rangeSelect.addEventListener('change', (e) => {
      radarRange = parseInt(e.target.value, 10) || 24;
      if (lastTelemetry) renderRadar(lastTelemetry);
    });
  }

  // Redraw when theme changes
  onThemeChange(() => {
    if (lastTelemetry) renderRadar(lastTelemetry);
  });
}

export function renderRadar(data) {
  if (!ctx || !radarCanvas) return;
  lastTelemetry = data;

  const width = radarCanvas.width;
  const height = radarCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width / 2 - 8;

  ctx.clearRect(0, 0, width, height);

  const themeBg = getThemeColor('--radar-bg', '#0a1020');
  const themeBorder = getThemeColor('--radar-border', 'rgba(0, 242, 254, 0.3)');
  const themeRing = getThemeColor('--radar-ring', 'rgba(255, 255, 255, 0.08)');
  const themeCone = getThemeColor('--radar-cone-start', 'rgba(0, 242, 254, 0.35)');
  const themeBot = getThemeColor('--radar-bot', '#00f2fe');

  // Background circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = themeBg;
  ctx.fill();
  ctx.strokeStyle = themeBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Concentric range rings
  const ringSteps = [0.33, 0.66, 1.0];
  ctx.strokeStyle = themeRing;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  ringSteps.forEach(step => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * step, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px monospace';
    const distText = Math.round(radarRange * step) + 'm';
    ctx.fillText(distText, centerX + 4, centerY - radius * step + 10);
  });

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!data || !data.connected) {
    ctx.restore();
    return;
  }

  const scale = radius / radarRange;
  const botX = data.x !== undefined ? data.x : 0;
  const botZ = data.z !== undefined ? data.z : 0;

  // Draw Registered Chests
  const chestList = Array.isArray(data.chests) ? data.chests : Object.entries(data.chests || {});
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
      ctx.fillStyle = themeBot;
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
  grad.addColorStop(0, themeCone);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius * 0.75, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
  ctx.fill();

  // Draw Bot Center Dot
  ctx.fillStyle = themeBot;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}
