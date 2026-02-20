
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: '2026-01-28.clover' as any,
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

  // EVENTO A: Checkout completado (Flujo nuevo o Upgrade con redirección)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const slotId = metadata.slot_id;
    const planName = metadata.planName;
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;
    const transactionType = metadata.transactionType;

    if (userId && slotId) {
      try {
        const { data: slotData } = await supabaseAdmin.from('slots').select('phone_number').eq('slot_id', slotId).single();
        if (!slotData) throw new Error("Slot no hallado.");

        if (transactionType === 'UPGRADE') {
          await supabaseAdmin.from('subscriptions').update({ status: 'canceled' })
            .eq('slot_id', slotId).eq('user_id', userId).eq('status', 'active');
        }

        await supabaseAdmin.from('subscriptions').insert({
            user_id: userId, slot_id: slotId, phone_number: slotData.phone_number,
            plan_name: planName, monthly_limit: monthlyLimit, credits_used: 0,
            status: 'active', stripe_session_id: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'usd', created_at: new Date().toISOString()
        });

        await supabaseAdmin.from('slots').update({ 
            status: 'ocupado', assigned_to: userId, plan_type: planName 
        }).eq('slot_id', slotId);

        if (session.customer) {
          await supabaseAdmin.from('users').update({ stripe_customer_id: session.customer }).eq('id', userId);
        }
      } catch (err: any) {
        console.error(`❌ PROVISION ERROR: ${err.message}`);
      }
    }
  }

  // EVENTO B: Suscripción actualizada (Flujo Upgrade Directo / One-Click)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const metadata = subscription.metadata || {};
    
    if (metadata.transactionType === 'UPGRADE') {
      const slotId = metadata.slot_id;
      const planName = metadata.planName;
      const monthlyLimit = Number(metadata.limit);

      if (slotId) {
        console.log(`[ONE-CLICK WEBHOOK] Sincronizando Upgrade para Slot ${slotId}`);
        
        // Actualizamos suscripción existente
        await supabaseAdmin.from('subscriptions')
          .update({ 
            plan_name: planName, 
            monthly_limit: monthlyLimit,
            credits_used: 0 // Reset de créditos por nuevo plan
          })
          .eq('slot_id', slotId)
          .eq('status', 'active');

        // Actualizamos hardware
        await supabaseAdmin.from('slots')
          .update({ plan_type: planName })
          .eq('slot_id', slotId);
      }
    }
  }

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const slotId = metadata.slot_id;
    if (slotId && metadata.transactionType !== 'UPGRADE') {
      await supabaseAdmin.from('slots').update({ status: 'libre', assigned_to: null, plan_type: null })
        .eq('slot_id', slotId).eq('status', 'reservado');
    }
  }

  return res.status(200).json({ received: true });
}
