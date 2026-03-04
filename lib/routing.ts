/**
 * Routing helper — detecta el dispositivo y devuelve la ruta de destino correcta.
 * - Desktop (≥1024px) → Web Dashboard `/web`
 * - Mobile / tablet   → Mobile Dashboard `/dashboard`
 */
export const getPostAuthRoute = (): string =>
  window.innerWidth >= 1024 ? '/web' : '/dashboard';
