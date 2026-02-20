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

    // --- FLUJO DE PAGO RÁPIDO (ONE-CLICK) ---
    if (customerId && !forceManual) {
      
      // ESCENARIO A: Upgrade de línea existente
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
            const stripeSubId = session.subscription as string;

            if (stripeSubId) {
              const subscription = await stripe.subscriptions.retrieve(stripeSubId);
              await stripe.subscriptions.update(stripeSubId, {
                items: [{ id: subscription.items.data[0].id, price: priceId }],
                proration_behavior: 'always_invoice',
                metadata: { transactionType: 'UPGRADE', planName, limit: monthlyLimit, slot_id, userId }
              });

              // Actualización atómica de hardware
              await supabaseAdmin.from('slots').update({ plan_type: planName }).eq('slot_id', slot_id);

              return res.status(200).json({ 
                instant: true, 
                subscriptionId: activeSub.id, 
                message: 'Upgrade procesado con éxito.' 
              });
            }
          } catch (subErr: any) {
            console.error("[UPGRADE ERROR]", subErr.message);
          }
        }
      }

      // ESCENARIO B: Nueva línea (Secuencia Infalible)
      if (!isUpgrade) {
        let reservedSlotId: string | null = null;
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

          if (defaultPaymentMethod) {
            // 1. Búsqueda de Slot Libre (Orden ascendente)
            const { data: freeSlot } = await supabaseAdmin
              .from('slots')
              .select('slot_id, phone_number')
              .eq('status', 'libre')
              .order('slot_id', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (!freeSlot) throw new Error("No hay puertos físicos disponibles en este momento.");
            reservedSlotId = freeSlot.slot_id;

            // 2. Bloqueo de Hardware Inmediato
            const { error: lockError } = await supabaseAdmin
              .from('slots')
              .update({ 
                status: 'ocupado', 
                assigned_to: userId, 
                plan_type: planName 
              })
              .eq('slot_id', reservedSlotId);

            if (lockError) throw lockError;

            // 3. Creación de Suscripción en Stripe
            const stripeSub = await stripe.subscriptions.create({
              customer: customerId,
              items: [{ price: priceId }],
              default_payment_method: defaultPaymentMethod as string,
              trial_period_days: 7,
              metadata: { userId, phoneNumber: freeSlot.phone_number, planName, slot_id: reservedSlotId, transactionType: 'NEW_SUB_INSTANT' }
            });

            // 4. Inserción en Tabla de Suscripciones (UUID)
            const { data: newSub, error: subError } = await supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: userId,
                slot_id: reservedSlotId,
                phone_number: freeSlot.phone_number,
                plan_name: planName,
                monthly_limit: monthlyLimit,
                credits_used: 0,
                status: 'active',
                stripe_session_id: stripeSub.id,
                amount: stripeSub.items.data[0].price.unit_amount ? stripeSub.items.data[0].price.unit_amount / 100 : 0,
                currency: stripeSub.currency || 'usd',
                created_at: new Date().toISOString()
              })
              .select('id')
              .single();

            if (subError) throw subError;

            return res.status(200).json({ 
                instant: true, 
                subscriptionId: newSub.id, 
                phoneNumber: freeSlot.phone_number,
                message: 'Nodo activado instantáneamente.' 
            });
          }
        } catch (err: any) {
          console.error("[PROVISIONING ERROR]", err.message);
          // 4. Rollback de Hardware si algo falló
          if (reservedSlotId) {
            await supabaseAdmin.from('slots').update({ status: 'libre', assigned_to: null, plan_type: null }).eq('slot_id', reservedSlotId);
          }
          return res.status(500).json({ error: err.message });
        }
      }
    }

    // --- FLUJO ESTÁNDAR (REDIRECCIÓN) ---
    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    // Reservamos slot preventivamente antes de ir a Stripe
    const { data: redirectSlot } = await supabaseAdmin
      .from('slots')
      .select('slot_id, phone_number')
      .eq('status', 'libre')
      .order('slot_id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!isUpgrade && !redirectSlot) throw new Error("Sin disponibilidad física.");

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
      metadata: { 
        userId, 
        phoneNumber: isUpgrade ? (phoneNumber || 'PENDING') : redirectSlot?.phone_number, 
        planName, 
        limit: monthlyLimit || 400, 
        slot_id: isUpgrade ? (slot_id || '') : redirectSlot?.slot_id, 
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUBSCRIPTION' 
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}