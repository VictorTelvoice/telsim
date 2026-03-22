import { STRIPE_PRICES } from '../../constants/stripePrices.js';

/** Nombre de plan alineado con checkout / PLAN_PRICES (Starter | Pro | Power). */
export function normalizeTierPlanName(planName: string | null | undefined): 'Starter' | 'Pro' | 'Power' {
  const p = String(planName ?? '').toLowerCase();
  if (p.includes('power')) return 'Power';
  if (p.includes('starter')) return 'Starter';
  if (p.includes('pro')) return 'Pro';
  return 'Pro';
}

export function billingIsAnnual(billingType: string | null | undefined): boolean {
  const s = String(billingType ?? '').toLowerCase();
  return s.includes('annual') || s === 'anual' || s.includes('year');
}

export function resolveStripePriceIdForReactivation(
  planName: string | null | undefined,
  billingType: string | null | undefined
): string {
  const tier = normalizeTierPlanName(planName);
  const annual = billingIsAnnual(billingType);
  if (tier === 'Starter') {
    return annual ? STRIPE_PRICES.STARTER.ANNUAL : STRIPE_PRICES.STARTER.MONTHLY;
  }
  if (tier === 'Power') {
    return annual ? STRIPE_PRICES.POWER.ANNUAL : STRIPE_PRICES.POWER.MONTHLY;
  }
  return annual ? STRIPE_PRICES.PRO.ANNUAL : STRIPE_PRICES.PRO.MONTHLY;
}
