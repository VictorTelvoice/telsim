
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover' as any,
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

    // 1. Obtener el stripe_customer_id de la tabla de perfiles en Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.stripe_customer_id) {
      return res.status(200).json({ status: 'no_method', message: 'Usuario no registrado en la pasarela.' });
    }

    const customerId = userData.stripe_customer_id;

    // 2. Listar métodos de pago (tarjetas) del cliente en Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1, // Solo nos interesa la principal para el resumen
    });

    if (paymentMethods.data.length === 0) {
      return res.status(200).json({ status: 'no_method', message: 'No hay tarjetas guardadas.' });
    }

    const primaryCard = paymentMethods.data[0].card;
    
    // 3. Devolver JSON estructurado para el componente visual
    return res.status(200).json({
      status: 'success',
      brand: primaryCard?.brand || 'card',
      last4: primaryCard?.last4 || '****',
      exp_month: primaryCard?.exp_month,
      exp_year: primaryCard?.exp_year
    });

  } catch (err: any) {
    console.error("[GET_PAYMENT_INFO_ERROR]", err.message);
    return res.status(500).json({ error: 'Error interno al consultar Stripe.' });
  }
}
