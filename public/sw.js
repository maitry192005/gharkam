// GharKaam Service Worker Self-Destruct & Cache Purge
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((c) => {
        if (c.url) c.navigate(c.url);
      });
    })
  );
});

// Pass-through to network: Never serve stale cached HTML/CSS
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
