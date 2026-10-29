const CACHE_NAME = 'pea-watsing-shell-v7';
const SHELL = ['/', '/styles.css', '/app.js', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache API calls, POSTs, cross-origin requests, or browser navigation to API.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Clone before returning the original response so its body is not consumed first.
        const copy = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .catch(() => {})
        );
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      const shell = await caches.match('/');
      if (shell && request.mode === 'navigate') return shell;
      return new Response('ออฟไลน์และไม่มีข้อมูลที่บันทึกไว้', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
