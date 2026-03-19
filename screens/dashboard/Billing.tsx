import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Settings2,
  History,
  ShieldCheck,
  Smartphone,
  X,
  Info,
  Clock,
  ExternalLink,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Subscription {
  id: string;
  plan_name: string;
  phone_number: string;
  amount: number;
  billing_type?: 'monthly' | 'annual' | string | null;
  activation_state?: 'paid' | 'provisioned' | 'on_air' | 'failed' | string | null;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  next_billing_date?: string | null;
  created_at: string;
  currency?: string | null;
  slot_id?: string | null;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface FinanceSummary {
  cash_revenue_cents: number;
  booked_sales_cents: number;
  booked_monthly_equivalent_cents: number;
  mrr_cents: number;
  arr_cents: number;
  failed_payments_count: number;
  revenue_at_risk_cents: number;
  active_subscriptions_count: number;
  active_sims_count: number;
  paid_count: number;
  provisioned_count: number;
  on_air_count: number;
  failed_count: number;
}

interface FinanceLedgerEvent {
  id: string;
  finance_event_type: string;
  plan_name: string | null;
  occurred_at: string;
  amount_cents: string | number | null;
  risk_amount_cents: string | number | null;
  currency: string;
  metadata: any;
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [loadingPM, setLoadingPM] = useState(true);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [ledgerEvents, setLedgerEvents] = useState<FinanceLedgerEvent[]>([]);

  const subsFetchInFlightRef = useRef(false);
  const subsReqIdRef = useRef(0);

  const fetchData = async (
    userId: string,
    signal: AbortSignal,
    reqId: number,
    alive: { current: boolean }
  ) => {
    if (subsFetchInFlightRef.current) return;
    subsFetchInFlightRef.current = true;
    setLoading(true);

    try {
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(signal);

      if (!alive.current || reqId !== subsReqIdRef.current) return;
      if (subsError) throw subsError;

      // Solo 1 vez: evita duplicar setSubscriptions
      setSubscriptions(subsData || []);
    } catch (err: any) {
      if (!alive.current) return;
      if (err?.name === 'AbortError' || signal.aborted) return;
      console.error('Error fetching billing data:', err);
    } finally {
      subsFetchInFlightRef.current = false;
      if (!alive.current) return;
      if (reqId === subsReqIdRef.current) setLoading(false);
    }
  };

  const fetchPaymentMethod = async (
    userId: string,
    signal: AbortSignal,
    alive: { current: boolean }
  ) => {
    setLoadingPM(true);
    try {
      const response = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'payment-method', userId }),
        signal
      });
      const data = await response.json();
      if (!alive.current) return;
      if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
    } catch (err) {
      if (!alive.current) return;
      if ((err as any)?.name === 'AbortError') return;
      console.error('Error al obtener método de pago de Stripe:', err);
    } finally {
      if (!alive.current) return;
      setLoadingPM(false);
    }
  };

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const controller = new AbortController();
    const alive = { current: true };
    const reqId = ++subsReqIdRef.current;

    fetchData(userId, controller.signal, reqId, alive);
    fetchPaymentMethod(userId, controller.signal, alive);

    const fetchFinance = async () => {
      setLoadingFinance(true);
      try {
        const {
          data: { session },
        } = await (supabase.auth as any).getSession();
        const token: string | undefined = session?.access_token;
        if (!token) return;

        const end = new Date();
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startDate = start.toISOString().slice(0, 10);
        const endDate = end.toISOString().slice(0, 10);

        const summaryRes = await fetch('/api/finance/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ startDate, endDate }),
          signal: controller.signal,
        });
        const summaryJson = await summaryRes.json();
        if (!alive.current) return;
        if (summaryRes.ok) setFinanceSummary(summaryJson as FinanceSummary);
        else console.error('finance/summary error:', summaryJson);

        const ledgerRes = await fetch('/api/finance/ledger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            startDate,
            endDate,
            financeEventTypes: ['cash_revenue', 'booked_revenue', 'payment_failed_attempt', 'churn_event'],
            limit: 50,
            offset: 0,
          }),
          signal: controller.signal,
        });
        const ledgerJson = await ledgerRes.json();
        if (!alive.current) return;
        if (ledgerRes.ok) setLedgerEvents((ledgerJson?.events ?? []) as FinanceLedgerEvent[]);
        else console.error('finance/ledger error:', ledgerJson);
      } catch (err) {
        if (!alive.current) return;
        if ((err as any)?.name === 'AbortError') return;
        console.error('Error fetching finance:', err);
      } finally {
        if (!alive.current) return;
        setLoadingFinance(false);
      }
    };

    void fetchFinance();

    return () => {
      alive.current = false;
      try { controller.abort(); } catch {}
    };
  }, [user?.id]);

  const handleOpenStripePortal = async () => {
    if (!user || isCreatingPortal) return;
    setIsCreatingPortal(true);

    try {
      const response = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal', userId: user.id }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || (language === 'es' ? "No se pudo abrir el portal de gestión. Asegúrate de tener una suscripción activa." : "Could not open management portal. Make sure you have an active subscription."));
        setIsCreatingPortal(false);
      }
    } catch (err) {
      console.error("Error creating portal session:", err);
      setIsCreatingPortal(false);
    }
  };

  const getBrandLogo = (brand: string): React.ReactNode => {
    const b = brand.toLowerCase();
    if (b.includes('visa')) return (
      <svg viewBox="0 0 48 16" className="w-full h-full" fill="none">
        <text x="0" y="13" fontSize="14" fontWeight="900" fontFamily="Arial" fill="#1A1F71">VISA</text>
      </svg>
    );
    if (b.includes('mastercard')) return (
      <div className="flex">
        <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
        <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-90 -ml-2" />
      </div>
    );
    if (b.includes('amex') || b.includes('american')) return (
      <svg viewBox="0 0 48 16" className="w-full h-full" fill="none">
        <text x="0" y="13" fontSize="11" fontWeight="900" fontFamily="Arial" fill="#007BC1">AMEX</text>
      </svg>
    );
    return null;
  };

  const activeServices = subscriptions.filter(
    (s) => s.status === 'active' || s.status === 'trialing'
  );

  const activeTableSubscriptions = subscriptions.filter(
    (s) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due'
  );
  const previousServices = subscriptions.filter(
    (s) => s.status !== 'active' && s.status !== 'trialing'
  );
  const totalMonthlySpend = activeServices.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const getPlanVisual = (planName: string) => {
    const name = (planName || '').toLowerCase();
    if (name.includes('power')) return {
      gradient: 'bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-500',
      text: 'text-white',
      subText: 'text-white/70',
      priceText: 'text-white',
      border: 'border-amber-300/30',
      icon: '⚡',
      shadow: 'shadow-amber-400/30',
    };
    if (name.includes('pro')) return {
      gradient: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600',
      text: 'text-white',
      subText: 'text-white/70',
      priceText: 'text-white',
      border: 'border-blue-300/30',
      icon: '🚀',
      shadow: 'shadow-blue-500/30',
    };
    return {
      gradient: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700',
      text: 'text-slate-900 dark:text-white',
      subText: 'text-slate-500 dark:text-slate-400',
      priceText: 'text-slate-900 dark:text-white',
      border: 'border-slate-200 dark:border-slate-600',
      icon: '✦',
      shadow: 'shadow-slate-200/50',
    };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatCentsCurrency = (cents: number, currency: string = 'USD') => {
    const code = (currency || 'USD').toUpperCase();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format((cents || 0) / 100);
  };

  const activationStateLabel = (s?: string | null) => {
    switch (s) {
      case 'paid':
        return 'paid';
      case 'provisioned':
        return 'provisioned';
      case 'on_air':
        return 'on_air';
      case 'failed':
        return 'failed';
      default:
        return (s || '—').toString();
    }
  };

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading || loadingFinance) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6">
        <RefreshCw className="size-6 text-primary animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('billing.syncing')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark font-display pb-32">
      {/* NAVEGACIÓN SUPERIOR */}
      <header className="flex items-center justify-between px-6 py-8 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-6" />
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash Revenue (últimos 30 días)</p>
          <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatCentsCurrency(financeSummary?.cash_revenue_cents ?? 0, 'USD')}</p>
        </div>
      </header>

      <main className="px-6 max-w-lg mx-auto lg:max-w-5xl lg:px-12">
        <div className="space-y-10">

          {/* TÍTULO PRINCIPAL */}
          <div className="pt-2">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t('billing.title')}</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('billing.subtitle')}</p>
          </div>

          {/* SECCIÓN 1: RESUMEN FINANCIERO */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Resumen financiero</h3>
              <button
                onClick={handleOpenStripePortal}
                disabled={isCreatingPortal}
                className="text-[11px] font-black text-primary uppercase tracking-widest px-4 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2"
              >
                {isCreatingPortal ? <Loader2 className="size-3 animate-spin" /> : t('billing.manage')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Cash Revenue</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{formatCentsCurrency(financeSummary?.cash_revenue_cents ?? 0, 'USD')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Últimos 30 días</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Booked Sales</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{formatCentsCurrency(financeSummary?.booked_sales_cents ?? 0, 'USD')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Últimos 30 días</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Booked Monthly Equivalent</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{formatCentsCurrency(financeSummary?.booked_monthly_equivalent_cents ?? 0, 'USD')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Eq. mensual</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Revenue at Risk</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{formatCentsCurrency(financeSummary?.revenue_at_risk_cents ?? 0, 'USD')}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{financeSummary ? `${financeSummary.failed_payments_count} fallos` : '—'}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Active Subscriptions</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{financeSummary?.active_subscriptions_count ?? 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Activas + trial</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Active SIMs</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{financeSummary?.active_sims_count ?? 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">En línea</p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: TUS SUSCRIPCIONES ACTIVAS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Tus suscripciones activas</h3>
              <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">
                {activeTableSubscriptions.length} planes
              </span>
            </div>

            {activeTableSubscriptions.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 italic">No tienes suscripciones activas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-separate" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Plan</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Tipo</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Monto</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Activation</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Slot / Tel.</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Próximo cobro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTableSubscriptions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 cursor-pointer"
                        onClick={() => setSelectedSub(sub)}
                      >
                        <td className="px-2 py-3 font-black text-slate-900 dark:text-white">{sub.plan_name}</td>
                        <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                          {sub.billing_type === 'annual' ? 'Anual' : sub.billing_type === 'monthly' ? 'Mensual' : sub.billing_type ?? '—'}
                        </td>
                        <td className="px-2 py-3 text-slate-900 dark:text-white tabular-nums font-black">
                          {sub.amount != null ? formatCurrency(sub.amount) : '—'}
                        </td>
                        <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                          {activationStateLabel(sub.activation_state)}
                        </td>
                        <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                          {sub.phone_number || sub.slot_id || '—'}
                        </td>
                        <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                          {sub.next_billing_date ? formatFriendlyDate(sub.next_billing_date) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECCIÓN 3: ACTIVATION FUNNEL */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Activation funnel</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">paid</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{financeSummary?.paid_count ?? 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">provisioned</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{financeSummary?.provisioned_count ?? 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">on_air</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{financeSummary?.on_air_count ?? 0}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">failed</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{financeSummary?.failed_count ?? 0}</p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: HISTORIAL FINANCIERO */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-slate-400">
                <History className="size-4" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em]">Historial financiero</h3>
              </div>
              <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase">
                Últimos 30 días
              </span>
            </div>

            {ledgerEvents.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 italic">Sin eventos financieros para el período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-separate" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Fecha</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Evento</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Plan</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Monto</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Riesgo</th>
                      <th className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] px-2 py-2">Moneda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEvents.map((ev) => {
                      const currency = ev.currency || 'USD';
                      const monto =
                        ev.amount_cents == null ? '—' : formatCentsCurrency(Number(ev.amount_cents), currency);
                      const riesgo =
                        ev.risk_amount_cents == null ? '—' : formatCentsCurrency(Number(ev.risk_amount_cents), currency);
                      return (
                        <tr key={ev.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{formatFriendlyDate(ev.occurred_at)}</td>
                          <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{ev.finance_event_type}</td>
                          <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{ev.plan_name ?? '—'}</td>
                          <td className="px-2 py-3 text-slate-900 dark:text-white tabular-nums font-black">{monto}</td>
                          <td className="px-2 py-3 text-slate-900 dark:text-white tabular-nums font-black">{riesgo}</td>
                          <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{String(currency).toUpperCase()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* BANNER DE SEGURIDAD */}
          <div className="flex flex-col items-center gap-6 pt-8 pb-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <ShieldCheck className="size-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('billing.secure_payment')}</span>
            </div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">Telsim Financial Infra v2.8</p>
          </div>

        </div>{/* end space-y-10 wrapper */}
      </main>

      {/* MODAL DE DETALLES DE SUSCRIPCIÓN */}
      {selectedSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedSub(null)}>
          <div
            className="w-full max-sm bg-slate-950 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-8 pb-4 flex justify-between items-start">
              <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                <Smartphone className="size-7" />
              </div>
              <button onClick={() => setSelectedSub(null)} className="size-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="px-8 pb-10 space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-white text-xl font-black uppercase tracking-tight">{selectedSub.plan_name}</h2>
                <div className="text-5xl font-black text-white tracking-tighter tabular-nums flex items-baseline justify-center gap-1">
                  {formatCurrency(selectedSub.amount)}
                  <span className="text-xs font-bold text-white/40">/mes</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-5 bg-slate-900/40 space-y-1">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{t('dashboard.port')}</span>
                  <p className="text-xs font-black text-white font-mono">{selectedSub.phone_number}</p>
                </div>
                <div className="p-5 bg-slate-900/40 space-y-1">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{t('common.status')}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black text-emerald-500 uppercase">{t('billing.active')}</span>
                  </div>
                </div>
                <div className="p-5 bg-slate-900/40 space-y-1">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{t('billing.start')}</span>
                  <p className="text-[10px] font-bold text-white/80">{formatFriendlyDate(selectedSub.created_at)}</p>
                </div>
                <div className="p-5 bg-slate-900/40 space-y-1">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{t('billing.next_billing')}</span>
                  <p className="text-[10px] font-bold text-white/80">{formatFriendlyDate(selectedSub.next_billing_date)}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 bg-white/5 rounded-lg flex items-center justify-center">
                    {paymentMethod && getBrandLogo(paymentMethod.brand) ? (
                      <div className="w-full h-full flex items-center justify-center">
                        {getBrandLogo(paymentMethod.brand)}
                      </div>
                    ) : (
                      <CreditCard className="size-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t('billing.payment_method')}</span>
                    <p className="text-[11px] font-bold text-white">{paymentMethod ? `${paymentMethod.brand} •••• ${paymentMethod.last4}` : t('billing.not_linked')}</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenStripePortal}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  {isCreatingPortal ? '...' : t('billing.manage')}
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setSelectedSub(null)}
                  className="w-full h-14 bg-white text-slate-900 font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                >
                  {t('billing.close_detail')}
                </button>
                <button className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors">
                  <ShieldAlert className="size-3" />
                  {t('billing.report_problem')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;