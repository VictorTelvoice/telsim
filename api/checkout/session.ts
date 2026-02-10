/**
 * TELSIM SERVER-SIDE CHECKOUT GATEWAY v3.1
 * Ruta de API para procesar suscripciones de forma segura y evitar bloqueos de dominio.
 */
import Stripe from 'stripe';

// Inicialización con la llave secreta (solo disponible en el servidor)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { priceId, userId, phoneNumber, planName, isUpgrade } = req.body;

    // Validación de integridad de datos
    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Parámetros insuficientes para la transacción.' });
    }

    // Determinar origen para las URLs de retorno
    const host = req.headers.host;
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    console.log(`[STRIPE SERVER] Generando sesión para Usuario: ${userId}, Plan: ${planName}`);

    // Configuración de URLs según el flujo (Onboarding vs Upgrade)
    const successUrl = isUpgrade 
      ? `${origin}/#/dashboard/upgrade-success?session_id={CHECKOUT_SESSION_ID}&num=${phoneNumber}&plan=${planName}`
      : `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`;
    
    const cancelUrl = isUpgrade 
      ? `${origin}/#/dashboard/numbers` 
      : `${origin}/#/onboarding/payment`;

    // Creación de la sesión en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      // Metadatos para el Webhook de Supabase
      metadata: {
        userId: userId,
        phoneNumber: phoneNumber || 'NEW_SIM_REQUEST',
        planName: planName,
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUBSCRIPTION'
      },
      subscription_data: {
        metadata: {
          userId: userId,
          phoneNumber: phoneNumber || 'NEW_SIM_REQUEST'
        }
      }
    });

    // Devolvemos la URL de redirección oficial de Stripe
    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error('[STRIPE CRITICAL ERROR]', err.message);
    return res.status(500).json({ 
      error: 'Error interno en la pasarela de pagos.',
      details: err.message 
    });
  }
}
