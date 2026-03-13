const CACHE = 'isaac-companion-v3';
const ASSETS = [
  './',
  './index.html',
  './app.js',
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
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
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
