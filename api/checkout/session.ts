import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicialización global robusta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  'Starter': { monthly: 19.90, annual: 199 },
  'Pro':     { monthly: 39.90, annual: 399 },
  'Power':   { monthly: 99.00, annual: 990 },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    let { priceId, userId, phoneNumber, planName, isUpgrade, monthlyLimit, slot_id, forceManual, isAnnual } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Parámetros insuficientes.' });
    }

    // Normalizar isAnnual: puede llegar como boolean, string 'true'/'false', o undefined
    if (typeof isAnnual === 'string') {
      isAnnual = isAnnual === 'true';
    } else if (typeof isAnnual !== 'boolean') {
      // Solo inferir de Stripe si realmente no vino ningún valor
      try {
        const priceObj = await stripe.prices.retrieve(priceId);
        const interval = (priceObj as any).recurring?.interval;
        // Determinar por el priceId directamente contra las constantes conocidas
        const ANNUAL_PRICE_IDS = [
          'price_1T52jPEADSrtMyiayfSm4e8m',
          'price_1T52kUEADSrtMyiavL3rwWqH',
          'price_1T52l1EADSrtMyiaGkuLXqy5',
        ];
        isAnnual = ANNUAL_PRICE_IDS.includes(priceId) || interval === 'year';
      } catch (e) {
        isAnnual = false;
      }
    }

    // 1. RECUPERACIÓN DE PERSISTENCIA DESDE TABLA 'profiles'
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    const customerId = profileData?.stripe_customer_id;

    // --- FLUJO DE PAGO INSTANTÁNEO INTERNO (REINTENTO ONE-CLICK) ---
    // Mantenemos esta lógica por si el usuario ya tiene un método predeterminado en Stripe
    if (customerId && !forceManual) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

        if (defaultPaymentMethod) {
          // ESCENARIO A: UPGRADE (upgrade instantáneo vía Stripe; Supabase se actualiza por webhook)
          if (isUpgrade && slot_id) {
            let activeSub: Record<string, unknown> | null = null;

            const { data: bySlot } = await supabaseAdmin
              .from('subscriptions')
              .select('*')
              .eq('slot_id', slot_id)
              .eq('user_id', userId)
              .in('status', ['active', 'trialing'])
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            activeSub = bySlot as Record<string, unknown> | null;

            if (!activeSub && phoneNumber) {
              const { data: byPhone } = await supabaseAdmin
                .from('subscriptions')
                .select('*')
                .eq('phone_number', phoneNumber)
                .eq('user_id', userId)
                .in('status', ['active', 'trialing'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              activeSub = byPhone as Record<string, unknown> | null;
            }

            console.log('[UPGRADE] activeSub encontrado:', JSON.stringify({
              id: activeSub?.id,
              slot_id: activeSub?.slot_id,
              status: activeSub?.status,
              stripe_subscription_id: activeSub?.stripe_subscription_id,
              stripe_session_id: activeSub?.stripe_session_id,
            }));

            if (activeSub && (activeSub.stripe_subscription_id || activeSub.stripe_session_id)) {
              let stripeSubId = activeSub.stripe_subscription_id as string | undefined;

              if (!stripeSubId) {
                const sessionId = activeSub.stripe_session_id as string;
                if (sessionId?.startsWith('sub_')) {
                  stripeSubId = sessionId;
                } else if (sessionId?.startsWith('cs_')) {
                  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
                  stripeSubId = checkoutSession.subscription as string;
                }
              }

              if (!stripeSubId) throw new Error('No se encontró la suscripción de Stripe para este slot.');

              const subscription = await stripe.subscriptions.retrieve(stripeSubId);
              await stripe.subscriptions.update(stripeSubId, {
                items: [{ id: subscription.items.data[0].id, price: priceId }],
                proration_behavior: 'always_invoice',
                metadata: {
                  userId,
                  slot_id: activeSub.slot_id as string,
                  planName,
                  monthlyLimit: String(monthlyLimit),
                  isAnnual: isAnnual ? 'true' : 'false',
                  transactionType: 'UPGRADE',
                },
              });

              return res.status(200).json({ instant: true, subscriptionId: activeSub.id });
            }
          }

          // ESCENARIO B: COMPRA NUEVA (Asignación de hardware)
          if (!isUpgrade) {
            const { data: freeSlot } = await supabaseAdmin
              .from('slots')
              .select('slot_id, phone_number')
              .eq('status', 'libre')
              .order('slot_id', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (!freeSlot) throw new Error("Sin disponibilidad física.");
            
            await supabaseAdmin.from('slots').update({ status: 'ocupado', assigned_to: userId, plan_type: planName }).eq('slot_id', freeSlot.slot_id);

            const priceData = await stripe.prices.retrieve(priceId);

            // Plan catalogue for correct annual pricing
            const planPrices = PLAN_PRICES[planName] || { monthly: (priceData.unit_amount || 0) / 100, annual: (priceData.unit_amount || 0) / 100 };
            const correctAmount = isAnnual ? planPrices.annual : planPrices.monthly;

            const stripeSub = await stripe.subscriptions.create({
              customer: customerId,
              items: [{ price: priceId }],
              default_payment_method: defaultPaymentMethod as string,
              trial_period_days: 7,
              metadata: { userId, phoneNumber: freeSlot.phone_number, planName, slot_id: freeSlot.slot_id, transactionType: 'NEW_SUB', isAnnual: isAnnual ? 'true' : 'false' }
            });

            const { data: newSub } = await supabaseAdmin
              .from('subscriptions')
              .insert({
                user_id: userId, slot_id: freeSlot.slot_id, phone_number: freeSlot.phone_number,
                plan_name: planName, monthly_limit: monthlyLimit, credits_used: 0,
                status: stripeSub.status === 'trialing' ? 'trialing' : 'active',
                stripe_session_id: stripeSub.id,
                amount: isAnnual ? (PLAN_PRICES[planName]?.annual ?? correctAmount) : (PLAN_PRICES[planName]?.monthly ?? correctAmount),
                billing_type: isAnnual ? 'annual' : 'monthly',
                currency: priceData.currency || 'usd',
                created_at: new Date().toISOString()
              })
              .select('id')
              .single();

            return res.status(200).json({ instant: true, subscriptionId: newSub?.id });
          }
        }
      } catch (oneClickErr: any) {
        console.error('[ONE-CLICK ERROR]', oneClickErr?.message, JSON.stringify(oneClickErr));
      }
    }

    // --- FLUJO ESTÁNDAR (STRIPE CHECKOUT CONFIGURADO SEGÚN INSTRUCCIONES) ---
    const host = req.headers.host;
    const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host}`;
    
    let targetSlotId = slot_id;
    let targetPhoneNumber: string = typeof phoneNumber === 'string' ? phoneNumber : '';

    if (!isUpgrade) {
      const { data: s } = await supabaseAdmin.from('slots').select('slot_id, phone_number').eq('status', 'libre').limit(1).single();
      if (!s) throw new Error("Sin capacidad física disponible.");
      targetSlotId = s.slot_id;
      targetPhoneNumber = (s as { phone_number?: string }).phone_number ?? targetPhoneNumber;
    } else if (!targetPhoneNumber && targetSlotId) {
      const { data: slotRow } = await supabaseAdmin.from('slots').select('phone_number').eq('slot_id', targetSlotId).maybeSingle();
      targetPhoneNumber = (slotRow as { phone_number?: string } | null)?.phone_number ?? '';
    }

    // Siempre incluir phoneNumber en metadata para que el webhook pueda referenciar la SIM en correos y Telegram
    const sessionConfig: any = {
      customer: customerId || undefined,
      payment_method_collection: 'always',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: { trial_period_days: 7 },
      success_url: `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&slot_id=${targetSlotId}&isUpgrade=${isUpgrade}`,
      cancel_url: `${origin}/#/dashboard/numbers`,
      metadata: {
        userId,
        slot_id: targetSlotId,
        phoneNumber: targetPhoneNumber,
        planName,
        limit: String(monthlyLimit ?? ''),
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUB',
        isAnnual: isAnnual ? 'true' : 'false'
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("[SESSION ERROR]", err.message);
    return res.status(500).json({ error: err.message });
  }
}