import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, slotId, newPriceId, newPlanName, isAnnual } = req.body;

  if (!userId || !slotId || !newPriceId || !newPlanName) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  try {
    // 1. Obtener stripe_customer_id del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No se encontró customer de Stripe para este usuario' });
    }

    const customerId = profile.stripe_customer_id;

    // 2. Obtener la suscripción activa actual del slot y el teléfono del slot
    const { data: currentSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('slot_id', slotId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    const { data: slotRow } = await supabaseAdmin
      .from('slots')
      .select('phone_number')
      .eq('slot_id', slotId)
      .maybeSingle();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.telsim.io';

    // 3. Crear Stripe Checkout Session para el upgrade
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: newPriceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          upgrade: 'true',
          slot_id: slotId,
          user_id: userId,
          old_subscription_id: currentSub?.stripe_subscription_id || '',
          new_plan_name: newPlanName,
          is_annual: isAnnual ? 'true' : 'false',
          phone_number: slotRow?.phone_number || '',
        },
      },
      payment_method_collection: 'always',
      success_url: `${baseUrl}/#/dashboard/upgrade-success?session_id={CHECKOUT_SESSION_ID}&slotId=${slotId}&planName=${encodeURIComponent(newPlanName)}&isAnnual=${isAnnual}`,
      cancel_url: `${baseUrl}/#/dashboard/upgrade-plan`,
    });

    return res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error('[UPGRADE-SUBSCRIPTION ERROR]', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Error interno del servidor' });
  }
}

