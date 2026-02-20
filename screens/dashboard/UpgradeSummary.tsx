import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  Sparkles,
  Crown,
  Leaf,
  AlertCircle,
  ArrowUpRight,
  TrendingDown,
  ChevronDown,
  Info
} from 'lucide-react';

const UpgradeSummary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
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
    
    const config: any = {
      isDowngrade,
      accent: 'text-emerald-500',
      bgAccent: 'bg-emerald-500/10',
      borderAccent: 'border-emerald-500/20',
      gradient: 'from-emerald-500 to-teal-600',
      icon: <Leaf className="size-5" />,
      title: 'MEJORA TU PLAN',
      ctaText: 'ACTUALIZAR AHORA',
      features: ['150 SMS Mensuales', 'Número SIM Real', 'Notificaciones Push'],
      warningMsg: '',
      lostFeatures: []
    };

    if (name.includes('POWER')) {
      config.accent = 'text-amber-500'; config.bgAccent = 'bg-amber-500/10'; config.borderAccent = 'border-amber-500/20';
      config.gradient = 'from-amber-500 to-orange-600'; config.icon = <Crown className="size-5" />;
      config.features = ['1,400 SMS Mensuales', 'Soporte Prioritario 24/7', 'Acceso API Full', 'Control Empresarial'];
    } else if (name.includes('PRO')) {
      config.accent = 'text-blue-600'; config.bgAccent = 'bg-blue-500/10'; config.borderAccent = 'border-blue-500/20';
      config.gradient = 'from-blue-600 to-indigo-700'; config.icon = <Zap className="size-5" />;
      config.features = ['400 SMS Mensuales', 'Automatización Webhook', 'Soporte vía Chat', 'Número SIM Real'];
    }

    if (isDowngrade) {
        config.title = 'REDUCIR PLAN';
        config.ctaText = 'CONFIRMAR CAMBIO DE PLAN';
        config.gradient = 'from-slate-700 to-slate-900';
        config.accent = 'text-slate-500';
        config.bgAccent = 'bg-slate-100 dark:bg-slate-800';
        
        if (currentName === 'POWER' && name === 'PRO') {
            config.warningMsg = 'Perderás el Soporte Prioritario 24/7 y las funciones de Seguridad y Control Empresarial.';
            config.lostFeatures = ['Soporte 24/7', 'Control Empresarial', 'Capacidad 1,400 SMS'];
        } else if (name === 'STARTER') {
            config.warningMsg = 'Perderás el acceso a API y Webhooks, el Chat en vivo y la automatización del 100% de tus SMS.';
            config.lostFeatures = ['API & Webhooks', 'Chat en vivo', 'Automatización 100%'];
        }
    }
    
    return config;
  }, [upgradeData]);

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
    } catch (err: any) { alert(err.message || "Error al procesar."); setIsProcessing(false); }
  };

  const formatPhoneNumber = (num: string) => {
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    return num.startsWith('+') ? num : `+${num}`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl pb-40">
            <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => !isProcessing && navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"><ArrowLeft className="size-5" /></button>
                <h2 className="text-[11px] font-black flex-1 text-center pr-10 uppercase tracking-[0.2em]">Configuración de Red</h2>
            </div>

            <div className="flex-1 flex flex-col px-5 pt-5 overflow-y-auto no-scrollbar">
                <div className="mb-8">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${planConfig.bgAccent} ${planConfig.accent} border ${planConfig.borderAccent} text-[9px] font-black uppercase tracking-widest mb-3`}>
                        {planConfig.isDowngrade ? <TrendingDown className="size-3" /> : planConfig.icon} 
                        <span>Plan {planName}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">
                        {planConfig.title}
                    </h1>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">${Number(price).toFixed(2)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">USD / Mes</span>
                    </div>
                </div>

                {planConfig.isDowngrade && (
                    <div className="mb-6 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/30 rounded-[2rem] p-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <AlertCircle className="size-6" />
                            </div>
                            <h3 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Impacto en el servicio</h3>
                        </div>
                        <p className="text-[11px] font-bold text-rose-800/80 dark:text-rose-400/80 leading-relaxed italic mb-4">
                            "{planConfig.warningMsg}"
                        </p>
                        <div className="space-y-2 pt-4 border-t border-rose-200/50 dark:border-rose-800/50">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Tu capacidad de créditos bajará:</p>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-rose-700 line-through opacity-50">{currentLimit} SMS</span>
                                <ChevronDown className="size-3 text-rose-400" />
                                <span className="text-sm font-black text-rose-700">{limit} SMS mensuales</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-[#1A2230] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-7 shadow-soft mb-6 relative overflow-hidden">
                    <div className="flex flex-col gap-0.5 mb-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Hardware Destino</span>
                        <span className="text-2xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">{formatPhoneNumber(phoneNumber)}</span>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                             <Info className="size-3.5 text-primary" />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especificaciones del Plan</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {planConfig.features.map((feat: string, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                    <CheckCircle2 className={`size-4 shrink-0 ${planConfig.accent}`} />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {paymentInfo && !isProcessing && (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-between animate-in fade-in duration-700">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-emerald-500 shrink-0"><Zap className="size-5" /></div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-none">Tarjeta vinculada</p>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{paymentInfo.brand} •• {paymentInfo.last4}</p>
                        </div>
                    </div>
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>
                )}
            </div>

            <div className="fixed bottom-0 z-[60] w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10 flex flex-col gap-3">
                <button onClick={() => handleConfirmUpgrade(false)} disabled={isProcessing} className={`group w-full bg-gradient-to-r ${planConfig.gradient} hover:brightness-110 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-xl flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70`}>
                    <div className="w-12 flex items-center justify-center">{isProcessing ? <Loader2 className="size-5 animate-spin text-white/80" /> : <ArrowUpRight className="size-6 text-white/40" />}</div>
                    <span className="text-sm tracking-widest uppercase font-black flex-1 text-center">{isProcessing ? 'Sincronizando...' : planConfig.ctaText}</span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors"><Sparkles className="size-6 text-white" /></div>
                </button>
                <button onClick={() => handleConfirmUpgrade(true)} disabled={isProcessing} className="w-full text-center text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] hover:text-primary transition-all disabled:opacity-50 py-2">Cambiar método de pago</button>
                <div className="flex items-center justify-center gap-2 opacity-20 mt-1"><ShieldCheck className="size-3.5" /><p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">TELSIM CORE SECURE-LEDGER v4.0</p></div>
            </div>
        </div>
    </div>
  );
};

export default UpgradeSummary;