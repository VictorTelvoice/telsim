/**
 * Helper de servidor: inserta eventos en la tabla audit_logs.
 * Usa Supabase con service_role para evitar bloqueos de RLS.
 *
 * Esquema en Supabase (crear tabla si no existe):
 *   create table audit_logs (
 *     id uuid primary key default gen_random_uuid(),
 *     event_type text not null,
 *     severity text default 'info',
 *     message text,
 *     user_email text,
 *     payload jsonb default '{}',
 *     source text default 'app',
 *     created_at timestamptz default now()
 *   );
 */

import { createClient } from '@supabase/supabase-js';

const getAdminClient = () =>
  createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

export type AuditSeverity = 'error' | 'warning' | 'info' | 'critical';

/**
 * Inserta un registro en audit_logs.
 * Solo guarda el payload completo cuando severity es 'error' o 'critical'; en 'info' o 'warning' se guarda solo el mensaje (payload vacío) para ahorrar espacio.
 */
export async function logEvent(
  eventType: string,
  severity?: AuditSeverity,
  message?: string,
  userEmail?: string | null,
  payload?: Record<string, unknown>,
  source?: string
): Promise<void> {
  try {
    const sev = severity ?? 'info';
    const storeFullPayload = sev === 'error' || sev === 'critical';
    const supabase = getAdminClient();
    await supabase.from('audit_logs').insert({
      event_type: eventType,
      severity: sev,
      message: message ?? '',
      user_email: userEmail ?? null,
      payload: storeFullPayload ? (payload ?? {}) : {},
      source: source ?? 'app',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[logEvent] Error escribiendo en audit_logs:', err);
  }
}
