import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileDown,
  History,
  Loader2,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import SideDrawer from '../SideDrawer';
import {
  BILLING_PAGE_INITIAL,
  BILLING_PAGE_STEP,
  loadBillingPanelPreferences,
  persistBillingPanelPreferences,
} from './billingPanelPreferences';
import {
  buildSubscriptionBillingViewModel,
  dedupeLatestSubscriptionPerLine,
  effectiveStripeSubscriptionIdForMatching,
  formatCurrencyAmount,
  invoiceNeedsStripeUrlSync,
  isCanceledBucketStatus,
  isStrictKpiActiveStatus,
  isTodasTabStatus,
  normalizeSubscriptionStatus,
  resolveChargeableNextBillingIso,
  resolveEstimatedMrrMonthlyEquivalent,
  resolveSubscriptionNextBillingIso,
  resolveUpcomingChargeSummary,
  sortSubscriptionsByPreference,
  subscriptionBadgeClassName,
} from './subscriptionBillingUtils';
import type { SubscriptionBillingViewModel, SubscriptionRowForBilling } from './subscriptionBillingUtils';

export interface UserBillingPanelProps {
  /** Página standalone (móvil / ruta dedicada) vs embebido en WebDashboard o Ajustes */
  variant?: 'page' | 'embedded';
  /** Activa clases Tailwind `dark:` cuando el panel está dentro del dashboard web oscuro */
  embeddedDark?: boolean;
  /** Oculta el bloque de título intro (cuando el padre ya muestra "Facturación") */
  hideIntroTitle?: boolean;
}

interface Subscription {
  id: string;
  plan_name: string;
  phone_number?: string | null;
  slot_id?: string | null;
  amount: number | null;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired' | string;
  billing_type?: 'monthly' | 'annual' | string | null;
  next_billing_date?: string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
  reactivation_grace_until?: string | null;
  /** Opcional si existe en BD o se enriquece desde API */
  reactivation_url?: string | null;
  created_at: string;
  currency?: string | null;
  stripe_subscription_id?: string | null;
  /** A veces `sub_*` queda aquí si `stripe_subscription_id` no se rellenó en migraciones. */
  stripe_session_id?: string | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface InvoiceRow {
  id: string;
  number: string | null;
  status: string | null;
  created: string | null;
  currency: string;
  amount_due: number;
  amount_paid: number;
  total: number;
  subscription_id: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  receipt_url: string | null;
  /** Céntimos (Stripe / BD); trazabilidad fiscal cuando Stripe Tax está activo. */
  subtotal_cents?: number;
  tax_cents?: number;
  total_cents?: number;
  customer_tax_ids?: unknown[];
  tax_breakdown?: unknown[];
}

/** Stable empty list: evita nuevos arrays en useMemo cuando el historial está colapsado. */
const EMPTY_INVOICE_ROWS: InvoiceRow[] = [];

function openStripeUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Resumen subtotal / impuestos / total (céntimos API). */
const InvoiceFiscalSummary: React.FC<{ inv: InvoiceRow; formatCurrency: (n: number, c?: string) => string }> = ({
  inv,
  formatCurrency,
}) => {
  const cur = inv.currency || 'USD';
  const sub = typeof inv.subtotal_cents === 'number' && inv.subtotal_cents >= 0 ? inv.subtotal_cents : null;
  const tax = typeof inv.tax_cents === 'number' ? inv.tax_cents : null;
  const tot =
    typeof inv.total_cents === 'number' && inv.total_cents > 0
      ? inv.total_cents
      : inv.amount_paid || inv.total || inv.amount_due || 0;

  const showTaxLine = tax != null && tax > 0;
  const showSubLine = sub != null && sub > 0 && (showTaxLine || sub !== tot);

  if (!showSubLine && !showTaxLine) return null;

  return (
    <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/80 p-2.5 space-y-1 text-[11px]">
      {showSubLine && (
        <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
          <span className="font-bold uppercase tracking-wide">Subtotal</span>
          <span className="font-black text-slate-800 dark:text-slate-200">{formatCurrency(sub! / 100, cur)}</span>
        </div>
      )}
      {showTaxLine && (
        <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
          <span className="font-bold uppercase tracking-wide">Impuestos</span>
          <span className="font-black text-slate-800 dark:text-slate-200">{formatCurrency(tax! / 100, cur)}</span>
        </div>
      )}
      {(showSubLine || showTaxLine) && (
        <div className="flex justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-600/50 text-slate-800 dark:text-slate-100">
          <span className="font-black uppercase tracking-wide">Total</span>
          <span className="font-black">{formatCurrency(tot / 100, cur)}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Un solo CTA según prioridad Stripe: PDF → hosted → recibo (URLs oficiales).
 * Si no hay URLs, "No disponible" + Sincronizar cuando aplique.
 */
const InvoicePrimaryAccess: React.FC<{
  inv: InvoiceRow;
  resolving: boolean;
  onResolve: () => void;
  dense?: boolean;
}> = ({ inv, resolving, onResolve, dense }) => {
  const pdf = inv.invoice_pdf?.trim() || null;
  const hosted = inv.hosted_invoice_url?.trim() || null;
  const receipt = inv.receipt_url?.trim() || null;
  const hasAny = !!(pdf || hosted || receipt);
  const canResolve =
    inv.status !== 'draft' && inv.status !== 'void' && inv.status !== 'uncollectible' && !hasAny;

  const primary =
    dense
      ? 'px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider hover:bg-primary/20 flex items-center justify-center gap-1 min-h-[36px] w-full sm:w-auto'
      : 'px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider hover:bg-primary/20 flex items-center justify-center gap-1 min-h-[40px] w-full sm:w-auto';

  const syncBtn =
    dense
      ? 'px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1'
      : 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1';

  let main: React.ReactNode = null;
  if (pdf) {
    main = (
      <button
        type="button"
        className={primary}
        title="PDF oficial de Stripe"
        onClick={() => openStripeUrl(pdf)}
      >
        <FileDown className="size-3.5 shrink-0" />
        Descargar PDF
      </button>
    );
  } else if (hosted) {
    main = (
      <button
        type="button"
        className={primary}
        title="Factura alojada en Stripe"
        onClick={() => openStripeUrl(hosted)}
      >
        <ExternalLink className="size-3.5 shrink-0" />
        Ver factura
      </button>
    );
  } else if (receipt) {
    main = (
      <button
        type="button"
        className={primary}
        title="Recibo del cobro en Stripe"
        onClick={() => openStripeUrl(receipt)}
      >
        <ExternalLink className="size-3.5 shrink-0" />
        Ver recibo
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {main ?? (
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1.5">No disponible</span>
      )}
      {canResolve && (
        <button
          type="button"
          disabled={resolving}
          className={syncBtn}
          title="Sincronizar enlaces desde Stripe"
          onClick={onResolve}
        >
          {resolving ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Sincronizar
        </button>
      )}
    </div>
  );
};

/** Tarjeta de suscripción: misma jerarquía en web embebida y ruta móvil (`variant="page"`). */
const SubscriptionBillingCard: React.FC<{
  sub: Subscription;
  vm: SubscriptionBillingViewModel;
  latestInvoice: InvoiceRow | null;
  invoicesReady: boolean;
  muted?: boolean;
  formatCurrency: (n: number, c?: string) => string;
  formatFriendlyDate: (iso: string) => string;
  onDetail: () => void;
  onPortal: () => void;
  onGoToLine: () => void;
  openReactivateLine: (href: string) => void;
  resolvingInvoiceId: string | null;
  resolveInvoiceUrls: (id: string) => void;
}> = ({
  sub,
  vm,
  latestInvoice,
  invoicesReady,
  muted,
  formatCurrency,
  formatFriendlyDate,
  onDetail,
  onPortal,
  onGoToLine,
  openReactivateLine,
  resolvingInvoiceId,
  resolveInvoiceUrls,
}) => {
  const actionCount = 2 + (vm.can_manage_payment ? 1 : 0) + (vm.can_reactivate && vm.reactivation_url ? 1 : 0);
  const actionGridClass =
    actionCount >= 4 ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 items-center' : 'grid grid-cols-3 gap-2 items-center';

  const wrap = muted
    ? 'bg-white dark:bg-slate-900 rounded-[1.6rem] border border-slate-200 dark:border-slate-800 p-4 min-w-0 opacity-95 ring-1 ring-slate-100/80 dark:ring-slate-800/80'
    : 'bg-white dark:bg-slate-900 rounded-[1.6rem] border border-slate-200 dark:border-slate-800 p-4 min-w-0 shadow-sm shadow-slate-200/40 dark:shadow-none';

  const invoiceStatusLabel = (() => {
    const st = String(latestInvoice?.status ?? '')
      .trim()
      .toLowerCase();
    if (st === 'paid') return 'Pagada';
    if (st === 'open') return 'Abierta';
    return 'Pendiente';
  })();

  return (
    <div className={`${wrap} flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight truncate">
            {sub.plan_name || 'Plan'}
          </p>
          <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 truncate">
            <Smartphone className="size-4 shrink-0 text-slate-400" aria-hidden />
            <span className="tabular-nums">{vm.display_line}</span>
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${subscriptionBadgeClassName(sub.status)}`}
        >
          {vm.display_status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
          <p className="text-[10px] uppercase font-black text-slate-400">Billing</p>
          <p className="font-bold text-slate-800 dark:text-slate-100">{vm.display_billing}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
          <p className="text-[10px] uppercase font-black text-slate-400">Monto</p>
          <p className="font-bold text-slate-800 dark:text-slate-100">
            {formatCurrency(Number(sub.amount || 0), sub.currency || 'USD')}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
          <p className="text-[10px] uppercase font-black text-slate-400">Contratación</p>
          <p className="font-bold text-slate-800 dark:text-slate-100">{formatFriendlyDate(sub.created_at)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
          <p className="text-[10px] uppercase font-black text-slate-400">{vm.display_next_date_label}</p>
          <p className="font-bold text-slate-800 dark:text-slate-100">{vm.display_next_date}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/80 p-3">
        <p className="text-[10px] uppercase font-black text-slate-400">Última factura</p>
        {invoicesReady && latestInvoice ? (
          <div className="mt-0.5 space-y-0.5">
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">
              {latestInvoice.number || latestInvoice.id}
            </p>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              Estado: {invoiceStatusLabel}
            </p>
            {latestInvoice.created ? (
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {formatFriendlyDate(latestInvoice.created)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">{vm.display_invoice_label}</p>
        )}
        {latestInvoice && invoicesReady ? <InvoiceFiscalSummary inv={latestInvoice} formatCurrency={formatCurrency} /> : null}
      </div>

      <div className={actionGridClass}>
        <button
          type="button"
          onClick={onDetail}
          className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[38px] text-center"
        >
          Ver detalle
        </button>
        {vm.can_manage_payment ? (
          <button
            type="button"
            onClick={onPortal}
            className="px-2.5 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wide hover:bg-primary/20 flex items-center justify-center gap-1 min-h-[38px] text-center"
          >
            <ExternalLink className="size-3.5 shrink-0" />
            Gestionar
          </button>
        ) : null}
        <button
          type="button"
          onClick={onGoToLine}
          className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[38px] text-center"
        >
          Ir a la línea
        </button>
        {vm.can_reactivate && vm.reactivation_url ? (
          <button
            type="button"
            onClick={() => openReactivateLine(vm.reactivation_url!)}
            className="px-2.5 py-2 rounded-xl border border-orange-200 dark:border-orange-500/35 bg-orange-50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-100 text-[10px] font-black uppercase tracking-wide hover:bg-orange-100/90 dark:hover:bg-orange-500/20 min-h-[38px] text-center"
          >
            Reactivar línea
          </button>
        ) : null}
      </div>

      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
        {vm.invoice_pdf_url ? (
          <button
            type="button"
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider hover:bg-primary/20 flex items-center justify-center gap-1.5 min-h-[40px]"
            onClick={() => openStripeUrl(vm.invoice_pdf_url!)}
          >
            <FileDown className="size-3.5 shrink-0" />
            Descargar PDF
          </button>
        ) : latestInvoice && invoicesReady && invoiceNeedsStripeUrlSync(latestInvoice) ? (
          <button
            type="button"
            disabled={resolvingInvoiceId === latestInvoice.id}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 min-h-[40px]"
            onClick={() => resolveInvoiceUrls(latestInvoice.id)}
          >
            {resolvingInvoiceId === latestInvoice.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Sincronizar enlaces
          </button>
        ) : null}
      </div>
    </div>
  );
};

const UserBillingPanel: React.FC<UserBillingPanelProps> = ({
  variant = 'page',
  embeddedDark = false,
  hideIntroTitle = false,
}) => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { unreadSmsCount } = useMessagesCount();
  const { unreadCount: unreadNotificationsCount } = useNotifications();
  const isEmbedded = variant === 'embedded';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const savedPlanId = localStorage.getItem('selected_plan') || 'starter';
  const planName = savedPlanId.charAt(0).toUpperCase() + savedPlanId.slice(1);

  const manageAuthHeaders = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = session?.access_token as string | undefined;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [session?.access_token]);

  const openReactivateLine = useCallback(
    (href: string) => {
      if (/^https?:\/\//i.test(href)) {
        window.location.href = href;
        return;
      }
      const path = href.startsWith('/#/') ? href.slice(2) : href.startsWith('#/') ? href.slice(1) : href;
      navigate(path);
    },
    [navigate]
  );

  const goToSubscriptionLine = useCallback(
    (sub: Subscription) => {
      const state = {
        focusSlotId: sub.slot_id ?? null,
        focusPhoneNumber: sub.phone_number ?? null,
      };
      if (variant === 'embedded') {
        navigate('/web', { state: { activeTab: 'numbers', ...state } });
        return;
      }
      navigate('/dashboard/numbers', { state });
    },
    [navigate, variant]
  );

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  /** `slot_id` → token de reserva en `slots` (reactivación 48h). */
  const [slotReservationBySlotId, setSlotReservationBySlotId] = useState<
    Record<
      string,
      { reservation_token: string | null; reservation_expires_at: string | null; phone_number: string | null }
    >
  >({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPM, setLoadingPM] = useState(true);
  /** Solo afecta al historial de invoices / cards de facturas; no bloquea el panel inicial. */
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoicesReady, setInvoicesReady] = useState(false);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);
  const [resolvingInvoiceId, setResolvingInvoiceId] = useState<string | null>(null);
  type SubscriptionFilterTab = 'activas' | 'todas';

  const [bootPrefs] = useState(() => loadBillingPanelPreferences());
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilterTab>(bootPrefs.subscriptionFilter);
  const [billingHistoryOpen, setBillingHistoryOpen] = useState(bootPrefs.billingHistoryOpen);
  /** Suscripciones terminadas: sección secundaria; estado abierto/cerrado persistido en `telsim.billingPanel.v1`. */
  const [canceledSectionOpen, setCanceledSectionOpen] = useState(bootPrefs.canceledSectionOpen);
  /** Tope de cards visibles en la pestaña principal (persistido). */
  const [subscriptionVisibleCount, setSubscriptionVisibleCount] = useState(bootPrefs.subscriptionVisibleCount);
  /** Paginación en “terminadas” (persistida). */
  const [canceledVisibleCount, setCanceledVisibleCount] = useState(bootPrefs.canceledVisibleCount);
  /** Paginación del grid de historial de invoices tras expandir (persistida). */
  const [invoiceHistoryVisibleCount, setInvoiceHistoryVisibleCount] = useState(
    bootPrefs.invoiceHistoryVisibleCount
  );
  /** Reservado para futuro selector; hoy solo `business`. */
  const [subscriptionSortMode] = useState<'business' | 'created_desc'>(bootPrefs.subscriptionSort);

  const invoiceFetchPhaseRef = useRef<'idle' | 'loading' | 'done'>('idle');

  const subsFetchInFlightRef = useRef(false);
  const subsReqIdRef = useRef(0);
  const billingSyncAttemptedRef = useRef<Set<string>>(new Set());

  /** Una fila por línea (slot / Stripe sub): evita duplicados históricos que inflan el conteo. */
  const subscriptionsDedupedByLine = useMemo(
    () => dedupeLatestSubscriptionPerLine(subscriptions),
    [subscriptions]
  );

  /**
   * KPI “Suscripciones activas”: solo active + trialing (past_due no cuenta como “activa” en el número).
   */
  const kpiStrictActiveSubs = useMemo(
    () => subscriptionsDedupedByLine.filter((s) => isStrictKpiActiveStatus(s.status)),
    [subscriptionsDedupedByLine]
  );

  const pastDueCountKpi = useMemo(
    () =>
      subscriptionsDedupedByLine.filter((s) => normalizeSubscriptionStatus(s.status) === 'past_due').length,
    [subscriptionsDedupedByLine]
  );

  /**
   * Pestañas principales (siempre dedupe por línea / slot / stripe_subscription_id):
   * - Activas: solo status active
   * - Todas: active + trialing + past_due (past_due explícito; no mezclado con Activas)
   */
  const displayedSubscriptions = useMemo(() => {
    if (subscriptionFilter === 'activas') {
      return subscriptionsDedupedByLine.filter((s) => normalizeSubscriptionStatus(s.status) === 'active');
    }
    return subscriptionsDedupedByLine.filter((s) => isTodasTabStatus(s.status));
  }, [subscriptionsDedupedByLine, subscriptionFilter]);

  /**
   * Lista filtrada ordenada por negocio (ver `sortSubscriptionsByPreference` / JSDoc en util).
   */
  const sortedDisplayedSubscriptions = useMemo(
    () => sortSubscriptionsByPreference(displayedSubscriptions, subscriptionSortMode),
    [displayedSubscriptions, subscriptionSortMode]
  );

  const subscriptionFilterCounts = useMemo(() => {
    const dl = subscriptionsDedupedByLine;
    return {
      activas: dl.filter((s) => normalizeSubscriptionStatus(s.status) === 'active').length,
      todas: dl.filter((s) => isTodasTabStatus(s.status)).length,
    };
  }, [subscriptionsDedupedByLine]);

  /** Terminadas / no vigentes: una fila por línea (evita conteo 120 vs 47 por duplicados históricos). */
  const canceledSubscriptionsDeduped = useMemo(() => {
    return subscriptionsDedupedByLine.filter((s) => isCanceledBucketStatus(s.status));
  }, [subscriptionsDedupedByLine]);

  const sortedCanceledSubscriptions = useMemo(
    () => sortSubscriptionsByPreference(canceledSubscriptionsDeduped, subscriptionSortMode),
    [canceledSubscriptionsDeduped, subscriptionSortMode]
  );

  /** Cards mostradas en la pestaña principal (paginación incremental). */
  const paginatedMainSubscriptions = useMemo(() => {
    const total = sortedDisplayedSubscriptions.length;
    if (total === 0) return [];
    const cap = Math.min(Math.max(subscriptionVisibleCount, BILLING_PAGE_INITIAL), total);
    return sortedDisplayedSubscriptions.slice(0, cap);
  }, [sortedDisplayedSubscriptions, subscriptionVisibleCount]);

  const paginatedCanceledSubscriptions = useMemo(() => {
    const total = sortedCanceledSubscriptions.length;
    if (total === 0) return [];
    const cap = Math.min(Math.max(canceledVisibleCount, BILLING_PAGE_INITIAL), total);
    return sortedCanceledSubscriptions.slice(0, cap);
  }, [sortedCanceledSubscriptions, canceledVisibleCount]);

  const canLoadMoreMain =
    sortedDisplayedSubscriptions.length > paginatedMainSubscriptions.length;
  const canLoadMoreCanceled =
    sortedCanceledSubscriptions.length > paginatedCanceledSubscriptions.length;

  const paginatedInvoiceRows = useMemo(() => {
    if (!billingHistoryOpen) return EMPTY_INVOICE_ROWS;
    const total = invoices.length;
    if (total === 0) return EMPTY_INVOICE_ROWS;
    const cap = Math.min(Math.max(invoiceHistoryVisibleCount, BILLING_PAGE_INITIAL), total);
    return invoices.slice(0, cap);
  }, [billingHistoryOpen, invoices, invoiceHistoryVisibleCount]);

  const canLoadMoreInvoices = invoices.length > paginatedInvoiceRows.length;

  /** Ajusta el tope visible al total real al cambiar filtros o datos. */
  useEffect(() => {
    const n = sortedDisplayedSubscriptions.length;
    setSubscriptionVisibleCount((prev) => {
      if (n === 0) return prev;
      return Math.min(Math.max(prev, BILLING_PAGE_INITIAL), n);
    });
  }, [sortedDisplayedSubscriptions.length, subscriptionFilter]);

  useEffect(() => {
    const n = sortedCanceledSubscriptions.length;
    setCanceledVisibleCount((prev) => {
      if (n === 0) return prev;
      return Math.min(Math.max(prev, BILLING_PAGE_INITIAL), n);
    });
  }, [sortedCanceledSubscriptions.length]);

  useEffect(() => {
    const n = invoices.length;
    setInvoiceHistoryVisibleCount((prev) => {
      if (n === 0) return prev;
      return Math.min(Math.max(prev, BILLING_PAGE_INITIAL), n);
    });
  }, [invoices.length]);

  useEffect(() => {
    persistBillingPanelPreferences({
      subscriptionFilter,
      subscriptionVisibleCount,
      canceledVisibleCount,
      invoiceHistoryVisibleCount,
      billingHistoryOpen,
      canceledSectionOpen,
      subscriptionSort: subscriptionSortMode,
    });
  }, [
    subscriptionFilter,
    subscriptionVisibleCount,
    canceledVisibleCount,
    invoiceHistoryVisibleCount,
    billingHistoryOpen,
    canceledSectionOpen,
    subscriptionSortMode,
  ]);

  const prevBillingUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = user?.id;
    if (id === prevBillingUserIdRef.current) return;
    const previous = prevBillingUserIdRef.current;
    prevBillingUserIdRef.current = id;
    if (previous !== undefined && previous !== id) {
      invoiceFetchPhaseRef.current = 'idle';
      setInvoices([]);
      setInvoicesReady(false);
    }
  }, [user?.id]);

  const planNameByStripeSubscriptionId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subscriptions) {
      const sid = effectiveStripeSubscriptionIdForMatching(s);
      if (sid) m.set(sid, s.plan_name || '—');
    }
    return m;
  }, [subscriptions]);

  /** MRR estimado (Cobro recurrente mensual equivalente): active + trialing; mensualidad vs anual/12. */
  const mrrEstimated = useMemo(
    () => resolveEstimatedMrrMonthlyEquivalent(subscriptionsDedupedByLine),
    [subscriptionsDedupedByLine]
  );
  const mrrCurrency = mrrEstimated?.currency || 'USD';

  /** Próximo cobro real (solo active/trialing, fecha futura); misma base que `resolveChargeableNextBillingIso` en utils. */
  const upcomingChargeSummary = useMemo(
    () => resolveUpcomingChargeSummary(subscriptionsDedupedByLine),
    [subscriptionsDedupedByLine]
  );

  /** Próximo cobro / fin de trial / plazo reactivación — solo desde columnas coherentes (ver `resolveSubscriptionNextBillingIso`). */
  const getNextBillingDateIso = (s: Subscription): string | null => resolveSubscriptionNextBillingIso(s);

  const invoicesByStripeSubscription = useMemo(() => {
    const map = new Map<string, InvoiceRow[]>();
    const sorted = [...invoices].sort((a, b) => {
      const ta = a.created ? new Date(a.created).getTime() : 0;
      const tb = b.created ? new Date(b.created).getTime() : 0;
      return tb - ta;
    });
    for (const inv of sorted) {
      const sid = String(inv.subscription_id ?? '').trim();
      if (!sid) continue;
      const list = map.get(sid) ?? [];
      list.push(inv);
      map.set(sid, list);
    }
    return map;
  }, [invoices]);

  const fetchSubscriptions = async (userId: string, signal: AbortSignal, reqId: number, alive: { current: boolean }) => {
    if (subsFetchInFlightRef.current) return;
    subsFetchInFlightRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (!alive.current || reqId !== subsReqIdRef.current) return;
      if (error) throw error;
      const rows = (data || []) as Subscription[];
      setSubscriptions(rows);

      const slotIds = [...new Set(rows.map((r) => r.slot_id).filter(Boolean) as string[])];
      if (slotIds.length === 0) {
        setSlotReservationBySlotId({});
      } else {
        const { data: slotRows, error: slotErr } = await supabase
          .from('slots')
          .select('slot_id, reservation_token, reservation_expires_at, phone_number')
          .in('slot_id', slotIds)
          .abortSignal(signal);
        if (!alive.current || reqId !== subsReqIdRef.current) return;
        if (slotErr) {
          console.warn('[billing] slots reservation fetch:', slotErr.message);
          setSlotReservationBySlotId({});
        } else {
          const next: Record<
            string,
            { reservation_token: string | null; reservation_expires_at: string | null; phone_number: string | null }
          > = {};
          for (const s of slotRows || []) {
            const sid = (s as { slot_id: string }).slot_id;
            next[sid] = {
              reservation_token: (s as { reservation_token?: string | null }).reservation_token ?? null,
              reservation_expires_at: (s as { reservation_expires_at?: string | null }).reservation_expires_at ?? null,
              phone_number: (s as { phone_number?: string | null }).phone_number ?? null,
            };
          }
          setSlotReservationBySlotId(next);
        }
      }
    } catch (err: any) {
      if (!alive.current) return;
      if (err?.name === 'AbortError' || signal.aborted) return;
      console.error('Error fetching subscriptions:', err);
    } finally {
      subsFetchInFlightRef.current = false;
      if (!alive.current) return;
      if (reqId === subsReqIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const candidates = subscriptions.filter((s) => {
      const status = normalizeSubscriptionStatus(s.status);
      const stripeSubId = String(s.stripe_subscription_id ?? '').trim();
      const nextChargeIso = resolveChargeableNextBillingIso(s);
      const nextChargeMs = nextChargeIso ? new Date(nextChargeIso).getTime() : Number.NaN;
      const hasStaleChargeDate = status === 'active' && !Number.isNaN(nextChargeMs) && nextChargeMs <= Date.now();
      return (
        (status === 'active' || status === 'trialing') &&
        (!resolveSubscriptionNextBillingIso(s) || hasStaleChargeDate) &&
        stripeSubId.startsWith('sub_') &&
        !billingSyncAttemptedRef.current.has(s.id)
      );
    });
    if (!user?.id || candidates.length === 0) return;

    let cancelled = false;
    const run = async () => {
      let changed = false;
      for (const sub of candidates) {
        billingSyncAttemptedRef.current.add(sub.id);
        try {
          const response = await fetch('/api/manage', {
            method: 'POST',
            headers: manageAuthHeaders,
            body: JSON.stringify({ action: 'sync-subscription-billing', subscriptionId: sub.id }),
          });
          if (!response.ok) continue;
          changed = true;
        } catch {
          // best-effort silencioso; evita bloquear la UI
        }
      }
      if (changed && !cancelled) {
        const controller = new AbortController();
        const reqId = ++subsReqIdRef.current;
        const alive = { current: true };
        await fetchSubscriptions(user.id, controller.signal, reqId, alive);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [subscriptions, user?.id, manageAuthHeaders]);

  const fetchPaymentMethod = async (userId: string, signal: AbortSignal, alive: { current: boolean }) => {
    setLoadingPM(true);
    try {
      const response = await fetch('/api/manage', {
        method: 'POST',
        headers: manageAuthHeaders,
        body: JSON.stringify({ action: 'payment-method', userId }),
        signal,
      });
      const data = await response.json();
      if (!alive.current) return;
      setPaymentMethod(data?.paymentMethod ?? null);
    } catch (err: any) {
      if (!alive.current) return;
      if (err?.name === 'AbortError') return;
      console.error('Error fetching payment method:', err);
    } finally {
      if (!alive.current) return;
      setLoadingPM(false);
    }
  };

  const fetchInvoices = useCallback(
    async (userId: string, signal: AbortSignal, alive: { current: boolean }) => {
      if (invoiceFetchPhaseRef.current === 'loading' || invoiceFetchPhaseRef.current === 'done') return;
      invoiceFetchPhaseRef.current = 'loading';
      setLoadingInvoices(true);
      try {
        const response = await fetch('/api/manage', {
          method: 'POST',
          headers: manageAuthHeaders,
          body: JSON.stringify({ action: 'invoice-history', userId, limit: 50 }),
          signal,
        });
        const data = await response.json();
        if (!alive.current) return;
        setInvoices((data?.invoices ?? []) as InvoiceRow[]);
        invoiceFetchPhaseRef.current = 'done';
        setInvoicesReady(true);
      } catch (err: any) {
        if (!alive.current) return;
        if (err?.name === 'AbortError') {
          invoiceFetchPhaseRef.current = 'idle';
          return;
        }
        console.error('Error fetching invoice history:', err);
        invoiceFetchPhaseRef.current = 'idle';
        setInvoicesReady(true);
      } finally {
        if (!alive.current && invoiceFetchPhaseRef.current === 'loading') {
          invoiceFetchPhaseRef.current = 'idle';
        }
        setLoadingInvoices(false);
      }
    },
    [manageAuthHeaders]
  );

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const controller = new AbortController();
    const alive = { current: true };
    const reqId = ++subsReqIdRef.current;

    void fetchSubscriptions(userId, controller.signal, reqId, alive);
    void fetchPaymentMethod(userId, controller.signal, alive);

    return () => {
      alive.current = false;
      try {
        controller.abort();
      } catch {
        /* noop */
      }
    };
  }, [user?.id, manageAuthHeaders]);

  /** Facturas: un solo fetch bajo demanda (expandir historial, modal o sección terminadas). */
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    if (!billingHistoryOpen && !selectedSub && !canceledSectionOpen) return;
    if (invoiceFetchPhaseRef.current === 'done') return;

    const controller = new AbortController();
    const alive = { current: true };
    void fetchInvoices(userId, controller.signal, alive);

    return () => {
      alive.current = false;
      try {
        controller.abort();
      } catch {
        /* noop */
      }
    };
  }, [user?.id, billingHistoryOpen, selectedSub, canceledSectionOpen, fetchInvoices]);

  const mergeResolvedInvoice = useCallback((updated: InvoiceRow) => {
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
  }, []);

  const resolveInvoiceUrls = useCallback(
    async (invoiceId: string) => {
      if (!user?.id) return;
      if (!session?.access_token) {
        alert('Vuelve a iniciar sesión para sincronizar facturas con Stripe.');
        return;
      }
      setResolvingInvoiceId(invoiceId);
      try {
        const response = await fetch('/api/manage', {
          method: 'POST',
          headers: manageAuthHeaders,
          body: JSON.stringify({ action: 'invoice-resolve', userId: user.id, invoiceId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          alert(typeof data?.error === 'string' ? data.error : 'No se pudo obtener la factura desde Stripe.');
          return;
        }
        if (data?.invoice?.id) mergeResolvedInvoice(data.invoice as InvoiceRow);
      } catch (e) {
        console.error(e);
        alert('Error al sincronizar con el servidor.');
      } finally {
        setResolvingInvoiceId(null);
      }
    },
    [user?.id, manageAuthHeaders, mergeResolvedInvoice, session?.access_token]
  );

  const handleOpenStripePortal = async () => {
    if (!user || isCreatingPortal) return;
    setIsCreatingPortal(true);
    try {
      const response = await fetch('/api/manage', {
        method: 'POST',
        headers: manageAuthHeaders,
        body: JSON.stringify({ action: 'portal', userId: user.id }),
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || 'No se pudo abrir el portal de gestión.');
        setIsCreatingPortal(false);
      }
    } catch (err) {
      console.error('Error creating portal session:', err);
      setIsCreatingPortal(false);
    }
  };

  const getBrandLogo = (brand: string): React.ReactNode => {
    const b = (brand || '').toLowerCase();
    if (b.includes('visa')) {
      return (
        <svg viewBox="0 0 48 16" className="w-full h-full" fill="none">
          <text x="0" y="13" fontSize="14" fontWeight="900" fontFamily="Arial" fill="#1A1F71">
            VISA
          </text>
        </svg>
      );
    }
    if (b.includes('mastercard')) {
      return (
        <div className="flex">
          <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
          <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-90 -ml-2" />
        </div>
      );
    }
    return <CreditCard className="size-5 text-slate-400" />;
  };

  const moneyLocale = language === 'es' ? 'es-ES' : 'en-US';
  const formatCurrency = useCallback(
    (value: number, currency?: string | null) =>
      formatCurrencyAmount(Number(value || 0), currency, moneyLocale),
    [moneyLocale]
  );

  const formatFriendlyDate = useCallback((dateStr?: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [language]);

  /** Próximo cobro / fin trial: sin inventar fechas; si no hay ISO válido → copy fija. */
  const formatNextBillingDisplay = useCallback(
    (s: SubscriptionRowForBilling) => {
      const iso = resolveSubscriptionNextBillingIso(s);
      if (!iso) return 'No disponible';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'No disponible';
      return formatFriendlyDate(iso);
    },
    [formatFriendlyDate]
  );

  /** Ruta app (`page`): cards en columna; dashboard embebido: grid responsive. */
  const subscriptionCardsGridClass = isEmbedded
    ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
    : 'flex flex-col gap-4';
  const invoiceHistoryGridClass = subscriptionCardsGridClass;

  if (loading || loadingPM) {
    return (
      <div
        className={
          isEmbedded
            ? 'flex flex-col items-center justify-center py-16'
            : 'min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6'
        }
      >
        <RefreshCw className="size-6 text-primary animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('billing.syncing')}</p>
      </div>
    );
  }

  const mainClasses = isEmbedded
    ? 'px-0 py-0 space-y-6 max-w-none'
    : 'px-5 max-w-lg mx-auto lg:max-w-5xl xl:max-w-7xl lg:px-12 pt-3 pb-6 space-y-7';

  const inner = (
    <main className={mainClasses}>
      {!hideIntroTitle && (
        <div />
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-[1.45rem] border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm shadow-slate-200/40 dark:shadow-none min-h-[7.5rem] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Activas</p>
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{kpiStrictActiveSubs.length}</p>
          {pastDueCountKpi > 0 ? (
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400/90 mt-1 leading-snug">
              +{pastDueCountKpi} en past due (siguen activas en Stripe; revisa pago)
            </p>
          ) : null}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.45rem] border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm shadow-slate-200/40 dark:shadow-none min-h-[7.5rem] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Equivalente mensual</p>
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="size-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {mrrEstimated ? formatCurrency(mrrEstimated.amount, mrrCurrency) : '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.45rem] border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm shadow-slate-200/40 dark:shadow-none min-h-[7.5rem] flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Proximo cobro</p>
            <div className="size-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <History className="size-4" />
            </div>
          </div>
          {upcomingChargeSummary ? (
            <div className="mt-2 min-w-0 flex-1 flex flex-col justify-between gap-1">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                {formatFriendlyDate(upcomingChargeSummary.dateIso)}
              </p>
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {formatCurrency(upcomingChargeSummary.amount, upcomingChargeSummary.currency)}
              </p>
              {[upcomingChargeSummary.planName, upcomingChargeSummary.phoneNumber].some(Boolean) ? (
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-snug line-clamp-2">
                  {[upcomingChargeSummary.planName, upcomingChargeSummary.phoneNumber].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-black text-slate-400 dark:text-slate-500 mt-2 flex-1 leading-snug">
              {t('billing.no_upcoming_charges')}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.45rem] border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col min-h-[7.5rem] shadow-sm shadow-slate-200/40 dark:shadow-none">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Método de pago.</p>
            <div className="size-8 rounded-xl bg-slate-900/5 dark:bg-slate-50/10 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <CreditCard className="size-4" />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-between gap-2 mt-1">
            {paymentMethod ? (
              <div className="flex items-start gap-2 min-w-0">
                <div className="size-9 shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1.5">
                  {getBrandLogo(paymentMethod.brand)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {paymentMethod.brand.toUpperCase()} •••• {paymentMethod.last4}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Expira {paymentMethod.exp_month}/{paymentMethod.exp_year}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-black text-slate-400">{t('billing.not_linked')}</p>
            )}
            <button
              type="button"
              onClick={handleOpenStripePortal}
              disabled={isCreatingPortal}
              className="self-start text-[10px] font-black text-primary uppercase tracking-wider px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-1.5"
            >
              {isCreatingPortal ? <Loader2 className="size-3 animate-spin" /> : null}
              {t('billing.manage')}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Tus suscripciones</h3>
            <span className="text-[9px] font-black bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full uppercase dark:bg-slate-700 dark:text-slate-200">
              {paginatedMainSubscriptions.length} de {sortedDisplayedSubscriptions.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 p-1 shadow-sm"
              role="tablist"
              aria-label="Filtro de suscripciones"
            >
              {(
                [
                  {
                    key: 'activas' as const,
                    label: 'Activas',
                    count: subscriptionFilterCounts.activas,
                    hint: 'Solo estado active (una fila por línea)',
                  },
                  {
                    key: 'todas' as const,
                    label: 'Todas',
                    count: subscriptionFilterCounts.todas,
                    hint: 'Active + trialing + past due (operativas; una fila por línea)',
                  },
                ] satisfies {
                  key: SubscriptionFilterTab;
                  label: string;
                  count: number;
                  hint: string;
                }[]
              ).map(({ key, label, count, hint }) => {
                const selected = subscriptionFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    title={hint}
                    aria-selected={selected}
                    onClick={() => setSubscriptionFilter(key)}
                    className={
                      selected
                        ? 'rounded-xl bg-primary text-white px-2.5 sm:px-3 py-2 text-[10px] font-black uppercase tracking-wide shadow-sm'
                        : 'rounded-xl px-2.5 sm:px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }
                  >
                    {label}{' '}
                    <span className={selected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {sortedDisplayedSubscriptions.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 italic">
              {subscriptionFilter === 'activas' && t('billing.no_services')}
              {subscriptionFilter === 'todas' &&
                'No hay suscripciones operativas (active / trialing / baja programada / past due) en tu cuenta.'}
            </p>
          </div>
        ) : (
          <>
          <div className={subscriptionCardsGridClass}>
            {paginatedMainSubscriptions.map((sub) => {
              const slotRes = sub.slot_id ? slotReservationBySlotId[sub.slot_id] : undefined;
              const { vm, latestInvoice } = buildSubscriptionBillingViewModel(sub, {
                allSubscriptions: subscriptions,
                invoicesByStripeSubId: invoicesByStripeSubscription,
                slotReservation: slotRes,
                formatNextDisplay: formatNextBillingDisplay,
                invoicesReady,
              });
              return (
                <SubscriptionBillingCard
                  key={sub.id}
                  sub={sub}
                  vm={vm}
                  latestInvoice={latestInvoice}
                  invoicesReady={invoicesReady}
                  formatCurrency={formatCurrency}
                  formatFriendlyDate={formatFriendlyDate}
                  onDetail={() => setSelectedSub(sub)}
                  onPortal={handleOpenStripePortal}
                  onGoToLine={() => goToSubscriptionLine(sub)}
                  openReactivateLine={openReactivateLine}
                  resolvingInvoiceId={resolvingInvoiceId}
                  resolveInvoiceUrls={resolveInvoiceUrls}
                />
              );
            })}
          </div>
          {canLoadMoreMain ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors w-full sm:w-auto min-h-[44px]"
                onClick={() =>
                  setSubscriptionVisibleCount((c) =>
                    Math.min(c + BILLING_PAGE_STEP, sortedDisplayedSubscriptions.length)
                  )
                }
              >
                Ver más ({BILLING_PAGE_STEP} más)
              </button>
            </div>
          ) : null}
          </>
        )}

        {canceledSubscriptionsDeduped.length > 0 ? (
          <div className="pt-2 space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-4 py-3.5 text-left hover:bg-slate-100/90 dark:hover:bg-slate-800/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={() => setCanceledSectionOpen((o) => !o)}
              aria-expanded={canceledSectionOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <Smartphone className="size-4 text-slate-500 dark:text-slate-400" aria-hidden />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
                    Suscripciones terminadas
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-snug">
                    {canceledSubscriptionsDeduped.length} línea{canceledSubscriptionsDeduped.length === 1 ? '' : 's'} en
                    historial · Planes ya finalizados o cancelados
                    {canceledSectionOpen ? ' · Ocultar' : ' · Expandir'}
                  </span>
                </div>
              </div>
              {canceledSectionOpen ? (
                <ChevronUp className="size-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              ) : (
                <ChevronDown className="size-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              )}
            </button>

            {canceledSectionOpen ? (
              <>
              <div className={subscriptionCardsGridClass}>
                {paginatedCanceledSubscriptions.map((sub) => {
                  const slotRes = sub.slot_id ? slotReservationBySlotId[sub.slot_id] : undefined;
                  const { vm, latestInvoice } = buildSubscriptionBillingViewModel(sub, {
                    allSubscriptions: subscriptions,
                    invoicesByStripeSubId: invoicesByStripeSubscription,
                    slotReservation: slotRes,
                    formatNextDisplay: formatNextBillingDisplay,
                    invoicesReady,
                  });
                  return (
                    <SubscriptionBillingCard
                      key={sub.id}
                      sub={sub}
                      vm={vm}
                      latestInvoice={latestInvoice}
                      invoicesReady={invoicesReady}
                      muted
                      formatCurrency={formatCurrency}
                      formatFriendlyDate={formatFriendlyDate}
                      onDetail={() => setSelectedSub(sub)}
                      onPortal={handleOpenStripePortal}
                      onGoToLine={() => goToSubscriptionLine(sub)}
                      openReactivateLine={openReactivateLine}
                      resolvingInvoiceId={resolvingInvoiceId}
                      resolveInvoiceUrls={resolveInvoiceUrls}
                    />
                  );
                })}
              </div>
              {canLoadMoreCanceled ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors w-full sm:w-auto min-h-[44px]"
                    onClick={() =>
                      setCanceledVisibleCount((c) =>
                        Math.min(c + BILLING_PAGE_STEP, sortedCanceledSubscriptions.length)
                      )
                    }
                  >
                    Ver más terminadas ({BILLING_PAGE_STEP})
                  </button>
                </div>
              ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="billing-history-toggle">
        <button
          type="button"
          id="billing-history-toggle"
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-4 py-3.5 text-left hover:bg-slate-100/90 dark:hover:bg-slate-800/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={() => setBillingHistoryOpen((o) => !o)}
          aria-expanded={billingHistoryOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <History className="size-4 text-slate-500 dark:text-slate-400" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
                Historial de facturación
              </span>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-snug">
                {invoicesReady
                  ? `${invoices.length} factura${invoices.length === 1 ? '' : 's'} sincronizadas con Stripe`
                  : 'Se cargan al expandir (entrada más rápida a Facturación)'}
                {' · '}
                {billingHistoryOpen ? 'Ocultar' : 'Ver listado completo'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-slate-500 dark:text-slate-400">
            {billingHistoryOpen ? (
              <ChevronUp className="size-5" aria-hidden />
            ) : (
              <ChevronDown className="size-5" aria-hidden />
            )}
          </div>
        </button>

        {billingHistoryOpen &&
          (loadingInvoices && !invoicesReady ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <RefreshCw className="size-7 text-primary animate-spin" aria-hidden />
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Cargando historial…</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 italic">No hay facturas disponibles.</p>
            </div>
          ) : (
            <>
              <div className={invoiceHistoryGridClass}>
                {paginatedInvoiceRows.map((inv) => {
                  const planLabel =
                    (inv.subscription_id && planNameByStripeSubscriptionId.get(inv.subscription_id)) || '—';
                  return (
                    <div
                      key={inv.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {inv.number || inv.id}
                          </p>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {formatFriendlyDate(inv.created)}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {inv.status || '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[12px]">
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                          <p className="text-[10px] uppercase font-black text-slate-400">Plan</p>
                          <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{planLabel}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                          <p className="text-[10px] uppercase font-black text-slate-400">Monto</p>
                          <p className="font-bold text-slate-700 dark:text-slate-200">
                            {formatCurrency(
                              (inv.amount_paid || inv.total || inv.amount_due || 0) / 100,
                              inv.currency || 'USD'
                            )}
                          </p>
                        </div>
                      </div>

                      <InvoiceFiscalSummary inv={inv} formatCurrency={formatCurrency} />

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-2">
                          Documento (Stripe)
                        </p>
                        <InvoicePrimaryAccess
                          inv={inv}
                          resolving={resolvingInvoiceId === inv.id}
                          onResolve={() => resolveInvoiceUrls(inv.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {canLoadMoreInvoices ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors w-full sm:w-auto min-h-[44px]"
                    onClick={() =>
                      setInvoiceHistoryVisibleCount((c) => Math.min(c + BILLING_PAGE_STEP, invoices.length))
                    }
                  >
                    Ver más facturas ({BILLING_PAGE_STEP})
                  </button>
                </div>
              ) : null}
            </>
          ))}
      </section>
    </main>
  );

  const detailModal = selectedSub
    ? (() => {
        const slotResModal = selectedSub.slot_id ? slotReservationBySlotId[selectedSub.slot_id] : undefined;
        const { vm: modalVm, latestInvoice: modalLatest } = buildSubscriptionBillingViewModel(selectedSub, {
          allSubscriptions: subscriptions,
          invoicesByStripeSubId: invoicesByStripeSubscription,
          slotReservation: slotResModal,
          formatNextDisplay: formatNextBillingDisplay,
          invoicesReady,
        });
        const li = modalLatest;
        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setSelectedSub(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{selectedSub.plan_name}</h2>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${subscriptionBadgeClassName(selectedSub.status)}`}
                  >
                    {modalVm.display_status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 shrink-0"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-black text-slate-500">Línea:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{modalVm.display_line}</span>
                </p>
                <p>
                  <span className="font-black text-slate-500">Billing:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{modalVm.display_billing}</span>
                </p>
                <p>
                  <span className="font-black text-slate-500">Monto:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">
                    {formatCurrency(Number(selectedSub.amount || 0), selectedSub.currency || 'USD')}
                  </span>
                </p>
                <p>
                  <span className="font-black text-slate-500">Contratación:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{formatFriendlyDate(selectedSub.created_at)}</span>
                </p>
                <p>
                  <span className="font-black text-slate-500">{modalVm.display_next_date_label}:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{modalVm.display_next_date}</span>
                </p>
              </div>
              {modalVm.can_reactivate && modalVm.reactivation_url ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      openReactivateLine(modalVm.reactivation_url!);
                      setSelectedSub(null);
                    }}
                    className="w-full rounded-xl border border-orange-200 dark:border-orange-500/35 bg-orange-50 dark:bg-orange-500/10 text-orange-900 dark:text-orange-100 text-[11px] font-black uppercase tracking-wider py-2.5 hover:bg-orange-100/90 dark:hover:bg-orange-500/20 transition-colors"
                  >
                    Reactivar línea
                  </button>
                </div>
              ) : null}
              {(() => {
                if (loadingInvoices && !invoicesReady) {
                  return (
                    <div className="mt-4 flex flex-col items-center gap-2 py-6 text-slate-500">
                      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
                      <p className="text-[11px] font-bold">Cargando facturas…</p>
                    </div>
                  );
                }
                if (!li) {
                  return (
                    <p className="mt-4 text-[11px] font-bold text-slate-400 italic">{modalVm.display_invoice_label}</p>
                  );
                }
                return (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Documentos (Stripe)</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Factura {li.number || li.id}</p>
                    <InvoiceFiscalSummary inv={li} formatCurrency={formatCurrency} />
                    <InvoicePrimaryAccess
                      inv={li}
                      resolving={resolvingInvoiceId === li.id}
                      onResolve={() => resolveInvoiceUrls(li.id)}
                      dense
                    />
                  </div>
                );
              })()}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleOpenStripePortal}
                  className="w-full rounded-xl bg-primary text-white font-black text-sm py-3 hover:opacity-90 transition"
                >
                  Gestionar en Stripe
                </button>
              </div>
            </div>
          </div>
        );
      })()
    : null;

  if (!isEmbedded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display pb-28">
        <header className="grid grid-cols-[40px_1fr_40px] items-center gap-3 px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-[#1e3a8a] dark:text-blue-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            aria-label="Abrir menu"
          >
            <svg width="16" height="12" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="0" y1="1" x2="18" y2="1"/>
              <line x1="0" y1="7" x2="18" y2="7"/>
              <line x1="0" y1="13" x2="18" y2="13"/>
            </svg>
          </button>
          <h1 className="text-center text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('billing.title')}</h1>
          <button
            type="button"
            onClick={handleOpenStripePortal}
            disabled={isCreatingPortal}
            className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            aria-label={t('billing.manage')}
          >
            {isCreatingPortal ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-5" />}
          </button>
        </header>
        {inner}
        {detailModal}
        <SideDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          user={{ name: userName, plan: planName }}
          unreadMessages={unreadSmsCount}
          unreadNotifications={unreadNotificationsCount}
          currentLang={language}
          onLangChange={(lang) => setLanguage(lang as 'es' | 'en')}
        />
      </div>
    );
  }

  return (
    <div className={embeddedDark ? 'dark font-display' : 'font-display'}>
      {inner}
      {detailModal}
    </div>
  );
};

export default UserBillingPanel;
