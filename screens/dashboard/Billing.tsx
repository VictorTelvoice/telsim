import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ExternalLink, FileDown, History, Loader2, RefreshCw, Smartphone, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Subscription {
  id: string;
  plan_name: string;
  phone_number?: string | null;
  slot_id?: string | null;
  amount: number | null;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired' | string;
  billing_type?: 'monthly' | 'annual' | string | null;
  next_billing_date?: string | null;
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
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPM, setLoadingPM] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);

  const subsFetchInFlightRef = useRef(false);
  const subsReqIdRef = useRef(0);

  const activeSubs = useMemo(
    () => subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due'),
    [subscriptions]
  );

  const nextBillingTotalEstimate = useMemo(
    () => activeSubs.reduce((acc, s) => acc + Number(s.amount || 0), 0),
    [activeSubs]
  );

  const nextBillingDate = useMemo(() => {
    const dates = activeSubs
      .map((s) => (s.next_billing_date ? new Date(s.next_billing_date) : null))
      .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ?? null;
  }, [activeSubs]);

  const invoicesByStripeSubscription = useMemo(() => {
    const map = new Map<string, InvoiceRow[]>();
    for (const inv of invoices) {
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      } catch {}
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

  const openInvoice = (inv: InvoiceRow) => {
    const url = inv.invoice_pdf || inv.hosted_invoice_url || inv.receipt_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading || loadingPM || loadingInvoices) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6">
        <RefreshCw className="size-6 text-primary animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('billing.syncing')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark font-display pb-28">
      <header className="flex items-center justify-between px-6 py-6 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-6" />
        </button>
        <button
          onClick={handleOpenStripePortal}
          disabled={isCreatingPortal}
          className="text-[11px] font-black text-primary uppercase tracking-widest px-3 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2"
        >
          {isCreatingPortal ? <Loader2 className="size-3 animate-spin" /> : t('billing.manage')}
        </button>
      </header>

      <main className="px-6 max-w-lg mx-auto lg:max-w-5xl lg:px-12 py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('billing.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tus planes, próximos cobros e invoices.</p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Suscripciones activas</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{activeSubs.length}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Próximo cobro estimado</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-2">
              {formatCurrency(nextBillingTotalEstimate, activeSubs[0]?.currency || 'USD')}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Próxima fecha de cobro</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-2">{nextBillingDate ? formatFriendlyDate(nextBillingDate.toISOString()) : '—'}</p>
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
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm overflow-hidden p-2">
                {paymentMethod ? getBrandLogo(paymentMethod.brand) : <CreditCard className="size-5 text-slate-400" />}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {paymentMethod ? `${paymentMethod.brand.toUpperCase()} •••• ${paymentMethod.last4}` : 'Sin método de pago'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  {paymentMethod ? `Expira ${paymentMethod.exp_month}/${paymentMethod.exp_year}` : 'Configura una tarjeta en Stripe'}
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenStripePortal}
              disabled={isCreatingPortal}
              className="text-[11px] font-black text-primary uppercase tracking-widest px-3 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2"
            >
              {isCreatingPortal ? <Loader2 className="size-3 animate-spin" /> : t('billing.manage')}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Tus suscripciones</h3>
            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">{activeSubs.length} activas</span>
          </div>

          {activeSubs.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 italic">{t('billing.no_services')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSubs.map((sub) => {
                const subInvoices = sub.stripe_subscription_id
                  ? invoicesByStripeSubscription.get(sub.stripe_subscription_id) || []
                  : [];
                const latestInvoice = subInvoices[0] || null;
                return (
                  <div key={sub.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{sub.plan_name || 'Plan'}</p>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Smartphone className="size-3.5" />
                          {sub.phone_number || sub.slot_id || 'Sin línea asociada'}
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {sub.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                        <p className="text-[10px] uppercase font-black text-slate-400">Billing</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{sub.billing_type === 'annual' ? 'Anual' : 'Mensual'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                        <p className="text-[10px] uppercase font-black text-slate-400">Monto</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(Number(sub.amount || 0), sub.currency || 'USD')}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                        <p className="text-[10px] uppercase font-black text-slate-400">Próxima renovación</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{formatFriendlyDate(sub.next_billing_date)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                        <p className="text-[10px] uppercase font-black text-slate-400">Invoice</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{latestInvoice?.number || '—'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => setSelectedSub(sub)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Ver detalle
                      </button>
                      <button
                        onClick={() => latestInvoice && openInvoice(latestInvoice)}
                        disabled={!latestInvoice || (!latestInvoice.invoice_pdf && !latestInvoice.hosted_invoice_url && !latestInvoice.receipt_url)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1"
                      >
                        <FileDown className="size-3.5" />
                        Descargar invoice
                      </button>
                      <button
                        onClick={handleOpenStripePortal}
                        className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider hover:bg-primary/20 flex items-center gap-1"
                      >
                        <ExternalLink className="size-3.5" />
                        Gestionar pago
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-500">
            <History className="size-4" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em]">Historial de facturación</h3>
          </div>

          {invoices.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 italic">No hay invoices disponibles.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{inv.number || inv.id}</p>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{formatFriendlyDate(inv.created)}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {inv.status || '—'}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <p className="text-[10px] uppercase font-black text-slate-400">Plan</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {subscriptions.find((s) => s.stripe_subscription_id === inv.subscription_id)?.plan_name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black text-slate-400">Monto</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {formatCurrency((inv.amount_paid || inv.total || inv.amount_due || 0) / 100, inv.currency || 'USD')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openInvoice(inv)}
                      disabled={!inv.invoice_pdf && !inv.hosted_invoice_url && !inv.receipt_url}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1"
                    >
                      <FileDown className="size-3.5" />
                      Descargar PDF / receipt
                    </button>
                    <button
                      onClick={() => inv.hosted_invoice_url && window.open(inv.hosted_invoice_url, '_blank', 'noopener,noreferrer')}
                      disabled={!inv.hosted_invoice_url}
                      className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider hover:bg-primary/20 disabled:opacity-40 flex items-center gap-1"
                    >
                      <ExternalLink className="size-3.5" />
                      Ver invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm" onClick={() => setSelectedSub(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{selectedSub.plan_name}</h2>
              <button onClick={() => setSelectedSub(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-black text-slate-500">Línea:</span> <span className="text-slate-800 dark:text-slate-200">{selectedSub.phone_number || selectedSub.slot_id || '—'}</span></p>
              <p><span className="font-black text-slate-500">Estado:</span> <span className="text-slate-800 dark:text-slate-200">{selectedSub.status}</span></p>
              <p><span className="font-black text-slate-500">Billing:</span> <span className="text-slate-800 dark:text-slate-200">{selectedSub.billing_type === 'annual' ? 'Anual' : 'Mensual'}</span></p>
              <p><span className="font-black text-slate-500">Monto:</span> <span className="text-slate-800 dark:text-slate-200">{formatCurrency(Number(selectedSub.amount || 0), selectedSub.currency || 'USD')}</span></p>
              <p><span className="font-black text-slate-500">Próxima renovación:</span> <span className="text-slate-800 dark:text-slate-200">{formatFriendlyDate(selectedSub.next_billing_date)}</span></p>
            </div>
            <div className="mt-5">
              <button
                onClick={handleOpenStripePortal}
                className="w-full rounded-xl bg-primary text-white font-black text-sm py-3 hover:opacity-90 transition"
              >
                Gestionar en Stripe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;

