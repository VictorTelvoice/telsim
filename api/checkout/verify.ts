
/**
 * TELSIM INFRASTRUCTURE - MANUAL VERIFICATION NODE v1.0
 * Permite al usuario forzar la verificación si el webhook tarda demasiado.
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Updated apiVersion to match required type '2026-01-28.clover'
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID requerido' });

    // 1. Consultar estado real en Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return res.status(200).json({ status: 'unpaid', message: 'El pago aún no ha sido confirmado por Stripe.' });
    }

    // 2. Verificar si ya existe en nuestra DB (procesado por webhook)
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('phone_number, plan_name, amount, currency, monthly_limit')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (subscription) {
      return res.status(200).json({ 
        status: 'completed', 
        phoneNumber: subscription.phone_number,
        planName: subscription.plan_name,
        amount: subscription.amount,
        currency: subscription.currency,
        monthlyLimit: subscription.monthly_limit
      });
    }

    // 3. Si está pagado en Stripe pero no en DB, el webhook está en camino o falló
    return res.status(200).json({ 
      status: 'pending_db', 
      message: 'Pago confirmado. La infraestructura física está terminando de asignar tu número.' 
    });

  } catch (err: any) {
    console.error("[VERIFY ERROR]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
