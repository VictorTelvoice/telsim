import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function triggerEmail(
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

async function sendTelegramNotification(message: string, userId: string): Promise<void> {
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
    console.warn('[CANCEL] Telegram skipped:', tgErr?.message);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subscriptionId } = req.body;
  if (!subscriptionId) return res.status(400).json({ error: 'Missing subscriptionId' });

  try {
    // Cancelar inmediatamente en Stripe
    await stripe.subscriptions.cancel(subscriptionId);

    // Actualizar Supabase y enviar notificaciones (misma lógica que webhook)
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, slot_id, plan_name')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (sub) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', sub.id);

      const userId = sub.user_id;
      const slotId = sub.slot_id;

      // 1. Resolver email desde public.users (igual que upgrade)
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      // 2. Resolver datos del slot para el número de teléfono
      const { data: slotData } = await supabaseAdmin
        .from('slots')
        .select('phone_number, plan_type')
        .eq('slot_id', slotId)
        .maybeSingle();

      const now = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // 3. Email — mismo triggerEmail que upgrade, pasando email directo en to_email
      if (userData?.email) {
        await triggerEmail('subscription_cancelled', userId, {
          plan_name: slotData?.plan_type,
          slot_id: slotId,
          email: userData.email,
          to_email: userData.email,
        });
        console.log('[CANCEL] Email enviado a:', userData.email);
      }

      // 4. Telegram — mismo helper que upgrade
      await sendTelegramNotification(
        `❌ *CANCELACIÓN*\n` +
          `📱 Número: +${slotData?.phone_number || slotId}\n` +
          `📦 Plan: ${slotData?.plan_type ?? sub.plan_name ?? ''}\n` +
          `📅 Fecha: ${now}\n` +
          `🔴 Estado: Cancelado`,
        userId
      );
      console.log('[CANCEL] Telegram enviado OK');
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[CANCEL-SUBSCRIPTION]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
