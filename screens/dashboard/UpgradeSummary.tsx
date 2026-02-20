import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingDown,
  ChevronDown,
  AlertTriangle,
  Lock,
  Smartphone,
  CreditCard,
  Sparkles
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
      title: 'Resumen de Cambio de Plan',
      ctaText: 'Actualizar Ahora',
      features: ['Número SIM Real', 'Notificaciones tiempo real', 'Soporte vía Ticket'],
      warningMsg: '',
      lostFeatures: []
    };

    if (name.includes('POWER')) {
      config.features = ['1,400 SMS Mensuales', 'Soporte Prioritario 24/7', 'Acceso API Full', 'Control Empresarial'];
    } else if (name.includes('PRO')) {
      config.features = ['400 SMS Mensuales', 'Automatización Webhook', 'Soporte vía Chat', 'Número SIM Real'];
    }

    if (isDowngrade) {
        config.title = 'Reducir Plan';
        config.ctaText = 'Confirmar Cambio de Plan';
        
        if (currentName === 'POWER' && name === 'PRO') {
            config.warningMsg = 'Perderás el Soporte Prioritario 24/7 y las funciones de Seguridad y Control Empresarial.';
        } else if (name === 'STARTER') {
            config.warningMsg = 'Perderás el acceso a API y Webhooks, el Chat en vivo y la automatización del 100% de tus SMS.';
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
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            {/* Header - Clon Onboarding */}
            <div className="sticky top-0 z-20 flex items-center bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-sm">
                <div 
                    onClick={() => !isProcessing && navigate(-1)}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer ${isProcessing ? 'opacity-30' : ''}`}
                >
                    <span className="material-symbols-outlined text-[#111318] dark:text-white" style={{fontSize: '24px'}}>arrow_back</span>
                </div>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10">{planConfig.title}</h2>
            </div>
            
            <div className="flex flex-col gap-2 px-6 pt-2 pb-4">
                <div className="flex justify-between items-center">
                    <p className="text-primary dark:text-blue-400 text-sm font-bold leading-normal">Ajuste de Potencia</p>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">{planName}</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#dbdfe6] dark:bg-gray-700 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500 ease-out" style={{width: '100%'}}></div>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 pb-44 overflow-y-auto no-scrollbar">
                <div className="pb-6 pt-2">
                    <h1 className="text-[#111318] dark:text-white tracking-tight text-[28px] font-extrabold leading-tight text-left mb-2">Revisa el cambio</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-relaxed">Confirma los detalles de la nueva configuración de red.</p>
                </div>

                {/* Tarjeta Principal - Clon Onboarding */}
                <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#1A2230] p-0 shadow-soft border border-slate-100 dark:border-slate-800 mb-6">
                    <div className="flex items-center gap-4 p-5 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="size-12 shrink-0 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center text-2xl">
                           🇨🇱
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#111318] dark:text-white text-[15px] font-bold leading-tight uppercase tracking-tight">Puerto {formatPhoneNumber(phoneNumber)}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5 text-primary">Infraestructura Real (+56)</p>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-5">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-1">Nuevo Plan</span>
                                <span className="text-[#111318] dark:text-white font-black text-xl uppercase tracking-tight">{planName}</span>
                                <span className="text-[10px] font-bold text-slate-500 mt-1">{limit} Créditos Mensuales</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[#111318] dark:text-white font-black text-xl">${Number(price).toFixed(2)}</span>
                                <span className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">/ Mes</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                           {planConfig.features.map((f: string, i: number) => (
                             <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <CheckCircle2 className="size-4 text-emerald-500" />
                                {f}
                             </div>
                           ))}
                        </div>

                        {/* Bloque Informativo - Clon Onboarding (Aviso de Downgrade o Tarjeta) */}
                        {planConfig.isDowngrade ? (
                          <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 p-4 animate-in fade-in slide-in-from-top-1">
                              <div className="flex items-start gap-3 mb-3">
                                  <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
                                  <div className="flex flex-col">
                                      <p className="text-rose-800 dark:text-rose-300 text-sm font-black leading-tight uppercase tracking-tight">Reducción de Beneficios</p>
                                      <p className="text-rose-700 dark:text-rose-400/80 text-[11px] font-medium leading-relaxed mt-1">
                                          {planConfig.warningMsg}
                                      </p>
                                  </div>
                              </div>
                              <div className="pt-3 border-t border-rose-500/10 flex justify-between items-center">
                                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Capacidad anterior:</span>
                                  <span className="text-[11px] font-black text-rose-700 dark:text-rose-300 line-through opacity-50">{currentLimit} SMS</span>
                              </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4">
                              <div className="flex items-start gap-3 mb-3">
                                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                                  <div className="flex flex-col">
                                      <p className="text-emerald-800 dark:text-emerald-300 text-sm font-black leading-tight uppercase tracking-tight">Mejora de Potencia</p>
                                      <p className="text-emerald-700 dark:text-emerald-400/80 text-[11px] font-medium leading-relaxed mt-1">Tu línea se reconfigurará instantáneamente con las nuevas capacidades.</p>
                                  </div>
                              </div>
                              <div className="pt-3 border-t border-emerald-500/10 flex justify-between items-center">
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sincronización:</span>
                                  <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">Inmediata</span>
                              </div>
                          </div>
                        )}
                    </div>
                </div>

                {/* Sección de Pago - Estilo Onboarding */}
                {paymentInfo && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Cobro</span>
                        <Lock className="size-3 text-slate-300" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="size-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                              <CreditCard className="size-5 text-primary" />
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{paymentInfo.brand} •• {paymentInfo.last4}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cargos procesados vía Stripe</p>
                           </div>
                        </div>
                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                  </div>
                )}
            </div>

            {/* Footer de Acción - Clon Onboarding */}
            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10 flex flex-col gap-4">
                <button 
                    onClick={() => handleConfirmUpgrade(false)}
                    disabled={isProcessing}
                    className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70"
                >
                    <div className="w-12 flex items-center justify-center">
                        {isProcessing ? <Loader2 className="size-5 animate-spin text-white/80" /> : <ArrowUpRight className="size-6 text-white/40" />}
                    </div>
                    <span className="text-[17px] tracking-wide uppercase font-black">
                        {isProcessing ? 'Sincronizando...' : planConfig.ctaText}
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Sparkles className="size-6 text-white" />
                    </div>
                </button>
                <button onClick={() => handleConfirmUpgrade(true)} disabled={isProcessing} className="w-full text-center text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] hover:text-primary transition-all disabled:opacity-50 py-1">Cambiar método de pago</button>
                <div className="flex items-center justify-center gap-1.5 opacity-40">
                    <Lock className="size-3" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">TELSIM SECURE CHECKOUT v4.0</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default UpgradeSummary;