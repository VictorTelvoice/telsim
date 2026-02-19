/**
 * TELSIM CLOUD INFRASTRUCTURE - UNIFIED WEBHOOK HANDLER v10.1
 * 
 * Corrección: Cambio de port_id -> slot_id para coincidir con el schema de DB.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: '2023-10-16',
});

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
    return res.status(405).json({ error: 'TELSIM: Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  
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
    console.error(`[TELSIM WEBHOOK ERROR] Security Validation Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const eventType = event.type;

  if (eventType === 'customer.updated' || eventType === 'payment_method.attached') {
    const object = event.data.object as any;
    const customerId = object.customer || (eventType === 'customer.updated' ? object.id : null);

    if (customerId && typeof customerId === 'string') {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });

        if (paymentMethods.data.length > 0) {
          const mainCard = paymentMethods.data[0].card;
          if (mainCard) {
            await supabaseAdmin
              .from('users')
              .update({
                card_brand: mainCard.brand,
                card_last4: mainCard.last4
              })
              .eq('stripe_customer_id', customerId);
          }
        }
      } catch (err: any) {
        console.error(`❌ TELSIM SYNC ERROR: ${err.message}`);
      }
    }
  }

  if (eventType === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const planName = metadata.planName;
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;

    if (userId) {
      try {
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('*')
          .eq('status', 'libre') 
          .is('assigned_to', null)
          .limit(1)
          .maybeSingle();

        if (slotError || !slot) {
          throw new Error("Infraestructura saturada: No hay puertos 'libre' disponibles.");
        }

        // CORRECCIÓN: port_id -> slot_id
        const { error: updateSlotError } = await supabaseAdmin
          .from('slots')
          .update({
            status: 'ocupado',
            assigned_to: userId,
            plan_type: planName
          })
          .eq('slot_id', slot.slot_id);

        if (updateSlotError) throw updateSlotError;

        // CORRECCIÓN: port_id -> slot_id
        const { error: subUpdateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            phone_number: slot.phone_number,
            slot_id: slot.slot_id,
            status: 'active',
            plan_name: planName,
            monthly_limit: monthlyLimit
          })
          .eq('stripe_session_id', session.id);

        if (subUpdateError) throw subUpdateError;
        
        if (session.customer) {
          await supabaseAdmin.from('users').update({ 
            stripe_customer_id: session.customer 
          }).eq('id', userId);
        }

      } catch (err: any) {
        console.error(`❌ TELSIM PROVISION CRITICAL ERROR: ${err.message}`);
        await supabaseAdmin.from('automation_logs').insert({
          user_id: userId,
          event_type: 'stripe_provision_error',
          status: 'error',
          error_message: err.message,
          payload: { session_id: session.id, metadata: metadata }
        });
      }
    }
  }

  return res.status(200).json({ received: true, node: 'TELSIM-GATEWAY-UNIFIED' });
}