/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v4.1
 * 
 * ADAPTACIÓN PARA VERCEL API ROUTES & STRIPE SIGNATURE VERIFICATION
 * Lógica de Upgrade Inmutable: Cancela anterior, crea nueva.
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

// Uso de variables de entorno sin prefijo VITE_ para backend en Vercel
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
    
    // 1. Monto: Stripe centavos -> Decimal (amount_total / 100)
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
      // 2. Idempotencia
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (existingSub) {
        return res.status(200).json({ received: true, note: 'Already processed' });
      }

      let finalPhoneNumber = phoneNumberReq;

      // 3. Asignación de Puerto si es nuevo
      if (phoneNumberReq === 'NEW_SIM_REQUEST') {
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('phone_number')
          .eq('status', 'libre')
          .limit(1)
          .single();

        if (slotError || !slot) throw new Error("No physical GSM slots available");
        finalPhoneNumber = slot.phone_number;
      }

      // 4. LÓGICA DE UPGRADE: Cancelar suscripción anterior para este número
      console.log(`[UPGRADE LOGIC] Superseding previous plans for ${finalPhoneNumber}`);
      await supabaseAdmin
        .from('subscriptions')
        .update({ 
          status: 'superseded',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('phone_number', finalPhoneNumber)
        .eq('status', 'active');

      // 5. NUEVA SUSCRIPCIÓN (Inmutable)
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert([{
          user_id: userId,
          phone_number: finalPhoneNumber,
          plan_name: planName,
          amount: amountValue, // Inserción del monto calculado
          monthly_limit: monthlyLimit,
          status: 'active',
          currency: (session.currency || 'usd').toUpperCase(),
          stripe_session_id: session.id,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // 6. Actualización de Infraestructura
      await supabaseAdmin
        .from('slots')
        .update({ 
          status: 'ocupado',
          assigned_to: userId,
          plan_type: planName 
        })
        .eq('phone_number', finalPhoneNumber);

      // 7. Notificación
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Plan Actualizado',
          message: `Confirmamos el pago de $${amountValue.toFixed(2)}. Tu puerto ${finalPhoneNumber} ha sido reconfigurado al plan ${planName}.`,
          type: 'subscription'
        }]);

      return res.status(200).json({ status: 'success' });

    } catch (err: any) {
      console.error('[WEBHOOK ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ received: true });
}