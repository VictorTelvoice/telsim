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

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    const customerId = userData?.stripe_customer_id;

    // LÓGICA DE PAGO RÁPIDO (ONE-CLICK)
    if (customerId && !forceManual) {
      // ESCENARIO A: Upgrade de una línea existente
      if (isUpgrade && slot_id) {
        const { data: activeSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id, stripe_session_id')
          .eq('slot_id', slot_id)
          .eq('status', 'active')
          .maybeSingle();

        if (activeSub?.stripe_session_id) {
          try {
            const session = await stripe.checkout.sessions.retrieve(activeSub.stripe_session_id);
            const stripeSubscriptionId = session.subscription as string;

            if (stripeSubscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
              await stripe.subscriptions.update(stripeSubscriptionId, {
                items: [{ id: subscription.items.data[0].id, price: priceId }],
                proration_behavior: 'always_invoice',
                metadata: { transactionType: 'UPGRADE', planName, limit: monthlyLimit, slot_id, userId }
              });

              // Actualizamos el plan_type en el hardware inmediatamente
              await supabaseAdmin.from('slots').update({ plan_type: planName }).eq('slot_id', slot_id);

              return res.status(200).json({ 
                instant: true, 
                subscriptionId: activeSub.id, 
                message: 'Upgrade procesado.' 
              });
            }
          } catch (subErr: any) {
            console.error("[INSTANT UPGRADE FAIL]", subErr.message);
          }
        }
      }

      // ESCENARIO B: Nueva línea (One-Click)
      if (!isUpgrade) {
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

          if (defaultPaymentMethod) {
            const { data: freeSlot } = await supabaseAdmin.from('slots').select('slot_id, phone_number').eq('status', 'libre').limit(1).maybeSingle();
            if (!freeSlot) throw new Error("No hay puertos físicos libres.");

            await supabaseAdmin.from('slots').update({ status: 'reservado', assigned_to: userId }).eq('slot_id', freeSlot.slot_id);

            const subscription = await stripe.subscriptions.create({
              customer: customerId,
              items: [{ price: priceId }],
              default_payment_method: defaultPaymentMethod as string,
              trial_period_days: 7,
              metadata: { userId, phoneNumber: freeSlot.phone_number, planName, limit: monthlyLimit, slot_id: freeSlot.slot_id, transactionType: 'NEW_SUBSCRIPTION_INSTANT' }
            });

            const { data: newSub } = await supabaseAdmin.from('subscriptions').insert({
                user_id: userId, slot_id: freeSlot.slot_id, phone_number: freeSlot.phone_number,
                plan_name: planName, monthly_limit: monthlyLimit, credits_used: 0,
                status: 'active', stripe_session_id: subscription.id,
                amount: subscription.items.data[0].price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : 0,
                currency: subscription.currency || 'usd', created_at: new Date().toISOString()
            }).select('id').single();

            await supabaseAdmin.from('slots').update({ status: 'ocupado', assigned_to: userId, plan_type: planName }).eq('slot_id', freeSlot.slot_id);

            return res.status(200).json({ 
                instant: true, 
                subscriptionId: newSub?.id, 
                phoneNumber: freeSlot.phone_number,
                message: 'Activación One-Click exitosa.' 
            });
          }
        } catch (err: any) { console.error("[INSTANT FAIL]", err.message); }
      }
    }

    // FLUJO ESTÁNDAR
    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_creation: customerId ? undefined : 'always',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: { trial_period_days: 7 },
      success_url: isUpgrade 
        ? `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&plan=${planName}&isUpgrade=true`
        : `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`,
      cancel_url: isUpgrade ? `${origin}/#/dashboard/numbers` : `${origin}/#/onboarding/payment`,
      client_reference_id: userId,
      metadata: { userId, phoneNumber: phoneNumber || 'PENDING', planName, limit: monthlyLimit || 400, slot_id: slot_id || '', transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUBSCRIPTION' }
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}