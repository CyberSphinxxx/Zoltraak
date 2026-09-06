// ==========================================================================
// Zoltraak API Transport & Real-Time SSE Client
// ==========================================================================

import { showToast } from './ui/toast.js';

let evtSource = null;

export function connectSSE({ onTelemetry, onLog, onPerceptionLog, onConnectionStatus }) {
  if (evtSource) {
    evtSource.close();
  }

  evtSource = new EventSource('/api/events');

  evtSource.onopen = () => {
    if (typeof onConnectionStatus === 'function') {
      onConnectionStatus(true);
    }
  };

  evtSource.addEventListener('telemetry', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof onTelemetry === 'function') onTelemetry(data);
    } catch (err) {
      console.error('Failed to parse telemetry event:', err);
    }
  });

  evtSource.addEventListener('log', (e) => {
    try {
      const entry = JSON.parse(e.data);
      if (typeof onLog === 'function') onLog(entry);
    } catch (err) {
      console.error('Failed to parse log event:', err);
    }
  });

  evtSource.addEventListener('perceptionLog', (e) => {
    try {
      const entry = JSON.parse(e.data);
      if (typeof onPerceptionLog === 'function') onPerceptionLog(entry);
    } catch (err) {
      console.error('Failed to parse perception log:', err);
    }
  });

  evtSource.onerror = () => {
    if (typeof onConnectionStatus === 'function') {
      onConnectionStatus(false);
    }
  };
}

export async function dispatchCommand(command) {
  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const result = await res.json();
    if (!result.success) {
      showToast(result.error || 'Command failed', 'error');
    }
    return result;
  } catch (err) {
    showToast('Failed to send command to Zoltraak', 'error');
    throw err;
  }
}

export async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    return data.config || data; // server returns { success, config }, unwrap it
  } catch (e) {
    console.warn('Could not fetch /api/config', e);
    return null;
  }
}

export async function saveSettingsAPI(payload, submitBtn, successNotice, onConfigUpdated) {
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
      if (result.config && typeof onConfigUpdated === 'function') {
        onConfigUpdated(result.config);
      }

      if (result.reconnected) {
        showToast(`Server updated to ${result.config.host}:${result.config.port}. Reconnecting bot...`);
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
    return result;
  } catch (err) {
    showToast('Failed to contact server API', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtn.getAttribute('data-orig') || 'Save Settings';
    }
    throw err;
  }
}
