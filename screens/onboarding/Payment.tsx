import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Loader2, 
  ShieldCheck, 
  Lock, 
  Zap, 
  CreditCard, 
  ChevronRight, 
  ArrowLeft,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInstantSuccess, setIsInstantSuccess] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{status: string, brand: string, last4: string} | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [assignedNum, setAssignedNum] = useState('');
  
  const planData = location.state || {};
  const planName = planData.planName || 'Pro';
  const price = planData.price || 39.90;
  const monthlyLimit = planData.monthlyLimit || 400;
  const stripePriceId = planData.stripePriceId || 'price_1SzJS9EADSrtMyiagxHUI2qM';

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
        console.error("Error fetching payment info:", err);
      } finally {
        setLoadingPayment(false);
      }
    };
    fetchPaymentInfo();
  }, [user]);

  const handleCheckout = async (forceManual: boolean = false) => {
    if (!user) return;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: stripePriceId,
          userId: user.id,
          planName: planName,
          monthlyLimit: monthlyLimit,
          isUpgrade: false,
          forceManual: forceManual
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Fallo en la conexión segura.");

      // Si el servidor detectó que puede hacer el pago instantáneo
      if (data.instant) {
        setAssignedNum(data.phoneNumber);
        setIsInstantSuccess(true);
        setIsProcessing(false);
        return;
      }

      // Si no, redirigimos a Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }

    } catch (err: any) {
      console.error("Payment Error:", err);
      alert(err.message || "Error al conectar con el servidor de pagos.");
      setIsProcessing(false);
    }
  };

  const formatPhoneNumber = (num: string) => {
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    return num.startsWith('+') ? num : `+${num}`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111318] dark:text-white antialiased min-h-screen flex flex-col items-center">
        <div className="relative flex h-full min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl pb-40">
            
            {/* HEADER COMPACTO */}
            <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                <button 
                    onClick={() => !isProcessing && navigate(-1)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <h2 className="text-[11px] font-black leading-tight flex-1 text-center pr-10 uppercase tracking-[0.2em]">Caja de Seguridad</h2>
            </div>

            <div className="flex-1 flex flex-col px-6 pt-6 overflow-y-auto no-scrollbar">
                
                {/* TÍTULO */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">Finalizar <br/>Suscripción</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">Nueva infraestructura lista para despliegue.</p>
                </div>

                {/* PLAN CARD */}
                <div className="bg-white dark:bg-[#1A2230] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-soft mb-8 flex justify-between items-center group transition-all hover:border-primary/20">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-widest font-black text-primary">Nodo {planName}</span>
                        <span className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter uppercase">{planName}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter tabular-nums">${Number(price).toFixed(2)}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">USD / Mes</span>
                    </div>
                </div>

                {/* SECCIÓN MEDIO DE PAGO */}
                <div className="space-y-4">
                  <h3 className="text-[#111318] dark:text-white font-black text-[11px] uppercase tracking-[0.2em] ml-1">Medio de pago</h3>
                  
                  {/* PAGO RÁPIDO (SI EXISTE TARJETA) */}
                  {paymentInfo && !isProcessing && (
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-500/5 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-700">
                      <div className="flex items-center gap-4">
                          <div className="size-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-emerald-500 border border-emerald-100 dark:border-emerald-800">
                             <Zap className="size-6" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">Pago Rápido Activo</p>
                             <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 capitalize">{paymentInfo.brand} terminada en •• {paymentInfo.last4}</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => handleCheckout(false)}
                          disabled={isProcessing}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black h-14 rounded-2xl shadow-lg flex items-center justify-between px-2 group active:scale-95 transition-all"
                      >
                          <div className="w-10"></div>
                          <span className="text-[13px] uppercase tracking-[0.15em]">Confirmar y Pagar</span>
                          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                             <ChevronRight className="size-5" />
                          </div>
                      </button>
                    </div>
                  )}

                  {/* VISTA STRIPE ESTÁNDAR / CARGANDO */}
                  {(!paymentInfo || isProcessing) && (
                    <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6 text-center">
                      <div className="size-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md">
                         <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-7" alt="Stripe" />
                      </div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic">
                        {loadingPayment ? 'Sincronizando pasarela...' : 'Conexión encriptada AES-256. Tus datos financieros están protegidos por Stripe.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* INFO BANNER */}
                <div className="mt-8 p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4">
                    <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        Confirmación de Nodo: No se realizará ningún cargo hasta que finalice el periodo de prueba de 7 días. Puedes gestionar o cancelar desde el panel de Facturación.
                    </p>
                </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="fixed bottom-0 z-[60] w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-6 pb-10 flex flex-col gap-4">
                
                {(!paymentInfo || isProcessing) && (
                  <button 
                      onClick={() => handleCheckout(true)}
                      disabled={isProcessing}
                      className="group w-full bg-primary hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-black h-16 rounded-2xl shadow-button flex items-center justify-between px-2 relative overflow-hidden disabled:opacity-70"
                  >
                      <div className="w-12 flex items-center justify-center">
                          {isProcessing && <Loader2 className="size-5 animate-spin text-white/80" />}
                      </div>
                      <span className="text-[15px] tracking-wide uppercase">
                          {isProcessing ? 'Sincronizando...' : 'Pagar con Stripe'}
                      </span>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <Lock className="size-5 text-white" />
                      </div>
                  </button>
                )}

                {paymentInfo && !isProcessing && (
                  <button 
                      onClick={() => handleCheckout(true)}
                      className="w-full text-center text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] hover:text-primary transition-all"
                  >
                      Pagar con otra tarjeta (Manual)
                  </button>
                )}

                <div className="flex items-center justify-center gap-1.5 opacity-20 mt-1">
                    <ShieldCheck className="size-3" />
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">Gateway Verificado v4.0</p>
                </div>
            </div>
        </div>

        {/* MODAL ÉXITO INSTANTÁNEO */}
        {isInstantSuccess && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500">
                <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center border border-white/10">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                        <div className="size-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white relative z-10 shadow-lg">
                            <CheckCircle2 className="size-10" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">¡Línea Activa!</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Puerto Asignado:</p>
                    <div className="text-2xl font-mono font-black text-primary mb-8 tracking-tighter">
                        {formatPhoneNumber(assignedNum)}
                    </div>
                    <button 
                        onClick={() => navigate(`/dashboard?new_line=${assignedNum}`)} 
                        className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group"
                    >
                        Entrar al Panel
                        <Sparkles className="size-4 group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default Payment;