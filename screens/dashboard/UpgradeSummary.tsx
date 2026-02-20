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
  CreditCard,
  ChevronRight,
  Crown,
  Leaf,
  Info,
  ShieldAlert,
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
        if (data.status === 'success') {
          setPaymentInfo(data);
        }
      } catch (err) {
        console.error("Error al obtener info de pago:", err);
      } finally {
        setLoadingPayment(false);
      }
    };

    fetchPaymentInfo();
  }, [user]);

  const planConfig = useMemo(() => {
    if (!upgradeData) return null;
    const name = upgradeData.planName.toUpperCase();
    
    if (name.includes('POWER')) {
      return {
        color: 'amber',
        accent: 'text-amber-500',
        bgAccent: 'bg-amber-500/10',
        borderAccent: 'border-amber-500/20',
        gradient: 'from-amber-500 to-orange-600',
        icon: <Crown className="size-6" />,
        features: ['1,400 SMS Mensuales', 'Soporte Prioritario 24/7', 'Escalabilidad Corporativa', 'Acceso API Full']
      };
    }
    if (name.includes('PRO')) {
      return {
        color: 'blue',
        accent: 'text-blue-600',
        bgAccent: 'bg-blue-500/10',
        borderAccent: 'border-blue-500/20',
        gradient: 'from-blue-600 to-indigo-700',
        icon: <Zap className="size-6" />,
        features: ['400 SMS Mensuales', 'Automatización Webhook', 'Soporte vía Chat Vivo', 'Reportes Avanzados']
      };
    }
    return {
      color: 'emerald',
      accent: 'text-emerald-500',
      bgAccent: 'bg-emerald-500/10',
      borderAccent: 'border-emerald-500/20',
      gradient: 'from-emerald-500 to-teal-600',
      icon: <Leaf className="size-6" />,
      features: ['150 SMS Mensuales', 'Número SIM Real', 'Notificaciones Push', 'Soporte vía Ticket']
    };
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
          priceId: stripePriceId,
          userId: user.id,
          phoneNumber: phoneNumber,
          planName: planName,
          isUpgrade: true,
          slot_id: slot_id,
          monthlyLimit: limit,
          forceManual: forceManual
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Fallo en la comunicación con Stripe.");

      if (data.instant) {
        setIsInstantSuccess(true);
        setIsProcessing(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }

    } catch (err: any) {
      console.error("Upgrade error:", err);
      alert(err.message || "Error al procesar la mejora del plan.");
      setIsProcessing(false);
    }
  };

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl pb-48">
            
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <button 
                    onClick={() => !isProcessing && navigate(-1)}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${isProcessing ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    <ArrowLeft className="size-5" />
                </button>
                <h2 className="text-[#111318] dark:text-white text-[11px] font-black leading-tight flex-1 text-center pr-10 uppercase tracking-[0.2em]">Confirmar Transacción</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-8 overflow-y-auto no-scrollbar">
                
                {/* PLAN IDENTITY BANNER */}
                <div className="mb-8">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${planConfig.bgAccent} ${planConfig.accent} border ${planConfig.borderAccent} text-[10px] font-black uppercase tracking-widest mb-3`}>
                        {planConfig.icon}
                        <span>Upgrade a Plan {planName}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">Mejora tu <br/>Infraestructura</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Sincronizando puerto físico en tiempo real.</p>
                </div>

                {/* HARDWARE STATUS CARD */}
                <div className="bg-white dark:bg-[#1A2230] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-soft mb-6 relative overflow-hidden group transition-all hover:border-primary/20">
                    <div className={`absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.07] ${planConfig.accent} pointer-events-none`}>
                         {/* Fix: Explicitly cast to React.ReactElement<any> to resolve className prop typing mismatch in cloneElement */}
                         {React.cloneElement(planConfig.icon as React.ReactElement<any>, { className: 'size-32' })}
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex flex-col gap-1 mb-6">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Nodo a Potenciar</span>
                            <span className="text-2xl font-mono font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                {formatPhoneNumber(phoneNumber)}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Capacidad del Nuevo Plan</p>
                            <div className="grid grid-cols-2 gap-4">
                                {planConfig.features.map((feat, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <CheckCircle2 className={`size-3.5 shrink-0 mt-0.5 ${planConfig.accent}`} />
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-tight">{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PRICING TABLE */}
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] p-8 space-y-5 border border-slate-100 dark:border-slate-800/50 mb-8">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Prorrateo Mensual</span>
                        <span className="text-slate-900 dark:text-white font-mono text-sm">${Number(price).toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a pagar hoy</span>
                            <div className="flex items-center gap-2">
                                <div className={`size-2 rounded-full ${planConfig.accent.replace('text-', 'bg-')} animate-pulse`}></div>
                                <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">${Number(price).toFixed(2)}</span>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 mb-2">USD</span>
                    </div>
                </div>

                {/* ONE-CLICK ALERT (IF AVAILABLE) */}
                {paymentInfo && !isProcessing && (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="size-11 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-emerald-500 shrink-0">
                       <CreditCard className="size-5" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-0.5">One-Click Checkout Activo</p>
                       <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Usaremos tu {paymentInfo.brand} terminada en {paymentInfo.last4}</p>
                    </div>
                  </div>
                )}
            </div>

            {/* ACTION FOOTER */}
            <div className="fixed bottom-0 z-[60] w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10 flex flex-col gap-4">
                
                {paymentInfo ? (
                  <>
                    <button 
                        onClick={() => handleConfirmUpgrade(false)}
                        disabled={isProcessing}
                        className={`group w-full bg-gradient-to-r ${planConfig.gradient} hover:brightness-110 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-[1.25rem] shadow-xl flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70`}
                    >
                        <div className="w-12 flex items-center justify-center">
                            {isProcessing ? <Loader2 className="size-5 animate-spin text-white/80" /> : <ArrowUpRight className="size-6 text-white/40" />}
                        </div>
                        <span className="text-[14px] tracking-wide uppercase font-black flex-1 text-center leading-tight">
                            {isProcessing ? 'Sincronizando...' : `Actualizar ahora (•${paymentInfo.last4})`}
                        </span>
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Sparkles className="size-5 text-white" />
                        </div>
                    </button>

                    <button 
                        onClick={() => handleConfirmUpgrade(true)}
                        disabled={isProcessing}
                        className="w-full h-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:text-primary transition-all disabled:opacity-50"
                    >
                        Pagar con otra tarjeta (Manual)
                    </button>
                  </>
                ) : (
                  <button 
                      onClick={() => handleConfirmUpgrade(true)}
                      disabled={isProcessing}
                      className={`group w-full bg-gradient-to-r ${planConfig.gradient} hover:brightness-110 active:scale-[0.98] transition-all text-white font-bold h-16 rounded-[1.25rem] shadow-xl flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70`}
                  >
                      <div className="w-12 flex items-center justify-center">
                          {isProcessing ? <Loader2 className="size-5 animate-spin text-white/80" /> : <ChevronRight className="size-6 text-white/40" />}
                      </div>
                      <span className="text-[16px] tracking-wide uppercase font-black flex-1 text-center">
                          {isProcessing ? 'Sincronizando...' : 'Confirmar Upgrade'}
                      </span>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <Sparkles className="size-5 text-white" />
                      </div>
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 opacity-30 mt-1">
                    <ShieldCheck className="size-3" />
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 text-center">Infraestructura Segura Ledger-v4</p>
                </div>
            </div>
        </div>

        {/* MODAL DE ÉXITO INSTANTÁNEO */}
        {isInstantSuccess && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500">
                <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 p-10 flex flex-col items-center text-center">
                    <div className="relative mb-8">
                        <div className={`absolute inset-0 ${planConfig.bgAccent} blur-2xl rounded-full scale-150 animate-pulse`}></div>
                        <div className={`size-20 rounded-3xl bg-gradient-to-br ${planConfig.gradient} flex items-center justify-center text-white relative z-10 shadow-lg shadow-black/20`}>
                            <CheckCircle2 className="size-10" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">¡Puerto Actualizado!</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed italic">Tu línea ya cuenta con la nueva potencia asignada en el Ledger de red.</p>
                    
                    <button 
                        onClick={() => navigate('/dashboard/numbers')}
                        className={`w-full h-14 bg-gradient-to-r ${planConfig.gradient} text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all`}
                    >
                        Entrar al Panel
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default UpgradeSummary;