/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v4.2
 * 
 * ADAPTACIÓN PARA VERCEL API ROUTES & STRIPE SIGNATURE VERIFICATION
 * Mapeo de stripe_session_id y lógica de monto decimal.
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

// Uso de variables de entorno oficiales de Vercel (Service Role para bypass RLS)
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
    
    // 1. Monto: Stripe envía centavos -> Convertir a Decimal (amount_total / 100)
    const rawTotal = session.amount_total ?? session.amount_subtotal ?? 0;
    const amountValue = Number(rawTotal) / 100;

    const metadata = session.metadata || {};
    const userId = metadata.userId; 
    const phoneNumberReq = metadata.phoneNumber; 
    const planName = metadata.planName; 
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;

    if (!userId) {
      console.error('[CRITICAL] Missing userId in session metadata');
      return res.status(400).json({ error: 'Missing userId' });
    }

    try {
      // 2. Idempotencia: Verificar si el ID de sesión ya existe en subscriptions
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (existingSub) {
        console.log(`[IDEMPOTENCIA] Sesión ${session.id} ya procesada. Omitiendo.`);
        return res.status(200).json({ received: true, note: 'Already processed' });
      }

      let finalPhoneNumber = phoneNumberReq;

      // 3. Asignación de Puerto si es solicitud de SIM nueva
      if (phoneNumberReq === 'NEW_SIM_REQUEST') {
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('phone_number')
          .eq('status', 'libre')
          .limit(1)
          .single();

        if (slotError || !slot) throw new Error("No physical GSM slots available in infrastructure");
        finalPhoneNumber = slot.phone_number;
      }

      // 4. LÓGICA DE UPGRADE/REPLACEMENT: Finalizar suscripción anterior para este número/usuario
      console.log(`[TELSIM UPGRADE] Superseding previous active plans for ${finalPhoneNumber}`);
      await supabaseAdmin
        .from('subscriptions')
        .update({ 
          status: 'superseded',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('phone_number', finalPhoneNumber)
        .eq('status', 'active');

      // 5. INSERCIÓN DE NUEVA SUSCRIPCIÓN (Inmutable)
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert([{
          user_id: userId,
          phone_number: finalPhoneNumber,
          plan_name: planName,
          amount: amountValue, // Monto decimal correcto
          monthly_limit: monthlyLimit,
          status: 'active',
          currency: (session.currency || 'usd').toUpperCase(),
          stripe_session_id: session.id, // Mapeo correcto de stripe_session_id
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('[DB INSERT ERROR]', insertError.message);
        throw insertError;
      }

      // 6. Actualización de Infraestructura GSM (Slots)
      await supabaseAdmin
        .from('slots')
        .update({ 
          status: 'ocupado',
          assigned_to: userId,
          plan_type: planName 
        })
        .eq('phone_number', finalPhoneNumber);

      // 7. Notificación de Sistema al Usuario
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Activación Completada',
          message: `Confirmamos tu pago de $${amountValue.toFixed(2)}. Tu número ${finalPhoneNumber} ha sido configurado con éxito.`,
          type: 'subscription'
        }]);

      // Bypass de Cache y Confirmación de Log
      console.log('Suscripción guardada con éxito: ' + session.id);
      
      return res.status(200).json({ status: 'success', sessionId: session.id });

    } catch (err: any) {
      console.error('[CRITICAL WEBHOOK HANDLER ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).json({ received: true });
}
