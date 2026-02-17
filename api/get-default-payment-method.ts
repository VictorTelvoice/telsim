/**
 * TELSIM SERVER-SIDE PAYMENT ANALYTICS v1.0
 * Recupera el método de pago predeterminado de Stripe
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'ID de usuario requerido.' });
    }

    // 1. Obtener el stripe_customer_id de la tabla de perfiles
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.stripe_customer_id) {
      // Si no hay customer ID, es que el usuario nunca ha iniciado un flujo de pago
      return res.status(200).json({ paymentMethod: null });
    }

    const customerId = userData.stripe_customer_id;

    // 2. Listar métodos de pago (tarjetas) del cliente en Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return res.status(200).json({ paymentMethod: null });
    }

    // 3. Devolver la primera tarjeta (usualmente la predeterminada en flujos simples)
    const pm = paymentMethods.data[0];
    
    return res.status(200).json({
      paymentMethod: {
        id: pm.id,
        brand: pm.card?.brand || 'card',
        last4: pm.card?.last4 || '****',
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      }
    });

  } catch (err: any) {
    console.error("[STRIPE PM ERROR]", err.message);
    return res.status(500).json({ error: err.message });
  }
}