// Retire the former offline shell without touching trip data or reloading tabs.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key.startsWith('voltfare-shell-')) await caches.delete(key);
  }
  await self.clients.claim();
  await self.registration.unregister();
})()));
