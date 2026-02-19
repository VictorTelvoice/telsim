/**
 * TELSIM CLOUD INFRASTRUCTURE - UNIFIED WEBHOOK HANDLER v10.2
 * 
 * Cambios:
 * - Uso garantizado de Service Role Key para bypass de RLS.
 * - Refuerzo de logs de error en operaciones de DB.
 * - Validación estricta de stripe_session_id.
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

// INICIALIZACIÓN CRÍTICA: Se usa SERVICE_ROLE_KEY para tener permisos de administrador (Bypass RLS)
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
    console.error(`[TELSIM WEBHOOK ERROR] Validation Failed: ${err.message}`);
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
        console.error(`❌ [TELSIM SYNC ERROR] User Update Failed: ${err.message}`);
      }
    }
  }

  if (eventType === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const planName = metadata.planName;
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;

    console.log(`[TELSIM WEBHOOK] Procesando sesión exitosa: ${session.id} para usuario: ${userId}`);

    if (userId) {
      try {
        // 1. Localizar puerto libre
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('*')
          .eq('status', 'libre') 
          .is('assigned_to', null)
          .limit(1)
          .maybeSingle();

        if (slotError) {
          console.error('[TELSIM DB ERROR] Error consultando tabla slots:', slotError);
          throw new Error("Fallo en consulta de infraestructura.");
        }

        if (!slot) {
          throw new Error("No hay puertos 'libre' disponibles en el inventario.");
        }

        // 2. Ocupar puerto
        const { error: updateSlotError } = await supabaseAdmin
          .from('slots')
          .update({
            status: 'ocupado',
            assigned_to: userId,
            plan_type: planName
          })
          .eq('slot_id', slot.slot_id);

        if (updateSlotError) {
          console.error('[TELSIM DB ERROR] Error actualizando tabla slots:', updateSlotError);
          throw updateSlotError;
        }

        // 3. Vincular suscripción mediante stripe_session_id
        // CRÍTICO: Usamos Service Role para saltar RLS y grabamos phone_number
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

        if (subUpdateError) {
          console.error('❌ [TELSIM DB ERROR] Error fatal actualizando suscripción:', subUpdateError);
          throw subUpdateError;
        }
        
        console.log(`✅ [TELSIM SUCCESS] Línea ${slot.phone_number} vinculada correctamente a la sesión ${session.id}`);

        // 4. Asegurar Customer ID
        if (session.customer) {
          await supabaseAdmin.from('users').update({ 
            stripe_customer_id: session.customer 
          }).eq('id', userId);
        }

      } catch (err: any) {
        console.error(`❌ [TELSIM PROVISIONING FAILED]: ${err.message}`);
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

  return res.status(200).json({ received: true, node: 'TELSIM-GATEWAY-PROVISIONING' });
}