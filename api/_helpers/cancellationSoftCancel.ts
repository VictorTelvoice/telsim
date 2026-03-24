import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Fecha/hora legible para usuario (es): dd-mm-yyyy HH:mm. Hora local del servidor. */
export function formatCancellationDateTimeForUser(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

/** Desde ISO guardado en `reservation_expires_at` (fin de reserva 48h). */
export function formatCancellationDateTimeFromIso(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatCancellationDateTimeForUser(d);
}

const CANCEL_EVENT = 'cancellation';
const TEMPLATE_EMAIL = `template_email_${CANCEL_EVENT}`;
const TEMPLATE_TELEGRAM = `template_telegram_${CANCEL_EVENT}`;
const TEMPLATE_APP = `template_app_${CANCEL_EVENT}`;

/** Mismos fallbacks que api/webhooks/stripe (plantillas admin vacías). */
const DEFAULT_TELEGRAM_CANCELLATION =
  '❌ *CANCELACIÓN CONFIRMADA*\n\n' +
  '📱 Número: {{phone}}\n' +
  '📦 Plan: {{plan}}\n' +
  '🔴 Estado: {{status}}\n' +
  '📅 Fecha de cierre: {{canceled_at}}\n' +
  '⏳ Reactivación disponible hasta: {{reactivation_deadline}}\n\n' +
  'La cancelación fue procesada correctamente.';
const DEFAULT_APP_CANCELLATION = 'Tu plan {{plan}} quedó cancelado. Podrás reactivar cuando quieras.';
const IN_APP_TITLE_CANCELLATION = '🔴 Suscripción terminada';

function replaceVariables(text: string, data: Record<string, unknown>): string {
  let out = text;
  for (const [key, value] of Object.entries(data)) {
    const val = value != null ? String(value) : '';
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

async function getTemplateContent(
  supabaseAdmin: SupabaseClient,
  templateId: string
): Promise<string | null> {
  try {
    const { data: row } = await supabaseAdmin.from('admin_settings').select('content').eq('id', templateId).maybeSingle();
    const c = (row as { content?: string | null } | null)?.content;
    return c != null && String(c).trim() !== '' ? String(c).trim() : null;
  } catch {
    return null;
  }
}

/** Reserva 48h desde slot ocupado (soft cancel): token en slots, sin pasar por libre. */
export async function reserveSlotSoftCancel(
  supabaseAdmin: SupabaseClient,
  params: { slotId: string; userId: string }
): Promise<{ token: string | null; expiresAt: string | null }> {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('slots')
    .update({
      status: 'reserved',
      reservation_token: token,
      reservation_expires_at: expiresAt,
      reservation_user_id: params.userId,
      reservation_stripe_session_id: null,
      assigned_to: null,
      plan_type: null,
      label: null,
      forwarding_active: false,
    })
    .eq('slot_id', params.slotId)
    .eq('status', 'ocupado')
    .select('reservation_token, reservation_expires_at')
    .maybeSingle();

  if (error) {
    console.error('[soft-cancel] slot reservation update failed', error);
    return { token: null, expiresAt: null };
  }
  if (!data) {
    console.error('[soft-cancel] slot no actualizado (¿no estaba ocupado?)', { slot_id: params.slotId });
    return { token: null, expiresAt: null };
  }
  return { token, expiresAt };
}

/**
 * Envío del correo canónico de cancelación desde manage (mismo contrato que api/webhooks/stripe triggerEmail).
 */
export async function sendCancellationEmailFromManage(
  supabaseAdmin: SupabaseClient,
  params: { userId: string; cancellationPayload: Record<string, unknown> }
): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from('admin_settings')
    .select('content, subject')
    .eq('id', TEMPLATE_EMAIL)
    .maybeSingle();
  const r = row as { content?: string | null; subject?: string | null } | null;
  const contentRaw = r?.content != null && String(r.content).trim() !== '' ? String(r.content).trim() : null;
  const subjectRaw = r?.subject != null && String(r.subject).trim() !== '' ? String(r.subject).trim() : null;

  let bodyOverride =
    contentRaw != null
      ? replaceVariables(contentRaw, params.cancellationPayload)
      : `<p>Hola <strong>${params.cancellationPayload.nombre ?? 'Cliente'}</strong>,</p><p>Tu suscripción <strong>${params.cancellationPayload.plan ?? ''}</strong> quedó en periodo de reactivación (48 h).</p>`;

  let subjectResolved =
    subjectRaw != null
      ? replaceVariables(subjectRaw, params.cancellationPayload)
      : `[Telsim] Aviso de baja: SIM ${params.cancellationPayload.phone_number ?? ''}.`;

  let email =
    (params.cancellationPayload.to_email as string) ||
    (params.cancellationPayload.email as string) ||
    undefined;
  if (!email) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', params.userId)
      .maybeSingle();
    email = userData?.email ?? undefined;
  }
  if (!email) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event: CANCEL_EVENT,
      user_id: params.userId,
      to_email: email,
      data: params.cancellationPayload,
      template_id: TEMPLATE_EMAIL,
      content: bodyOverride,
      subject: subjectResolved,
    }),
  });
  await res.json().catch(() => ({}));
}

/**
 * Telegram de cancelación en soft-cancel (misma plantilla que el webhook; customer.subscription.deleted no dispara al instante).
 */
export async function sendCancellationTelegramFromManage(
  supabaseAdmin: SupabaseClient,
  params: { userId: string; cancellationPayload: Record<string, unknown> }
): Promise<void> {
  console.log('[CANCEL manage] telegram start', { userId: params.userId });
  const raw = await getTemplateContent(supabaseAdmin, TEMPLATE_TELEGRAM);
  const message = replaceVariables(raw ?? DEFAULT_TELEGRAM_CANCELLATION, params.cancellationPayload);

  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id, notification_preferences')
      .eq('id', params.userId)
      .maybeSingle();
    const tgToken = userRow?.telegram_token;
    const tgChatId = userRow?.telegram_chat_id;
    /** Opt-out explícito solo para cancelación (independiente del email / sin dedupe cruzado con email). */
    const prefs = userRow?.notification_preferences as {
      cancellation?: { telegram?: boolean };
    } | null | undefined;
    if (prefs?.cancellation?.telegram === false) {
      console.log('[CANCEL manage] telegram skipped reason=user_opt_out');
      return;
    }
    if (!tgToken || !tgChatId) {
      console.log('[CANCEL manage] telegram skipped reason=no_bot_linked');
      return;
    }
    const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tgChatId, text: message, parse_mode: 'Markdown' }),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    try {
      await supabaseAdmin.from('notification_history').insert({
        user_id: params.userId,
        type: 'telegram',
        event_name: CANCEL_EVENT,
        recipient: `Telegram:${tgChatId}`,
        content: (message || '').slice(0, 500) || null,
        status: tgRes.ok ? 'sent' : 'error',
        error_message: tgRes.ok ? null : (tgData?.description ?? null),
      });
    } catch {
      // no bloquear
    }
    if (tgRes.ok) {
      console.log('[CANCEL manage] telegram sent');
    } else {
      console.warn('[CANCEL manage] telegram failed', tgData?.description ?? tgRes.status);
    }
  } catch (err) {
    console.warn('[CANCEL manage] telegram failed', (err as Error)?.message);
  }
}

/**
 * Toast in-app de cancelación en soft-cancel (template_app_cancellation).
 */
export async function sendCancellationAppFromManage(
  supabaseAdmin: SupabaseClient,
  params: { userId: string; cancellationPayload: Record<string, unknown> }
): Promise<void> {
  const raw = await getTemplateContent(supabaseAdmin, TEMPLATE_APP);
  const appMsg = replaceVariables(raw ?? DEFAULT_APP_CANCELLATION, params.cancellationPayload);

  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: params.userId,
      title: IN_APP_TITLE_CANCELLATION,
      message: appMsg,
      type: 'error',
      is_read: false,
      created_at: new Date().toISOString(),
      source_notification_key: CANCEL_EVENT,
    });
  } catch (e) {
    console.warn('[sendCancellationAppFromManage]', (e as Error)?.message);
  }
}
