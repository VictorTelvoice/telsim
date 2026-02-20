/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v4.7
 * 
 * ADAPTACIÓN PARA VERCEL API ROUTES & STRIPE SIGNATURE VERIFICATION
 * Lógica simplificada de cierre forzado de planes previos.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// CLIENTE ADMINISTRATIVO (SERVICE ROLE) - Crucial para bypass RLS y cierre forzado
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

async function getRawBody(readable: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of readable) {
    if (typeof chunk === 'string') {
      chunks.push(new TextEncoder().encode(chunk));
    } else {
      chunks.push(new Uint8Array(chunk));
    }
  }
  
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    console.error(`[STRIPE ERROR] ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const rawTotal = session.amount_total ?? session.amount_subtotal ?? 0;
    const amountValue = Number(rawTotal) / 100;

    const metadata = session.metadata || {};
    const userId = metadata.userId; 
    const phoneNumberReq = metadata.phoneNumber; 
    const planName = metadata.planName; 
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;

    if (!userId) {
      console.error('[CRITICAL] Missing userId in metadata');
      return res.status(400).json({ error: 'Missing userId' });
    }

    try {
      // 1. Idempotencia: Verificar si ya procesamos este pago
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (existingSub) {
        return res.status(200).json({ received: true, note: 'Already processed' });
      }

      let finalPhoneNumber = '';
      let finalPortId = '';

      // 2. Lógica de Vinculación de Infraestructura (Hardware GSM)
      if (phoneNumberReq === 'NEW_SIM_REQUEST') {
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('port_id, phone_number')
          .eq('status', 'libre')
          .limit(1)
          .single();

        if (slotError || !slot) throw new Error("No physical GSM slots available in the node");
        finalPhoneNumber = slot.phone_number;
        finalPortId = slot.port_id;
      } else {
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('port_id')
          .eq('phone_number', phoneNumberReq)
          .single();

        if (slotError || !slot) throw new Error(`Slot not found for line: ${phoneNumberReq}`);
        finalPhoneNumber = phoneNumberReq;
        finalPortId = slot.port_id;
      }

      // 3. CIERRE FORZADO DE SUSCRIPCIONES ANTERIORES (Cleanup simplificado)
      // Buscamos y cancelamos todas las suscripciones activas del usuario para este número
      const { error: cancelError } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', userId)
        .eq('phone_number', finalPhoneNumber)
        .eq('status', 'active');

      if (cancelError) {
        console.error('[CLEANUP ERROR] Fallo al cancelar planes antiguos:', cancelError.message);
      } else {
        console.log('Suscripciones antiguas canceladas para el usuario: ' + userId);
      }

      // 4. INSERTAR NUEVA SUSCRIPCIÓN (Estado 'active')
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert([{
          user_id: userId,
          phone_number: finalPhoneNumber,
          sim_id: finalPortId, // port_id físico mapeado a sim_id en la tabla
          plan_name: planName,
          amount: amountValue,
          monthly_limit: monthlyLimit,
          status: 'active',
          currency: (session.currency || 'usd').toUpperCase(),
          stripe_session_id: session.id
        }]);

      if (insertError) {
        console.error('[DB ERROR] Error insertando nueva suscripción:', insertError.message);
        throw insertError;
      }

      // 5. ACTUALIZAR ESTADO DEL HARDWARE (Slot físico)
      await supabaseAdmin
        .from('slots')
        .update({ 
          status: 'ocupado',
          assigned_to: userId,
          plan_type: planName
        })
        .eq('port_id', finalPortId);

      // 6. NOTIFICACIÓN Y LOG FINAL
      console.log(`[TELSIM] Provisión completada: Session ${session.id} -> sim_id ${finalPortId}`);

      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Plan Actualizado',
          message: `Tu línea ${finalPhoneNumber} ha sido vinculada al nuevo plan ${planName} con éxito.`,
          type: 'subscription'
        }]);

      return res.status(200).json({ status: 'success', sim_id: finalPortId });

    } catch (err: any) {
      console.error('[CRITICAL WEBHOOK ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ received: true });
}