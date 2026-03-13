import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { triggerEmail, sendTelegramNotification } from './_helpers/notifications';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

      // ── NOTIFICACIONES CANCELACIÓN ─────────────────────────────────────
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

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

      // Email — mismo triggerEmail del upgrade, con to_email directo
      if (userData?.email) {
        await triggerEmail('subscription_cancelled', userId, {
          plan_name: slotData?.plan_type,
          slot_id: slotId,
          email: userData.email,
          to_email: userData.email,
        });
        console.log('[CANCEL] Email enviado a:', userData.email);
      }

      // Telegram — mismo sendTelegramNotification del upgrade
      await sendTelegramNotification(
        `❌ *CANCELACIÓN*\n` +
          `📱 Número: +${slotData?.phone_number || slotId}\n` +
          `📦 Plan: ${slotData?.plan_type ?? sub.plan_name ?? ''}\n` +
          `📅 Fecha: ${now}\n` +
          `🔴 Estado: Cancelado`,
        userId
      );
      console.log('[CANCEL] Telegram enviado OK');
      // ───────────────────────────────────────────────────────────────────
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[CANCEL-SUBSCRIPTION]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
