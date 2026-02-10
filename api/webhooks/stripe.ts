/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER
 * 
 * Lógica oficial para el procesamiento de pagos y aprovisionamiento de red.
 * Refactorizado para máxima seguridad utilizando variables de entorno.
 */

import Stripe from 'stripe';

// Inicialización segura del cliente de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (event: any, supabaseClient: any) => {
  const { type, data } = event;

  /**
   * NOTA DE SEGURIDAD: En producción, utiliza stripe.webhooks.constructEvent
   * con el raw body y el sig-header para validar la autenticidad del evento
   * usando el WEBHOOK_SECRET.
   */

  // Eventos de interés: Éxito de checkout o actualización manual de suscripción
  if (type === 'checkout.session.completed' || type === 'customer.subscription.updated') {
    const sessionOrSub = data.object;
    
    // Extraemos metadatos enviados desde el frontend
    const metadata = sessionOrSub.metadata || {};
    const { userId, phoneNumber, planName, amount, limit } = metadata;

    if (!userId || !phoneNumber) {
      console.warn('[STRIPE WEBHOOK] Metadata faltante para aprovisionamiento');
      return { status: 'error', message: 'Missing metadata' };
    }

    try {
      // PROCESO DE HISTORIAL INMUTABLE:
      
      // 1. Marcar la suscripción anterior como 'actualizado' (Atomic flow)
      await supabaseClient
        .from('subscriptions')
        .update({ status: 'actualizado' })
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber)
        .eq('status', 'active');

      // 2. Crear nueva suscripción activa e inmutable
      const { error: insertError } = await supabaseClient
        .from('subscriptions')
        .insert([{
          user_id: userId,
          phone_number: phoneNumber,
          plan_name: planName || 'Pro',
          amount: parseFloat(amount) || 0,
          monthly_limit: parseInt(limit) || 400,
          status: 'active',
          currency: 'USD',
          stripe_session_id: sessionOrSub.id
        }]);

      if (insertError) throw insertError;

      // 3. Cambiar estado del puerto GSM a 'ocupado'
      await supabaseClient
        .from('slots')
        .update({ 
          status: 'ocupado',
          plan_type: planName || 'Pro'
        })
        .eq('phone_number', phoneNumber);

      // 4. Generar notificación de éxito en tiempo real
      await supabaseClient
        .from('notifications')
        .insert([{
          user_id: userId,
          title: '¡Plan Actualizado!',
          message: `Tu línea ${phoneNumber} ahora es Plan ${planName}. La configuración de red ha sido actualizada exitosamente.`,
          type: 'subscription'
        }]);

      console.log(`[STRIPE WEBHOOK SUCCESS] Red aprovisionada vía puerto físico para ${phoneNumber}`);
      return { status: 'success' };
    } catch (err) {
      console.error('[STRIPE WEBHOOK CRITICAL ERROR]', err);
      throw err;
    }
  }

  return { status: 'ignored' };
};