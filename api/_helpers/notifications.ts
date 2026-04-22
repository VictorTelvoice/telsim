import { createClient } from '@supabase/supabase-js';

let _supabaseAdmin: any = null;
function getSupabaseAdmin(): any {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required');
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    _supabaseAdmin = createClient(url, key);
  }
  return _supabaseAdmin;
}

export type NotificationChannel = 'email' | 'telegram' | 'sms_product';
export type NotificationCategory = 'product_delivery' | 'operational';

/** Inserta en notification_history sin bloquear el flujo. */
export async function insertNotificationLog(params: {
  user_id: string;
  channel: NotificationChannel;
  recipient: string;
  event: string;
  status: 'sent' | 'error';
  category?: NotificationCategory;
  content_preview?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await getSupabaseAdmin().from('notification_history').insert({
      user_id: params.user_id,
      type: params.channel,
      event_name: params.event,
      recipient: params.recipient,
      content: params.content_preview ?? null,
      status: params.status,
      error_message: params.error_message ?? null,
    });
  } catch {
    // no bloquear por fallo de historial
  }
}

/** Envío interno Telegram con logging automático. */
export async function internalSendTelegram(options: {
  userId: string;
  content: string;
  category?: NotificationCategory;
  event?: string;
  metadata?: { slot_id?: string; phone_number?: string };
}): Promise<{ success: boolean; error?: string }> {
  const event = options.event ?? 'notification';
  const category = options.category ?? 'operational';
  const preview = (options.content || '').slice(0, 500) || null;
  try {
    const { data: userRow } = await getSupabaseAdmin()
      .from('users')
      .select('telegram_token, telegram_chat_id')
      .eq('id', options.userId)
      .maybeSingle();
    const token = userRow?.telegram_token?.trim();
    const chatId = userRow?.telegram_chat_id?.trim();
    if (!token || !chatId) {
      return { success: false, error: 'Telegram no configurado para este usuario.' };
    }
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: options.content, parse_mode: 'Markdown' }),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    await insertNotificationLog({
      user_id: options.userId,
      channel: 'telegram',
      recipient: `Telegram:${chatId}`,
      event,
      status: tgRes.ok ? 'sent' : 'error',
      category,
      content_preview: preview,
      error_message: tgRes.ok ? null : (tgData?.description ?? null),
      metadata: options.metadata ? { slot_id: options.metadata.slot_id, phone_number: options.metadata.phone_number } : undefined,
    });
    if (!tgRes.ok) return { success: false, error: tgData?.description || 'Error de Telegram' };
    return { success: true };
  } catch (err) {
    const msg = (err as Error)?.message || 'Error enviando Telegram';
    await insertNotificationLog({
      user_id: options.userId,
      channel: 'telegram',
      recipient: '',
      event,
      status: 'error',
      category,
      content_preview: preview,
      error_message: msg,
      metadata: options.metadata ? { slot_id: options.metadata.slot_id, phone_number: options.metadata.phone_number } : undefined,
    });
    return { success: false, error: msg };
  }
}

/** Envío interno Email con logging automático. */
export async function internalSendEmail(options: {
  userId: string;
  toEmail?: string;
  event: string;
  content?: string;
  data?: Record<string, unknown>;
  category?: NotificationCategory;
  metadata?: { slot_id?: string; phone_number?: string };
  from?: string;
  subject?: string;
  html?: string;
  is_test?: boolean;
  custom_content?: string;
  template_id?: string;
  contentBelowDetails?: string;
  contentTitle?: string;
}): Promise<{ success: boolean; error?: string; httpStatus?: number; rawBodySnippet?: string }> {
  const category = options.category ?? 'operational';
  const preview = (options.content ?? options.html ?? options.custom_content ?? '').slice(0, 500) || null;
  try {
    let email = options.toEmail ?? (options.data?.to_email as string) ?? (options.data?.email as string);
    if (!email) {
      const { data: userData } = await getSupabaseAdmin().from('users').select('email').eq('id', options.userId).maybeSingle();
      email = userData?.email;
    }
    if (!email) return { success: false, error: 'No hay email para este usuario.' };
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return { success: false, error: 'Configuración de email faltante.' };
    
    const payloadOut: Record<string, unknown> = {
      event: options.event,
      user_id: options.userId,
      to_email: email,
      data: options.data ?? {},
      content: options.content ?? undefined,
      from: options.from ?? undefined,
      subject: options.subject ?? undefined,
      html: options.html ?? undefined,
      is_test: options.is_test ?? undefined,
      custom_content: options.custom_content ?? undefined,
      template_id: options.template_id ?? undefined,
      contentBelowDetails: options.contentBelowDetails,
      contentTitle: options.contentTitle,
    };
    
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify(payloadOut),
    });
    
    const rawBody = await res.text();
    let result: Record<string, unknown> = {};
    try {
      result = rawBody ? JSON.parse(rawBody) : {};
    } catch {}
    
    const errFromDetail = result?.detail && typeof result.detail === 'object' && (result.detail as Record<string, unknown>)?.message != null
      ? String((result.detail as Record<string, unknown>).message)
      : null;
    const errorDetail = !res.ok
      ? (typeof result?.error === 'string' ? result.error : typeof result?.message === 'string' ? result.message : errFromDetail) || rawBody || `HTTP ${res.status}`
      : null;
    
    if (!res.ok) {
      await insertNotificationLog({
        user_id: options.userId,
        channel: 'email',
        recipient: email,
        event: options.event,
        status: 'error',
        category,
        content_preview: preview,
        error_message: errorDetail,
      });
      return { success: false, error: errorDetail || 'Error enviando email', httpStatus: res.status, rawBodySnippet: rawBody.slice(0, 4000) };
    }
    
    await insertNotificationLog({
        user_id: options.userId,
        channel: 'email',
        recipient: email,
        event: options.event,
        status: 'sent',
        category,
        content_preview: preview,
    });
    
    return { success: true };
  } catch (err) {
    const msg = (err as Error)?.message || 'Error enviando email';
    await insertNotificationLog({
      user_id: options.userId,
      channel: 'email',
      recipient: '',
      event: options.event,
      status: 'error',
      category,
      content_preview: preview,
      error_message: msg,
    });
    return { success: false, error: msg };
  }
}

/** Función unificada de envío. */
export async function sendUnified(options: {
  channel: NotificationChannel;
  userId: string;
  category?: NotificationCategory;
  event: string;
  recipient?: string;
  content: string;
  data?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const { channel, userId, event, content, data = {} } = options;
  const category = options.category ?? (channel === 'sms_product' ? 'product_delivery' : 'operational');
  
  if (channel === 'sms_product') {
    await insertNotificationLog({
      user_id: userId,
      channel: 'sms_product',
      recipient: options.recipient ?? '',
      event,
      status: 'sent',
      category: 'product_delivery',
      content_preview: (content || '').slice(0, 500),
    });
    return { success: true };
  }

  if (channel === 'telegram') {
    return internalSendTelegram({ userId, content, category, event });
  }

  if (channel === 'email') {
    return internalSendEmail({ userId, event, content, category, data });
  }

  return { success: false, error: 'Canal no soportado.' };
}
