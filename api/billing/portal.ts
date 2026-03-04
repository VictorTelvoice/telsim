
/**
 * TELSIM · POST /api/billing/portal
 *
 * Genera un enlace seguro al Customer Portal de Stripe.
 * Acepta { customerId, returnUrl } en el body, o bien { userId }
 * para hacer lookup en la tabla `users`.
 */
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
    const { customerId, userId, returnUrl } = req.body;

    let stripeCustomerId = customerId;

    // If no customerId provided directly, look it up via userId
    if (!stripeCustomerId && userId) {
      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (error || !userData?.stripe_customer_id) {
        return res.status(400).json({
          error: 'No se encontró un perfil de facturación activo. Realiza tu primera compra para habilitar el portal.',
        });
      }
      stripeCustomerId = userData.stripe_customer_id;
    }

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'Se requiere customerId o userId.' });
    }

    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const fallbackReturn = `${protocol}://${host}/#/dashboard`;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || fallbackReturn,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('[PORTAL ERROR]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
