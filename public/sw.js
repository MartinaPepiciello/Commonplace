// Commonplace service worker: keeps the app available offline.
// Online: always fetch the latest files (so a new deploy shows up immediately) and keep a copy.
// Offline or very slow network: serve the saved copy. API calls always go straight to the network.
const CACHE = 'commonplace-v2';
const SHELL = ['/index.html', '/styles.css', '/app.js', '/manifest.webmanifest', '/icon.svg',
  '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
const TIMEOUT_MS = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  const key = e.request.mode === 'navigate' || url.pathname === '/' ? '/index.html' : url.pathname;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const network = fetch(e.request, { cache: 'no-cache' }).then((res) => {
        if (res.ok) e.waitUntil(cache.put(key, res.clone()));
        return res;
      });
      const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS));
      try {
        const res = await Promise.race([network, timeout]);
        if (res) return res;
      } catch {}
      return (await cache.match(key)) || network;
    })
  );
});
