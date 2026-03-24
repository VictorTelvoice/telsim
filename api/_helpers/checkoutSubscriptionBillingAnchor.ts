import type Stripe from 'stripe';

/**
 * Margen respecto a "ahora" para aceptar un anchor desde Stripe (evita rechazo por skew de reloj
 * entre nuestro servidor y Stripe al comparar con la creación de Checkout Session).
 */
export const BILLING_ANCHOR_FUTURE_BUFFER_SEC = 120;

export type BillingAnchorSource =
  | 'stripe_trial_end'
  | 'stripe_current_period_end'
  | 'none'
  | 'omitted_past_or_invalid';

export type CheckoutBillingAnchorLog = {
  now_sec: number;
  anchor_original_sec: number | null;
  anchor_source: BillingAnchorSource;
  anchor_final_sec: number | null;
  fallback: boolean;
  fallback_reason?: string;
};

export type ResolveCheckoutBillingAnchorResult = {
  /** Solo si es futuro válido respecto a Stripe; si no, omitir en `subscription_data`. */
  billing_cycle_anchor?: number;
  log: CheckoutBillingAnchorLog;
};

/**
 * Decide `billing_cycle_anchor` opcional para **nueva** suscripción vía Checkout (mode subscription).
 * - Nunca usa `created_at` ni fechas de BD.
 * - Solo considera timestamps de la suscripción Stripe existente (trial_end / current_period_end).
 * - Si el candidato no es claramente futuro, no envía anchor (Stripe alinea el ciclo al completar el checkout).
 */
export function resolveBillingCycleAnchorForUpgradeCheckout(
  existingStripeSub: Stripe.Subscription | null,
  nowMs: number = Date.now()
): ResolveCheckoutBillingAnchorResult {
  const nowSec = Math.floor(nowMs / 1000);
  const baseLog: CheckoutBillingAnchorLog = {
    now_sec: nowSec,
    anchor_original_sec: null,
    anchor_source: 'none',
    anchor_final_sec: null,
    fallback: false,
  };

  if (!existingStripeSub) {
    return {
      log: {
        ...baseLog,
        fallback: true,
        fallback_reason: 'no_stripe_subscription_retrieved',
      },
    };
  }

  const st = String(existingStripeSub.status ?? '').toLowerCase();
  const trialEnd = existingStripeSub.trial_end ?? null;
  const periodEnd = existingStripeSub.current_period_end ?? null;

  let candidateSec: number | null = null;
  let source: BillingAnchorSource = 'none';

  if (st === 'trialing' && trialEnd != null && trialEnd > 0) {
    candidateSec = trialEnd;
    source = 'stripe_trial_end';
  } else if (periodEnd != null && periodEnd > 0) {
    candidateSec = periodEnd;
    source = 'stripe_current_period_end';
  }

  if (candidateSec == null) {
    return {
      log: {
        ...baseLog,
        anchor_source: 'none',
        fallback: true,
        fallback_reason: 'no_trial_end_or_current_period_end_on_stripe',
      },
    };
  }

  const minAcceptable = nowSec + BILLING_ANCHOR_FUTURE_BUFFER_SEC;
  if (candidateSec > minAcceptable) {
    return {
      billing_cycle_anchor: candidateSec,
      log: {
        now_sec: nowSec,
        anchor_original_sec: candidateSec,
        anchor_source: source,
        anchor_final_sec: candidateSec,
        fallback: false,
      },
    };
  }

  return {
    log: {
      now_sec: nowSec,
      anchor_original_sec: candidateSec,
      anchor_source: 'omitted_past_or_invalid',
      anchor_final_sec: null,
      fallback: true,
      fallback_reason: `candidate_not_future_enough_or_past (candidate=${candidateSec}, min=${minAcceptable}, status=${st})`,
    },
  };
}
