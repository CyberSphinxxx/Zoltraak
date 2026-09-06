// ==========================================================================
// Zoltraak Action Control & Live Console Terminal Component
// One-Click Bot Commands and Real-Time Chat Log Stream
// ==========================================================================

import { dispatchCommand } from '../api.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

export function initActions() {
  // Command button clicks
  document.querySelectorAll('.cmd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) dispatchCommand(cmd);
    });
  });

  // Terminal command input form
  const cmdForm = document.getElementById('cmdForm');
  const cmdInput = document.getElementById('cmdInput');
  if (cmdForm && cmdInput) {
    cmdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = cmdInput.value.trim();
      if (cmd) {
        dispatchCommand(cmd);
        cmdInput.value = '';
      }
    });
  }

  // Clear console button
  const clearConsoleBtn = document.getElementById('clearConsoleBtn');
  if (clearConsoleBtn) {
    clearConsoleBtn.addEventListener('click', () => {
      const feed = document.getElementById('consoleFeed');
      if (feed) feed.innerHTML = '';
    });
  }
}

export function appendLogEntry(entry) {
  const consoleFeed = document.getElementById('consoleFeed');
  if (!consoleFeed) return;

  const el = document.createElement('div');
  el.className = `log-entry ${entry.type || 'system'}`;
  el.innerHTML = `<span class="log-time">${entry.time || '--:--:--'}</span><span class="log-sender">[${escapeHtml(entry.sender || 'System')}]</span> ${escapeHtml(entry.message || '')}`;
  consoleFeed.appendChild(el);
  consoleFeed.scrollTop = consoleFeed.scrollHeight;
}
