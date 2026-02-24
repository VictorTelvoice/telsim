import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingDown,
  AlertTriangle,
  Lock,
  CreditCard,
  Sparkles,
  Crown,
  Zap,
  Leaf
} from 'lucide-react';

const UpgradeSummary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{status: string, brand: string, last4: string} | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);

  const upgradeData = location.state;

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/get-payment-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await response.json();
        if (data.status === 'success') setPaymentInfo(data);
      } catch (err) { console.error(err); } finally { setLoadingPayment(false); }
    };
    fetchPaymentInfo();
  }, [user]);

  const planHierarchy = ['STARTER', 'PRO', 'POWER'];

  const planConfig = useMemo(() => {
    if (!upgradeData) return null;
    const name = upgradeData.planName.toUpperCase();
    const currentName = (upgradeData.currentPlanName || 'STARTER').toUpperCase();
    
    const targetIdx = planHierarchy.indexOf(name);
    const currentIdx = planHierarchy.indexOf(currentName);
    const isDowngrade = targetIdx < currentIdx;
    
    // Configuración base (STARTER)
    const config: any = {
      isDowngrade,
      title: isDowngrade ? t('upgrade_summary.downgrade_title') : t('upgrade_summary.title'),
      ctaText: isDowngrade ? t('upgrade_summary.cta_downgrade') : t('upgrade_summary.cta_upgrade'),
      features: t('upgrade_summary.starter_features').split(', '),
      warningMsg: '',
      // Identidad cromática (Default Starter)
      accentColor: 'text-primary',
      barColor: 'bg-primary',
      buttonGradient: 'from-primary to-blue-700',
      borderColor: 'border-slate-100 dark:border-slate-800',
      icon: <Leaf className="size-4" />,
      checkColor: 'text-emerald-500'
    };

    if (name.includes('POWER')) {
      config.features = t('upgrade_summary.power_features').split(', ');
      config.accentColor = 'text-amber-600';
      config.barColor = 'bg-gradient-to-r from-amber-400 to-yellow-600';
      config.buttonGradient = 'from-[#B49248] via-[#D4AF37] to-[#8C6B1C]';
      config.borderColor = 'border-amber-200/50 dark:border-amber-900/30';
      config.icon = <Crown className="size-4" />;
      config.checkColor = 'text-amber-500';
    } else if (name.includes('PRO')) {
      config.features = t('upgrade_summary.pro_features').split(', ');
      config.accentColor = 'text-blue-600';
      config.barColor = 'bg-blue-600';
      config.buttonGradient = 'from-blue-600 to-indigo-800';
      config.borderColor = 'border-blue-100 dark:border-blue-900/30';
      config.icon = <Zap className="size-4" />;
      config.checkColor = 'text-blue-600';
    }

    if (isDowngrade) {
        if (currentName === 'POWER' && name === 'PRO') {
            config.warningMsg = t('upgrade_summary.power_to_pro_warning');
        } else if (name === 'STARTER') {
            config.warningMsg = t('upgrade_summary.to_starter_warning');
        }
    }
    
    return config;
  }, [upgradeData, t]);

  if (!user || !upgradeData || !planConfig) return <Navigate to="/dashboard/numbers" replace />;

  const { phoneNumber, planName, price, limit, stripePriceId, slot_id, currentLimit } = upgradeData;

  const handleConfirmUpgrade = async (forceManual: boolean = false) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: stripePriceId, userId: user.id, phoneNumber, planName, isUpgrade: true, slot_id, monthlyLimit: limit, forceManual
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.instant && data.subscriptionId) {
        navigate(`/onboarding/processing?id=${data.subscriptionId}&plan=${planName}&isUpgrade=true`);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (err: any) { alert(err.message || t('common.error')); setIsProcessing(false); }
  };

  const handleBack = () => {
    if (isProcessing) return;
    // Volvemos a MyNumbers pasando el estado para reabrir la vista de "Cambiar Plan"
    navigate('/dashboard/numbers', { 
      state: { 
        reopenUpgrade: true, 
        slotId: slot_id 
      } 
    });
  };

  const formatPhoneNumber = (num: string) => {
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    return num.startsWith('+') ? num : `+${num}`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            {/* Header - Flecha personalizada para volver a Cambiar Plan */}
            <div className="sticky top-0 z-20 flex items-center bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-sm">
                <div 
                    onClick={handleBack}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer ${isProcessing ? 'opacity-30' : ''}`}
                >
                    <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{fontSize: '24px'}}>arrow_back</span>
                </div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10">{planConfig.title}</h2>
            </div>
            
            <div className="flex flex-col gap-2 px-6 pt-2 pb-4">
                <div className="flex justify-between items-center">
                    <p className={`${planConfig.accentColor} text-sm font-bold leading-normal`}>{t('billing.plan_adjustment')}</p>
                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                       {planConfig.icon}
                       {planName}
                    </p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full ${planConfig.barColor} transition-all duration-700 ease-out`} style={{width: '100%'}}></div>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 pb-44 overflow-y-auto no-scrollbar">
                <div className="pb-6 pt-2">
                    <h1 className="text-[#111318] dark:text-white tracking-tight text-[28px] font-extrabold leading-tight text-left mb-2">{t('upgrade_summary.review_change')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed">{t('upgrade_summary.confirm_details')}</p>
                </div>

                {/* Tarjeta Principal */}
                <div className={`relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#1A2230] p-0 shadow-soft border-2 ${planConfig.borderColor} mb-6 transition-colors duration-500`}>
                    <div className="flex items-center gap-4 p-5 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="size-12 shrink-0 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center text-2xl">
                           🇨🇱
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#111318] dark:text-white text-[15px] font-bold leading-tight uppercase tracking-tight">{t('upgrade_summary.port')} {formatPhoneNumber(phoneNumber)}</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${planConfig.accentColor}`}>Infraestructura Real (+56)</p>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-5">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">{t('upgrade_summary.new_plan')}</span>
                                <span className={`font-black text-xl uppercase tracking-tight ${planConfig.accentColor}`}>{planName}</span>
                                <span className="text-[10px] font-bold text-slate-500 mt-1">{limit} {t('upgrade_summary.monthly_credits')}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[#111318] dark:text-white font-black text-2xl tracking-tighter">${Number(price).toFixed(2)}</span>
                                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest mt-0.5">{t('upgrade_summary.per_month')}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                           {planConfig.features.map((f: string, i: number) => (
                             <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <CheckCircle2 className={`size-4 shrink-0 ${planConfig.checkColor}`} />
                                {f}
                             </div>
                           ))}
                        </div>

                        {/* Bloque Informativo */}
                        {planConfig.isDowngrade ? (
                          <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 p-4 animate-in fade-in slide-in-from-top-1">
                              <div className="flex items-start gap-3 mb-3">
                                  <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
                                  <div className="flex flex-col">
                                      <p className="text-rose-800 dark:text-rose-300 text-sm font-black leading-tight uppercase tracking-tight">{t('upgrade_summary.benefit_reduction')}</p>
                                      <p className="text-rose-700 dark:text-rose-400/80 text-[11px] font-medium leading-relaxed mt-1 italic">
                                          "{planConfig.warningMsg}"
                                      </p>
                                  </div>
                              </div>
                              <div className="pt-3 border-t border-rose-500/10 flex justify-between items-center">
                                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{t('upgrade_summary.previous_capacity')}:</span>
                                  <span className="text-[11px] font-black text-rose-700 dark:text-rose-300 line-through opacity-50">{currentLimit} SMS</span>
                              </div>
                          </div>
                        ) : (
                          <div className={`rounded-2xl border p-4 ${planName.toUpperCase().includes('POWER') ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'}`}>
                              <div className="flex items-start gap-3 mb-3">
                                  {planName.toUpperCase().includes('POWER') ? (
                                    <Crown className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                                  ) : (
                                    <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                                  )}
                                  <div className="flex flex-col">
                                      <p className={`text-sm font-black leading-tight uppercase tracking-tight ${planName.toUpperCase().includes('POWER') ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>{t('upgrade_summary.power_upgrade')}</p>
                                      <p className={`text-[11px] font-medium leading-relaxed mt-1 ${planName.toUpperCase().includes('POWER') ? 'text-amber-700 dark:text-amber-400/80' : 'text-emerald-700 dark:text-emerald-400/80'}`}>{t('upgrade_summary.reconfigure_instantly').replace('{{plan}}', planName)}</p>
                                  </div>
                              </div>
                              <div className={`pt-3 border-t flex justify-between items-center ${planName.toUpperCase().includes('POWER') ? 'border-amber-500/10' : 'border-emerald-500/10'}`}>
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${planName.toUpperCase().includes('POWER') ? 'text-amber-600' : 'text-emerald-600'}`}>{t('upgrade_summary.sync')}:</span>
                                  <span className={`text-[11px] font-black ${planName.toUpperCase().includes('POWER') ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{t('upgrade_summary.immediate')}</span>
                              </div>
                          </div>
                        )}
                    </div>
                </div>

                {/* Sección de Pago */}
                {paymentInfo && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('upgrade_summary.payment_method')}</span>
                        <Lock className="size-3 text-slate-300" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="size-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                              <CreditCard className={`size-5 ${planConfig.accentColor}`} />
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{paymentInfo.brand} •• {paymentInfo.last4}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('upgrade_summary.processed_via')}</p>
                           </div>
                        </div>
                        <div className={`size-2 rounded-full animate-pulse ${planName.toUpperCase().includes('POWER') ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    </div>
                  </div>
                )}
            </div>

            {/* Footer de Acción - Limpio de textos adicionales */}
            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10 flex flex-col gap-4">
                <button 
                    onClick={() => handleConfirmUpgrade(false)}
                    disabled={isProcessing}
                    className={`group w-full bg-gradient-to-r ${planConfig.buttonGradient} hover:brightness-110 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70`}
                >
                    <div className="w-12 flex items-center justify-center">
                        {isProcessing ? <Loader2 className="size-5 animate-spin text-white/80" /> : <ArrowUpRight className="size-6 text-white/40" />}
                    </div>
                    <span className="text-[17px] tracking-wide uppercase font-black">
                        {isProcessing ? t('upgrade_summary.sincronizando') : planConfig.ctaText}
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Sparkles className="size-6 text-white" />
                    </div>
                </button>
                <button onClick={() => handleConfirmUpgrade(true)} disabled={isProcessing} className="w-full text-center text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] hover:text-primary transition-all disabled:opacity-50 py-1">{t('upgrade_summary.change_payment_method')}</button>
            </div>
        </div>
    </div>
  );
};

export default UpgradeSummary;