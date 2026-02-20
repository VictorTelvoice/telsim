import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { priceId, userId, phoneNumber, planName, isUpgrade, monthlyLimit, slot_id, forceManual } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Parámetros insuficientes.' });
    }

    // 1. OBTENER DATOS DEL USUARIO (Stripe Customer ID)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    const customerId = userData?.stripe_customer_id;

    // 2. LÓGICA DE UPGRADE INSTANTÁNEO (Sólo si NO se fuerza manual)
    if (isUpgrade && customerId && slot_id && !forceManual) {
      const { data: activeSub } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_session_id')
        .eq('slot_id', slot_id)
        .eq('status', 'active')
        .maybeSingle();

      if (activeSub?.stripe_session_id) {
        try {
          const session = await stripe.checkout.sessions.retrieve(activeSub.stripe_session_id);
          const subscriptionId = session.subscription as string;

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            await stripe.subscriptions.update(subscriptionId, {
              items: [{
                id: subscription.items.data[0].id,
                price: priceId,
              }],
              proration_behavior: 'always_invoice',
              metadata: {
                transactionType: 'UPGRADE',
                planName: planName,
                limit: monthlyLimit,
                slot_id: slot_id,
                userId: userId // Se añade userId para el Webhook
              }
            });

            return res.status(200).json({ instant: true, message: 'Upgrade procesado con éxito.' });
          }
        } catch (subErr: any) {
          console.error("[INSTANT UPGRADE FAIL]", subErr.message);
        }
      }
    }

    // 3. FLUJO ESTÁNDAR DE CHECKOUT
    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_creation: customerId ? undefined : 'always',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: isUpgrade 
        ? `${origin}/#/dashboard/upgrade-success?session_id={CHECKOUT_SESSION_ID}&num=${phoneNumber}&plan=${planName}`
        : `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`,
      cancel_url: isUpgrade ? `${origin}/#/dashboard/numbers` : `${origin}/#/onboarding/payment`,
      client_reference_id: userId,
      metadata: {
        userId, phoneNumber: phoneNumber || 'PENDING', planName,
        limit: monthlyLimit || 400, slot_id: slot_id,
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUBSCRIPTION'
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}