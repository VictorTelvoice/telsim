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

  const eventType = event.type;

  if (eventType === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const slotId = metadata.slot_id; // SIEMPRE slot_id
    const planName = metadata.planName;
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;

    if (userId) {
      try {
        console.log(`[TELSIM LEDGER] Provisionando Slot ID: ${slotId}`);
        
        // 1. Vincular cliente
        if (session.customer) {
          await supabaseAdmin.from('users').update({ 
            stripe_customer_id: session.customer 
          }).eq('id', userId);
        }

        // 2. Upsert Suscripción (Garantizando slot_id)
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            slot_id: slotId,
            plan_name: planName,
            monthly_limit: monthlyLimit,
            status: 'active',
            stripe_session_id: session.id,
            updated_at: new Date().toISOString()
          }, { onConflict: 'slot_id' });

        if (subError) throw subError;

        // 3. Marcar Slot como ocupado
        if (slotId && slotId !== 'new') {
           await supabaseAdmin.from('slots')
            .update({ 
                status: 'ocupado',
                assigned_to: userId,
                plan_type: planName
            })
            .eq('slot_id', slotId);
        }

      } catch (err: any) {
        console.error(`❌ TELSIM PROVISION ERROR: ${err.message}`);
      }
    }
  }

  return res.status(200).json({ received: true, node: 'TELSIM-GATEWAY-PRO' });
}