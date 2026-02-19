
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

    let finalSlotId = slot_id;

    // REGLA CRÍTICA DE CONCURRENCIA Y ORDEN: 
    // Si es una compra nueva, buscamos el primer slot libre disponible por orden de ID
    if (!isUpgrade && (!finalSlotId || finalSlotId === 'new')) {
      const { data: freeSlot, error: slotError } = await supabaseAdmin
        .from('slots')
        .select('slot_id')
        .eq('status', 'libre')
        .order('slot_id', { ascending: true }) // Garantiza asignar 1A antes que 2A
        .limit(1)
        .maybeSingle();

      if (slotError || !freeSlot) {
        return res.status(503).json({ error: 'No hay puertos físicos disponibles en este momento. Intenta más tarde.' });
      }

      finalSlotId = freeSlot.slot_id;

      // RESERVA INMEDIATA: Bloquear el slot para que ninguna otra sesión lo tome
      await supabaseAdmin
        .from('slots')
        .update({ 
          status: 'reservado',
          assigned_to: userId,
          plan_type: planName
        })
        .eq('slot_id', finalSlotId);
    }

    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const successUrl = isUpgrade 
      ? `${origin}/#/dashboard/upgrade-success?session_id={CHECKOUT_SESSION_ID}&num=${phoneNumber}&plan=${planName}`
      : `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`;
    
    const cancelUrl = isUpgrade 
      ? `${origin}/#/dashboard/numbers` 
      : `${origin}/#/onboarding/payment`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        phoneNumber: phoneNumber || 'PENDING_ASSIGNMENT',
        planName: planName,
        limit: monthlyLimit || 400,
        slot_id: finalSlotId,
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUBSCRIPTION'
      },
      subscription_data: {
        metadata: {
          userId: userId,
          phoneNumber: phoneNumber || 'PENDING_ASSIGNMENT',
          slot_id: finalSlotId
        }
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("[CHECKOUT SESSION ERROR]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
