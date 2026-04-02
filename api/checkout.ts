/**
 * TELSIM · POST /api/checkout
 *
 * Una sola ruta con parámetro action (query o body): ?action=session | ?action=verify
 * session: crea sesión Stripe Checkout (body: priceId, userId, planName, ...)
 * verify: verifica sesión de pago (body: sessionId)
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { applyStripeCheckoutBillingCompliance } from './_helpers/stripeCheckoutCompliance.js';
import {
  applySlotCountryFilter,
  isSupportedOnboardingCountryCode,
} from './_helpers/slotCountryMapping.js';
import { monthlySmsLimitForPlan } from './_helpers/subscriptionPlanLimits.js';
import { subscriptionBillingSnapshotFromStripe } from './_helpers/stripeSubscriptionBilling.js';

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

  const hostHeader = req.headers.host ?? 'localhost';
  const currentUrl = new URL(req.url ?? '/', `https://${hostHeader}`);
  const actionFromQuery = currentUrl.searchParams.get('action');
  const action = (actionFromQuery || req.body?.action) as string;
  if (!action || !['session', 'verify'].includes(action)) {
    return res.status(400).json({ error: 'Se requiere action: "session" o "verify".' });
  }

  try {
    if (action === 'verify') {
      const { sessionId } = req.body || {};
      if (!sessionId) return res.status(400).json({ error: 'Session ID requerido' });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return res.status(200).json({ status: 'unpaid', message: 'El pago aún no ha sido confirmado por Stripe.' });
      }
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('phone_number, plan_name, amount, currency, monthly_limit')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();
      if (subscription) {
        return res.status(200).json({
          status: 'completed',
          phoneNumber: subscription.phone_number,
          planName: subscription.plan_name,
          amount: subscription.amount,
          currency: subscription.currency,
          monthlyLimit: subscription.monthly_limit,
        });
      }
      return res.status(200).json({
        status: 'pending_db',
        message: 'Pago confirmado. La infraestructura está asignando tu número.',
      });
    }

    // action === 'session'
    let { priceId, userId, phoneNumber, planName, isUpgrade, monthlyLimit, slot_id, forceManual, isAnnual, region } = req.body || {};

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Parámetros insuficientes.' });
    }

    if (typeof isAnnual === 'string') {
      isAnnual = isAnnual === 'true';
    } else if (typeof isAnnual !== 'boolean') {
      try {
        const priceObj = await stripe.prices.retrieve(priceId);
        const interval = (priceObj as any).recurring?.interval;
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

    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    const customerId = profileData?.stripe_customer_id;

    const regionCode =
      typeof region === 'string' && region.trim().length > 0 ? region.trim().toUpperCase() : '';

    class CheckoutHttpError extends Error {
      status: number;
      code: string;
      constructor(status: number, code: string, message: string) {
        super(message);
        this.status = status;
        this.code = code;
      }
    }

    if (regionCode && !isSupportedOnboardingCountryCode(regionCode)) {
      console.warn('[CHECKOUT] UNSUPPORTED_ONBOARDING_COUNTRY — sin mapping en slotCountryMapping.ts', {
        regionCode,
      });
      return res.status(400).json({
        error:
          `El país "${regionCode}" no está configurado para asignación de línea. Actualiza el catálogo o contacta soporte.`,
        code: 'UNSUPPORTED_ONBOARDING_COUNTRY',
      });
    }

    if (customerId && !forceManual) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

        if (defaultPaymentMethod) {
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

              if (stripeSubId) {
                const subscription = await stripe.subscriptions.retrieve(stripeSubId);
                await stripe.subscriptions.update(stripeSubId, {
                  items: [{ id: subscription.items.data[0].id, price: priceId }],
                  billing_cycle_anchor: 'now',
                  proration_behavior: 'none',
                  trial_end: 'now',
                  cancel_at_period_end: false,
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
          }

          if (!isUpgrade) {
            let freeQ: any = supabaseAdmin
              .from('slots')
              .select('slot_id, phone_number')
              .eq('status', 'libre')
              .is('assigned_to', null);
            if (regionCode) freeQ = applySlotCountryFilter(freeQ, regionCode);

            const { data: freeSlot, error: freeSelectErr } = await freeQ
              .order('slot_id', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (freeSelectErr) {
              console.error('[CHECKOUT][slots] one-click SELECT libre failed:', {
                code: freeSelectErr.code,
                message: freeSelectErr.message,
                details: freeSelectErr.details,
                hint: (freeSelectErr as { hint?: string }).hint,
              });
              throw new CheckoutHttpError(
                500,
                'SLOT_QUERY_FAILED',
                `Error al consultar inventario de líneas: ${freeSelectErr.message}`
              );
            }

            if (freeSlot) {
              const oneClickSmsLimit = monthlySmsLimitForPlan(planName, monthlyLimit);
              const { error: oneClickOccupyErr } = await supabaseAdmin
                .from('slots')
                .update({
                  status: 'ocupado',
                  assigned_to: userId,
                  plan_type: planName,
                })
                .eq('slot_id', freeSlot.slot_id);
              if (oneClickOccupyErr) {
                console.error('[CHECKOUT][slots] one-click UPDATE ocupado failed:', {
                  code: oneClickOccupyErr.code,
                  message: oneClickOccupyErr.message,
                  details: oneClickOccupyErr.details,
                });
                throw new CheckoutHttpError(
                  500,
                  'SLOT_OCCUPY_FAILED',
                  `Error al ocupar la línea: ${oneClickOccupyErr.message}`
                );
              }

              const priceData = await stripe.prices.retrieve(priceId);
              const planPrices = PLAN_PRICES[planName] || { monthly: (priceData.unit_amount || 0) / 100, annual: (priceData.unit_amount || 0) / 100 };
              const correctAmount = isAnnual ? planPrices.annual : planPrices.monthly;

              const stripeSub = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                default_payment_method: defaultPaymentMethod as string,
                metadata: { userId, phoneNumber: freeSlot.phone_number, planName, slot_id: freeSlot.slot_id, transactionType: 'NEW_SUB', isAnnual: isAnnual ? 'true' : 'false' }
              });

              const billingSnap = subscriptionBillingSnapshotFromStripe(stripeSub);
              const nextBillingDateIso = billingSnap.next_billing_date;
              const trialEndIso = billingSnap.trial_end;
              const currentPeriodEndIso = billingSnap.current_period_end;
              const activationTs = new Date().toISOString();

              // Evitar duplicar subscriptions vivas para el mismo slot.
              // Si ya existe status in ('active','trialing','past_due') para este slot_id,
              // no insertamos otra fila viva (y cancelamos la suscripción recién creada en Stripe).
              const LIVE_STATUSES = ['active', 'trialing', 'past_due'];
              const { data: existingLiveSub } = await supabaseAdmin
                .from('subscriptions')
                .select('id, status, stripe_subscription_id')
                .eq('slot_id', freeSlot.slot_id)
                .in('status', LIVE_STATUSES)
                .limit(1)
                .maybeSingle();

              if (existingLiveSub) {
                console.warn('[ONE-CLICK] Existe subscription viva para slot_id; se evita duplicación', {
                  slot_id: freeSlot.slot_id,
                  existing_subscription_id: existingLiveSub.id,
                  existing_status: existingLiveSub.status,
                  new_stripe_subscription_id: stripeSub.id,
                });
                try {
                  await stripe.subscriptions.cancel(stripeSub.id);
                } catch (cancelErr: any) {
                  console.error('[ONE-CLICK] Cancel Stripe subscription falló tras detectar duplicación', cancelErr?.message ?? cancelErr);
                }

                // Liberar el slot en BD para no dejarlo ocupando sin fila local de subscription.
                const { error: revertSlotErr } = await supabaseAdmin
                  .from('slots')
                  .update({
                    status: 'libre',
                    assigned_to: null,
                    plan_type: null,
                    label: null,
                    forwarding_active: false,
                  })
                  .eq('slot_id', freeSlot.slot_id);

                if (revertSlotErr) {
                  console.error('[ONE-CLICK] Revert slot failed:', revertSlotErr.message);
                }

                throw new CheckoutHttpError(
                  409,
                  'LIVE_SUBSCRIPTION_EXISTS_FOR_SLOT',
                  'No se insertó una nueva subscription viva porque el slot ya tiene otra viva.'
                );
              }

              const { data: newSub } = await supabaseAdmin
                .from('subscriptions')
                .insert({
                  user_id: userId, slot_id: freeSlot.slot_id, phone_number: freeSlot.phone_number,
                  plan_name: planName, monthly_limit: oneClickSmsLimit, credits_used: 0,
                  status: billingSnap.status,
                  /* No hay Checkout Session (cs_): solo suscripción creada vía API */
                  stripe_session_id: null,
                  stripe_subscription_id: stripeSub.id,
                  amount: isAnnual ? (PLAN_PRICES[planName]?.annual ?? correctAmount) : (PLAN_PRICES[planName]?.monthly ?? correctAmount),
                  billing_type: isAnnual ? 'annual' : 'monthly',
                  currency: priceData.currency || 'usd',
                  trial_end: trialEndIso,
                  next_billing_date: nextBillingDateIso,
                  current_period_end: currentPeriodEndIso,
                  /* Misma línea de llegada que checkout + webhook exitoso: servicio operativo */
                  activation_state: 'on_air',
                  activation_state_updated_at: activationTs,
                  created_at: activationTs
                })
                .select('id')
                .single();

              // One-click path también debe marcar onboarding como completo.
              await supabaseAdmin
                .from('users')
                .update({
                  onboarding_completed: true,
                  onboarding_step: 'completed',
                  onboarding_checkout_session_id: null,
                })
                .eq('id', userId);

              return res.status(200).json({ instant: true, subscriptionId: newSub?.id });
            }
          }
        }
      } catch (oneClickErr: any) {
        if (oneClickErr instanceof CheckoutHttpError) throw oneClickErr;
        console.error('[ONE-CLICK ERROR]', oneClickErr?.message, JSON.stringify(oneClickErr));
      }
    }

    const host = req.headers.host;
    const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host}`;

    let targetSlotId = slot_id;
    let targetPhoneNumber: string = typeof phoneNumber === 'string' ? phoneNumber : '';

    const RESERVATION_TTL_MS = 1000 * 60 * 30; // 30 minutes
    const nowMs = Date.now();
    let reservationToken: string | null = null;

    const reserveSlotForCheckout = async () => {
      const nowIso = new Date(nowMs).toISOString();

      const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
          setTimeout(() => resolve(), ms);
        });

      let hadAnyCandidate = false;
      let lastCandidateStatus: 'libre' | 'reserved' | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        // 1) Prefer truly free slots
        let freeQ: any = supabaseAdmin
          .from('slots')
          .select('slot_id, phone_number')
          .eq('status', 'libre')
          .is('assigned_to', null);
        if (regionCode) freeQ = applySlotCountryFilter(freeQ, regionCode);
        const { data: freeSlot, error: freeSelectErr } = await freeQ
          .order('slot_id', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (freeSelectErr) {
          console.error('[CHECKOUT][slots] reserve SELECT libre failed:', {
            code: freeSelectErr.code,
            message: freeSelectErr.message,
            details: freeSelectErr.details,
            hint: (freeSelectErr as { hint?: string }).hint,
          });
          throw new CheckoutHttpError(
            500,
            'SLOT_QUERY_FAILED',
            `Error al consultar inventario de líneas: ${freeSelectErr.message}`
          );
        }

        // 2) Fallback: expired reservations treated as "free"
        let expiredReservedSlot:
          | { slot_id: string; phone_number?: string | null }
          | null = null;
        if (!freeSlot) {
          let expiredQ: any = supabaseAdmin
            .from('slots')
            .select('slot_id, phone_number')
            .eq('status', 'reserved')
            .is('assigned_to', null)
            .lt('reservation_expires_at', nowIso);
          if (regionCode) expiredQ = applySlotCountryFilter(expiredQ, regionCode);
          const { data, error: expiredErr } = await expiredQ.order('slot_id', { ascending: true }).limit(1).maybeSingle();
          if (expiredErr) {
            console.error('[CHECKOUT][slots] reserve SELECT reserved-expired failed:', {
              code: expiredErr.code,
              message: expiredErr.message,
              details: expiredErr.details,
            });
            throw new CheckoutHttpError(
              500,
              'SLOT_QUERY_FAILED',
              `Error al consultar reservas expiradas: ${expiredErr.message}`
            );
          }
          expiredReservedSlot = data;
        }

        const slotToReserve = freeSlot ?? expiredReservedSlot;
        const candidateStatus: 'libre' | 'reserved' = freeSlot ? 'libre' : 'reserved';

        if (!slotToReserve) {
          if (attempt === 2) {
            // En este punto no encontramos slots candidatos en ninguna iteración.
            throw new CheckoutHttpError(
              422,
              'NO_SLOTS_AVAILABLE',
              'No hay slots disponibles para reservar en este momento.'
            );
          }
          continue;
        }

        hadAnyCandidate = true;
        lastCandidateStatus = candidateStatus;

        const reservationTokenCandidate = crypto.randomBytes(16).toString('hex');
        const expiresAtIso = new Date(nowMs + RESERVATION_TTL_MS).toISOString();

        // Atomic-ish: aseguramos que el slot no cambie entre "select" y "update" con condición de estado.
        let updateQ: any = supabaseAdmin
          .from('slots')
          .update({
            status: 'reserved',
            reservation_token: reservationTokenCandidate,
            reservation_expires_at: expiresAtIso,
            reservation_user_id: userId,
            reservation_stripe_session_id: null,
            assigned_to: null,
            plan_type: planName,
          })
          .eq('slot_id', slotToReserve.slot_id)
          .eq('status', candidateStatus);
        const { data: reservedSlot, error: reserveErr } = await updateQ
          .select('slot_id, phone_number')
          .maybeSingle();

        if (reserveErr) {
          // Errores reales del UPDATE (constraints/triggers/etc) -> interno.
          throw new CheckoutHttpError(
            500,
            'SLOT_RESERVATION_UPDATE_FAILED',
            reserveErr.message || 'Error al reservar el slot.'
          );
        }

        if (reservedSlot) {
          return {
            slotId: reservedSlot.slot_id,
            phone: (reservedSlot as { phone_number?: string }).phone_number ?? '',
            reservationToken: reservationTokenCandidate,
            reservationExpiresAtIso: expiresAtIso,
          };
        }

        // Si el UPDATE no afectó filas, pero tuvimos candidato, asumimos conflicto transitorio de concurrencia.
        if (attempt < 2) {
          await sleep(150 + attempt * 150);
          continue;
        }
      }

      if (hadAnyCandidate) {
        throw new CheckoutHttpError(
          409,
          'SLOT_RESERVATION_CONFLICT',
          'Hubo un conflicto temporal al reservar tu slot. Intenta nuevamente.'
        );
      }

      // Fallback: no hubo candidatos.
      throw new CheckoutHttpError(
        422,
        'NO_SLOTS_AVAILABLE',
        'No hay slots disponibles para reservar en este momento.'
      );
    };

    if (!isUpgrade) {
      // Reserva previa antes de enviar al checkout de Stripe para evitar carreras.
      const reserved = await reserveSlotForCheckout();
      targetSlotId = reserved.slotId;
      targetPhoneNumber = reserved.phone || targetPhoneNumber;
      reservationToken = reserved.reservationToken;
    } else if (!targetPhoneNumber && targetSlotId) {
      const { data: slotRow } = await supabaseAdmin.from('slots').select('phone_number').eq('slot_id', targetSlotId).maybeSingle();
      targetPhoneNumber = (slotRow as { phone_number?: string } | null)?.phone_number ?? '';
    }

    const sessionConfig: Record<string, unknown> = {
      customer: customerId || undefined,
      payment_method_collection: 'always',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/#/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&slot_id=${targetSlotId}&isUpgrade=${isUpgrade}`,
      cancel_url: `${origin}/#/dashboard/numbers`,
      metadata: {
        userId,
        slot_id: targetSlotId,
        phoneNumber: targetPhoneNumber,
        planName,
        region: regionCode,
        limit: String(monthlyLimit ?? ''),
        transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUB',
        isAnnual: isAnnual ? 'true' : 'false',
      },
    };

    // Dirección de facturación obligatoria; Stripe Tax / tax IDs solo si env está activado (ver stripeCheckoutCompliance).
    applyStripeCheckoutBillingCompliance(sessionConfig);
    // Nota: `invoice_creation.enabled` aplica solo a Checkout `mode: 'payment'` (one-time). Este flujo usa suscripción:
    // Stripe genera la invoice oficial en cada ciclo / alta; URLs se persisten en `invoice.payment_succeeded`.

    // Si es NEW_SUB, incluimos reserva en metadata para validarla en el webhook.
    // Nota: solo reservamos en el bloque `!isUpgrade` anterior.
    if (!isUpgrade) {
      (sessionConfig.metadata as Record<string, string>).reservation_token = reservationToken || '';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig as Stripe.Checkout.SessionCreateParams);

    console.log('[PURCHASE] checkout created', {
      checkoutSessionId: session.id,
      slotId: targetSlotId,
      userId,
      isUpgrade,
    });

    // Asociamos el checkout session id a la reserva (para validación fuerte).
    if (!isUpgrade) {
      const meta = sessionConfig.metadata as Record<string, string>;
      const tokenToWrite = (meta.reservation_token || '') as string;
      await supabaseAdmin
        .from('slots')
        .update({ reservation_stripe_session_id: session.id })
        .eq('slot_id', targetSlotId)
        .eq('status', 'reserved')
        .eq('reservation_token', tokenToWrite);
    }
    return res.status(200).json({ url: session.url, checkoutSessionId: session.id });

  } catch (err: any) {
    console.error('[CHECKOUT]', action, err?.message);
    const status = err?.status ?? 500;
    const code = err?.code ?? 'INTERNAL_ERROR';
    return res.status(status).json({ error: err?.message || 'Error interno.', code });
  }
}
