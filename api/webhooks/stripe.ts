import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getRawBody(readable: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of readable) {
    if (typeof chunk === 'string') chunks.push(new TextEncoder().encode(chunk));
    else chunks.push(new Uint8Array(chunk));
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'activation' | 'subscription' | 'error' | 'warning' | 'success'
) {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[NOTIFICATION WARN]', e);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    const rawBodyString = new TextDecoder().decode(rawBody);
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBodyString, sig, webhookSecret);
    } else {
      event = JSON.parse(rawBodyString);
    }
  } catch (err: any) {
    console.error('[WEBHOOK SIGNATURE ERROR]', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[WEBHOOK] Evento recibido: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, slot_id: slotId, planName, limit, transactionType } = session.metadata || {};

    if (!userId || !slotId) {
      return res.status(200).json({ received: true });
    }

    try {
      let amount = (session.amount_total || 0) / 100;
      if (amount === 0) {
        const lines = await stripe.checkout.sessions.listLineItems(session.id);
        amount = (lines.data[0]?.price?.unit_amount || 0) / 100;
      }

      let trialEnd: string | null = null;
      let stripeSubscriptionId: string | null = null;
      let subscriptionStatus: 'active' | 'trialing' = 'active';

      if (session.subscription) {
        stripeSubscriptionId = session.subscription.toString();
        try {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          if (stripeSub.trial_end) {
            trialEnd = new Date(stripeSub.trial_end * 1000).toISOString();
            subscriptionStatus = 'trialing';
          }
        } catch (subErr) {
          console.warn('[WEBHOOK] No se pudo recuperar suscripción Stripe:', subErr);
        }
      }

      if (session.customer) {
        await supabaseAdmin.from('profiles').update({
          stripe_customer_id: session.customer.toString()
        }).eq('id', userId);
      }

      if (transactionType === 'UPGRADE') {
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'canceled' })
          .eq('slot_id', slotId)
          .eq('status', 'active');
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'canceled' })
          .eq('slot_id', slotId)
          .eq('status', 'trialing');
      }

      const { data: slot } = await supabaseAdmin
        .from('slots')
        .select('phone_number')
        .eq('slot_id', slotId)
        .single();

      const { data: exists } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (!exists) {
        await supabaseAdmin.from('subscriptions').insert({
          user_id: userId,
          slot_id: slotId,
          phone_number: slot?.phone_number,
          plan_name: planName,
          monthly_limit: Number(limit),
          status: subscriptionStatus,
          stripe_session_id: session.id,
          stripe_subscription_id: stripeSubscriptionId,
          trial_end: trialEnd,
          amount,
          currency: session.currency || 'usd',
          created_at: new Date().toISOString(),
        });
      }

      await supabaseAdmin.from('slots').update({
        status: 'ocupado',
        assigned_to: userId,
        plan_type: planName,
      }).eq('slot_id', slotId);

      const trialMsg = trialEnd
        ? `Tu trial gratuito de 7 días comienza ahora. El primer cobro será el ${new Date(trialEnd).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}.`
        : `Tu línea ${slot?.phone_number || ''} está activa y lista para recibir SMS.`;

      await createNotification(userId, '🚀 ¡Línea activada!', trialMsg, 'activation');

    } catch (err: any) {
      console.error('[WEBHOOK ERROR] checkout.session.completed:', err.message);
    }
  }

  else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const previousAttributes = (event.data as any).previous_attributes || {};

    if (!previousAttributes.status) {
      return res.status(200).json({ received: true });
    }

    const stripeSubId = subscription.id;
    const newStatus = subscription.status;
    const prevStatus = previousAttributes.status;

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) return res.status(200).json({ received: true });

      const statusMap: Record<string, string> = {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due',
        paused: 'canceled',
      };

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: statusMap[newStatus] || 'active' })
        .eq('id', sub.id);

      if (prevStatus === 'trialing' && newStatus === 'active') {
        await createNotification(
          sub.user_id,
          '✅ Trial completado — Plan activo',
          `Tu plan ${sub.plan_name} está ahora activo. Gracias por continuar con Telsim.`,
          'subscription'
        );
      }

      if (newStatus === 'canceled' && prevStatus !== 'canceled') {
        await supabaseAdmin.from('slots').update({
          status: 'libre', assigned_to: null, plan_type: null,
        }).eq('slot_id', sub.slot_id);

        await createNotification(
          sub.user_id,
          '⚠️ Suscripción cancelada',
          `Tu plan ${sub.plan_name} fue cancelado. Tu número ha sido liberado. Puedes activar un nuevo plan cuando quieras.`,
          'warning'
        );
      }
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] customer.subscription.updated:', err.message);
    }
  }

  else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!stripeSubId) return res.status(200).json({ received: true });

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) return res.status(200).json({ received: true });

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('id', sub.id);

      await createNotification(
        sub.user_id,
        '🔴 Pago fallido — Acción requerida',
        `No pudimos cobrar tu plan ${sub.plan_name}. Actualiza tu método de pago en Billing para no perder el acceso.`,
        'error'
      );
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] invoice.payment_failed:', err.message);
    }
  }

  else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason !== 'subscription_cycle' &&
        invoice.billing_reason !== 'subscription_update') {
      return res.status(200).json({ received: true });
    }

    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!stripeSubId) return res.status(200).json({ received: true });

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, status')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) return res.status(200).json({ received: true });

      if (sub.status === 'past_due') {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', sub.id);

        await createNotification(
          sub.user_id,
          '✅ Pago procesado',
          `El pago de tu plan ${sub.plan_name} fue exitoso. Tu servicio continúa activo.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] invoice.payment_succeeded:', err.message);
    }
  }

  else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();

      if (!sub) return res.status(200).json({ received: true });

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', sub.id);

      await supabaseAdmin.from('slots').update({
        status: 'libre', assigned_to: null, plan_type: null,
      }).eq('slot_id', sub.slot_id);

      await createNotification(
        sub.user_id,
        '🔴 Suscripción terminada',
        `Tu plan ${sub.plan_name} fue cancelado definitivamente. Reactiva tu suscripción cuando quieras.`,
        'error'
      );
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] customer.subscription.deleted:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}
