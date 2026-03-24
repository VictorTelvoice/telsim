import type { SupabaseClient } from '@supabase/supabase-js';
import { logEvent } from './logger.js';

const EVENT = 'reactivation_success';
const TEMPLATE_EMAIL = `template_email_${EVENT}`;
const TEMPLATE_TG = `template_telegram_${EVENT}`;
const TEMPLATE_APP = `template_app_${EVENT}`;

function replaceVariables(text: string, data: Record<string, unknown>): string {
  let out = text;
  for (const [key, value] of Object.entries(data)) {
    const val = value != null ? String(value) : '';
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

const DEFAULT_EMAIL_SUBJECT = '[Telsim] Reactivación exitosa de tu línea {{phone}}';

/** Intro del correo (el cuadro Plan/Estado/SIM/Tipo va en el renderer canónico). El bloque inferior por defecto sale de template_*_below_details o del fallback en send-email. */
const DEFAULT_EMAIL_BODY = `<p>Hola {{nombre}},</p>
<p>Tu línea fue reactivada correctamente en Telsim.</p>`;

const DEFAULT_EMAIL_TITLE = 'Reactivación exitosa';

const DEFAULT_TG = `✅ REACTIVACIÓN EXITOSA

📱 Número: {{phone}}
📦 Plan: {{plan}}
🟢 Estado: {{status}}

Tu línea fue restaurada correctamente en Telsim.`;

const DEFAULT_APP = 'Reactivación exitosa. Tu línea vuelve a estar activa.';

/**
 * Email + Telegram + in-app para reactivation_success (sin pasar por invoice_paid / new_purchase).
 */
export async function sendReactivationSuccessNotifications(
  supabaseAdmin: SupabaseClient,
  params: {
    userId: string;
    data: {
      nombre: string;
      phone: string;
      plan: string;
      status: string;
      /** Mensual / Anual — fila «Tipo de plan» en el renderer. */
      billing_type?: string;
      to_email?: string;
    };
  }
): Promise<void> {
  const d = params.data;
  const payload: Record<string, unknown> = {
    nombre: d.nombre,
    phone: d.phone,
    phone_number: d.phone,
    plan: d.plan,
    status: d.status,
    billing_type: d.billing_type ?? 'Mensual',
    to_email: d.to_email ?? '',
    email: d.to_email ?? '',
  };

  const { data: emailRow } = await supabaseAdmin
    .from('admin_settings')
    .select('content, subject')
    .eq('id', TEMPLATE_EMAIL)
    .maybeSingle();
  const er = emailRow as { content?: string | null; subject?: string | null } | null;
  const contentRaw =
    er?.content != null && String(er.content).trim() !== '' ? String(er.content).trim() : DEFAULT_EMAIL_BODY;
  const subjectRaw =
    er?.subject != null && String(er.subject).trim() !== '' ? String(er.subject).trim() : DEFAULT_EMAIL_SUBJECT;
  const bodyOverride = replaceVariables(contentRaw, payload);
  let subjectResolved = replaceVariables(subjectRaw, payload);

  const { data: titleRow } = await supabaseAdmin
    .from('admin_settings')
    .select('content')
    .eq('id', `${TEMPLATE_EMAIL}_title`)
    .maybeSingle();
  const titleFromDb = (titleRow as { content?: string | null } | null)?.content;
  const contentTitleResolved =
    titleFromDb != null && String(titleFromDb).trim() !== ''
      ? replaceVariables(String(titleFromDb).trim(), payload)
      : DEFAULT_EMAIL_TITLE;

  const { data: belowRow } = await supabaseAdmin
    .from('admin_settings')
    .select('content')
    .eq('id', `${TEMPLATE_EMAIL}_below_details`)
    .maybeSingle();
  const belowFromDb = (belowRow as { content?: string | null } | null)?.content;
  const contentBelowResolved =
    belowFromDb != null && String(belowFromDb).trim() !== ''
      ? replaceVariables(String(belowFromDb).trim(), payload)
      : undefined;

  let email = d.to_email;
  if (!email) {
    const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', params.userId).maybeSingle();
    email = userData?.email ?? undefined;
  }
  if (!email) {
    void logEvent(
      'REACTIVATION_SUCCESS_SKIP_NO_EMAIL',
      'warning',
      'reactivation_success: usuario sin email; no se llama a send-email',
      undefined,
      { user_id: params.userId },
      'manage'
    );
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    void logEvent(
      'REACTIVATION_SUCCESS_SKIP_NO_CONFIG',
      'critical',
      'reactivation_success: falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY',
      undefined,
      { user_id: params.userId },
      'manage'
    );
    return;
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event: EVENT,
      user_id: params.userId,
      to_email: email,
      data: { ...payload, to_email: email, email },
      template_id: TEMPLATE_EMAIL,
      content: bodyOverride,
      subject: subjectResolved,
      contentTitle: contentTitleResolved,
      ...(contentBelowResolved !== undefined ? { contentBelowDetails: contentBelowResolved } : {}),
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    void logEvent(
      'REACTIVATION_SUCCESS_EMAIL_FAILED',
      'error',
      `send-email reactivation_success: ${String((result as { message?: string })?.message ?? (result as { error?: string })?.error ?? res.status)}`,
      email,
      { user_id: params.userId, status: res.status },
      'manage'
    );
  }
  /** Historial email: un solo insert en supabase/functions/send-email. */

  const { data: tgRow } = await supabaseAdmin.from('admin_settings').select('content').eq('id', TEMPLATE_TG).maybeSingle();
  const tgTemplate =
    (tgRow as { content?: string | null } | null)?.content != null &&
    String((tgRow as { content?: string | null }).content).trim() !== ''
      ? String((tgRow as { content?: string | null }).content).trim()
      : DEFAULT_TG;
  const tgMessage = replaceVariables(tgTemplate, payload);

  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id, notification_preferences')
      .eq('id', params.userId)
      .maybeSingle();
    const tgToken = userRow?.telegram_token;
    const tgChatId = userRow?.telegram_chat_id;
    const prefs = userRow?.notification_preferences as {
      sim_expired?: { telegram?: boolean };
      sim_activated?: { telegram?: boolean };
    } | null | undefined;
    const sendTg = prefs?.sim_expired?.telegram === true || prefs?.sim_activated?.telegram === true;
    if (tgToken && tgChatId && sendTg) {
      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: tgMessage, parse_mode: 'Markdown' }),
      });
      const tgData = await tgRes.json().catch(() => ({}));
      try {
        await supabaseAdmin.from('notification_history').insert({
          user_id: params.userId,
          type: 'telegram',
          event_name: EVENT,
          recipient: `Telegram:${tgChatId}`,
          content: tgMessage.slice(0, 500) || null,
          status: tgRes.ok ? 'sent' : 'error',
          error_message: tgRes.ok ? null : (tgData?.description ?? null),
        });
      } catch {
        // no bloquear
      }
    }
  } catch {
    // ignore
  }

  const { data: appRow } = await supabaseAdmin.from('admin_settings').select('content').eq('id', TEMPLATE_APP).maybeSingle();
  const appMsg =
    (appRow as { content?: string | null } | null)?.content != null &&
    String((appRow as { content?: string | null }).content).trim() !== ''
      ? replaceVariables(String((appRow as { content?: string | null }).content).trim(), payload)
      : DEFAULT_APP;

  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: params.userId,
      title: 'Reactivación exitosa',
      message: appMsg,
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
      source_notification_key: EVENT,
    });
  } catch {
    // ignore
  }
}
