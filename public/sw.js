// Service Worker: actualización inmediata + nunca cachear API/Supabase

const SUPABASE_ORIGIN = 'supabase.co';
const API_PATH = '/api/';

function isNetworkOnlyRequest(url) {
  const u = url.toString();
  return u.includes(SUPABASE_ORIGIN) || u.includes(API_PATH);
}

// Tomar control en cuanto haya nueva versión (sin esperar a cerrar pestañas)
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Activar: reclamar clientes, limpiar cachés antiguos, avisar a la app para refrescar auth
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      try {
        const channel = new BroadcastChannel('sw-messages');
        channel.postMessage({ type: 'AUTH_REFRESH' });
        channel.close();
      } catch (_) {}
    })()
  );
});

// API y Supabase: siempre red (NetworkOnly). Nunca servir respuestas de DB desde caché.
self.addEventListener('fetch', (event) => {
  if (!event.request.url || !isNetworkOnlyRequest(event.request.url)) return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        JSON.stringify({ error: 'network_error' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    })
  );
});
