import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA migration cleanup (TEMPORAL)
// Objetivo: desactivar Service Workers antiguos que pueden seguir controlando la app en producción
// y limpiar caches obsoletos para que no sirvan bundles viejos / respuestas HTML por MIME incorrecto.
// Nota: Esto es una migración temporal; NO re-registramos el SW desde aquí.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const LEGACY_SW_CLEANUP_FLAG_KEY = 'pwa_legacy_sw_cleanup_done_v1';
  const alreadyCleaned = (() => {
    try {
      return window.localStorage.getItem(LEGACY_SW_CLEANUP_FLAG_KEY) === '1';
    } catch {
      return false;
    }
  })();

  if (!alreadyCleaned) {
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map((reg) =>
            reg.unregister().catch(() => {
              // non-critical: seguimos limpiando caches
            })
          )
        );

        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(
            cacheKeys.map((key) =>
              caches.delete(key).catch(() => {
                // non-critical
              })
            )
          );
        }
      } finally {
        try {
          window.localStorage.setItem(LEGACY_SW_CLEANUP_FLAG_KEY, '1');
        } catch {
          // ignore
        }
      }
    })();
  }
}

// PWA: Service Worker temporalmente DESHABILITADO (producción)
// Deshabilitado temporalmente para evitar problemas de cache en producción
// (p. ej. servir bundles viejos / MIME type incorrecto).
//
// Nota: public/sw.js se mantiene; solo se desactiva el registro desde aquí.
// if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js').then((reg) => {
//     if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
//     reg.addEventListener('updatefound', () => {
//       const w = reg.installing;
//       if (w) {
//         w.addEventListener('statechange', () => {
//           if (w.state === 'installed' && navigator.serviceWorker.controller) {
//             w.postMessage({ type: 'SKIP_WAITING' });
//           }
//         });
//       }
//     });
//   }).catch(() => {});
//   navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
// }