import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '' 
);

async function getRawBody(readable: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of readable) {
    if (typeof chunk === 'string') chunks.push(new TextEncoder().encode(chunk));
    else chunks.push(new Uint8Array(chunk));
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    const rawBodyString = new TextDecoder().decode(rawBody);
    if (webhookSecret && sig) event = stripe.webhooks.constructEvent(rawBodyString, sig, webhookSecret);
    else event = JSON.parse(rawBodyString);
  } catch (err: any) { return res.status(400).send(`Webhook Error: ${err.message}`); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, slot_id: slotId, planName, limit, transactionType } = session.metadata || {};

    if (userId && slotId) {
      try {
        let amount = (session.amount_total || 0) / 100;
        if (amount === 0) {
          const lines = await stripe.checkout.sessions.listLineItems(session.id);
          amount = (lines.data[0]?.price?.unit_amount || 0) / 100;
        }

        // GUARDAR CUSTOMER ID PARA PERSISTENCIA DE PAGO
        if (session.customer) {
            await supabaseAdmin.from('users').update({ 
                stripe_customer_id: session.customer.toString() 
            }).eq('id', userId);
        }

        if (transactionType === 'UPGRADE') {
          // Lógica de Auditoría: Marcar como cancelada la previa
          await supabaseAdmin.from('subscriptions')
            .update({ status: 'canceled' })
            .eq('slot_id', slotId)
            .eq('status', 'active');
        }

        const { data: slot } = await supabaseAdmin.from('slots').select('phone_number').eq('slot_id', slotId).single();
        
        // Evitar duplicidad con flujos instantáneos
        const { data: exists } = await supabaseAdmin.from('subscriptions').select('id').eq('stripe_session_id', session.id).maybeSingle();
        
        if (!exists) {
            await supabaseAdmin.from('subscriptions').insert({
                user_id: userId, slot_id: slotId, phone_number: slot?.phone_number,
                plan_name: planName, monthly_limit: Number(limit), status: 'active',
                stripe_session_id: session.id, amount, currency: session.currency || 'usd',
                created_at: new Date().toISOString()
            });
        }

        await supabaseAdmin.from('slots').update({ 
            status: 'ocupado', assigned_to: userId, plan_type: planName 
        }).eq('slot_id', slotId);

      } catch (err: any) { console.error(`[WEBHOOK ERROR] ${err.message}`); }
    }
  }
  return res.status(200).json({ received: true });
}