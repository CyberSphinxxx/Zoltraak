// ==========================================================================
// Zoltraak Tactical Management Console
// Master Application Entrypoint (ES Modules Architecture)
// ==========================================================================

import { initThemeEngine } from './theme.js';
import { initTabs } from './ui/tabs.js';
import { connectSSE, fetchConfig } from './api.js';
import { initRadar, renderRadar } from './components/radar.js';
import { initHUD, renderHUD } from './components/hud.js';
import { initActions, appendLogEntry } from './components/actions.js';
import { initSensory, renderSensory, appendPerceptionLogEntry } from './components/sensory.js';
import { initSettings, populateConfigForms } from './components/settings.js';

let latestTelemetry = null;
let activeTab = 'hud';

function initHeaderElements() {
  const stateBadge = document.getElementById('stateBadge');
  const connIndicator = document.getElementById('connIndicator');
  const connText = document.getElementById('connText');
  const serverInfo = document.getElementById('serverInfo');
  const ownerInfo = document.getElementById('ownerInfo');

  return {
    updateConnection(online) {
      if (connIndicator && connText) {
        connIndicator.className = online ? 'pulse-beacon beacon-online' : 'pulse-beacon beacon-offline';
        connText.textContent = online ? 'Connected' : 'Reconnecting...';
      }
    },
    updateTelemetry(data) {
      if (!data) return;
      if (ownerInfo && data.ownerName) ownerInfo.textContent = data.ownerName;
      if (serverInfo && data.serverHost && data.serverPort) {
        serverInfo.textContent = `${data.serverHost}:${data.serverPort}`;
      }
      if (stateBadge && data.state) {
        stateBadge.textContent = data.state;
        stateBadge.className = 'badge mode-' + data.state.toLowerCase();
      }
    }
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Theme System
  initThemeEngine();

  // 2. Initialize UI Components
  const header = initHeaderElements();
  initRadar();
  initHUD();
  initActions();
  initSensory();

  // 3. Initialize Tabs & Hash Router
  initTabs((tabId) => {
    activeTab = tabId;
    if (tabId === 'hud' && latestTelemetry) {
      renderRadar(latestTelemetry);
    }
  });

  // 4. Initialize Settings
  initSettings((updatedConfig) => {
    populateConfigForms(updatedConfig);
    if (updatedConfig.owner) {
      const ownerEl = document.getElementById('ownerInfo');
      if (ownerEl) ownerEl.textContent = updatedConfig.owner;
    }
  });

  // 5. Fetch Initial Bot Configuration
  const cfg = await fetchConfig();
  if (cfg) {
    populateConfigForms(cfg);
  }

  // 6. Connect Real-time SSE Telemetry Stream
  connectSSE({
    onConnectionStatus(online) {
      header.updateConnection(online);
    },
    onTelemetry(data) {
      latestTelemetry = data;
      header.updateTelemetry(data);
      renderHUD(data);
      renderSensory(data);

      if (activeTab === 'hud') {
        renderRadar(data);
      }
    },
    onLog(entry) {
      appendLogEntry(entry);
    },
    onPerceptionLog(entry) {
      appendPerceptionLogEntry(entry);
    }
  });
});
