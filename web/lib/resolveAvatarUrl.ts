const STRIP_INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

function stripAndTrim(raw: unknown): string {
  if (raw == null) return '';
  return String(raw).replace(STRIP_INVISIBLE, '').trim();
}

/**
 * Valida que el string sea una URL http/https parseable.
 * Si no lo es, devuelve null para evitar imágenes rotas.
 */
export function sanitizeHttpUrl(raw: unknown): string | null {
  const s = stripAndTrim(raw);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return s;
  } catch {
    return null;
  }
}

/**
 * Resolución de avatar con prioridad de negocio:
 * 1) `public.users.avatar_url` (representado como `user.avatar_url`)
 * 2) `auth.user.user_metadata.avatar_url`
 * 3) `auth.user.user_metadata.picture`
 * 4) null (fallback a iniciales desde la UI)
 */
export function resolveAvatarUrlForUi(user: any): string | null {
  const usersAvatar = user?.avatar_url ?? null;
  const md = user?.user_metadata ?? null;
  const mdAvatar = md?.avatar_url ?? null;
  const mdPicture = md?.picture ?? null;

  // Importantísimo: si `users.avatar_url` existe (y es válida), no se pisa con metadata.
  return sanitizeHttpUrl(usersAvatar) ?? sanitizeHttpUrl(mdAvatar) ?? sanitizeHttpUrl(mdPicture);
}

