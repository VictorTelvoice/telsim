/**
 * TELSIM CLOUD INFRASTRUCTURE - STRIPE WEBHOOK HANDLER v3.7
 * 
 * LÓGICA DE ACTUALIZACIÓN AGRESIVA: 
 * 1. Finalización de suscripciones previas (superseded).
 * 2. Creación de nuevos registros (Inmutabilidad histórica).
 * 3. Mapeo estricto de montos decimales.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicialización con Service Role para saltar RLS y manejar la columna 'amount'
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const handleStripeWebhook = async (event: any) => {
  const { type, data } = event;

  if (type === 'checkout.session.completed') {
    const session = data.object;
    
    // 1. EXTRACCIÓN Y CONVERSIÓN DE MONTO (Stripe centavos -> DB decimal)
    const rawTotal = session.amount_total ?? session.amount_subtotal ?? 0;
    const amountValue = Number(rawTotal) / 100; // Ej: 3990 -> 39.9

    // 2. EXTRACCIÓN DE METADATOS (Case-sensitive exacto)
    const metadata = session.metadata || {};
    const userId = metadata.userId; 
    const phoneNumberReq = metadata.phoneNumber; 
    const planName = metadata.planName; 
    const monthlyLimit = metadata.limit ? Number(metadata.limit) : 400;

    console.log('--- [DIAGNÓSTICO TELSIM INICIO] ---');
    console.log('Evento ID:', event.id);
    console.log('Session ID:', session.id);
    console.log('Insertando en Supabase -> Monto:', amountValue);
    console.log('Metadatos:', { userId, phoneNumberReq, planName });

    if (!userId) {
      console.error('[FATAL] Metadato userId no encontrado en Stripe Session.');
      return { status: 'error', message: 'User identity missing' };
    }

    try {
      // 3. VERIFICAR IDEMPOTENCIA (Evitar duplicar si Stripe reintenta el webhook)
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (existingSub) {
        console.log('[INFO] Webhook ya procesado anteriormente. Omitiendo.');
        return { status: 'success', message: 'Already processed' };
      }

      let finalPhoneNumber = phoneNumberReq;

      // 4. ASIGNACIÓN DE INFRAESTRUCTURA (Nuevo puerto si aplica)
      if (phoneNumberReq === 'NEW_SIM_REQUEST') {
        const { data: slot, error: slotError } = await supabaseAdmin
          .from('slots')
          .select('phone_number')
          .eq('status', 'libre')
          .limit(1)
          .single();

        if (slotError || !slot) {
          console.error('[INFRA ERROR] Sin puertos GSM físicos disponibles.');
          throw new Error("No physical hardware slots available");
        }
        finalPhoneNumber = slot.phone_number;
      }

      // 5. FINALIZAR SUSCRIPCIÓN ANTERIOR (Superseded)
      // Buscamos cualquier plan activo para este usuario y número y lo cerramos.
      console.log(`[CLEANUP] Finalizando planes previos para ${finalPhoneNumber}...`);
      const { error: updateOldError } = await supabaseAdmin
        .from('subscriptions')
        .update({ 
          status: 'superseded',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('phone_number', finalPhoneNumber)
        .eq('status', 'active');

      if (updateOldError) {
        console.warn('[WARNING] Error al marcar anterior como superseded:', updateOldError.message);
      }

      // 6. CREAR NUEVA SUSCRIPCIÓN (Inmutabilidad)
      const subscriptionPayload = {
        user_id: userId,
        phone_number: finalPhoneNumber,
        plan_name: planName,
        amount: amountValue, // Mapeo exacto a columna 'amount' (Decimal)
        monthly_limit: monthlyLimit,
        status: 'active',
        currency: (session.currency || 'usd').toUpperCase(),
        stripe_session_id: session.id,
        created_at: new Date().toISOString()
      };

      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert([subscriptionPayload])
        .select();

      if (insertError) {
        // "GRITAR" ERROR DETALLADO
        console.error('--- [ERROR CRÍTICO SUPABASE] ---');
        console.error('Mensaje:', insertError.message);
        console.error('Detalles:', insertError.details);
        console.error('Payload:', JSON.stringify(subscriptionPayload));
        throw insertError;
      }

      // 7. VINCULAR SERVICIO EN TABLA SLOTS
      await supabaseAdmin
        .from('slots')
        .update({ 
          status: 'ocupado',
          assigned_to: userId,
          plan_type: planName 
        })
        .eq('phone_number', finalPhoneNumber);

      // 8. NOTIFICACIÓN DE SISTEMA
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: userId,
          title: 'Contrato Activado',
          message: `Confirmamos pago de $${amountValue.toFixed(2)}. Tu puerto ${finalPhoneNumber} está vinculado al plan ${planName}.`,
          type: 'subscription'
        }]);

      console.log('--- [DIAGNÓSTICO TELSIM ÉXITO] ---');
      return { status: 'success' };

    } catch (err: any) {
      console.error('[WEBHOOK FATAL ERROR]', err.message);
      return { status: 'error', error: err.message };
    }
  }

  return { status: 'ignored' };
};