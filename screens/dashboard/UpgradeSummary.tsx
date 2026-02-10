
import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Smartphone,
  Zap,
  AlertCircle
} from 'lucide-react';

const UpgradeSummary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const upgradeData = location.state;

  if (!user || !upgradeData) return <Navigate to="/dashboard/numbers" replace />;

  const { phoneNumber, planName, price, limit, stripePriceId } = upgradeData;

  const handleConfirmUpgrade = async () => {
    setIsProcessing(true);

    try {
      // Uso correcto para Vite
      // Fix: Accessing environment variables using (import.meta as any).env to resolve TS error "Property 'env' does not exist on type 'ImportMeta'"
      const publishableKey = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
      
      if (!publishableKey) {
        console.error("[TELSIM ERROR] Variable VITE_STRIPE_PUBLISHABLE_KEY no encontrada en el entorno.");
        throw new Error("Stripe Key no configurada.");
      }

      const stripe = (window as any).Stripe(publishableKey);
      
      if (!stripe) {
        throw new Error("Librería StripeJS no cargada.");
      }

      console.log(`[UPGRADE DEBUG] Iniciando nodo con clave: ${publishableKey.substring(0, 8)}...`);
      
      // Simulación de interacción con el nodo de pago
      await new Promise(resolve => setTimeout(resolve, 1800));

      // Navegamos al éxito simulado para el usuario final mientras el webhook se procesa asíncronamente
      navigate('/dashboard/upgrade-success', { 
        state: { 
          phoneNumber, 
          planName, 
          price, 
          limit,
          userId: user.id
        },
        replace: true 
      });

    } catch (err: any) {
      console.error("Critical upgrade error:", err);
      alert(err.message || "Error de configuración de pasarela.");
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
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <button 
                    onClick={() => !isProcessing && navigate(-1)}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${isProcessing ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                    <ArrowLeft className="size-5" />
                </button>
                <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight flex-1 text-center pr-10 uppercase tracking-tighter">Paso 3: Confirmación</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-8 pb-40 overflow-y-auto no-scrollbar">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Resumen de Mejora</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">Protección de claves activa. Redirigiendo a nodo seguro.</p>
                </div>

                <div className="bg-white dark:bg-[#1A2230] rounded-[2rem] border border-gray-100 dark:border-gray-700/50 p-6 shadow-soft mb-6 relative overflow-hidden group">
                    <div className="flex flex-col gap-1 mb-4">
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Línea a Actualizar</span>
                        <span className="text-2xl font-mono font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                            {formatPhoneNumber(phoneNumber)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Zap className="size-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nueva Configuración</span>
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase">Plan {planName} • {limit} SMS</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 space-y-4 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex justify-between items-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Servicio Mensual ({planName})</span>
                        <span className="text-slate-900 dark:text-white font-mono text-sm">${Number(price).toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Cobro hoy</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">${Number(price).toFixed(2)}</span>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4">
                    <AlertCircle className="size-5 text-primary shrink-0" />
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        Cobro proporcional inmediato. Los beneficios se aplicarán al puerto GSM tras la validación de integridad del webhook.
                    </p>
                </div>
            </div>

            <div className="fixed bottom-0 z-30 w-full max-w-md bg-white/95 dark:bg-[#101622]/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-6 pb-10">
                <button 
                    onClick={handleConfirmUpgrade}
                    disabled={isProcessing}
                    className="group w-full bg-[#635BFF] hover:bg-[#5851e0] active:scale-[0.98] transition-all text-white font-bold h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70"
                >
                    <div className="w-12 flex items-center justify-center">
                        {isProcessing && <Loader2 className="size-5 animate-spin text-white/80" />}
                    </div>
                    <span className="text-[17px] tracking-wide uppercase">
                        {isProcessing ? 'Procesando...' : 'Pagar con Stripe'}
                    </span>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <ShieldCheck className="size-6 text-white" />
                    </div>
                </button>
                <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40">
                    <span className="material-symbols-outlined text-gray-500" style={{fontSize: '14px'}}>lock</span>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Configuración Segura de Claves • TELSIM v2.9</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default UpgradeSummary;
