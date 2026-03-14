// Service Worker mínimo: activar nueva versión de inmediato (skipWaiting)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
