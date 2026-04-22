import Stripe from 'stripe';

/**
 * Compliance helpers for Stripe Checkout
 */
export function applyStripeCheckoutBillingCompliance(sessionConfig: Record<string, any>): void {
  sessionConfig.billing_address_collection = 'required';

  if (process.env.STRIPE_CHECKOUT_AUTOMATIC_TAX === 'true') {
    sessionConfig.automatic_tax = { enabled: true };
    sessionConfig.customer_update = { address: 'auto', name: 'auto' };
  }

  if (process.env.STRIPE_CHECKOUT_TAX_ID_COLLECTION === 'true') {
    sessionConfig.tax_id_collection = { enabled: true };
  }
}

/**
 * Country mapping for slots
 */
export const ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS: Record<string, string[]> = {
  CL: ['Chile'],
  AR: ['Argentina'],
  PE: ['Perú', 'Peru'],
  MX: ['México', 'Mexico'],
  CO: ['Colombia'],
  BR: ['Brasil', 'Brazil'],
  US: ['Estados Unidos', 'USA', 'United States', 'EE.UU.', 'EEUU'],
};

export function isSupportedOnboardingCountryCode(iso: string): boolean {
  if (!iso) return true;
  return Boolean(ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS[iso.toUpperCase()]?.length);
}

/**
 * Subscription plan limits
 */
export const PLAN_MONTHLY_SMS_LIMITS: Record<string, number> = {
  Starter: 150,
  Pro: 400,
  Power: 1400,
};

export function monthlySmsLimitForPlan(
  planName: string | null | undefined,
  explicit?: string | number | null
): number {
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    const n = typeof explicit === 'number' ? explicit : Number(String(explicit).trim());
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  
  const p = String(planName ?? '').trim().toLowerCase();
  if (!p) return 150;
  if (p.includes('power')) return PLAN_MONTHLY_SMS_LIMITS.Power;
  if (p.includes('pro')) return PLAN_MONTHLY_SMS_LIMITS.Pro;
  if (p.includes('starter')) return PLAN_MONTHLY_SMS_LIMITS.Starter;
  
  const exact = Object.keys(PLAN_MONTHLY_SMS_LIMITS).find((k) => k.toLowerCase() === p);
  if (exact) return PLAN_MONTHLY_SMS_LIMITS[exact];
  return 150;
}

/**
 * Billing snapshot from Stripe
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

export function subscriptionBillingSnapshotFromStripe(stripeSub: Stripe.Subscription): SubscriptionBillingSnapshot {
  const nowSec = Math.floor(Date.now() / 1000);
  const trialEndSec = stripeSub.trial_end ?? null;
  const trialEndIso = trialEndSec != null && trialEndSec > 0 ? new Date(trialEndSec * 1000).toISOString() : null;

  const cpeSec = stripeSub.current_period_end ?? null;
  const currentPeriodEndIso = cpeSec != null && cpeSec > 0 ? new Date(cpeSec * 1000).toISOString() : null;

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
  if (inTrialWindow) dbStatus = 'trialing';

  let nextBilling: string | null = dbStatus === 'trialing' 
    ? (trialEndIso ?? currentPeriodEndIso) 
    : (currentPeriodEndIso ?? trialEndIso);

  if (dbStatus === 'active' && (!nextBilling || new Date(nextBilling).getTime() <= Date.now())) {
    const derived = addRecurringInterval(currentPeriodEndIso ?? '', stripeSub) ?? addRecurringInterval(trialEndIso ?? '', stripeSub);
    if (derived) nextBilling = derived;
  }

  return {
    status: dbStatus,
    trial_end: trialEndIso,
    current_period_end: currentPeriodEndIso,
    next_billing_date: nextBilling,
  };
}
