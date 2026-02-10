/**
 * TELSIM SERVER-SIDE CHECKOUT GATEWAY v3.2
 */
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { priceId, userId, phoneNumber, planName, isUpgrade, monthlyLimit } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Parámetros insuficientes.' });
    }

    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const successUrl = isUpgrade 
      ? `${origin}/#/dashboard/upgrade-success?session_id={CHECKOUT_SESSION_ID}&num=${phoneNumber}&plan=${planName}`
      : `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`;
    
    const cancelUrl = isUpgrade 
      ? `${origin}/#/dashboard/numbers` 
      : `${origin}/#/onboarding/payment`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        phoneNumber: phoneNumber || 'NEW_SIM_REQUEST',
        planName: planName,
        limit: monthlyLimit || 400, // Enviamos el límite para el Webhook
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUBSCRIPTION'
      },
      subscription_data: {
        metadata: {
          userId: userId,
          phoneNumber: phoneNumber || 'NEW_SIM_REQUEST'
        }
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}