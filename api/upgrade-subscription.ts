import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-01-28.clover' as any });
const supabaseAdmin = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  'Starter': { monthly: 19.90, annual: 199 },
  'Pro': { monthly: 39.90, annual: 399 },
  'Power': { monthly: 99.00, annual: 990 },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const { userId, slot_id, phoneNumber, newPriceId, planName, monthlyLimit, isAnnual } = req.body;
  if (!userId || !newPriceId || !planName) return res.status(400).json({ error: 'Parámetros insuficientes.' });

  try {
    // Buscar suscripción activa por slot_id, fallback por phoneNumber
    let activeSub: any = null;
    if (slot_id) {
      const { data } = await supabaseAdmin.from('subscriptions').select('*')
        .eq('slot_id', slot_id).eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      activeSub = data;
    }
    if (!activeSub && phoneNumber) {
      const { data } = await supabaseAdmin.from('subscriptions').select('*')
        .eq('phone_number', phoneNumber).eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      activeSub = data;
    }
    if (!activeSub) return res.status(404).json({ error: 'No se encontró suscripción activa para este número.' });

    // Resolver stripe_subscription_id
    let stripeSubId = activeSub.stripe_subscription_id as string | undefined;
    if (!stripeSubId) {
      const sessionId = activeSub.stripe_session_id as string;
      if (sessionId?.startsWith('sub_')) {
        stripeSubId = sessionId;
      } else if (sessionId?.startsWith('cs_')) {
        const cs = await stripe.checkout.sessions.retrieve(sessionId);
        stripeSubId = cs.subscription as string;
        await supabaseAdmin.from('subscriptions').update({ stripe_subscription_id: stripeSubId }).eq('id', activeSub.id);
      }
    }
    if (!stripeSubId) return res.status(400).json({ error: 'No se encontró ID de suscripción Stripe.' });

    // Obtener customer
    const { data: profileData } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', userId).maybeSingle();
    const customerId = profileData?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No se encontró customer de Stripe.' });

    // Cancelar suscripción antigua en Stripe (el webhook la marcará canceled en Supabase → queda en historial)
    await stripe.subscriptions.cancel(stripeSubId);

    // Crear nueva suscripción con nuevo plan, mismo slot, cobrando inmediatamente
    const newStripeSub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: newPriceId }],
      off_session: true,
      payment_behavior: 'error_if_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        slot_id: activeSub.slot_id,
        planName,
        limit: String(monthlyLimit),
        transactionType: 'UPGRADE',
        isAnnual: isAnnual ? 'true' : 'false',
        phoneNumber: activeSub.phone_number,
      },
    });

    const paymentStatus = (newStripeSub as any).latest_invoice?.payment_intent?.status;
    const isConfirmedActive = newStripeSub.status === 'active';

    if (!isConfirmedActive && newStripeSub.status !== 'trialing') {
      return res.status(402).json({
        error: 'El pago fue rechazado. Verifica tu método de pago.',
        stripeStatus: newStripeSub.status,
        paymentStatus,
      });
    }

    const subStatus: 'active' | 'trialing' =
      newStripeSub.status === 'trialing' ? 'trialing' : 'active';

    // Crear nuevo registro en Supabase (misma slot, nuevo plan, fecha nueva)
    const planPrices = PLAN_PRICES[planName];
    const amount = isAnnual ? (planPrices?.annual ?? 0) : (planPrices?.monthly ?? 0);
    const { data: newSubRecord } = await supabaseAdmin.from('subscriptions').insert({
      user_id: userId,
      slot_id: activeSub.slot_id,
      phone_number: activeSub.phone_number,
      plan_name: planName,
      monthly_limit: monthlyLimit,
      credits_used: 0,
      status: subStatus,
      stripe_subscription_id: newStripeSub.id,
      stripe_session_id: newStripeSub.id,
      amount,
      billing_type: isAnnual ? 'annual' : 'monthly',
      currency: 'usd',
      created_at: new Date().toISOString(),
    }).select('id').single();

    // Actualizar slot con nuevo plan solo si el pago fue confirmado (o trialing)
    if (isConfirmedActive || newStripeSub.status === 'trialing') {
      await supabaseAdmin.from('slots').update({ plan_type: planName })
        .eq('slot_id', activeSub.slot_id);
    }

    return res.status(200).json({ success: true, subscriptionId: newSubRecord?.id });
  } catch (err: any) {
    console.error('[UPGRADE-SUBSCRIPTION ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
