import { safeReadLocalStorageJson, safeWriteLocalStorageJson } from '../../lib/localStoragePreferences';

/** Clave dedicada al panel de facturación usuario (web + móvil comparten UserBillingPanel). */
export const BILLING_PANEL_STORAGE_KEY = 'telsim.billingPanel.v1';

export type SubscriptionFilterTabPersisted = 'activas' | 'trialing' | 'todas';

export type BillingPanelPreferences = {
  subscriptionFilter: SubscriptionFilterTabPersisted;
  /** Tope máximo de cards visibles en la pestaña principal (se acota al total de la lista). */
  subscriptionVisibleCount: number;
  /** Tope en la sección “terminadas” (paginación incremental). */
  canceledVisibleCount: number;
  /** Cuántas filas de historial de invoices renderizar (paginación tras expandir + fetch). */
  invoiceHistoryVisibleCount: number;
  billingHistoryOpen: boolean;
  canceledSectionOpen: boolean;
  /**
   * Reservado para un futuro selector manual. Hoy solo aplica orden de negocio fijo.
   * @default 'business'
   */
  subscriptionSort: 'business' | 'created_desc';
};

export const BILLING_PAGE_INITIAL = 6;
export const BILLING_PAGE_STEP = 6;

export function defaultBillingPanelPreferences(): BillingPanelPreferences {
  return {
    subscriptionFilter: 'activas',
    subscriptionVisibleCount: BILLING_PAGE_INITIAL,
    canceledVisibleCount: BILLING_PAGE_INITIAL,
    invoiceHistoryVisibleCount: BILLING_PAGE_INITIAL,
    billingHistoryOpen: false,
    canceledSectionOpen: false,
    subscriptionSort: 'business',
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function loadBillingPanelPreferences(): BillingPanelPreferences {
  const d = defaultBillingPanelPreferences();
  const raw = safeReadLocalStorageJson(BILLING_PANEL_STORAGE_KEY, d as unknown as Record<string, unknown>);
  const filter = raw.subscriptionFilter;
  const sort = raw.subscriptionSort;
  return {
    subscriptionFilter:
      filter === 'activas' || filter === 'trialing' || filter === 'todas' ? filter : d.subscriptionFilter,
    subscriptionVisibleCount: clamp(
      Number(raw.subscriptionVisibleCount),
      BILLING_PAGE_INITIAL,
      5000
    ),
    canceledVisibleCount: clamp(Number(raw.canceledVisibleCount), BILLING_PAGE_INITIAL, 5000),
    invoiceHistoryVisibleCount: clamp(Number(raw.invoiceHistoryVisibleCount), BILLING_PAGE_INITIAL, 5000),
    billingHistoryOpen: Boolean(raw.billingHistoryOpen),
    canceledSectionOpen: Boolean(raw.canceledSectionOpen),
    subscriptionSort: sort === 'created_desc' ? 'created_desc' : 'business',
  };
}

export function persistBillingPanelPreferences(patch: Partial<BillingPanelPreferences>): void {
  const current = loadBillingPanelPreferences();
  const next: BillingPanelPreferences = { ...current, ...patch };
  next.subscriptionVisibleCount = clamp(
    next.subscriptionVisibleCount,
    BILLING_PAGE_INITIAL,
    5000
  );
  next.canceledVisibleCount = clamp(next.canceledVisibleCount, BILLING_PAGE_INITIAL, 5000);
  next.invoiceHistoryVisibleCount = clamp(next.invoiceHistoryVisibleCount, BILLING_PAGE_INITIAL, 5000);
  safeWriteLocalStorageJson(BILLING_PANEL_STORAGE_KEY, next as unknown as Record<string, unknown>);
}
