
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

  // EVENTO: Checkout completado con éxito
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const slotId = metadata.slot_id;
    const planName = metadata.planName;
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;
    const transactionType = metadata.transactionType; // 'NEW_SUBSCRIPTION' o 'UPGRADE'

    if (userId && slotId) {
      try {
        console.log(`[TELSIM LEDGER] Procesando ${transactionType} para usuario ${userId} en Slot ${slotId}`);

        // 1. OBTENER EL NÚMERO DEL HARDWARE VINCULADO
        const { data: slotData, error: slotFetchError } = await supabaseAdmin
          .from('slots')
          .select('phone_number')
          .eq('slot_id', slotId)
          .single();

        if (slotFetchError || !slotData) throw new Error(`Puerto ${slotId} no hallado en el inventario.`);

        // 2. SI ES UN UPGRADE: Cancelar suscripciones activas previas para este slot
        if (transactionType === 'UPGRADE') {
          console.log(`[TELSIM UPGRADE] Archivando plan anterior para el slot ${slotId}`);
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('slot_id', slotId)
            .eq('user_id', userId)
            .eq('status', 'active');
        }

        // 3. INSERTAR LA NUEVA SUSCRIPCIÓN (REINICIANDO CICLO)
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            slot_id: slotId,
            phone_number: slotData.phone_number,
            plan_name: planName,
            monthly_limit: monthlyLimit,
            credits_used: 0, // Reinicio de créditos por nuevo plan
            status: 'active',
            stripe_session_id: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'usd',
            created_at: new Date().toISOString()
          });

        if (subError) throw subError;

        // 4. ACTUALIZAR ESTADO DEL HARDWARE
        await supabaseAdmin.from('slots')
          .update({ 
              status: 'ocupado',
              assigned_to: userId,
              plan_type: planName // Actualizar al nuevo nombre de plan (Starter -> Pro)
          })
          .eq('slot_id', slotId);

        // 5. VINCULAR CUSTOMER ID SI ES NUEVO
        if (session.customer) {
          await supabaseAdmin.from('users').update({ 
            stripe_customer_id: session.customer 
          }).eq('id', userId);
        }

        console.log(`[TELSIM WEBHOOK] ✅ ${transactionType} EXITOSO: ${slotData.phone_number} (${planName})`);

      } catch (err: any) {
        console.error(`❌ PROVISION ERROR EN WEBHOOK: ${err.message}`);
      }
    }
  }

  // EVENTO: Pago fallido o expirado (Liberar reserva si no es un upgrade)
  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const slotId = metadata.slot_id;
    const transactionType = metadata.transactionType;
    
    if (slotId && transactionType !== 'UPGRADE') {
      console.log(`[TELSIM] Checkout fallido. Liberando reserva del slot ${slotId}`);
      await supabaseAdmin.from('slots')
        .update({ status: 'libre', assigned_to: null, plan_type: null })
        .eq('slot_id', slotId)
        .eq('status', 'reservado');
    }
  }

  return res.status(200).json({ received: true });
}
