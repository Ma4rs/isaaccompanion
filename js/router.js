(function () {
  'use strict';

  function getRoute() {
    const hash = (location.hash || '#/').slice(1);
    const parts = hash.split('/').filter(Boolean);
    const rawId = parts[1] || null;
    let decodedId = null;
    if (rawId !== null) {
      try { decodedId = decodeURIComponent(rawId); }
      catch { decodedId = rawId; }
    }
    return { path: parts[0] || '', id: decodedId };
  }

  function setNavActive(route, navLinks) {
    const base = route.path || '/';
    navLinks.forEach((a) => {
      const p = a.getAttribute('data-path');
      a.classList.toggle('active',
        p === base || (p === '/items' && base === 'items') ||
        (p === '/trinkets' && base === 'trinkets') ||
        (p === '/paths' && base === 'paths') || (p === '/unlocks' && base === 'unlocks') ||
        (p === '/challenges' && base === 'challenges') || (p === '/transformations' && base === 'transformations') ||
        (p === '/reference' && base === 'reference') || (p === '/pools' && base === 'pools')
      );
    });
  }

  window.IsaacRouter = {
    getRoute,
    setNavActive,
  };
})();

