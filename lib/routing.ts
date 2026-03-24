/**
 * Detecta si el dispositivo es realmente móvil usando SOLO el user-agent.
 *
 * ⚠️  NO usar window.innerWidth: en WebViews (apps nativas, PWA) el viewport
 * puede renderizarse inicialmente con el ancho del escritorio (ej. 980 px)
 * antes de que el navegador aplique el meta-viewport, lo que genera falsos
 * negativos en la primera carga y muestra el dashboard de escritorio en móvil.
 */
export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Routing helper — detecta el dispositivo y devuelve la ruta de destino correcta.
 * - Desktop / tablet → Web Dashboard `/web`
 * - Mobile real      → Mobile Dashboard `/dashboard`
 */
export const getPostAuthRoute = (): string =>
  isMobileDevice() ? '/dashboard' : '/web';
