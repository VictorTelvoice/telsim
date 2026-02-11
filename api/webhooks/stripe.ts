/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v4.3
 * 
 * ADAPTACIÓN PARA VERCEL API ROUTES & STRIPE SIGNATURE VERIFICATION
 * Vinculación física de Port ID y aprovisionamiento de Hardware GSM.
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

// Cliente administrativo para bypass de RLS
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
      console.error('[CRITICAL] Missing userId');
      return res.status(400).json({ error: 'Missing userId' });
    }

    try {
      // 1. Verificar Idempotencia
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

      // 2. LÓGICA DE VINCULACIÓN DE PUERTO (Infraestructura GSM)
      if (phoneNumberReq === 'NEW_SIM_REQUEST') {
        // Buscar slot libre para nueva asignación
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('port_id, phone_number')
          .eq('status', 'libre')
          .limit(1)
          .single();

        if (slotError || !slot) throw new Error("No physical GSM slots available in infrastructure");
        finalPhoneNumber = slot.phone_number;
        finalPortId = slot.port_id;
      } else {
        // Es un upgrade/renovación sobre un número existente
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('port_id')
          .eq('phone_number', phoneNumberReq)
          .single();

        if (slotError || !slot) throw new Error(`Slot not found for phone number: ${phoneNumberReq}`);
        finalPhoneNumber = phoneNumberReq;
        finalPortId = slot.port_id;
      }

      // 3. FINALIZAR PLANES PREVIOS (Atomic Update)
      console.log(`[TELSIM] Superseding previous plans for port ${finalPortId} (${finalPhoneNumber})`);
      await supabaseAdmin
        .from('subscriptions')
        .update({ 
          status: 'superseded',
          updated_at: new Date().toISOString()
        })
        .eq('phone_number', finalPhoneNumber)
        .eq('status', 'active');

      // 4. CREAR NUEVA SUSCRIPCIÓN CON VÍNCULO FÍSICO
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert([{
          user_id: userId,
          phone_number: finalPhoneNumber,
          port_id: finalPortId, // Vínculo crucial para el motor de SMS
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
      const { error: slotUpdateError } = await supabaseAdmin
        .from('slots')
        .update({ 
          status: 'ocupado',
          assigned_to: userId,
          plan_type: planName,
          updated_at: new Date().toISOString()
        })
        .eq('port_id', finalPortId);

      if (slotUpdateError) throw slotUpdateError;

      // 6. LOG DE CONFIRMACIÓN Y NOTIFICACIÓN
      console.log(`Suscripción guardada con éxito: ${session.id} | Port: ${finalPortId}`);

      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Puerto Configurado',
          message: `Tu línea ${finalPhoneNumber} ha sido vinculada al puerto ${finalPortId} con éxito. Pago de $${amountValue.toFixed(2)} procesado.`,
          type: 'subscription'
        }]);

      return res.status(200).json({ status: 'success', portId: finalPortId });

    } catch (err: any) {
      console.error('[CRITICAL WEBHOOK ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ received: true });
}
