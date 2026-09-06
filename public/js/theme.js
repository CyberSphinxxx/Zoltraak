// ==========================================================================
// Zoltraak Dynamic Theme Engine
// Handles Theme Tokens, Persistence, and Interactive Theme Switcher
// ==========================================================================

export const THEMES = [
  { id: 'arcane', name: 'Arcane Cyber', color: '#00f2fe' },
  { id: 'rose', name: 'Rose Quartz', color: '#fb7185' },
  { id: 'forest', name: 'Emerald Forest', color: '#10b981' },
  { id: 'ocean', name: 'Abyssal Ocean', color: '#38bdf8' },
  { id: 'solar', name: 'Solar Amber', color: '#fbbf24' },
  { id: 'amethyst', name: 'Void Amethyst', color: '#c084fc' }
];

const STORAGE_KEY = 'zoltraak-active-theme';
const listeners = [];

export function getCurrentTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && THEMES.some(t => t.id === saved)) {
    return saved;
  }
  return 'arcane';
}

export function setTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  document.documentElement.setAttribute('data-theme', theme.id);
  localStorage.setItem(STORAGE_KEY, theme.id);

  // Update theme picker UI
  const nameEl = document.getElementById('activeThemeName');
  const dotEl = document.getElementById('activeThemeDot');
  if (nameEl) nameEl.textContent = theme.name;
  if (dotEl) {
    dotEl.style.backgroundColor = theme.color;
    dotEl.style.boxShadow = `0 0 8px ${theme.color}`;
  }

  // Update active state in dropdown
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === theme.id);
  });

  // Notify listeners (e.g., radar canvas redraw)
  listeners.forEach(fn => {
    try {
      fn(theme);
    } catch (e) {
      console.error('Theme listener error:', e);
    }
  });
}

export function onThemeChange(fn) {
  if (typeof fn === 'function') {
    listeners.push(fn);
  }
}

export function initThemeEngine() {
  const active = getCurrentTheme();
  setTheme(active);

  const pickerBtn = document.getElementById('themePickerBtn');
  const dropdown = document.getElementById('themeDropdown');

  if (dropdown) {
    dropdown.innerHTML = '';
    THEMES.forEach(t => {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = `theme-option ${t.id === active ? 'active' : ''}`;
      opt.setAttribute('data-theme', t.id);
      opt.innerHTML = `
        <span class="theme-option-dot" style="background-color: ${t.color}; box-shadow: 0 0 6px ${t.color}"></span>
        <span>${t.name}</span>
      `;
      opt.addEventListener('click', () => {
        setTheme(t.id);
        dropdown.classList.remove('open');
      });
      dropdown.appendChild(opt);
    });
  }

  if (pickerBtn && dropdown) {
    pickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !pickerBtn.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  }
}
