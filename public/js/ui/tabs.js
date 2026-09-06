// ==========================================================================
// Zoltraak Tab Navigation & Hash Routing System
// ==========================================================================

export function initTabs(onTabSwitch) {
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPages = document.querySelectorAll('.tab-page');

  function switchTab(tabId) {
    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });

    tabPages.forEach(page => {
      page.classList.toggle('active', page.id === `page-${tabId}`);
    });

    if (typeof onTabSwitch === 'function') {
      onTabSwitch(tabId);
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

  return { switchTab };
}
