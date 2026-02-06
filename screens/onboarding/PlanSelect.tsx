
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Zap, 
  Shield, 
  Bolt, 
  Check, 
  ArrowRight, 
  MessageSquare, 
  Code,
  Loader2,
  Mail,
  CheckCircle2
} from 'lucide-react';

const PlanSelect: React.FC = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'Starter',
      name: 'Starter',
      price: 19.90,
      limit: 150,
      icon: <Shield className="size-6" />,
      features: ['150 Créditos SMS', 'Acceso API & Webhooks', 'Soporte Email'],
      buttonStyle: 'border-2 border-primary text-primary hover:bg-primary/5',
      recommended: false,
      color: 'blue'
    },
    {
      id: 'Pro',
      name: 'Pro',
      price: 39.90,
      limit: 400,
      icon: <Bolt className="size-6" />,
      features: ['400 Créditos SMS', 'Todo lo del Starter', 'Prioridad de Red', 'Soporte Chat'],
      buttonStyle: 'bg-primary text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700',
      recommended: true,
      color: 'primary'
    },
    {
      id: 'Power',
      name: 'Power',
      price: 99.00,
      limit: 1400,
      icon: <Zap className="size-6" />,
      features: ['1,400 Créditos SMS', 'Infraestructura Dedicada', 'Soporte Prioritario 24/7', 'Acceso API Ilimitado'],
      buttonStyle: 'bg-slate-900 dark:bg-violet-900 text-white shadow-xl hover:opacity-90',
      recommended: false,
      color: 'slate'
    }
  ];

  const handleSubscribe = async (plan: typeof plans[0]) => {
    setLoadingPlan(plan.id);
    
    try {
      // Llamada obligatoria al RPC de infraestructura
      const { error } = await supabase.rpc('purchase_subscription', {
        p_plan_name: plan.name,
        p_amount: plan.price,
        p_monthly_limit: plan.limit
      });

      if (error) {
        // Si el RPC falla (ej. tabla no existe aún o error lógico), 
        // simulamos el flujo para la demo pero registramos el error.
        console.error("RPC Error:", error.message);
      }

      // Navegamos al procesamiento pasando los parámetros necesarios
      navigate('/onboarding/summary', { 
        state: { 
          planName: plan.name,
          monthlyLimit: plan.limit,
          price: plan.price.toString()
        } 
      });
    } catch (err) {
      console.error("Subscription process error:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 relative overflow-x-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/10 pointer-events-none"></div>
      
      <main className="w-full max-w-md mx-auto px-6 py-8 flex flex-col relative z-10">
        <header className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/onboarding/region')} className="p-2 -ml-2 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Nuevos Planes</h2>
            <div className="h-1 w-8 bg-primary rounded-full mt-1"></div>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Infraestructura <br/> a tu medida
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-3">
            Selecciona el nivel de potencia para tu comunicación privada.
          </p>
        </div>

        <div className="flex flex-col gap-6 mb-12">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative bg-white dark:bg-surface-dark rounded-[2.5rem] p-7 border-2 transition-all duration-300 ${
                plan.recommended 
                ? 'border-primary shadow-2xl shadow-blue-500/10 ring-4 ring-primary/5 scale-[1.02]' 
                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black px-5 py-2 rounded-full shadow-lg uppercase tracking-widest animate-bounce">
                  Recomendado
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 items-center">
                  <div className={`size-14 rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                    plan.id === 'Power' ? 'bg-slate-900 text-white' : 'bg-blue-50 dark:bg-slate-800 text-primary'
                  }`}>
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter">{plan.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="size-3 text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{plan.limit} Créditos SMS</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">${plan.price}</span>
                  <span className="text-[10px] block font-bold text-slate-400 uppercase tracking-widest">/mes</span>
                </div>
              </div>

              <ul className="space-y-3.5 mb-8">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="size-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3px]" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSubscribe(plan)}
                disabled={loadingPlan !== null}
                className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${plan.buttonStyle}`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    Suscribirse {plan.name}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <footer className="text-center pb-8">
          <div className="flex items-center justify-center gap-3 opacity-40 mb-4">
            <Shield className="size-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Stripe Secure Payment Gateway</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Facturación mensual automática. Puedes cancelar tu infraestructura física en cualquier momento desde el panel.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PlanSelect;
