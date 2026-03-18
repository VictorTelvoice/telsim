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