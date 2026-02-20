import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicialización global para evitar errores de API Key no proporcionada
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { priceId, userId, phoneNumber, planName, isUpgrade, monthlyLimit, slot_id, forceManual } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Faltan parámetros: priceId o userId.' });
    }

    // 1. RECUPERACIÓN DEL CLIENTE (Persistencia de pago)
    // Se consulta el stripe_customer_id de la tabla de usuarios para vincularlo a la sesión
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    const customerId = userData?.stripe_customer_id;

    // --- FLUJO ONE-CLICK (PAGO RÁPIDO INTERNO) ---
    // Esta lógica de auditoría y asignación se mantiene intacta según lo solicitado
    if (customerId && !forceManual) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

        if (defaultPaymentMethod) {
          // CASO 1: UPGRADE (Audit Trail: Cancelar anterior / Crear nueva)
          if (isUpgrade && slot_id) {
            const { data: activeSub } = await supabaseAdmin
              .from('subscriptions')
              .select('*')
              .eq('slot_id', slot_id)
              .eq('status', 'active')
              .maybeSingle();

            if (activeSub?.stripe_session_id) {
              const priceData = await stripe.prices.retrieve(priceId);
              const session = await stripe.checkout.sessions.retrieve(activeSub.stripe_session_id);
              const stripeSubId = session.subscription as string;
              
              if (stripeSubId) {
                const subscription = await stripe.subscriptions.retrieve(stripeSubId);
                await stripe.subscriptions.update(stripeSubId, {
                  items: [{ id: subscription.items.data[0].id, price: priceId }],
                  proration_behavior: 'always_invoice',
                });
              }

              await supabaseAdmin.from('subscriptions').update({ status: 'canceled' }).eq('id', activeSub.id);

              const { data: newSub } = await supabaseAdmin
                .from('subscriptions')
                .insert({
                  user_id: userId,
                  slot_id: slot_id,
                  phone_number: activeSub.phone_number,
                  plan_name: planName,
                  monthly_limit: monthlyLimit,
                  credits_used: activeSub.credits_used || 0,
                  status: 'active',
                  stripe_session_id: activeSub.stripe_session_id,
                  amount: (priceData.unit_amount || 0) / 100,
                  currency: priceData.currency || 'usd',
                  created_at: new Date().toISOString()
                })
                .select('id')
                .single();

              await supabaseAdmin.from('slots').update({ plan_type: planName }).eq('slot_id', slot_id);
              return res.status(200).json({ instant: true, subscriptionId: newSub?.id });
            }
          }

          // CASO 2: COMPRA NUEVA ONE-CLICK
          if (!isUpgrade) {
            const { data: freeSlot } = await supabaseAdmin
              .from('slots')
              .select('slot_id, phone_number')
              .eq('status', 'libre')
              .order('slot_id', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (!freeSlot) throw new Error("Sin disponibilidad física.");
            await supabaseAdmin.from('slots').update({ status: 'ocupado', assigned_to: userId, plan_type: planName }).eq('slot_id', freeSlot.slot_id);

            const priceData = await stripe.prices.retrieve(priceId);
            const stripeSub = await stripe.subscriptions.create({
              customer: customerId,
              items: [{ price: priceId }],
              default_payment_method: defaultPaymentMethod as string,
              trial_period_days: 7,
              metadata: { userId, phoneNumber: freeSlot.phone_number, planName, slot_id: freeSlot.slot_id, transactionType: 'NEW_SUB' }
            });

            const { data: newSub } = await supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: userId, slot_id: freeSlot.slot_id, phone_number: freeSlot.phone_number,
                plan_name: planName, monthly_limit: monthlyLimit, credits_used: 0,
                status: 'active', stripe_session_id: stripeSub.id,
                amount: (priceData.unit_amount || 0) / 100, currency: priceData.currency || 'usd',
                created_at: new Date().toISOString()
              })
              .select('id')
              .single();

            return res.status(200).json({ instant: true, subscriptionId: newSub?.id });
          }
        }
      } catch (oneClickErr) {
        console.warn("Fallo One-Click, redirigiendo a Stripe Checkout estándar...");
      }
    }

    // --- FLUJO ESTÁNDAR (STRIPE CHECKOUT CON RECONOCIMIENTO DE TARJETA GUARDADA) ---
    const host = req.headers.host;
    const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host}`;
    
    let targetSlotId = slot_id;
    let targetPhone = phoneNumber;

    if (!isUpgrade) {
      const { data: s } = await supabaseAdmin.from('slots').select('slot_id, phone_number').eq('status', 'libre').limit(1).single();
      if (!s) throw new Error("Sin puertos libres.");
      targetSlotId = s.slot_id;
      targetPhone = s.phone_number;
    }

    // Creación de sesión inyectando el Customer ID y optimizando la colección de métodos de pago
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined, // INYECCIÓN: Reusar cliente si existe
      customer_creation: customerId ? undefined : 'always', // No forzar creación si ya existe
      payment_method_collection: customerId ? 'if_required' : 'always', // PRIORIZACIÓN: No pedir datos si ya tiene tarjeta guardada
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: { trial_period_days: 7 },
      success_url: `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&slot_id=${targetSlotId}&isUpgrade=${isUpgrade}`,
      cancel_url: `${origin}/#/dashboard/numbers`,
      metadata: { userId, slot_id: targetSlotId, planName, limit: monthlyLimit, transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUB' }
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("[SESSION ERROR]", err.message);
    return res.status(500).json({ error: err.message });
  }
}