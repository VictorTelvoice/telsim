
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
    const { priceId, userId, phoneNumber, planName, isUpgrade, monthlyLimit, slot_id } = req.body;

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

    // 2. LÓGICA DE UPGRADE INSTANTÁNEO (ONE-CLICK)
    if (isUpgrade && customerId && slot_id) {
      // Buscamos la suscripción activa actual en nuestra DB para obtener el ID de Stripe
      const { data: activeSub } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_session_id')
        .eq('slot_id', slot_id)
        .eq('status', 'active')
        .maybeSingle();

      if (activeSub?.stripe_session_id) {
        try {
          // Recuperamos la sesión para obtener el ID de la suscripción real
          const session = await stripe.checkout.sessions.retrieve(activeSub.stripe_session_id);
          const subscriptionId = session.subscription as string;

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            
            // Actualizamos la suscripción directamente
            await stripe.subscriptions.update(subscriptionId, {
              items: [{
                id: subscription.items.data[0].id,
                price: priceId,
              }],
              proration_behavior: 'always_invoice', // Cobra la diferencia ahora
              metadata: {
                transactionType: 'UPGRADE',
                planName: planName,
                limit: monthlyLimit,
                slot_id: slot_id
              }
            });

            return res.status(200).json({ instant: true, message: 'Upgrade procesado con éxito.' });
          }
        } catch (subErr: any) {
          console.error("[INSTANT UPGRADE FAIL]", subErr.message);
          // Si falla el instantáneo (ej. requiere 3DS), continuamos al Checkout normal
        }
      }
    }

    // 3. FLUJO ESTÁNDAR DE CHECKOUT (Con Customer ID si existe)
    let finalSlotId = slot_id;
    if (!isUpgrade && (!finalSlotId || finalSlotId === 'new')) {
      const { data: freeSlot } = await supabaseAdmin
        .from('slots')
        .select('slot_id')
        .eq('status', 'libre')
        .order('slot_id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!freeSlot) return res.status(503).json({ error: 'Sin puertos disponibles.' });
      finalSlotId = freeSlot.slot_id;
      
      await supabaseAdmin.from('slots').update({ 
        status: 'reservado', assigned_to: userId, plan_type: planName 
      }).eq('slot_id', finalSlotId);
    }

    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined, // REGLA CLAVE: Si existe, usa sus tarjetas guardadas
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
        limit: monthlyLimit || 400, slot_id: finalSlotId,
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUBSCRIPTION'
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
