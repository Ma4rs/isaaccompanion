(function () {
  'use strict';

  const API_BASE = 'https://isaac-fastapi.onrender.com';
  const API_TIMEOUT = 5000;
  const PREFIX_PATH = 'isaac-path-';
  const PREFIX_UNLOCK = 'isaac-unlock-';
  const PREFIX_CHALLENGE = 'isaac-challenge-';
  const POOLS = ['treasure', 'devil', 'angel', 'shop', 'boss', 'secret', 'golden', 'planetarium'];
  const QUALITIES = [0, 1, 2, 3, 4];
  const PLACEHOLDER_ICON = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
    '<rect fill="%233d3228" width="48" height="48" rx="4"/>' +
    '<text x="24" y="30" font-size="20" fill="%239a8f84" text-anchor="middle" font-family="sans-serif">?</text></svg>'
  );

  const fallback = window.ISAAC_FALLBACK || { items: [], paths: [], unlocks: [], challenges: [], transformations: [] };

  const state = {
    items: [], itemsSource: null, itemsLoading: true, itemsError: null,
    paths: [], pathsLoading: true, pathsError: null,
    unlocks: [], unlocksLoading: true, unlocksError: null,
    challenges: [], challengesLoading: true, challengesError: null,
    transformations: [], transformationsLoading: true, transformationsError: null
  };

  const app = document.getElementById('app');
  const navLinks = document.querySelectorAll('.nav-link');
  const globalSearchEl = document.getElementById('globalSearch');
  const searchResultsEl = document.getElementById('searchResults');

  const _escEl = document.createElement('span');
  function esc(s) { _escEl.textContent = s; return _escEl.innerHTML; }

  function getRoute() {
    const hash = (location.hash || '#/').slice(1);
    const parts = hash.split('/').filter(Boolean);
    return { path: parts[0] || '', id: parts[1] || null };
  }

  function setNavActive(route) {
    const base = route.path || '/';
    navLinks.forEach(a => {
      const p = a.getAttribute('data-path');
      a.classList.toggle('active',
        p === base || (p === '/items' && base === 'items') ||
        (p === '/paths' && base === 'paths') || (p === '/unlocks' && base === 'unlocks') ||
        (p === '/challenges' && base === 'challenges') || (p === '/transformations' && base === 'transformations')
      );
    });
  }

  function getItemImageUrl(item) {
    if (item && item.iconUrl) return item.iconUrl;
    if (!item || !item.id) return PLACEHOLDER_ICON;
    return 'icons/' + item.id + '.png';
  }

  function mapItem(raw) {
    return {
      id: String(raw.id != null ? raw.id : raw.name != null ? raw.name : ''),
      name: String(raw.name != null ? raw.name : ''),
      description: raw.description != null ? String(raw.description) : undefined,
      iconUrl: raw.icon_url != null ? String(raw.icon_url) : raw.iconUrl != null ? String(raw.iconUrl) : undefined,
      quality: typeof raw.quality === 'number' ? raw.quality : undefined,
      pool: raw.pool != null ? String(raw.pool) : undefined,
      quote: raw.quote != null ? String(raw.quote) : undefined,
      tags: Array.isArray(raw.tags) ? raw.tags : undefined
    };
  }

  // --- Data fetching ---

  function fetchItemsApi() {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), API_TIMEOUT);
    return fetch(API_BASE + '/items', { signal: controller.signal })
      .then(res => { clearTimeout(t); if (!res.ok) throw new Error('API ' + res.status); return res.json(); })
      .then(data => { const list = Array.isArray(data) ? data : (data && (data.items || data.data)) || []; return list.map(mapItem); })
      .catch(() => { clearTimeout(t); throw new Error('API unavailable'); });
  }

  function fetchItemsFallback() {
    return fetch('data/items.fallback.json').then(res => {
      if (!res.ok) throw new Error('Fallback failed'); return res.json();
    }).then(data => { const list = Array.isArray(data) ? data : (data && data.items) || []; return list.map(mapItem); });
  }

  function loadItems() {
    state.itemsLoading = true; state.itemsError = null; render();
    fetchItemsApi()
      .then(list => { state.items = list; state.itemsSource = 'api'; state.itemsLoading = false; render(); })
      .catch(() => fetchItemsFallback().then(list => { state.items = list; state.itemsSource = 'fallback'; state.itemsLoading = false; render(); }))
      .catch(() => { state.items = fallback.items.map(mapItem); state.itemsSource = 'fallback'; state.itemsError = null; state.itemsLoading = false; render(); });
  }

  function loadJson(url, key, fallbackKey) {
    state[key + 'Loading'] = true; state[key + 'Error'] = null;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then(data => { state[key] = Array.isArray(data) ? data : (data && data[key]) || []; state[key + 'Loading'] = false; render(); })
      .catch(() => { state[key] = fallback[fallbackKey || key] || []; state[key + 'Loading'] = false; render(); });
  }

  function loadPaths() { loadJson('data/paths.json', 'paths'); }
  function loadUnlocks() { loadJson('data/unlocks.json', 'unlocks'); }
  function loadChallenges() { loadJson('data/challenges.json', 'challenges'); }
  function loadTransformations() { loadJson('data/transformations.json', 'transformations'); }

  // --- Lookups ---

  function getItemById(id) { return state.items.find(i => i.id === id) || null; }
  function getPathById(id) { return state.paths.find(p => p.id === id) || null; }
  function getUnlockById(id) { return state.unlocks.find(u => u.id === id) || null; }
  function getChallengeById(id) { return state.challenges.find(c => c.id === id) || null; }
  function getTransformationById(id) { return state.transformations.find(t => t.id === id) || null; }

  function getTransformationsForItem(itemName) {
    if (!itemName) return [];
    const name = itemName.toLowerCase();
    return state.transformations.filter(t => (t.items || []).some(n => n.toLowerCase() === name));
  }

  // --- localStorage ---

  function getChecked(prefix, id) {
    try { const raw = localStorage.getItem(prefix + id); if (!raw) return new Set(); const arr = JSON.parse(raw); return new Set(Array.isArray(arr) ? arr : []); } catch { return new Set(); }
  }
  function setChecked(prefix, id, stepIds) { try { localStorage.setItem(prefix + id, JSON.stringify(Array.from(stepIds))); } catch {} }
  function clearChecked(prefix, id) { try { localStorage.removeItem(prefix + id); } catch {} }

  // --- Dashboard stats ---

  function getDashboardStats() {
    let pathsDone = 0, pathsTotal = state.paths.length;
    state.paths.forEach(p => {
      const steps = p.steps || [];
      const checked = getChecked(PREFIX_PATH, p.id);
      if (steps.length > 0 && steps.every(s => checked.has(s.id))) pathsDone++;
    });

    let unlocksDone = 0, unlocksTotal = state.unlocks.length;
    state.unlocks.forEach(u => {
      const steps = u.steps || [];
      const checked = getChecked(PREFIX_UNLOCK, u.id);
      if (steps.length > 0 && steps.every(s => checked.has(s.id))) unlocksDone++;
    });

    let challengesDone = 0, challengesTotal = state.challenges.length;
    state.challenges.forEach(c => {
      const checked = getChecked(PREFIX_CHALLENGE, c.id);
      if (checked.has('done')) challengesDone++;
    });

    const totalDone = pathsDone + unlocksDone + challengesDone;
    const totalAll = pathsTotal + unlocksTotal + challengesTotal;
    const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    return { pathsDone, pathsTotal, unlocksDone, unlocksTotal, challengesDone, challengesTotal, totalDone, totalAll, overallPct };
  }

  // --- Filter state ---

  let currentSearch = '';
  let currentPool = '';
  let currentQuality = '';

  function filterItems(search, pool, quality) {
    let list = state.items;
    const q = (search || '').trim().toLowerCase();
    if (q) list = list.filter(i => (i.name && i.name.toLowerCase().includes(q)) || (i.description && i.description.toLowerCase().includes(q)));
    if (pool) list = list.filter(i => (i.pool || '').toLowerCase() === pool.toLowerCase());
    if (quality !== '' && quality !== null && quality !== undefined) list = list.filter(i => (i.quality != null ? i.quality : 0) === Number(quality));
    return list;
  }

  // --- Global search ---

  function globalSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (q.length < 2) return { items: [], paths: [], unlocks: [], challenges: [], transformations: [] };
    const MAX = 5;
    return {
      items: state.items.filter(i => (i.name && i.name.toLowerCase().includes(q)) || (i.description && i.description.toLowerCase().includes(q))).slice(0, MAX),
      paths: state.paths.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q))).slice(0, MAX),
      unlocks: state.unlocks.filter(u => (u.characterName && u.characterName.toLowerCase().includes(q)) || (u.targetUnlock && u.targetUnlock.toLowerCase().includes(q))).slice(0, MAX),
      challenges: state.challenges.filter(c => (c.name && c.name.toLowerCase().includes(q)) || (c.description && c.description.toLowerCase().includes(q)) || (c.unlock && c.unlock.toLowerCase().includes(q)) || (c.character && c.character.toLowerCase().includes(q))).slice(0, MAX),
      transformations: state.transformations.filter(t => (t.name && t.name.toLowerCase().includes(q)) || (t.description && t.description.toLowerCase().includes(q))).slice(0, MAX)
    };
  }

  function renderSearchResults(results) {
    const sections = [];
    if (results.items.length) {
      sections.push('<div class="search-group"><h3 class="search-group-title">Items</h3>' +
        results.items.map(i => '<a href="#/items/' + encodeURIComponent(i.id) + '" class="search-result-item"><span class="search-result-badge badge-items">Item</span><span class="search-result-name">' + esc(i.name) + '</span>' + (i.description ? '<span class="search-result-desc">' + esc(i.description) + '</span>' : '') + '</a>').join('') + '</div>');
    }
    if (results.paths.length) {
      sections.push('<div class="search-group"><h3 class="search-group-title">Paths</h3>' +
        results.paths.map(p => '<a href="#/paths/' + encodeURIComponent(p.id) + '" class="search-result-item"><span class="search-result-badge badge-paths">Path</span><span class="search-result-name">' + esc(p.name) + '</span></a>').join('') + '</div>');
    }
    if (results.unlocks.length) {
      sections.push('<div class="search-group"><h3 class="search-group-title">Unlocks</h3>' +
        results.unlocks.map(u => '<a href="#/unlocks/' + encodeURIComponent(u.id) + '" class="search-result-item"><span class="search-result-badge badge-unlocks">Unlock</span><span class="search-result-name">' + esc(u.characterName) + '</span></a>').join('') + '</div>');
    }
    if (results.challenges.length) {
      sections.push('<div class="search-group"><h3 class="search-group-title">Challenges</h3>' +
        results.challenges.map(c => '<a href="#/challenges/' + encodeURIComponent(c.id) + '" class="search-result-item"><span class="search-result-badge badge-challenges">Challenge</span><span class="search-result-name">#' + c.number + ' ' + esc(c.name) + '</span></a>').join('') + '</div>');
    }
    if (results.transformations.length) {
      sections.push('<div class="search-group"><h3 class="search-group-title">Transformations</h3>' +
        results.transformations.map(t => '<a href="#/transformations/' + encodeURIComponent(t.id) + '" class="search-result-item"><span class="search-result-badge badge-transforms">Transform</span><span class="search-result-name">' + esc(t.name) + '</span></a>').join('') + '</div>');
    }
    return sections.length ? '<div class="search-results-inner">' + sections.join('') + '</div>' : '<div class="search-results-inner"><p class="search-no-results">No results found.</p></div>';
  }

  function showSearchResults(query) {
    if (!searchResultsEl) return;
    const q = (query || '').trim();
    if (q.length < 2) { searchResultsEl.classList.remove('open'); searchResultsEl.innerHTML = ''; return; }
    searchResultsEl.innerHTML = renderSearchResults(globalSearch(q));
    searchResultsEl.classList.add('open');
  }

  function hideSearchResults() { if (!searchResultsEl) return; searchResultsEl.classList.remove('open'); searchResultsEl.innerHTML = ''; }

  // --- Skeleton helpers ---

  function skeletonCards(count, className) {
    let html = '';
    for (let i = 0; i < count; i++) html += '<div class="' + className + ' skeleton-card" aria-hidden="true"><div class="skeleton-line skeleton-line--short"></div><div class="skeleton-line"></div></div>';
    return html;
  }

  // --- Render: Home dashboard ---

  function renderHome() {
    const s = getDashboardStats();
    const loading = state.pathsLoading || state.unlocksLoading || state.challengesLoading;

    const overallHtml = loading
      ? '<div class="dashboard-overall"><div class="skeleton-line skeleton-line--short"></div></div>'
      : '<div class="dashboard-overall">' +
          '<div class="dashboard-pct">' + s.overallPct + '%</div>' +
          '<div class="dashboard-pct-label">overall guide progress</div>' +
          '<div class="dashboard-overall-bar"><div class="progress-wrap"><div class="progress-bar" style="width:' + s.overallPct + '%"></div></div><span class="progress-text">' + s.totalDone + '/' + s.totalAll + '</span></div>' +
        '</div>';

    function card(href, title, done, total, desc) {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return '<a href="' + href + '" class="home-card">' +
        '<span class="home-card-title">' + title + '</span>' +
        (loading
          ? '<span class="home-card-desc">' + desc + '</span>'
          : '<span class="home-card-stat">' + done + '/' + total + ' completed</span>' +
            '<div class="home-card-bar"><div class="progress-wrap"><div class="progress-bar" style="width:' + pct + '%"></div></div></div>'
        ) +
      '</a>';
    }

    return (
      '<div class="home">' +
        '<h1 class="home-title">Isaac Companion</h1>' +
        '<p class="home-tagline">Your guide to 100% The Binding of Isaac: Repentance</p>' +
        overallHtml +
        '<div class="home-links">' +
          '<a href="#/items" class="home-card"><span class="home-card-title">Items</span><span class="home-card-desc">Browse all 577 items</span></a>' +
          card('#/paths', 'Paths', s.pathsDone, s.pathsTotal, 'Path guides') +
          card('#/unlocks', 'Unlocks', s.unlocksDone, s.unlocksTotal, '34 characters') +
          card('#/challenges', 'Challenges', s.challengesDone, s.challengesTotal, '45 challenges') +
          '<a href="#/transformations" class="home-card"><span class="home-card-title">Transforms</span><span class="home-card-desc">' + state.transformations.length + ' transformations</span></a>' +
        '</div>' +
      '</div>'
    );
  }

  // --- Render: Items ---

  function renderItems(search, pool, quality) {
    if (state.itemsLoading) return '<div class="items"><h1 class="items-title">Items</h1><div class="items-grid">' + skeletonCards(12, 'item-card') + '</div></div>';
    if (state.itemsError) return '<div class="items-error" role="alert">Error: ' + esc(state.itemsError) + '</div>';
    const filtered = filterItems(search, pool, quality);
    const sourceHtml = state.itemsSource ? '<p class="items-source">' + (state.itemsSource === 'api' ? 'Data from API' : 'Using offline fallback') + '</p>' : '';
    const optionsPool = POOLS.map(p => '<option value="' + esc(p) + '"' + (pool === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('');
    const optionsQuality = QUALITIES.map(q => '<option value="' + q + '"' + (Number(quality) === q ? ' selected' : '') + '>Quality ' + q + '</option>').join('');
    const cards = filtered.map(item => {
      const meta = [];
      if (item.quality != null) meta.push('Q' + item.quality);
      if (item.pool) meta.push(esc(item.pool));
      return '<a href="#/items/' + encodeURIComponent(item.id) + '" class="item-card"><img src="' + esc(getItemImageUrl(item)) + '" alt="' + esc(item.name) + '" class="item-card-icon" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_ICON + '\';" /><span class="item-card-name">' + esc(item.name) + '</span>' + (meta.length ? '<span class="item-card-meta">' + meta.join(' &middot; ') + '</span>' : '') + '</a>';
    }).join('');
    return '<div class="items"><h1 class="items-title">Items</h1>' + sourceHtml +
      '<div class="items-toolbar"><input type="search" placeholder="Search items\u2026" class="items-search" data-action="search" value="' + esc(search || '') + '" aria-label="Search items" />' +
      '<select class="items-select" data-action="pool" aria-label="Filter by pool"><option value="">All pools</option>' + optionsPool + '</select>' +
      '<select class="items-select" data-action="quality" aria-label="Filter by quality"><option value="">All quality</option>' + optionsQuality + '</select></div>' +
      '<div class="items-grid">' + cards + '</div>' + (filtered.length === 0 ? '<p class="items-empty">No items match your filters.</p>' : '') + '</div>';
  }

  function renderItemDetail(id) {
    if (state.itemsLoading && state.items.length === 0) return '<div class="item-detail"><a href="#/items" class="item-detail-back">&larr; Items</a><div class="item-detail-card skeleton-card"><div class="skeleton-line skeleton-line--short"></div><div class="skeleton-line"></div></div></div>';
    const item = id ? getItemById(id) : null;
    if (!item) return '<div class="item-detail-missing">Item not found.</div>';
    const meta = [];
    if (item.quality != null) meta.push('Quality ' + item.quality);
    if (item.pool) meta.push(item.pool);
    const tagsHtml = item.tags && item.tags.length ? item.tags.map(t => '<span class="item-detail-tag">' + esc(t) + '</span>').join('') : '';

    const transforms = getTransformationsForItem(item.name);
    const transformsHtml = transforms.length
      ? '<div class="item-transforms"><strong>Contributes to:</strong> ' + transforms.map(t => '<a href="#/transformations/' + encodeURIComponent(t.id) + '" class="transform-link">' + esc(t.name) + '</a>').join(', ') + '</div>'
      : '';

    return '<div class="item-detail"><a href="#/items" class="item-detail-back">&larr; Items</a>' +
      '<article class="item-detail-card" tabindex="-1">' +
        '<img src="' + esc(getItemImageUrl(item)) + '" alt="' + esc(item.name) + '" class="item-detail-icon" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_ICON + '\';" />' +
        '<h1 class="item-detail-name">' + esc(item.name) + '</h1>' +
        (meta.length ? '<p class="item-detail-meta">' + esc(meta.join(' \u00b7 ')) + '</p>' : '') +
        (item.description ? '<p class="item-detail-desc">' + esc(item.description) + '</p>' : '') +
        (item.quote ? '<blockquote class="item-detail-quote">\u201c' + esc(item.quote) + '\u201d</blockquote>' : '') +
        (tagsHtml ? '<div class="item-detail-tags">' + tagsHtml + '</div>' : '') +
        transformsHtml +
      '</article></div>';
  }

  // --- Render: Progress bar ---

  function renderProgressBar(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return '<div class="progress-wrap"><div class="progress-bar" style="width:' + pct + '%"></div></div><span class="progress-text">' + done + '/' + total + '</span>';
  }

  // --- Render: Paths ---

  function renderPaths() {
    if (state.pathsLoading) return '<div class="paths"><h1 class="paths-title">Paths</h1><p class="paths-desc">Step-by-step guides for Repentance paths.</p><div class="paths-grid">' + skeletonCards(6, 'path-card') + '</div></div>';
    if (state.pathsError) return '<div class="paths-error" role="alert">Error: ' + esc(state.pathsError) + '</div>';
    const cards = state.paths.map(p => {
      const steps = p.steps || []; const checked = getChecked(PREFIX_PATH, p.id); const done = steps.filter(s => checked.has(s.id)).length;
      return '<a href="#/paths/' + encodeURIComponent(p.id) + '" class="path-card"><img src="portraits/bosses/' + esc(p.id) + '.png" alt="" class="path-card-portrait" onerror="this.style.display=\'none\'" /><div class="path-card-body"><h2 class="path-card-name">' + esc(p.name) + '</h2>' + (p.description ? '<p class="path-card-desc">' + esc(p.description) + '</p>' : '') + '<div class="card-progress">' + renderProgressBar(done, steps.length) + '</div></div></a>';
    }).join('');
    return '<div class="paths"><h1 class="paths-title">Paths</h1><p class="paths-desc">Step-by-step guides for Repentance paths.</p><div class="paths-grid">' + cards + '</div>' + (state.paths.length === 0 ? '<p class="paths-empty">No paths loaded.</p>' : '') + '</div>';
  }

  function renderChecklist(steps, checked) {
    if (!steps || !steps.length) return '';
    return '<ul class="check-list" role="list">' + steps.map(step => {
      const c = checked.has(step.id);
      return '<li class="check-list-item' + (c ? ' checked' : '') + '" role="listitem"><button type="button" class="check-list-box" data-step-id="' + esc(step.id) + '" aria-pressed="' + c + '" aria-label="' + esc(step.label) + '">' + (c ? '\u2713' : '') + '</button><span class="check-list-label">' + esc(step.label) + '</span></li>';
    }).join('') + '</ul>';
  }

  function renderPathDetail(id) {
    if (state.pathsLoading && state.paths.length === 0) return '<div class="path-detail"><a href="#/paths" class="path-detail-back">&larr; Paths</a><div class="path-detail-card skeleton-card"><div class="skeleton-line skeleton-line--short"></div><div class="skeleton-line"></div></div></div>';
    const path = id ? getPathById(id) : null;
    if (!path) return '<div class="path-detail-missing">Path not found.</div>';
    const checked = getChecked(PREFIX_PATH, id); const steps = path.steps || []; const done = steps.filter(s => checked.has(s.id)).length;
    return '<div class="path-detail" data-path-id="' + esc(id) + '"><a href="#/paths" class="path-detail-back">&larr; Paths</a><article class="path-detail-card" tabindex="-1"><img src="portraits/bosses/' + esc(id) + '.png" alt="" class="path-detail-portrait" onerror="this.style.display=\'none\'" /><h1 class="path-detail-name">' + esc(path.name) + '</h1>' + (path.description ? '<p class="path-detail-desc">' + esc(path.description) + '</p>' : '') + '<div class="detail-progress">' + renderProgressBar(done, steps.length) + '</div>' + renderChecklist(steps, checked) + '<button type="button" class="reset-btn" data-action="reset-path" data-id="' + esc(id) + '">Reset progress</button></article></div>';
  }

  // --- Render: Unlocks ---

  function renderUnlocks() {
    if (state.unlocksLoading) return '<div class="unlocks"><h1 class="unlocks-title">Unlocks</h1><p class="unlocks-desc">How to unlock all 34 characters.</p><div class="unlocks-grid">' + skeletonCards(8, 'unlock-card') + '</div></div>';
    if (state.unlocksError) return '<div class="unlocks-error" role="alert">Error: ' + esc(state.unlocksError) + '</div>';
    const cards = state.unlocks.map(u => {
      const steps = u.steps || []; const checked = getChecked(PREFIX_UNLOCK, u.id); const done = steps.filter(s => checked.has(s.id)).length;
      return '<a href="#/unlocks/' + encodeURIComponent(u.id) + '" class="unlock-card"><img src="portraits/characters/' + esc(u.id) + '.png" alt="" class="unlock-card-portrait" onerror="this.style.display=\'none\'" /><div class="unlock-card-body"><h2 class="unlock-card-name">' + esc(u.targetUnlock) + '</h2><span class="unlock-card-meta">' + esc(u.characterName) + '</span><div class="card-progress">' + renderProgressBar(done, steps.length) + '</div></div></a>';
    }).join('');
    return '<div class="unlocks"><h1 class="unlocks-title">Unlocks</h1><p class="unlocks-desc">How to unlock all 34 characters.</p><div class="unlocks-grid">' + cards + '</div>' + (state.unlocks.length === 0 ? '<p class="unlocks-empty">No unlocks loaded.</p>' : '') + '</div>';
  }

  function renderRewardsTable(rewards) {
    if (!rewards || !rewards.length) return '';
    return '<div class="rewards-section"><h2 class="rewards-title">Completion Rewards</h2>' +
      '<table class="rewards-table"><thead><tr><th>Boss</th><th>Unlocks</th></tr></thead><tbody>' +
      rewards.map(r => '<tr><td>' + esc(r.boss) + '</td><td>' + esc(r.unlock) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function renderUnlockDetail(id) {
    if (state.unlocksLoading && state.unlocks.length === 0) return '<div class="unlock-detail"><a href="#/unlocks" class="unlock-detail-back">&larr; Unlocks</a><div class="unlock-detail-card skeleton-card"><div class="skeleton-line skeleton-line--short"></div><div class="skeleton-line"></div></div></div>';
    const unlock = id ? getUnlockById(id) : null;
    if (!unlock) return '<div class="unlock-detail-missing">Unlock not found.</div>';
    const checked = getChecked(PREFIX_UNLOCK, id); const steps = unlock.steps || []; const done = steps.filter(s => checked.has(s.id)).length;
    return '<div class="unlock-detail" data-unlock-id="' + esc(id) + '"><a href="#/unlocks" class="unlock-detail-back">&larr; Unlocks</a><article class="unlock-detail-card" tabindex="-1"><img src="portraits/characters/' + esc(id) + '.png" alt="" class="unlock-detail-portrait" onerror="this.style.display=\'none\'" /><h1 class="unlock-detail-name">' + esc(unlock.targetUnlock) + '</h1><p class="unlock-detail-meta">' + esc(unlock.characterName) + '</p><div class="detail-progress">' + renderProgressBar(done, steps.length) + '</div>' + renderChecklist(steps, checked) + '<button type="button" class="reset-btn" data-action="reset-unlock" data-id="' + esc(id) + '">Reset progress</button>' + renderRewardsTable(unlock.rewards) + '</article></div>';
  }

  // --- Render: Challenges ---

  function renderChallenges() {
    if (state.challengesLoading) return '<div class="challenges"><h1 class="challenges-title">Challenges</h1><p class="challenges-desc">All 45 challenges and their rewards.</p><div class="challenges-grid">' + skeletonCards(9, 'challenge-card') + '</div></div>';
    if (state.challengesError) return '<div class="challenges-error" role="alert">Error: ' + esc(state.challengesError) + '</div>';
    const cards = state.challenges.map(c => {
      const checked = getChecked(PREFIX_CHALLENGE, c.id); const completed = checked.has('done');
      return '<a href="#/challenges/' + encodeURIComponent(c.id) + '" class="challenge-card' + (completed ? ' challenge-done' : '') + '"><div class="challenge-card-header"><span class="challenge-number">#' + c.number + '</span><span class="difficulty-badge difficulty-badge--' + esc(c.difficulty || 'medium') + '">' + esc(c.difficulty || 'medium') + '</span></div><h2 class="challenge-card-name">' + esc(c.name) + '</h2><span class="challenge-card-meta">' + esc(c.character) + ' &rarr; ' + esc(c.goal) + '</span><span class="challenge-card-unlock">Unlocks: ' + esc(c.unlock) + '</span>' + (completed ? '<span class="challenge-card-check">\u2713</span>' : '') + '</a>';
    }).join('');
    return '<div class="challenges"><h1 class="challenges-title">Challenges</h1><p class="challenges-desc">All 45 challenges and their rewards.</p><div class="challenges-grid">' + cards + '</div>' + (state.challenges.length === 0 ? '<p class="challenges-empty">No challenges loaded.</p>' : '') + '</div>';
  }

  function renderChallengeDetail(id) {
    if (state.challengesLoading && state.challenges.length === 0) return '<div class="challenge-detail"><a href="#/challenges" class="challenge-detail-back">&larr; Challenges</a><div class="challenge-detail-card skeleton-card"><div class="skeleton-line skeleton-line--short"></div><div class="skeleton-line"></div></div></div>';
    const ch = id ? getChallengeById(id) : null;
    if (!ch) return '<div class="challenge-detail-missing">Challenge not found.</div>';
    const checked = getChecked(PREFIX_CHALLENGE, id); const completed = checked.has('done');
    const restrictions = (ch.restrictions || []).map(r => '<li>' + esc(r) + '</li>').join('');
    return '<div class="challenge-detail" data-challenge-id="' + esc(id) + '"><a href="#/challenges" class="challenge-detail-back">&larr; Challenges</a><article class="challenge-detail-card" tabindex="-1"><div class="challenge-detail-header"><span class="challenge-number">#' + ch.number + '</span><span class="difficulty-badge difficulty-badge--' + esc(ch.difficulty || 'medium') + '">' + esc(ch.difficulty || 'medium') + '</span></div><h1 class="challenge-detail-name">' + esc(ch.name) + '</h1>' + (ch.description ? '<p class="challenge-detail-desc">' + esc(ch.description) + '</p>' : '') + '<div class="challenge-meta"><div class="challenge-meta-row"><strong>Character:</strong> ' + esc(ch.character) + '</div><div class="challenge-meta-row"><strong>Goal:</strong> ' + esc(ch.goal) + '</div><div class="challenge-meta-row"><strong>Unlocks:</strong> ' + esc(ch.unlock) + '</div>' + (restrictions ? '<div class="challenge-meta-row"><strong>Restrictions:</strong><ul class="challenge-restrictions">' + restrictions + '</ul></div>' : '') + '</div><div class="challenge-completion"><button type="button" class="check-list-box challenge-done-btn" data-action="toggle-challenge" data-id="' + esc(id) + '" aria-pressed="' + completed + '" aria-label="Mark as completed">' + (completed ? '\u2713' : '') + '</button><span class="challenge-done-label">' + (completed ? 'Completed' : 'Mark as completed') + '</span></div></article></div>';
  }

  // --- Render: Transformations ---

  function renderTransformations() {
    if (state.transformationsLoading) return '<div class="transformations"><h1 class="transformations-title">Transformations</h1><p class="transformations-desc">Collect enough items from a set to trigger a transformation.</p><div class="transformations-grid">' + skeletonCards(7, 'transform-card') + '</div></div>';
    if (state.transformationsError) return '<div class="transformations-error" role="alert">Error: ' + esc(state.transformationsError) + '</div>';
    const cards = state.transformations.map(t => {
      const items = t.items || [];
      return '<a href="#/transformations/' + encodeURIComponent(t.id) + '" class="transform-card"><h2 class="transform-card-name">' + esc(t.name) + '</h2><p class="transform-card-desc">' + esc(t.description) + '</p><span class="transform-card-meta">Requires ' + t.requires + ' of ' + items.length + ' items</span></a>';
    }).join('');
    return '<div class="transformations"><h1 class="transformations-title">Transformations</h1><p class="transformations-desc">Collect enough items from a set to trigger a transformation.</p><div class="transformations-grid">' + cards + '</div>' + (state.transformations.length === 0 ? '<p class="transformations-empty">No transformations loaded.</p>' : '') + '</div>';
  }

  function renderTransformationDetail(id) {
    if (state.transformationsLoading && state.transformations.length === 0) return '<div class="transform-detail"><a href="#/transformations" class="transform-detail-back">&larr; Transformations</a><div class="transform-detail-card skeleton-card"><div class="skeleton-line skeleton-line--short"></div><div class="skeleton-line"></div></div></div>';
    const t = id ? getTransformationById(id) : null;
    if (!t) return '<div class="transform-detail-missing">Transformation not found.</div>';
    const items = t.items || [];
    const itemLinks = items.map(name => {
      const found = state.items.find(i => i.name.toLowerCase() === name.toLowerCase());
      return found
        ? '<li class="transform-item"><a href="#/items/' + encodeURIComponent(found.id) + '">' + esc(name) + '</a></li>'
        : '<li class="transform-item">' + esc(name) + '</li>';
    }).join('');
    return '<div class="transform-detail"><a href="#/transformations" class="transform-detail-back">&larr; Transformations</a><article class="transform-detail-card" tabindex="-1"><h1 class="transform-detail-name">' + esc(t.name) + '</h1><p class="transform-detail-desc">' + esc(t.description) + '</p><p class="transform-detail-req">Requires <strong>' + t.requires + '</strong> of the following ' + items.length + ' items:</p><ul class="transform-items-list">' + itemLinks + '</ul></article></div>';
  }

  // --- Footer ---

  function renderFooter() {
    return '<footer class="site-footer"><span>Isaac Companion &middot; Fan project for <a href="https://store.steampowered.com/app/250900/The_Binding_of_Isaac_Rebirth/" target="_blank" rel="noopener">The Binding of Isaac: Repentance</a></span></footer>';
  }

  // --- Main render ---

  function render() {
    const route = getRoute();
    setNavActive(route);
    app.classList.remove('route-in'); void app.offsetWidth; app.classList.add('route-in');
    let html = '';
    if (route.path === '') html = renderHome();
    else if (route.path === 'items' && !route.id) html = renderItems(currentSearch, currentPool, currentQuality);
    else if (route.path === 'items' && route.id) html = renderItemDetail(route.id);
    else if (route.path === 'paths' && !route.id) html = renderPaths();
    else if (route.path === 'paths' && route.id) html = renderPathDetail(route.id);
    else if (route.path === 'unlocks' && !route.id) html = renderUnlocks();
    else if (route.path === 'unlocks' && route.id) html = renderUnlockDetail(route.id);
    else if (route.path === 'challenges' && !route.id) html = renderChallenges();
    else if (route.path === 'challenges' && route.id) html = renderChallengeDetail(route.id);
    else if (route.path === 'transformations' && !route.id) html = renderTransformations();
    else if (route.path === 'transformations' && route.id) html = renderTransformationDetail(route.id);
    else html = renderHome();
    app.innerHTML = html + renderFooter();
    const article = app.querySelector('article[tabindex]');
    if (article) article.focus({ preventScroll: true });
  }

  // --- Event delegation ---

  app.addEventListener('input', e => {
    if (e.target.matches('[data-action="search"]')) {
      currentSearch = e.target.value;
      const grid = app.querySelector('.items-grid');
      const empty = app.querySelector('.items-empty');
      if (grid) {
        const filtered = filterItems(currentSearch, currentPool, currentQuality);
        grid.innerHTML = filtered.map(item => {
          const meta = [];
          if (item.quality != null) meta.push('Q' + item.quality);
          if (item.pool) meta.push(esc(item.pool));
          return '<a href="#/items/' + encodeURIComponent(item.id) + '" class="item-card"><img src="' + esc(getItemImageUrl(item)) + '" alt="' + esc(item.name) + '" class="item-card-icon" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_ICON + '\';" /><span class="item-card-name">' + esc(item.name) + '</span>' + (meta.length ? '<span class="item-card-meta">' + meta.join(' &middot; ') + '</span>' : '') + '</a>';
        }).join('');
        if (empty) empty.style.display = filtered.length === 0 ? '' : 'none';
        if (!empty && filtered.length === 0) grid.insertAdjacentHTML('afterend', '<p class="items-empty">No items match your filters.</p>');
      }
    }
  });

  app.addEventListener('change', e => {
    if (e.target.matches('[data-action="pool"]')) { currentPool = e.target.value; render(); }
    else if (e.target.matches('[data-action="quality"]')) { currentQuality = e.target.value; render(); }
  });

  app.addEventListener('click', e => {
    const checkBtn = e.target.closest('.check-list-box:not([data-action])');
    if (checkBtn) {
      const stepId = checkBtn.getAttribute('data-step-id');
      const pd = checkBtn.closest('.path-detail[data-path-id]');
      const ud = checkBtn.closest('.unlock-detail[data-unlock-id]');
      if (pd) { const id = pd.getAttribute('data-path-id'); const c = getChecked(PREFIX_PATH, id); if (c.has(stepId)) c.delete(stepId); else c.add(stepId); setChecked(PREFIX_PATH, id, c); render(); }
      else if (ud) { const id = ud.getAttribute('data-unlock-id'); const c = getChecked(PREFIX_UNLOCK, id); if (c.has(stepId)) c.delete(stepId); else c.add(stepId); setChecked(PREFIX_UNLOCK, id, c); render(); }
      return;
    }
    const challengeBtn = e.target.closest('[data-action="toggle-challenge"]');
    if (challengeBtn) { const id = challengeBtn.getAttribute('data-id'); const c = getChecked(PREFIX_CHALLENGE, id); if (c.has('done')) c.delete('done'); else c.add('done'); setChecked(PREFIX_CHALLENGE, id, c); render(); return; }
    const resetPath = e.target.closest('[data-action="reset-path"]');
    if (resetPath) { if (confirm('Reset all progress for this path?')) { clearChecked(PREFIX_PATH, resetPath.getAttribute('data-id')); render(); } return; }
    const resetUnlock = e.target.closest('[data-action="reset-unlock"]');
    if (resetUnlock) { if (confirm('Reset all progress for this unlock?')) { clearChecked(PREFIX_UNLOCK, resetUnlock.getAttribute('data-id')); render(); } }
  });

  app.addEventListener('error', e => {
    if (e.target.tagName === 'IMG' && !e.target.dataset.fallbackApplied) { e.target.dataset.fallbackApplied = '1'; e.target.src = PLACEHOLDER_ICON; }
  }, true);

  // --- Global search events ---

  if (globalSearchEl) {
    globalSearchEl.addEventListener('input', () => showSearchResults(globalSearchEl.value));
    globalSearchEl.addEventListener('focus', () => { if (globalSearchEl.value.trim().length >= 2) showSearchResults(globalSearchEl.value); });
    globalSearchEl.addEventListener('keydown', e => { if (e.key === 'Escape') { hideSearchResults(); globalSearchEl.blur(); } });
  }
  document.addEventListener('click', e => { if (searchResultsEl && !e.target.closest('.search-wrap')) hideSearchResults(); });
  window.addEventListener('hashchange', () => { hideSearchResults(); if (globalSearchEl) globalSearchEl.value = ''; });
  document.addEventListener('keydown', e => { if (e.key === '/' && !e.target.matches('input, select, textarea')) { e.preventDefault(); if (globalSearchEl) globalSearchEl.focus(); } });
  if (searchResultsEl) searchResultsEl.addEventListener('click', e => { if (e.target.closest('a')) hideSearchResults(); });

  // --- Router ---

  window.addEventListener('hashchange', render);
  window.addEventListener('load', () => { loadItems(); loadPaths(); loadUnlocks(); loadChallenges(); loadTransformations(); render(); });
})();
