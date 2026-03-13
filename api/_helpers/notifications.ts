import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function triggerEmail(
  event: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
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
      }),
    });
    const result = await res.json().catch(() => ({}));
    console.log('[triggerEmail] resultado:', result);
    if (!res.ok) console.error('[triggerEmail]', await res.text());
  } catch (err) {
    console.error('[triggerEmail] Failed:', err);
  }
}

export async function sendTelegramNotification(message: string, userId: string): Promise<void> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id, notification_preferences')
      .eq('id', userId)
      .maybeSingle();
    const tgToken = userRow?.telegram_token;
    const tgChatId = userRow?.telegram_chat_id;
    const prefs = userRow?.notification_preferences as { sim_expired?: { telegram?: boolean } } | null | undefined;
    const sendTg = prefs?.sim_expired?.telegram === true;
    if (tgToken && tgChatId && sendTg) {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: message, parse_mode: 'Markdown' }),
      });
    }
  } catch (tgErr: any) {
    console.warn('[sendTelegramNotification] skipped:', tgErr?.message);
  }
}
