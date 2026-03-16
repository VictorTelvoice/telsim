/** Detecta si el dispositivo es realmente móvil (user agent o viewport muy estrecho). */
export const isMobileDevice = (): boolean => {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  }
  if (typeof window !== 'undefined') {
    if (window.innerWidth < 480) return true;
  }
  return false;
};

/**
 * Routing helper — detecta el dispositivo y devuelve la ruta de destino correcta.
 * - Desktop / tablet → Web Dashboard `/web`
 * - Mobile real      → Mobile Dashboard `/dashboard`
 */
export const getPostAuthRoute = (): string =>
  isMobileDevice() ? '/dashboard' : '/web';
