import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Reemplaza patrones {{variable}} en text con los valores de data.
 * Ej: replaceVariables('Hola {{nombre}}, plan {{plan}}', { nombre: 'Juan', plan: 'Pro' }) → 'Hola Juan, plan Pro'
 */
export function replaceVariables(text: string, data: Record<string, unknown>): string {
  let out = text;
  for (const [key, value] of Object.entries(data)) {
    const val = value != null ? String(value) : '';
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

/**
 * Obtiene el content de admin_settings para un id dado (ej: template_email_purchase_success).
 */
export async function getTemplateContent(templateId: string): Promise<string | null> {
  try {
    const { data: row } = await supabaseAdmin
      .from('admin_settings')
      .select('content')
      .eq('id', templateId)
      .maybeSingle();
    const content = (row as { content?: string | null } | null)?.content;
    return content != null && content.trim() !== '' ? content.trim() : null;
  } catch {
    return null;
  }
}

export async function triggerEmail(
  event: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const templateId = `template_email_${event}`;
  let bodyOverride: string | null = null;
  const templateContent = await getTemplateContent(templateId);
  if (templateContent) {
    bodyOverride = replaceVariables(templateContent, data);
  }

  console.log('[triggerEmail] Llamando send-email:', event, 'userId:', userId);
  try {
    let email = (data?.to_email as string) ?? (data?.email as string) ?? undefined;
    if (!email) {
      const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', userId).maybeSingle();
      email = userData?.email;
    }
    if (!email) {
      console.error('[triggerEmail] {"error":"No email address resolved"}');
      return;
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.warn('[triggerEmail] Missing env vars');
      return;
    }
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        event,
        user_id: userId,
        to_email: email,
        data,
        template_id: templateId,
        content: bodyOverride ?? undefined,
      }),
    });
    const result = await res.json().catch(() => ({}));
    console.log('[triggerEmail] resultado:', result);
    if (!res.ok) console.error('[triggerEmail]', await res.text());
  } catch (err) {
    console.error('[triggerEmail] Failed:', err);
  }
}

/**
 * Envía notificación por Telegram.
 * - Si se pasa data, se interpreta eventName como nombre de evento: se busca template_telegram_<eventName> en admin_settings, se reemplazan variables y se envía.
 * - Si no se pasa data, messageOrEvent se usa como mensaje literal (comportamiento legacy).
 */
export async function sendTelegramNotification(
  messageOrEvent: string,
  userId: string,
  data?: Record<string, unknown>
): Promise<void> {
  let message: string;
  if (data != null) {
    const templateId = `template_telegram_${messageOrEvent}`;
    const templateContent = await getTemplateContent(templateId);
    if (templateContent) {
      message = replaceVariables(templateContent, data);
    } else {
      message = replaceVariables('Evento: {{event}}', { event: messageOrEvent, ...data });
    }
  } else {
    message = messageOrEvent;
  }

  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id, notification_preferences')
      .eq('id', userId)
      .maybeSingle();
    const tgToken = userRow?.telegram_token;
    const tgChatId = userRow?.telegram_chat_id;
    const prefs = userRow?.notification_preferences as { sim_expired?: { telegram?: boolean }; sim_activated?: { telegram?: boolean } } | null | undefined;
    const sendTg = prefs?.sim_expired?.telegram === true || prefs?.sim_activated?.telegram === true;
    if (tgToken && tgChatId && sendTg) {
      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: message, parse_mode: 'Markdown' }),
      });
      const tgData = await tgRes.json().catch(() => ({}));
      try {
        await supabaseAdmin.from('notification_history').insert({
          user_id: userId,
          recipient: `Telegram:${tgChatId}`,
          channel: 'telegram',
          event: typeof data !== 'undefined' ? messageOrEvent : 'notification',
          status: tgRes.ok ? 'sent' : 'error',
          error_message: tgRes.ok ? null : (tgData?.description ?? null),
          content_preview: (message || '').slice(0, 500) || null,
        });
      } catch {
        // no bloquear por fallo de historial
      }
    }
  } catch (tgErr: unknown) {
    console.warn('[sendTelegramNotification] skipped:', (tgErr as Error)?.message);
  }
}
