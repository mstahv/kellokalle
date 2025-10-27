const CACHE_NAME = 'lahtokello-v2';
const urlsToCache = [
  '/',
  '/index.html',
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Ohita ulkoiset pyynnöt (esim. API-kutsut tulospalvelu.fi:hin)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Anna ulkoisten pyyntöjen mennä suoraan verkkoon
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
