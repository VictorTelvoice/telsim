/**
 * Límites mensuales de SMS por plan — fuente única para subscriptions.monthly_limit (y lógica de negocio que derive límites por plan).
 */

export const PLAN_MONTHLY_SMS_LIMITS: Record<string, number> = {
  Starter: 150,
  Pro: 400,
  Power: 1400,
};

function normalizePlanToken(planName: string | null | undefined): string {
  return String(planName ?? '').trim().toLowerCase();
}

/**
 * Resuelve el límite mensual: respeta un valor explícito válido; si no, deriva del nombre de plan.
 */
export function monthlySmsLimitForPlan(
  planName: string | null | undefined,
  explicit?: string | number | null
): number {
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    const n = typeof explicit === 'number' ? explicit : Number(String(explicit).trim());
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  const p = normalizePlanToken(planName);
  if (!p) return 150;
  if (p.includes('power')) return PLAN_MONTHLY_SMS_LIMITS.Power;
  if (p.includes('pro')) return PLAN_MONTHLY_SMS_LIMITS.Pro;
  if (p.includes('starter')) return PLAN_MONTHLY_SMS_LIMITS.Starter;
  const exact = Object.keys(PLAN_MONTHLY_SMS_LIMITS).find((k) => k.toLowerCase() === p);
  if (exact) return PLAN_MONTHLY_SMS_LIMITS[exact];
  return 150;
}
