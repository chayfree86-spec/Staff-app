// Bump this string on any change to force old caches to be cleared on activate.
const CACHE_NAME = 'staff-app-cache-v5';

// Minimal app shell kept only so the app can still open offline. Everything
// else (hashed build assets, icons, fonts) is cached on demand as requested.
const OFFLINE_URL = '/index.html';
const PRECACHE = ['/index.html', '/manifest.json', '/pwa-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      // Activate this new worker immediately instead of waiting for all tabs
      // to close, so a freshly deployed build takes over right away.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null))))
      .then(() => self.clients.claim())
  );
});

// Lets the page tell the worker to activate at once (used by the update flow).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch the API — data must always come straight from the server.
  if (url.pathname.includes('/api/')) return;

  const isNavigation =
    req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  // HTML / page loads: ALWAYS fetch fresh from the network, bypassing the HTTP
  // cache, so the newest index.html — which references the newest hashed
  // JS/CSS — always loads. The cached copy is only a fallback for offline.
  if (isNavigation) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(OFFLINE_URL, copy));
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Hashed build assets are content-hashed (a new build = new filenames), so
  // they are immutable and safe to serve cache-first for instant loads.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Everything else (icons, fonts, manifest): network-first, fall back to cache
  // when offline so updated files show up immediately while still working offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
