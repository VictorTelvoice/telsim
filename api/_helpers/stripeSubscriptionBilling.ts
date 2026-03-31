import type Stripe from 'stripe';

function addRecurringInterval(baseIso: string, stripeSub: Stripe.Subscription): string | null {
  const baseMs = new Date(baseIso).getTime();
  if (Number.isNaN(baseMs)) return null;

  const recurring = stripeSub.items?.data?.[0]?.price?.recurring;
  const interval = String(recurring?.interval ?? '').toLowerCase();
  const intervalCount = Number(recurring?.interval_count ?? 1) || 1;

  const next = new Date(baseMs);
  if (interval === 'year') {
    next.setFullYear(next.getFullYear() + intervalCount);
  } else if (interval === 'month') {
    next.setMonth(next.getMonth() + intervalCount);
  } else if (interval === 'week') {
    next.setDate(next.getDate() + 7 * intervalCount);
  } else if (interval === 'day') {
    next.setDate(next.getDate() + intervalCount);
  } else {
    return null;
  }

  return next.toISOString();
}

/**
 * Deriva campos de facturación para `public.subscriptions` desde la suscripción Stripe.
 *
 * Reglas:
 * - En ventana de trial (`trial_end` > ahora): `status` = trialing, `next_billing_date` = trial_end.
 * - Fuera de trial y Stripe `active`: `status` = active, `next_billing_date` = current_period_end.
 * - `current_period_end` se persiste en ISO cuando Stripe lo expone.
 * - No usar timestamps del evento ni "now" como próximo cobro.
 */
export type SubscriptionBillingSnapshot = {
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
};

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  cancelled: 'canceled',
  unpaid: 'past_due',
  paused: 'canceled',
};

export function subscriptionBillingSnapshotFromStripe(stripeSub: Stripe.Subscription): SubscriptionBillingSnapshot {
  const nowSec = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();
  const trialEndSec = stripeSub.trial_end ?? null;
  const trialEndIso =
    trialEndSec != null && trialEndSec > 0 ? new Date(trialEndSec * 1000).toISOString() : null;

  const cpeSec = stripeSub.current_period_end ?? null;
  const currentPeriodEndIso =
    cpeSec != null && cpeSec > 0 ? new Date(cpeSec * 1000).toISOString() : null;

  const stripeStatus = String(stripeSub.status ?? '').toLowerCase();
  const inTrialWindow = trialEndSec != null && trialEndSec > nowSec;

  if (stripeStatus === 'canceled' || stripeStatus === 'cancelled' || stripeStatus === 'incomplete_expired') {
    return {
      status: 'canceled',
      trial_end: trialEndIso,
      current_period_end: currentPeriodEndIso,
      next_billing_date: null,
    };
  }

  let dbStatus = STATUS_MAP[stripeStatus] ?? (stripeStatus || 'active');

  if (inTrialWindow) {
    dbStatus = 'trialing';
  }

  let nextBilling: string | null = null;
  if (dbStatus === 'trialing') {
    nextBilling = trialEndIso ?? currentPeriodEndIso ?? null;
  } else {
    nextBilling = currentPeriodEndIso ?? trialEndIso ?? null;
  }

  const nextBillingMs = nextBilling ? new Date(nextBilling).getTime() : Number.NaN;
  if (dbStatus === 'active' && (Number.isNaN(nextBillingMs) || nextBillingMs <= nowMs)) {
    const derived =
      addRecurringInterval(currentPeriodEndIso ?? '', stripeSub) ??
      addRecurringInterval(trialEndIso ?? '', stripeSub);
    if (derived) {
      nextBilling = derived;
    }
  }

  return {
    status: dbStatus,
    trial_end: trialEndIso,
    current_period_end: currentPeriodEndIso,
    next_billing_date: nextBilling,
  };
}
