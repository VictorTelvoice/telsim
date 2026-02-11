/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v4.5
 * 
 * ADAPTACIÓN PARA VERCEL API ROUTES & STRIPE SIGNATURE VERIFICATION
 * Lógica de limpieza forzada (canceled) y vinculación de sim_id.
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

// CLIENTE ADMINISTRATIVO (SERVICE ROLE) - Crucial para bypass RLS
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
      // 1. Idempotencia: No procesar dos veces el mismo pago
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

      // 2. Lógica de Vinculación de Infraestructura (Slots)
      if (phoneNumberReq === 'NEW_SIM_REQUEST') {
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('port_id, phone_number')
          .eq('status', 'libre')
          .limit(1)
          .single();

        if (slotError || !slot) throw new Error("No physical GSM slots available");
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

      // 3. CIERRE FORZADO DE PLANES ANTERIORES (Cleanup)
      // Buscamos todas las suscripciones activas para este usuario y número específico
      const { error: cancelError } = await supabaseAdmin
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('phone_number', finalPhoneNumber)
        .eq('status', 'active');

      if (cancelError) {
        console.error('[CLEANUP ERROR] Fallo al cancelar planes previos:', cancelError.message);
      } else {
        console.log('Suscripciones antiguas canceladas para el usuario: ' + userId);
      }

      // 4. CREAR NUEVA SUSCRIPCIÓN (Inmutable)
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert([{
          user_id: userId,
          phone_number: finalPhoneNumber,
          sim_id: finalPortId, // Identificador físico del puerto GSM
          plan_name: planName,
          amount: amountValue,
          monthly_limit: monthlyLimit,
          status: 'active',
          currency: (session.currency || 'usd').toUpperCase(),
          stripe_session_id: session.id,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // 5. ACTUALIZAR ESTADO DE HARDWARE (Slot)
      await supabaseAdmin
        .from('slots')
        .update({ 
          status: 'ocupado',
          assigned_to: userId,
          plan_type: planName,
          updated_at: new Date().toISOString()
        })
        .eq('port_id', finalPortId);

      // 6. NOTIFICACIÓN Y LOG FINAL
      console.log(`Suscripción guardada con éxito: ${session.id} | sim_id: ${finalPortId}`);

      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Plan Actualizado',
          message: `Confirmamos el cambio al plan ${planName}. Tu línea ${finalPhoneNumber} (Puerto ${finalPortId}) ha sido reconfigurada.`,
          type: 'subscription'
        }]);

      return res.status(200).json({ status: 'success', sessionId: session.id });

    } catch (err: any) {
      console.error('[CRITICAL WEBHOOK HANDLER ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ received: true });
}
