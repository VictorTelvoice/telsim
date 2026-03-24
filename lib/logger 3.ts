/**
 * Helper de servidor: inserta eventos en la tabla audit_logs.
 * Usa Supabase con service_role para evitar bloqueos de RLS.
 * Para severity 'error' o 'critical', envía alerta a Telegram usando
 * telegram_token y telegram_chat_id del usuario admin en la tabla users (en segundo plano).
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

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

const getAdminClient = () =>
  createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

export type AuditSeverity = 'error' | 'warning' | 'info' | 'critical';

const CONFIG_ALERT_KEY = 'config_alert_telegram_admin_enabled';

/** Consulta si las alertas críticas al Telegram del CEO están habilitadas (admin_settings). */
async function isAlertTelegramAdminEnabled(): Promise<boolean> {
  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from('admin_settings')
      .select('content')
      .eq('id', CONFIG_ALERT_KEY)
      .maybeSingle();
    return String((data as { content?: string } | null)?.content ?? '').toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/**
 * Envía alerta a Telegram en segundo plano (fire-and-forget).
 * Si config_alert_telegram_admin_enabled es 'true', usa TELEGRAM_ADMIN_TOKEN y TELEGRAM_ADMIN_CHAT_ID
 * con detalle del error, ID de suscripción y email del cliente. Si no, usa telegram del usuario admin en users.
 */
async function sendTelegramAlertInBackground(
  eventType: string,
  severity: string,
  message: string,
  userEmail: string | null,
  payload: Record<string, unknown>,
  source: string
): Promise<void> {
  try {
    const clientEmail = userEmail ?? (payload?.customer_email as string) ?? (payload?.user_email as string) ?? null;
    const subscriptionId = (payload?.subscription_id as string) ?? null;
    const payloadSnippet =
      Object.keys(payload || {}).length > 0
        ? '\n<pre>' + JSON.stringify(payload).slice(0, 500) + (JSON.stringify(payload).length > 500 ? '…' : '') + '</pre>'
        : '';

    const enabled = await isAlertTelegramAdminEnabled();
    const adminToken = process.env.TELEGRAM_ADMIN_TOKEN?.trim();
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

    if (enabled && adminToken && adminChatId) {
      const text =
        `<b>🚨 ${severity.toUpperCase()}</b>\n<b>${eventType}</b>\n${message || '—'}` +
        (clientEmail ? `\n👤 Email: <code>${String(clientEmail).replace(/</g, '&lt;')}</code>` : '') +
        (subscriptionId ? `\n📋 Suscripción: <code>${String(subscriptionId)}</code>` : '') +
        (source ? `\n📍 ${source}` : '') +
        payloadSnippet;
      await fetch(`https://api.telegram.org/bot${adminToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML' }),
      });
      return;
    }

    const supabase = getAdminClient();
    const { data, error: selectError } = await supabase
      .from('users')
      .select('telegram_token, telegram_chat_id')
      .eq('id', ADMIN_UID)
      .maybeSingle();

    if (selectError || !data?.telegram_token?.trim() || !data?.telegram_chat_id?.trim()) return;

    const token = data.telegram_token.trim();
    const chatId = data.telegram_chat_id.trim();
    const text = `<b>🚨 ${severity.toUpperCase()}</b>\n<b>${eventType}</b>\n${message || '—'}${clientEmail ? `\n👤 ${clientEmail}` : ''}${subscriptionId ? `\n📋 sub: ${subscriptionId}` : ''}${source ? `\n📍 ${source}` : ''}${payloadSnippet}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {
    // Ignorar errores para no afectar el flujo principal
  }
}

/**
 * Inserta un registro en audit_logs.
 * Solo guarda el payload completo cuando severity es 'error' o 'critical'; en 'info' o 'warning' se guarda solo el mensaje (payload vacío) para ahorrar espacio.
 * Si la severidad es 'error' o 'critical', lanza en segundo plano el envío de alerta a Telegram con las credenciales del admin en users (sin bloquear).
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

    if (sev === 'error' || sev === 'critical') {
      void sendTelegramAlertInBackground(
        eventType,
        sev,
        message ?? '',
        userEmail ?? null,
        storeFullPayload ? (payload ?? {}) : {},
        source ?? 'app'
      );
    }
  } catch (err) {
    console.error('[logEvent] Error escribiendo en audit_logs:', err);
  }
}
