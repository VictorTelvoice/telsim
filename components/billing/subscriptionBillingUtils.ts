/**
 * Utilidades para el panel de facturación: normalización de estado Stripe/BD,
 * reglas de “activa” para KPI vs lista, y deduplicación por línea (slot).
 */

export interface SubscriptionLike {
  id: string;
  slot_id?: string | null;
  stripe_subscription_id?: string | null;
  status?: string | null;
  created_at: string;
}

/** Estado en minúsculas y alias comunes (p. ej. inglés británico). */
export function normalizeSubscriptionStatus(status: string | null | undefined): string {
  const s = String(status ?? '')
    .trim()
    .toLowerCase();
  if (s === 'cancelled') return 'canceled';
  return s;
}

/**
 * Sigue operativa en Stripe (no terminada): próximos cobros / KPI de billing.
 * Incluye `past_due` porque la suscripción sigue viva hasta cancelación.
 */
export function isLiveOperationalStatus(status: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(status);
  return n === 'active' || n === 'trialing' || n === 'past_due';
}

/**
 * Pestaña “Todas” del panel usuario: líneas vigentes (active, trialing, past_due).
 * `past_due` se lista aquí explícitamente; no entra en “Activas” ni “Trialing”.
 */
export function isTodasTabStatus(status: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(status);
  return n === 'active' || n === 'trialing' || n === 'past_due';
}

/**
 * KPI “Suscripciones activas”: solo `active` y `trialing`.
 * `past_due` no entra aquí (cobro fallido; se informa aparte si aplica).
 */
export function isStrictKpiActiveStatus(status: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(status);
  return n === 'active' || n === 'trialing';
}

/** Filtro “Canceladas”: terminadas o no cobrables según estado típico Stripe. */
export function isCanceledBucketStatus(status: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(status);
  return (
    n === 'canceled' ||
    n === 'expired' ||
    n === 'unpaid' ||
    n === 'incomplete' ||
    n === 'incomplete_expired'
  );
}

/** Clave estable por línea: prioriza slot, luego Stripe sub, luego id de fila. */
export function subscriptionLineDedupeKey(s: SubscriptionLike): string {
  const slot = String(s.slot_id ?? '').trim();
  if (slot) return `slot:${slot}`;
  const stripe = String(s.stripe_subscription_id ?? '').trim();
  if (stripe) return `stripe:${stripe}`;
  return `id:${s.id}`;
}

/**
 * Una sola fila por línea / sub Stripe, la más reciente por `created_at`.
 * Evita inflar conteos cuando hay histórico duplicado en BD por el mismo slot.
 */
export function dedupeLatestSubscriptionPerLine<T extends SubscriptionLike>(subscriptions: T[]): T[] {
  const sorted = [...subscriptions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const seen = new Set<string>();
  const out: T[] = [];
  for (const s of sorted) {
    const k = subscriptionLineDedupeKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export type SubscriptionBadgeVariant = 'active' | 'trialing' | 'past_due' | 'canceled' | 'other';

export function getSubscriptionBadgeVariant(status: string | null | undefined): SubscriptionBadgeVariant {
  const n = normalizeSubscriptionStatus(status);
  if (n === 'active') return 'active';
  if (n === 'trialing') return 'trialing';
  if (n === 'past_due') return 'past_due';
  /* Terminada explícitamente en Stripe (mismo estilo visual “no vigente” que cancelada) */
  if (n === 'canceled' || n === 'expired') return 'canceled';
  /* Cobro / alta incompleta: badge neutro, no confundir con “Cancelada” */
  if (n === 'unpaid' || n === 'incomplete' || n === 'incomplete_expired') return 'other';
  if (isCanceledBucketStatus(status)) return 'canceled';
  return 'other';
}

const BADGE_STYLES: Record<SubscriptionBadgeVariant, string> = {
  active:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30',
  trialing:
    'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-200/80 dark:border-sky-500/30',
  past_due:
    'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-200/80 dark:border-amber-500/30',
  canceled:
    'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200/80 dark:border-rose-500/25',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
};

/** Etiqueta UX en español; no reutilizar el string crudo de BD en la card. */
export function getSubscriptionBadgeLabel(status: string | null | undefined): string {
  const n = normalizeSubscriptionStatus(status);
  if (n === 'active') return 'Activa';
  if (n === 'trialing') return 'Trialing';
  if (n === 'past_due') return 'Past Due';
  if (n === 'canceled') return 'Cancelada';
  if (n === 'expired') return 'Expirada';
  if (n === 'unpaid') return 'Impaga';
  if (n === 'incomplete' || n === 'incomplete_expired') return 'Incompleta';
  if (n === 'paused') return 'Pausada';
  return n || '—';
}

export function subscriptionBadgeClassName(status: string | null | undefined): string {
  return BADGE_STYLES[getSubscriptionBadgeVariant(status)];
}

const STRIP_INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

/**
 * Normaliza códigos ISO 4217 sucios (histórico, ZWSP, fullwidth NFKC, basura alrededor).
 * Valida con Intl; nunca lanza.
 */
export function sanitizeCurrencyCode(raw: string | null | undefined, fallback = 'USD'): string {
  const base =
    String(raw ?? '')
      .normalize('NFKC')
      .replace(STRIP_INVISIBLE, '')
      .trim() || fallback;

  const lettersOnly = base.toUpperCase().replace(/[^A-Z]/g, '');
  const candidates: string[] = [];
  if (lettersOnly.length >= 3) {
    for (let i = 0; i <= lettersOnly.length - 3; i++) {
      candidates.push(lettersOnly.slice(i, i + 3));
    }
  }
  const tryCodes = [...new Set([...(lettersOnly.length === 3 ? [lettersOnly] : []), ...candidates, fallback, 'USD'])];
  for (const code of tryCodes) {
    if (!/^[A-Z]{3}$/.test(code)) continue;
    try {
      new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(0);
      return code;
    } catch {
      /* siguiente candidato */
    }
  }
  return 'USD';
}

/**
 * Formato monetario seguro (datos sucios de Stripe/BD). No lanza; último recurso: "USD 0.00".
 */
export function formatCurrencyAmount(
  value: number,
  currencyRaw?: string | null,
  locale = 'en-US'
): string {
  const safeN = Number.isFinite(Number(value)) ? Number(value) : 0;
  let code = sanitizeCurrencyCode(currencyRaw, 'USD');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(safeN);
  } catch {
    code = 'USD';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(safeN);
    } catch {
      return `${code} ${safeN.toFixed(2)}`;
    }
  }
}
