/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v3.4
 * 
 * Corrección de precisión financiera y mapeo estricto de columnas.
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
    
    // 1. Extracción de Monto Real (Stripe envía centavos, ej: 1990)
    // Usamos Number() para garantizar tipo numérico y dividimos por 100 para decimales
    const amount = Number(session.amount_total / 100); 

    // 2. Extracción de Metadatos (Claves exactas según JSON de Stripe)
    const metadata = session.metadata || {};
    const userId = metadata.userId; 
    const phoneNumber = metadata.phoneNumber; 
    const planName = metadata.planName; 
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;

    // 3. LOGS DE DEPURACIÓN PARA VERCEL
    console.log('--- DIAGNÓSTICO WEBHOOK TELSIM ---');
    console.log('Sesión ID:', session.id);
    console.log('Metadatos recibidos:', { userId, phoneNumber, planName });
    console.log('Insertando en Supabase -> Monto: ' + amount);

    if (!userId || !phoneNumber) {
      console.error('[CRITICAL] Faltan metadatos esenciales (userId o phoneNumber).');
      return { status: 'error', message: 'Faltan metadatos de identidad.' };
    }

    try {
      // 4. Actualización Atómica de la Base de Datos
      
      // A. Marcar suscripciones anteriores como obsoletas
      await supabaseClient
        .from('subscriptions')
        .update({ status: 'actualizado' })
        .eq('phone_number', phoneNumber)
        .eq('status', 'active');

      // B. Insertar nueva suscripción con mapeo exacto de columnas
      const { error: insertError } = await supabaseClient
        .from('subscriptions')
        .insert([{
          user_id: userId,
          phone_number: phoneNumber,
          plan_name: planName,
          amount: amount, // Mapeo exacto a la columna 'amount' (Decimal)
          monthly_limit: monthlyLimit,
          status: 'active',
          currency: (session.currency || 'usd').toUpperCase(),
          stripe_session_id: session.id
        }]);

      if (insertError) {
        console.error('[SUPABASE INSERT ERROR]', insertError);
        throw insertError;
      }

      // C. Sincronizar estado del slot físico
      await supabaseClient
        .from('slots')
        .update({ 
          status: 'ocupado',
          plan_type: planName
        })
        .eq('phone_number', phoneNumber);

      // D. Notificar éxito al usuario
      await supabaseClient
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Pago Confirmado',
          message: `Tu plan ${planName} ha sido activado por un monto de $${amount.toFixed(2)}.`,
          type: 'subscription'
        }]);

      console.log(`[WEBHOOK SUCCESS] Procesado con éxito: ${session.id} | Monto: ${amount}`);
      return { status: 'success' };

    } catch (err: any) {
      console.error('[WEBHOOK CRITICAL FAILURE]', err.message);
      return { status: 'error', error: err.message };
    }
  }

  return { status: 'ignored', type };
};