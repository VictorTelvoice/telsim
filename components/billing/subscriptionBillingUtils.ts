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
  return (
    n === 'active' ||
    n === 'trialing' ||
    n === 'past_due' ||
    n === 'pending_reactivation_cancel'
  );
}

/**
 * Pestaña “Todas” del panel usuario: líneas vigentes (active, trialing, past_due).
 * `past_due` se lista aquí explícitamente; no entra en “Activas” ni “Trialing”.
 */
export function isTodasTabStatus(status: string | null | undefined): boolean {
  const n = normalizeSubscriptionStatus(status);
  return (
    n === 'active' ||
    n === 'trialing' ||
    n === 'past_due' ||
    n === 'pending_reactivation_cancel'
  );
}

/**
 * Inventario del usuario (`Inicio`, `Mis Números`, `Dashboard web`):
 * muestra solo líneas realmente usables en producto.
 * Excluye `pending_reactivation_cancel` porque ya salió del inventario
 * y debe gestionarse desde Facturación.
 */
export function isInventoryVisibleStatus(status: string | null | undefined): boolean {
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

export type SubscriptionBadgeVariant =
  | 'active'
  | 'trialing'
  | 'pending_reactivation'
  | 'past_due'
  | 'canceled'
  | 'other';

export function getSubscriptionBadgeVariant(status: string | null | undefined): SubscriptionBadgeVariant {
  const n = normalizeSubscriptionStatus(status);
  if (n === 'active') return 'active';
  if (n === 'trialing') return 'trialing';
  if (n === 'pending_reactivation_cancel') return 'pending_reactivation';
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
  pending_reactivation:
    'bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-200 border border-orange-200/80 dark:border-orange-500/30',
  past_due:
    'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-200/80 dark:border-amber-500/30',
  canceled:
    'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200/80 dark:border-rose-500/25',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
};

/**
 * Etiqueta del badge (la UI aplica `uppercase` en las cards).
 * Fuente: `subscriptions.status` en BD.
 */
export function getSubscriptionBadgeLabel(status: string | null | undefined): string {
  const n = normalizeSubscriptionStatus(status);
  if (n === 'active') return 'Activa';
  if (n === 'trialing') return 'Trialing';
  if (n === 'pending_reactivation_cancel') return 'Baja programada';
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

/** Campos mínimos para ordenar suscripciones en el panel de facturación. */
export interface SubscriptionSortable {
  status?: string | null;
  next_billing_date?: string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
  /** Plazo 48h para reactivar (solo `pending_reactivation_cancel`). */
  reactivation_grace_until?: string | null;
  created_at: string;
}

/**
 * Próximo cobro para suscripciones **cobrables** (`active` / `trialing`):
 * - `trialing` → `trial_end`
 * - `active` → `next_billing_date`, si null → `current_period_end`
 *
 * Usado por el KPI “Próxima fecha de cobro” y alineado con el tramo activo/trialing de
 * `resolveSubscriptionNextBillingIso`. No usa `created_at`.
 */
export function resolveChargeableNextBillingIso(s: SubscriptionSortable): string | null {
  const st = normalizeSubscriptionStatus(s.status);
  const now = Date.now();
  const asFutureIso = (value: string | null | undefined): string | null => {
    const iso = String(value ?? '').trim();
    if (!iso) return null;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms) || ms <= now) return null;
    return iso;
  };

  if (st === 'trialing') {
    return asFutureIso(s.trial_end) ?? asFutureIso(s.current_period_end) ?? s.trial_end ?? s.current_period_end ?? null;
  }
  if (st === 'active') {
    return asFutureIso(s.next_billing_date) ?? asFutureIso(s.current_period_end) ?? s.next_billing_date ?? s.current_period_end ?? null;
  }
  return null;
}

/**
 * Próxima fecha relevante para la UI según `subscriptions.status` (no inventa fechas desde `created_at`).
 * Para `active` / `trialing` delega en `resolveChargeableNextBillingIso`.
 * - pending_reactivation_cancel → `reactivation_grace_until` (plazo), luego fechas de cobro si aplica
 */
export function resolveSubscriptionNextBillingIso(s: SubscriptionSortable): string | null {
  const st = normalizeSubscriptionStatus(s.status);
  if (st === 'trialing' || st === 'active') {
    return resolveChargeableNextBillingIso(s);
  }
  if (st === 'pending_reactivation_cancel') {
    return s.reactivation_grace_until ?? s.next_billing_date ?? s.current_period_end ?? null;
  }
  return s.next_billing_date ?? s.trial_end ?? s.current_period_end ?? null;
}

/** Suscripción mínima para el resumen de próximo cobro (KPI). */
export type SubscriptionLikeUpcomingCharge = SubscriptionSortable & {
  amount?: number | null;
  currency?: string | null;
  plan_name?: string | null;
  phone_number?: string | null;
};

export type UpcomingChargeSummary = {
  /** ISO 8601 del próximo cobro elegido */
  dateIso: string;
  amount: number;
  currency: string;
  planName: string | null;
  phoneNumber: string | null;
  /** Estado normalizado (`active` | `trialing`) */
  status: string;
};

/**
 * Entre suscripciones **solo** `active` y `trialing`, con fecha de cobro **futura** válida,
 * devuelve la de fecha más cercana y sus datos para el KPI.
 *
 * Excluye: canceladas, baja programada, past_due, sin fecha válida, fechas pasadas o no parseables.
 * No usa `created_at`.
 */
export function resolveUpcomingChargeSummary<T extends SubscriptionLikeUpcomingCharge>(
  subscriptions: T[]
): UpcomingChargeSummary | null {
  const now = Date.now();
  let best: { ms: number; iso: string; sub: T } | null = null;

  for (const s of subscriptions) {
    const st = normalizeSubscriptionStatus(s.status);
    if (st !== 'active' && st !== 'trialing') continue;

    const iso = resolveChargeableNextBillingIso(s);
    if (!iso || String(iso).trim() === '') continue;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) continue;
    if (ms <= now) continue;

    if (!best || ms < best.ms) {
      best = { ms, iso: String(iso).trim(), sub: s };
    }
  }

  if (!best) return null;

  const sub = best.sub;
  return {
    dateIso: best.iso,
    amount: Number(sub.amount ?? 0),
    currency: sub.currency != null && String(sub.currency).trim() !== '' ? String(sub.currency).trim() : 'USD',
    planName: sub.plan_name != null ? String(sub.plan_name).trim() || null : null,
    phoneNumber: sub.phone_number != null ? String(sub.phone_number).trim() || null : null,
    status: normalizeSubscriptionStatus(sub.status),
  };
}

/** Suscripción mínima para el KPI de MRR. */
export type SubscriptionLikeMrr = SubscriptionLikeUpcomingCharge & {
  billing_type?: string | null;
  amount?: number | null;
  currency?: string | null;
};

export type MrrMonthlySummary = {
  amount: number;
  currency: string;
};

/**
 * MRR estimado: suma del cobro recurrente mensual equivalente de suscripciones vigentes.
 *
 * Reglas:
 * - incluir: `active` + `trialing`
 * - excluir: `canceled` y `pending_reactivation_cancel` (por selección de active/trialing)
 * - `billing_type === 'monthly'` → usar amount completo
 * - `billing_type === 'annual'` → amount / 12
 */
export function resolveEstimatedMrrMonthlyEquivalent<T extends SubscriptionLikeMrr>(
  subscriptions: T[]
): MrrMonthlySummary | null {
  const eligible = subscriptions.filter((s) => {
    const st = normalizeSubscriptionStatus(s.status);
    return st === 'active' || st === 'trialing';
  });

  if (eligible.length === 0) return null;

  const currency =
    eligible[0].currency != null && String(eligible[0].currency).trim() !== '' ? String(eligible[0].currency).trim() : 'USD';

  const amount = eligible.reduce((acc, s) => {
    const amt = Number(s.amount ?? 0);
    const bt = String(s.billing_type ?? '').trim();
    if (bt === 'annual') return acc + amt / 12;
    return acc + amt;
  }, 0);

  return { amount, currency };
}

/** Datos de `slots` necesarios para armar el enlace de reactivación (token 48h). */
export type SlotReservationForReactivation = {
  reservation_token?: string | null;
  reservation_expires_at?: string | null;
  phone_number?: string | null;
};

/** Campos opcionales de `subscriptions` / enriquecimiento para el CTA “Reactivar línea”. */
export type SubscriptionReactivationFields = {
  status?: string | null;
  reactivation_grace_until?: string | null;
  /** Si existiera en BD o payload enriquecido (URL absoluta o `/#/...`). */
  reactivation_url?: string | null;
};

/**
 * Resuelve href para el flujo `#/web/reactivate-line?token=…`.
 * Prioridad: `reservation_token` vigente del slot → `reactivation_url` persistida.
 * El token del slot es la fuente de verdad más reciente y evita reutilizar enlaces viejos.
 * Requiere ventana de gracia vigente y/o reserva de slot con token no expirado; si no hay URL ni token usable, devuelve null.
 */
export function resolveReactivateLineHref(
  sub: SubscriptionReactivationFields,
  slot: SlotReservationForReactivation | null | undefined
): string | null {
  if (normalizeSubscriptionStatus(sub.status) !== 'pending_reactivation_cancel') {
    return null;
  }

  const now = Date.now();
  const graceMs =
    sub.reactivation_grace_until != null && String(sub.reactivation_grace_until).trim() !== ''
      ? new Date(sub.reactivation_grace_until as string).getTime()
      : NaN;
  const graceOk = Number.isFinite(graceMs) && graceMs > now;

  const tok = slot?.reservation_token != null ? String(slot.reservation_token).trim() : '';
  const resExpMs =
    slot?.reservation_expires_at != null && String(slot.reservation_expires_at).trim() !== ''
      ? new Date(slot.reservation_expires_at as string).getTime()
      : NaN;
  const slotOk = tok.length > 0 && Number.isFinite(resExpMs) && resExpMs > now;

  if (!graceOk && !slotOk) {
    return null;
  }

  if (slotOk) {
    return `/#/web/reactivate-line?token=${encodeURIComponent(tok)}`;
  }

  const raw = sub.reactivation_url != null ? String(sub.reactivation_url).trim() : '';
  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/#/') || raw.startsWith('#/')) {
      return raw.startsWith('/') ? raw : `/${raw}`;
    }
  }

  return null;
}

/** Fila mínima de factura para agrupar por `subscription_id` (Stripe `sub_*`). */
export type InvoiceRowLike = {
  id: string;
  created?: string | null;
  subscription_id?: string | null;
};

export type SubscriptionLikeForInvoices = {
  slot_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_session_id?: string | null;
};

/**
 * `stripe_subscription_id` en BD o, si vino mal migrado, `sub_*` colado en `stripe_session_id`.
 */
export function effectiveStripeSubscriptionIdForMatching(sub: SubscriptionLikeForInvoices): string | null {
  const a = sub.stripe_subscription_id != null ? String(sub.stripe_subscription_id).trim() : '';
  if (a) return a;
  const sid = typeof sub.stripe_session_id === 'string' ? sub.stripe_session_id.trim() : '';
  if (sid.startsWith('sub_')) return sid;
  return null;
}

/**
 * Invoices para la tarjeta de una línea: match por `sub_*` de la fila; si no hay, unifica facturas de
 * otras filas del mismo `slot_id` (upgrade / reparación donde el invoice sigue ligado al Stripe sub anterior).
 */
export function mergeInvoicesForSubscriptionLine<T extends InvoiceRowLike>(
  sub: SubscriptionLikeForInvoices,
  allSubscriptions: SubscriptionLikeForInvoices[],
  invoicesByStripeSubId: Map<string, T[]>
): T[] {
  const eff = effectiveStripeSubscriptionIdForMatching(sub);
  if (eff) {
    const direct = invoicesByStripeSubId.get(eff);
    if (direct?.length) return direct;
  }
  const slot = sub.slot_id != null ? String(sub.slot_id).trim() : '';
  if (!slot) return [];

  const stripeIds = new Set<string>();
  for (const s of allSubscriptions) {
    if (String(s.slot_id ?? '').trim() !== slot) continue;
    const e = effectiveStripeSubscriptionIdForMatching(s);
    if (e) stripeIds.add(e);
  }
  const merged: T[] = [];
  for (const id of stripeIds) {
    const rows = invoicesByStripeSubId.get(id);
    if (rows) merged.push(...rows);
  }
  merged.sort((a, b) => {
    const ta = a.created ? new Date(a.created).getTime() : 0;
    const tb = b.created ? new Date(b.created).getTime() : 0;
    return tb - ta;
  });
  const seen = new Set<string>();
  return merged.filter((inv) => {
    if (seen.has(inv.id)) return false;
    seen.add(inv.id);
    return true;
  });
}

/** Fila de factura con URLs opcionales (Stripe). */
export type InvoiceRowForView = InvoiceRowLike & {
  invoice_pdf?: string | null;
  hosted_invoice_url?: string | null;
  receipt_url?: string | null;
  number?: string | null;
  status?: string | null;
};

/** Misma regla que el botón “Sincronizar” en `InvoicePrimaryAccess`: falta PDF/hosted/recibo en API. */
export function invoiceNeedsStripeUrlSync(inv: InvoiceRowForView): boolean {
  const pdf = inv.invoice_pdf != null ? String(inv.invoice_pdf).trim() : '';
  const hosted = inv.hosted_invoice_url != null ? String(inv.hosted_invoice_url).trim() : '';
  const receipt = inv.receipt_url != null ? String(inv.receipt_url).trim() : '';
  const hasAny = !!(pdf || hosted || receipt);
  const st = String(inv.status ?? '')
    .trim()
    .toLowerCase();
  return st !== 'draft' && st !== 'void' && st !== 'uncollectible' && !hasAny;
}

/**
 * Fila de suscripción con todos los campos que usa el panel (web y app comparten el mismo tipo lógico).
 */
export type SubscriptionRowForBilling = SubscriptionLikeForInvoices &
  SubscriptionSortable &
  SubscriptionReactivationFields & {
    billing_type?: string | null;
    phone_number?: string | null;
    plan_name?: string | null;
    amount?: number | null;
    currency?: string | null;
  };

/**
 * Vista ya resuelta para UI: mismos valores en dashboard web, ruta `/billing` y cualquier cliente que importe utils.
 */
export type SubscriptionBillingViewModel = {
  display_status: string;
  display_billing: string;
  display_next_date: string;
  /** Etiqueta de la fila de fecha (renovación vs plazo de reactivación). */
  display_next_date_label: string;
  /** Teléfono o slot. */
  display_line: string;
  /** Texto listo para la tarjeta (número de factura o mensaje). */
  display_invoice_label: string;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
  /** Portal Stripe: siempre true cuando el usuario puede abrir sesión (el panel controla auth). */
  can_manage_payment: boolean;
  can_reactivate: boolean;
  reactivation_url: string | null;
  latest_invoice_id: string | null;
};

export function buildSubscriptionBillingViewModel<T extends InvoiceRowForView>(
  sub: SubscriptionRowForBilling,
  ctx: {
    allSubscriptions: SubscriptionLikeForInvoices[];
    invoicesByStripeSubId: Map<string, T[]>;
    slotReservation?: SlotReservationForReactivation | null;
    /** Debe reflejar `resolveSubscriptionNextBillingIso` + formato local. */
    formatNextDisplay: (sub: SubscriptionRowForBilling) => string;
    /** Evita mostrar “sin factura” antes de terminar el fetch. */
    invoicesReady: boolean;
    /** Si false, `can_manage_payment` sigue true pero la UI puede ocultar (reservado). */
    allowManagePayment?: boolean;
  }
): { vm: SubscriptionBillingViewModel; latestInvoice: T | null } {
  const merged = mergeInvoicesForSubscriptionLine(sub, ctx.allSubscriptions, ctx.invoicesByStripeSubId);
  const latestInvoice = merged[0] ?? null;

  const reactivation_url = resolveReactivateLineHref(sub, ctx.slotReservation);
  const can_reactivate = reactivation_url != null;

  const st = normalizeSubscriptionStatus(sub.status);
  const display_next_date_label =
    st === 'pending_reactivation_cancel' ? 'Plazo reactivación' : 'Próxima renovación';

  const line =
    String(ctx.slotReservation?.phone_number ?? '')
      .trim() ||
    String(sub.phone_number ?? '')
      .trim() ||
    String(sub.slot_id ?? '').trim() ||
    'Sin línea asociada';

  let display_invoice_label = '—';
  if (!ctx.invoicesReady) {
    display_invoice_label = '—';
  } else if (latestInvoice) {
    const num = latestInvoice.number != null ? String(latestInvoice.number).trim() : '';
    display_invoice_label = num || latestInvoice.id;
  } else {
    const st = normalizeSubscriptionStatus(sub.status);
    display_invoice_label =
      st === 'trialing'
        ? 'La primera factura se emitirá al finalizar el período de prueba'
        : 'Sin factura emitida aún';
  }

  const pdf = latestInvoice?.invoice_pdf != null ? String(latestInvoice.invoice_pdf).trim() : '';
  const hosted = latestInvoice?.hosted_invoice_url != null ? String(latestInvoice.hosted_invoice_url).trim() : '';

  const allowManage = ctx.allowManagePayment !== false;

  return {
    vm: {
      display_status: getSubscriptionBadgeLabel(sub.status),
      display_billing: sub.billing_type === 'annual' ? 'Anual' : 'Mensual',
      display_next_date: ctx.formatNextDisplay(sub),
      display_next_date_label,
      display_line: line,
      display_invoice_label,
      invoice_pdf_url: pdf || null,
      hosted_invoice_url: hosted || null,
      can_manage_payment: allowManage,
      can_reactivate,
      reactivation_url,
      latest_invoice_id: latestInvoice?.id ?? null,
    },
    latestInvoice,
  };
}

/**
 * Prioridad de estado para orden de negocio:
 * active (0) → trialing (1) → past_due (2) → otros no cancelados → canceladas / bucket cancelado al final (100).
 */
export function subscriptionBusinessStatusRank(status: string | null | undefined): number {
  const n = normalizeSubscriptionStatus(status);
  if (n === 'active') return 0;
  if (n === 'trialing') return 1;
  if (n === 'pending_reactivation_cancel') return 2;
  if (n === 'past_due') return 3;
  if (isCanceledBucketStatus(status)) return 100;
  return 50;
}

/**
 * Fecha de “próximo hito” para ordenar dentro del mismo estado (alineado a badge + resolveSubscriptionNextBillingIso).
 */
function billingProximityTimestamp(s: SubscriptionSortable): number | null {
  const iso = resolveSubscriptionNextBillingIso(s);
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Orden de negocio para listas de suscripción en Facturación (solo presentación; no cambia filtros):
 *
 * 1. **active** primero, luego **trialing**.
 * 2. Dentro de cada estado: más cercanas al próximo cobro / fin de prueba
 *    (ver `billingProximityTimestamp`: next_billing_date, fallback trial_end), fecha **ascendente**.
 * 3. Sin esas fechas: **created_at** descendente (alta más reciente primero).
 * 4. En **Todas** (active + trialing + pending_reactivation_cancel + past_due): **past_due** va **después** de active,
 *    trialing y baja programada (rangos 0–2) y **antes** de canceladas si compartieran lista; hoy las **terminadas**
 *    viven solo en la sección colapsable aparte, no en “Todas”.
 * 5. Canceladas / bucket cancelado: rango al **final** (p. ej. sección terminadas).
 */
export function compareSubscriptionsBusinessOrder(a: SubscriptionSortable, b: SubscriptionSortable): number {
  const ra = subscriptionBusinessStatusRank(a.status);
  const rb = subscriptionBusinessStatusRank(b.status);
  if (ra !== rb) return ra - rb;

  const ta = billingProximityTimestamp(a);
  const tb = billingProximityTimestamp(b);
  const aHas = ta != null;
  const bHas = tb != null;
  if (aHas && bHas && ta !== tb) return (ta as number) - (tb as number);
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;

  const ca = new Date(a.created_at).getTime();
  const cb = new Date(b.created_at).getTime();
  if (Number.isNaN(ca) && Number.isNaN(cb)) return 0;
  if (Number.isNaN(ca)) return 1;
  if (Number.isNaN(cb)) return -1;
  return cb - ca;
}

export function sortSubscriptionsBusinessOrder<T extends SubscriptionSortable>(subs: T[]): T[] {
  return [...subs].sort(compareSubscriptionsBusinessOrder);
}

/** Futuro selector de orden; hoy el panel persiste `business` por defecto. */
export function sortSubscriptionsByPreference<T extends SubscriptionSortable>(
  subs: T[],
  mode: 'business' | 'created_desc'
): T[] {
  if (mode === 'created_desc') {
    return [...subs].sort((a, b) => {
      const ca = new Date(a.created_at).getTime();
      const cb = new Date(b.created_at).getTime();
      if (Number.isNaN(ca) && Number.isNaN(cb)) return 0;
      if (Number.isNaN(ca)) return 1;
      if (Number.isNaN(cb)) return -1;
      return cb - ca;
    });
  }
  return sortSubscriptionsBusinessOrder(subs);
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
