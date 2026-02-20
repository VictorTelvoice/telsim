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
  XCircle,
  ArrowUpRight
} from 'lucide-react';

const UpgradeSummary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInstantSuccess, setIsInstantSuccess] = useState(false);
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
    const currentName = (upgradeData.currentPlanName || '').toUpperCase();
    const isDowngrade = planHierarchy.indexOf(name) < planHierarchy.indexOf(currentName);
    
    const config: any = {
      isDowngrade,
      accent: 'text-emerald-500',
      bgAccent: 'bg-emerald-500/10',
      borderAccent: 'border-emerald-500/20',
      gradient: 'from-emerald-500 to-teal-600',
      icon: <Leaf className="size-5" />,
      features: ['150 SMS Mensuales', 'Número SIM Real', 'Notificaciones Push'],
      lostFeatures: []
    };

    if (name.includes('POWER')) {
      config.accent = 'text-amber-500'; config.bgAccent = 'bg-amber-500/10'; config.borderAccent = 'border-amber-500/20';
      config.gradient = 'from-amber-500 to-orange-600'; config.icon = <Crown className="size-5" />;
      config.features = ['1,400 SMS Mensuales', 'Soporte Prioritario 24/7', 'Acceso API Full'];
    } else if (name.includes('PRO')) {
      config.accent = 'text-blue-600'; config.bgAccent = 'bg-blue-500/10'; config.borderAccent = 'border-blue-500/20';
      config.gradient = 'from-blue-600 to-indigo-700'; config.icon = <Zap className="size-5" />;
      config.features = ['400 SMS Mensuales', 'Automatización Webhook', 'Soporte vía Chat'];
    }

    if (isDowngrade) {
        if (currentName === 'POWER') config.lostFeatures = ['API Full Access', 'Soporte 24/7', 'Capacidad 1,400 SMS'];
        else if (currentName === 'PRO') config.lostFeatures = ['Webhooks & API', 'Automatización Full'];
        config.gradient = 'from-slate-700 to-slate-900'; config.accent = 'text-slate-500'; config.bgAccent = 'bg-slate-100';
    }
    return config;
  }, [upgradeData]);

  if (!user || !upgradeData || !planConfig) return <Navigate to="/dashboard/numbers" replace />;

  const { phoneNumber, planName, price, limit, stripePriceId, slot_id } = upgradeData;

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
      if (data.instant) { setIsInstantSuccess(true); setIsProcessing(false); return; }
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
                <h2 className="text-[11px] font-black flex-1 text-center pr-10 uppercase tracking-[0.2em]">Resumen de Transacción</h2>
            </div>

            <div className="flex-1 flex flex-col px-5 pt-5 overflow-y-auto no-scrollbar">
                <div className="mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${planConfig.bgAccent} ${planConfig.accent} border ${planConfig.borderAccent} text-[9px] font-black uppercase tracking-widest mb-2`}>
                        {planConfig.icon} <span>Plan {planName}</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Mejora tu Plan</h1>
                </div>

                <div className="bg-white dark:bg-[#1A2230] rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-soft mb-4 relative overflow-hidden">
                    <div className="flex flex-col gap-0.5 mb-4">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Puerto a Reconfigurar</span>
                        <span className="text-xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">{formatPhoneNumber(phoneNumber)}</span>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-1.5">Especificaciones</p>
                        <div className="grid grid-cols-2 gap-2">
                            {planConfig.features.map((feat: string, i: number) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <CheckCircle2 className={`size-3 shrink-0 ${planConfig.accent}`} />
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-none">{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {planConfig.isDowngrade && (
                        <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-800/20">
                            <div className="flex items-center gap-1.5 mb-1.5"><AlertCircle className="size-3 text-rose-500" /><span className="text-[9px] font-black text-rose-600 uppercase">Capacidad que se perderá:</span></div>
                            <div className="space-y-1">
                                {planConfig.lostFeatures.map((lost: string, i: number) => (
                                    <div key={i} className="flex items-center gap-1.5 opacity-60"><XCircle className="size-2.5 text-rose-400" /><span className="text-[9px] font-bold text-rose-800 dark:text-rose-400 line-through">{lost}</span></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/50 mb-4">
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3"><span>Prorrateo de Red</span><span className="text-slate-900 dark:text-white font-mono">${Number(price).toFixed(2)}</span></div>
                    <div className="flex justify-between items-end pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col"><span className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Total hoy</span><span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">${Number(price).toFixed(2)}</span></div>
                        <span className="text-[9px] font-black text-slate-400 mb-1.5">USD</span>
                    </div>
                </div>

                {paymentInfo && !isProcessing && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-3 animate-in fade-in duration-700">
                    <div className="size-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-emerald-500 shrink-0"><Zap className="size-4" /></div>
                    <div><p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-none">Pago Instantáneo Activo</p><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{paymentInfo.brand} •• {paymentInfo.last4}</p></div>
                  </div>
                )}
            </div>

            <div className="fixed bottom-0 z-[60] w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-5 pb-8 flex flex-col gap-3">
                <button onClick={() => handleConfirmUpgrade(false)} disabled={isProcessing} className={`group w-full bg-gradient-to-r ${planConfig.gradient} hover:brightness-110 active:scale-[0.98] transition-all text-white font-bold h-14 rounded-2xl shadow-xl flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70`}>
                    <div className="w-10 flex items-center justify-center">{isProcessing ? <Loader2 className="size-4 animate-spin text-white/80" /> : <ArrowUpRight className="size-5 text-white/40" />}</div>
                    <span className="text-[13px] tracking-wide uppercase font-black flex-1 text-center">{isProcessing ? 'Sincronizando...' : (planConfig.isDowngrade ? 'Confirmar Cambio' : 'Actualizar ahora')}</span>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors"><Sparkles className="size-4 text-white" /></div>
                </button>
                <button onClick={() => handleConfirmUpgrade(true)} disabled={isProcessing} className="w-full text-center text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.15em] hover:text-primary transition-all disabled:opacity-50">Pagar con otra tarjeta (Manual)</button>
                <div className="flex items-center justify-center gap-1.5 opacity-20 mt-1"><ShieldCheck className="size-3" /><p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">Protocolo Secure-Ledger v4</p></div>
            </div>
        </div>
        {isInstantSuccess && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500">
                <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center">
                    <div className={`size-16 rounded-2xl bg-gradient-to-br ${planConfig.gradient} flex items-center justify-center text-white mb-6`}><CheckCircle2 className="size-8" /></div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">¡Plan Actualizado!</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6 italic">Tu línea ya cuenta con la nueva potencia asignada.</p>
                    <button onClick={() => navigate('/dashboard/numbers')} className={`w-full h-12 bg-gradient-to-r ${planConfig.gradient} text-white font-black rounded-xl text-[10px] uppercase tracking-widest`}>Volver al Panel</button>
                </div>
            </div>
        )}
    </div>
  );
};

export default UpgradeSummary;