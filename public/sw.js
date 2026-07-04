const CACHE_NAME = 'staff-app-cache-v3';
const OFFLINE_URL = '/';

const INITIAL_CACHES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(INITIAL_CACHES);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Always delete old caches to ensure fresh load
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // CRITICAL: NEVER cache API calls. Data must always come directly from the API.
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network First Strategy for other assets:
  // Try fetching from the network first. If successful, update the cache and return the response.
  // If the network is offline or fails, fallback to the cached version.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, clone and save in cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For HTML navigation requests, return the root offline URL
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
