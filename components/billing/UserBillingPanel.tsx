import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
import {
  dedupeLatestSubscriptionPerLine,
  getSubscriptionBadgeLabel,
  isCanceledBucketStatus,
  isLiveOperationalStatus,
  isStrictKpiActiveStatus,
  normalizeSubscriptionStatus,
  subscriptionBadgeClassName,
} from './subscriptionBillingUtils';

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
  created_at: string;
  currency?: string | null;
  stripe_subscription_id?: string | null;
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

const UserBillingPanel: React.FC<UserBillingPanelProps> = ({
  variant = 'page',
  embeddedDark = false,
  hideIntroTitle = false,
}) => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { t, language } = useLanguage();
  const isEmbedded = variant === 'embedded';

  const manageAuthHeaders = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = session?.access_token as string | undefined;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [session?.access_token]);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPM, setLoadingPM] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);
  const [resolvingInvoiceId, setResolvingInvoiceId] = useState<string | null>(null);
  type SubscriptionFilterTab = 'activas' | 'canceladas' | 'todas';
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilterTab>('activas');
  const [billingHistoryOpen, setBillingHistoryOpen] = useState(false);

  const subsFetchInFlightRef = useRef(false);
  const subsReqIdRef = useRef(0);

  /** Una fila por línea (slot / Stripe sub): evita duplicados históricos que inflan el conteo. */
  const subscriptionsDedupedByLine = useMemo(
    () => dedupeLatestSubscriptionPerLine(subscriptions),
    [subscriptions]
  );

  /** Suscripciones aún operativas para cobros / próximo billing (incluye past_due). */
  const operationalSubs = useMemo(
    () => subscriptionsDedupedByLine.filter((s) => isLiveOperationalStatus(s.status)),
    [subscriptionsDedupedByLine]
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
   * Activas: active + trialing + past_due (dedupe por línea). past_due sigue con badge “Past Due”.
   * Canceladas: canceled, expired, unpaid, incomplete, incomplete_expired (todas las filas, sin dedupe).
   * Todas: historial completo ordenado por created_at.
   */
  const displayedSubscriptions = useMemo(() => {
    const sortedAll = [...subscriptions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (subscriptionFilter === 'activas') {
      return subscriptionsDedupedByLine.filter((s) => isLiveOperationalStatus(s.status));
    }
    if (subscriptionFilter === 'canceladas') {
      return sortedAll.filter((s) => isCanceledBucketStatus(s.status));
    }
    return sortedAll;
  }, [subscriptions, subscriptionsDedupedByLine, subscriptionFilter]);

  const subscriptionFilterCounts = useMemo(() => {
    const sortedAll = [...subscriptions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      activas: subscriptionsDedupedByLine.filter((s) => isLiveOperationalStatus(s.status)).length,
      canceladas: sortedAll.filter((s) => isCanceledBucketStatus(s.status)).length,
      todas: subscriptions.length,
    };
  }, [subscriptions, subscriptionsDedupedByLine]);

  const planNameByStripeSubscriptionId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subscriptions) {
      const sid = s.stripe_subscription_id?.trim();
      if (sid) m.set(sid, s.plan_name || '—');
    }
    return m;
  }, [subscriptions]);

  const nextBillingTotalEstimate = useMemo(
    () => operationalSubs.reduce((acc, s) => acc + Number(s.amount || 0), 0),
    [operationalSubs]
  );

  const nextBillingDate = useMemo(() => {
    const dates = operationalSubs
      .map((s) => {
        const iso =
          s.next_billing_date ||
          s.trial_end ||
          (() => {
            const d0 = new Date(s.created_at);
            if (Number.isNaN(d0.getTime())) return null;
            if (s.billing_type === 'annual') d0.setFullYear(d0.getFullYear() + 1);
            else d0.setDate(d0.getDate() + 30);
            return d0.toISOString();
          })();
        if (!iso) return null;
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : d;
      })
      .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ?? null;
  }, [operationalSubs]);

  const getNextBillingDateIso = (s: Subscription): string | null => {
    if (s.next_billing_date) return s.next_billing_date;
    if (s.trial_end) return s.trial_end;
    const d = new Date(s.created_at);
    if (Number.isNaN(d.getTime())) return null;
    if (s.billing_type === 'annual') d.setFullYear(d.getFullYear() + 1);
    else d.setDate(d.getDate() + 30);
    return d.toISOString();
  };

  const invoicesByStripeSubscription = useMemo(() => {
    const map = new Map<string, InvoiceRow[]>();
    const sorted = [...invoices].sort((a, b) => {
      const ta = a.created ? new Date(a.created).getTime() : 0;
      const tb = b.created ? new Date(b.created).getTime() : 0;
      return tb - ta;
    });
    for (const inv of sorted) {
      if (!inv.subscription_id) continue;
      const list = map.get(inv.subscription_id) ?? [];
      list.push(inv);
      map.set(inv.subscription_id, list);
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
      setSubscriptions((data || []) as Subscription[]);
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

  const fetchInvoices = async (userId: string, signal: AbortSignal, alive: { current: boolean }) => {
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
    } catch (err: any) {
      if (!alive.current) return;
      if (err?.name === 'AbortError') return;
      console.error('Error fetching invoice history:', err);
    } finally {
      if (!alive.current) return;
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const controller = new AbortController();
    const alive = { current: true };
    const reqId = ++subsReqIdRef.current;

    void fetchSubscriptions(userId, controller.signal, reqId, alive);
    void fetchPaymentMethod(userId, controller.signal, alive);
    void fetchInvoices(userId, controller.signal, alive);

    return () => {
      alive.current = false;
      try {
        controller.abort();
      } catch {
        /* noop */
      }
    };
  }, [user?.id, manageAuthHeaders]);

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

  const formatCurrency = (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
    }).format(Number(value || 0));

  const formatFriendlyDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading || loadingPM || loadingInvoices) {
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
    : 'px-6 max-w-lg mx-auto lg:max-w-5xl xl:max-w-7xl lg:px-12 py-6 space-y-8';

  const inner = (
    <main className={mainClasses}>
      {!hideIntroTitle && (
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('billing.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestiona tus planes, próximos cobros e invoices.
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Suscripciones activas</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{kpiStrictActiveSubs.length}</p>
          {pastDueCountKpi > 0 ? (
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400/90 mt-1 leading-snug">
              +{pastDueCountKpi} en past due (siguen activas en Stripe; revisa pago)
            </p>
          ) : null}
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Próximo cobro estimado</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {formatCurrency(nextBillingTotalEstimate, operationalSubs[0]?.currency || 'USD')}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Próxima fecha de cobro</p>
          <p className="text-sm font-black text-slate-900 dark:text-white mt-2">
            {nextBillingDate ? formatFriendlyDate(nextBillingDate.toISOString()) : '—'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Método de pago</p>
          {paymentMethod ? (
            <p className="text-sm font-black text-slate-900 dark:text-white mt-2">
              {paymentMethod.brand.toUpperCase()} •••• {paymentMethod.last4}
            </p>
          ) : (
            <p className="text-sm font-black text-slate-400 mt-2">No vinculado</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('billing.default_payment')}</h3>
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm overflow-hidden p-2">
              {paymentMethod ? getBrandLogo(paymentMethod.brand) : <CreditCard className="size-5 text-slate-400" />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {paymentMethod ? `${paymentMethod.brand.toUpperCase()} •••• ${paymentMethod.last4}` : 'Sin método de pago'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                {paymentMethod
                  ? `Expira ${paymentMethod.exp_month}/${paymentMethod.exp_year}`
                  : 'Configura una tarjeta en Stripe'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenStripePortal}
            disabled={isCreatingPortal}
            className="text-[11px] font-black text-primary uppercase tracking-widest px-3 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2"
          >
            {isCreatingPortal ? <Loader2 className="size-3 animate-spin" /> : t('billing.manage')}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Tus suscripciones</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 p-0.5"
              role="tablist"
              aria-label="Filtro de suscripciones"
            >
              {(
                [
                  {
                    key: 'activas' as const,
                    label: 'Activas',
                    count: subscriptionFilterCounts.activas,
                    hint: 'Activas + trialing + past due (una por línea)',
                  },
                  {
                    key: 'canceladas' as const,
                    label: 'Canceladas',
                    count: subscriptionFilterCounts.canceladas,
                    hint: 'Cancelada, expirada, impaga o incompleta',
                  },
                  {
                    key: 'todas' as const,
                    label: 'Todas',
                    count: subscriptionFilterCounts.todas,
                    hint: 'Todas las filas de suscripción',
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
                        ? 'rounded-lg bg-white dark:bg-slate-800 px-2.5 sm:px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-900 dark:text-white shadow-sm ring-2 ring-primary/35 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-900'
                        : 'rounded-lg px-2.5 sm:px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }
                  >
                    {label}{' '}
                    <span className={selected ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}>({count})</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[9px] font-black bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full uppercase dark:bg-slate-700 dark:text-slate-200">
              {displayedSubscriptions.length} en vista
            </span>
          </div>
        </div>

        {displayedSubscriptions.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 italic">
              {subscriptionFilter === 'activas' && t('billing.no_services')}
              {subscriptionFilter === 'canceladas' && 'No hay suscripciones canceladas en el historial.'}
              {subscriptionFilter === 'todas' && 'No hay suscripciones para este usuario.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedSubscriptions.map((sub) => {
              const subInvoices = sub.stripe_subscription_id
                ? invoicesByStripeSubscription.get(sub.stripe_subscription_id) || []
                : [];
              const latestInvoice = subInvoices[0] || null;
              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 min-w-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{sub.plan_name || 'Plan'}</p>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <Smartphone className="size-3.5 shrink-0" />
                        {sub.phone_number || sub.slot_id || 'Sin línea asociada'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full ${subscriptionBadgeClassName(sub.status)}`}
                    >
                      {getSubscriptionBadgeLabel(sub.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                      <p className="text-[10px] uppercase font-black text-slate-400">Billing</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {sub.billing_type === 'annual' ? 'Anual' : 'Mensual'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                      <p className="text-[10px] uppercase font-black text-slate-400">Monto</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {formatCurrency(Number(sub.amount || 0), sub.currency || 'USD')}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                      <p className="text-[10px] uppercase font-black text-slate-400">Contratación</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{formatFriendlyDate(sub.created_at)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                      <p className="text-[10px] uppercase font-black text-slate-400">Próxima renovación / cobro</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {formatFriendlyDate(getNextBillingDateIso(sub))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2 sm:col-span-2">
                      <p className="text-[10px] uppercase font-black text-slate-400">Invoice</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{latestInvoice?.number || '—'}</p>
                      {latestInvoice ? (
                        <InvoiceFiscalSummary inv={latestInvoice} formatCurrency={formatCurrency} />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSub(sub)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenStripePortal}
                        className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider hover:bg-primary/20 flex items-center gap-1"
                      >
                        <ExternalLink className="size-3.5" />
                        Gestionar pago
                      </button>
                    </div>
                    {latestInvoice ? (
                      <InvoicePrimaryAccess
                        inv={latestInvoice}
                        resolving={resolvingInvoiceId === latestInvoice.id}
                        onResolve={() => resolveInvoiceUrls(latestInvoice.id)}
                      />
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 italic">Sin factura registrada aún en Stripe para esta suscripción.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {invoices.length} factura{invoices.length === 1 ? '' : 's'} ·{' '}
                {billingHistoryOpen ? 'Ocultar historial' : 'Ver historial'}
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
          (invoices.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 italic">No hay facturas disponibles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {invoices.map((inv) => {
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
          ))}
      </section>
    </main>
  );

  const detailModal = selectedSub ? (
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
              {getSubscriptionBadgeLabel(selectedSub.status)}
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
            <span className="text-slate-800 dark:text-slate-200">
              {selectedSub.phone_number || selectedSub.slot_id || '—'}
            </span>
          </p>
          <p>
            <span className="font-black text-slate-500">Billing:</span>{' '}
            <span className="text-slate-800 dark:text-slate-200">
              {selectedSub.billing_type === 'annual' ? 'Anual' : 'Mensual'}
            </span>
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
            <span className="font-black text-slate-500">Próxima renovación / cobro:</span>{' '}
            <span className="text-slate-800 dark:text-slate-200">
              {formatFriendlyDate(getNextBillingDateIso(selectedSub))}
            </span>
          </p>
        </div>
        {selectedSub.stripe_subscription_id &&
          (() => {
            const subs =
              invoicesByStripeSubscription.get(selectedSub.stripe_subscription_id!) || [];
            const li = subs[0];
            if (!li) {
              return (
                <p className="mt-4 text-[11px] font-bold text-slate-400 italic">
                  Aún no hay factura de Stripe asociada a esta suscripción.
                </p>
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
  ) : null;

  if (!isEmbedded) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark font-display pb-28">
        <header className="flex items-center justify-between px-6 py-6 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400"
          >
            <ArrowLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={handleOpenStripePortal}
            disabled={isCreatingPortal}
            className="text-[11px] font-black text-primary uppercase tracking-widest px-3 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2"
          >
            {isCreatingPortal ? <Loader2 className="size-3 animate-spin" /> : t('billing.manage')}
          </button>
        </header>
        {inner}
        {detailModal}
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
