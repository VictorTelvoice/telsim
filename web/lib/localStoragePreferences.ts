/**
 * Patrón reutilizable: preferencias en localStorage con JSON seguro.
 * No lanza; tolera modo privado / cuota / JSON inválido.
 */

export function safeReadLocalStorageJson<T extends Record<string, unknown>>(
  key: string,
  fallback: T
): T {
  if (typeof window === 'undefined') return { ...fallback };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...fallback };
    return { ...fallback, ...(parsed as T) };
  } catch {
    return { ...fallback };
  }
}

export function safeWriteLocalStorageJson(key: string, value: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop: quota exceeded, private mode, etc. */
  }
}
