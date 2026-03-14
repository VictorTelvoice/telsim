import React, { useEffect, useState } from 'react';
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
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  next_billing_date: string;
  created_at: string;
  currency: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPM, setLoadingPM] = useState(true);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch Subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

    } catch (err: any) {
      console.error("Error fetching billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethod = async () => {
    if (!user) return;
    setLoadingPM(true);
    try {
      const response = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'payment-method', userId: user.id }),
      });
      const data = await response.json();
      if (data.paymentMethod) {
        setPaymentMethod(data.paymentMethod);
      }
    } catch (err) {
      console.error("Error al obtener método de pago de Stripe:", err);
    } finally {
      setLoadingPM(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPaymentMethod();
  }, [user]);

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

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
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
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('billing.total_monthly')}</p>
          <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(totalMonthlySpend)}</p>
        </div>
      </header>

      <main className="px-6 max-w-lg mx-auto lg:max-w-5xl lg:px-12">
        <div className="space-y-10">

          {/* TÍTULO PRINCIPAL */}
          <div className="pt-2">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t('billing.title')}</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('billing.subtitle')}</p>
          </div>

          {/* SECCIÓN A: MÉTODO DE PAGO */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">{t('billing.default_payment')}</h3>

            {loadingPM ? (
              <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                <Loader2 className="size-5 text-primary animate-spin" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('billing.consulting_stripe')}</span>
              </div>
            ) : paymentMethod ? (
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm overflow-hidden p-2">
                    {getBrandLogo(paymentMethod.brand) ? (
                      <div className="w-full h-full flex items-center justify-center">
                        {getBrandLogo(paymentMethod.brand)}
                      </div>
                    ) : (
                      <CreditCard className="size-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {paymentMethod.brand} •••• {paymentMethod.last4}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">EXPIRES: {paymentMethod.exp_month}/{paymentMethod.exp_year}</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenStripePortal}
                  disabled={isCreatingPortal}
                  className="text-[11px] font-black text-primary uppercase tracking-widest px-4 py-2 hover:bg-primary/10 rounded-xl transition-all flex items-center gap-2"
                >
                  {isCreatingPortal ? <Loader2 className="size-3 animate-spin" /> : t('billing.manage')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/onboarding/region')}
                className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-primary/40 transition-all group"
              >
                <div className="size-10 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                  <Plus className="size-5" />
                </div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-slate-300">{t('billing.link_card_stripe')}</span>
              </button>
            )}
          </section>

          {/* DESKTOP: B + C LADO A LADO / MOBILE: APILADOS */}
          <div className="space-y-10 lg:grid lg:grid-cols-2 lg:gap-10 lg:space-y-0 lg:items-start">

            {/* SECCIÓN B: PLANES ACTIVOS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('billing.active_services')}</h3>
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">{activeServices.length} {t('billing.plans')}</span>
              </div>

              {activeServices.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 italic">{t('billing.no_services')}</p>
                </div>
              ) : (
                <div className={`grid gap-3 ${activeServices.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {activeServices.map((sub) => {
                    const visual = getPlanVisual(sub.plan_name);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSub(sub)}
                        className={`${visual.gradient} border ${visual.border} rounded-[1.75rem] p-5 shadow-lg ${visual.shadow} cursor-pointer active:scale-[0.96] transition-all duration-200 flex flex-col justify-between min-h-[180px] lg:min-h-[220px]`}
                      >
                        {/* Top: icon + status */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl lg:text-3xl leading-none">{visual.icon}</span>
                          <div className="flex items-center gap-1">
                            <div className="size-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${visual.subText}`}>{t('billing.active')}</span>
                          </div>
                        </div>

                        {/* Middle: plan name + phone */}
                        <div className="flex-1">
                          <h4 className={`text-[13px] lg:text-[15px] font-black uppercase tracking-tight leading-tight mb-1 ${visual.text}`}>{sub.plan_name}</h4>
                          <p className={`text-[10px] font-bold font-mono truncate ${visual.subText}`}>{sub.phone_number}</p>
                        </div>

                        {/* Bottom: price */}
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <p className={`text-xl lg:text-2xl font-black tabular-nums leading-none ${visual.priceText}`}>{formatCurrency(sub.amount)}</p>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${visual.subText}`}>/mes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECCIÓN C: HISTORIAL */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <History className="size-4" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em]">{t('billing.view_canceled')}</h3>
                </div>
                {previousServices.length > 0 && (
                  <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase">{previousServices.length}</span>
                )}
              </div>

              {previousServices.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 italic">Sin historial de cancelaciones</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {previousServices.map((sub) => (
                    <div key={sub.id} className="px-5 py-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="size-9 bg-slate-200/60 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                          <Smartphone className="size-4 text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">{sub.plan_name}</span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{sub.phone_number}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-slate-400 line-through">{formatCurrency(sub.amount)}</p>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{t('billing.canceled')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>{/* end desktop grid */}

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