/**
 * TELSIM STRIPE PORTAL GATEWAY v1.0
 * Genera un enlace seguro al Customer Portal de Stripe
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

    // 1. Obtener el stripe_customer_id del usuario
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.stripe_customer_id) {
      return res.status(400).json({ error: 'No se encontró un perfil de facturación activo. Realiza tu primera compra para habilitar el portal.' });
    }

    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    // 2. Crear sesión del portal de Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${origin}/#/dashboard/billing`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("[PORTAL ERROR]", err.message);
    return res.status(500).json({ error: err.message });
  }
}