const CACHE = 'isaac-companion-v6';
const RUNTIME_CACHE = 'isaac-companion-runtime-v2';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './js/router.js',
  './js/data.js',
  './js/search.js',
  './supabase.js',
  './auth-ui.js',
  './styles.css',
  './manifest.json',
  './data/fallback.js',
  './data/items.fallback.json',
  './data/paths.json',
  './data/unlocks.json',
  './data/challenges.json',
  './data/transformations.json',
  './data/trinkets.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const url = new URL(e.request.url);
    const isAssetImage = url.pathname.startsWith('/icons/') || url.pathname.startsWith('/portraits/');

    if (isAssetImage) {
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      const runtimeCached = await runtimeCache.match(e.request);
      if (runtimeCached) return runtimeCached;
      try {
        const networkRes = await fetch(e.request);
        if (networkRes.ok) runtimeCache.put(e.request, networkRes.clone());
        return networkRes;
      } catch {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    }

    const cached = await caches.match(e.request);

    // Return cached content immediately when available, then refresh cache in background.
    if (cached) {
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      }).catch(() => {});
      return cached;
    }

    try {
      const res = await fetch(e.request);
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    } catch {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
