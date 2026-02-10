/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v3.2
 * 
 * Procesamiento oficial de pagos con corrección de precisión decimal.
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const handleStripeWebhook = async (event: any, supabaseClient: any) => {
  const { type, data } = event;

  // Procesamos exclusivamente el éxito del Checkout
  if (type === 'checkout.session.completed') {
    const session = data.object;
    
    // 1. Extracción y Conversión de Monto (Stripe envía centavos)
    const amountTotalCents = session.amount_total || 0;
    const amountDecimal = amountTotalCents / 100; // Convierte 3990 a 39.90

    // 2. Extracción de Metadatos de Identidad TELSIM
    const metadata = session.metadata || {};
    const userId = metadata.userId; 
    const phoneNumber = metadata.phoneNumber;
    const planName = metadata.planName || 'Pro';
    const monthlyLimit = parseInt(metadata.limit) || 400;

    console.log(`[WEBHOOK] Procesando Pago: $${amountDecimal} para Usuario: ${userId}`);

    if (!userId || !phoneNumber) {
      console.error('[STRIPE WEBHOOK ERROR] Metadata de usuario o teléfono faltante.');
      return { status: 'error', message: 'Missing critical metadata' };
    }

    try {
      // 3. Flujo Atómico en Supabase:
      
      // A. Marcar suscripciones previas de esta línea como 'actualizado'
      await supabaseClient
        .from('subscriptions')
        .update({ status: 'actualizado' })
        .eq('phone_number', phoneNumber)
        .eq('status', 'active');

      // B. Insertar nueva suscripción con el monto decimal corregido
      const { error: insertError } = await supabaseClient
        .from('subscriptions')
        .insert([{
          user_id: userId, // Usamos el ID de los metadatos
          phone_number: phoneNumber,
          plan_name: planName,
          amount: amountDecimal, // Ahora guarda $39.90, $99.00, etc.
          monthly_limit: monthlyLimit,
          status: 'active',
          currency: (session.currency || 'usd').toUpperCase(),
          stripe_session_id: session.id
        }]);

      if (insertError) throw insertError;

      // C. Actualizar el estado del puerto físico GSM
      await supabaseClient
        .from('slots')
        .update({ 
          status: 'ocupado',
          plan_type: planName
        })
        .eq('phone_number', phoneNumber);

      // D. Notificación de Infraestructura
      await supabaseClient
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Transacción Confirmada',
          message: `Pago de $${amountDecimal.toFixed(2)} procesado. Tu línea ${phoneNumber} ha sido provisionada con el Plan ${planName}.`,
          type: 'subscription'
        }]);

      console.log(`[WEBHOOK SUCCESS] Suscripción registrada exitosamente: ${session.id}`);
      return { status: 'success' };

    } catch (err: any) {
      console.error('[STRIPE WEBHOOK CRITICAL ERROR]', err.message);
      throw err;
    }
  }

  return { status: 'ignored' };
};