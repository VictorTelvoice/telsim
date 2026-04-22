'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { completeOnboarding } from '@/actions/onboardingActions';
import TelsimBrandLogo from '@/components/TelsimBrandLogo';
import { CheckCircle2, Home, CreditCard, Smartphone, Copy, Check, Zap, Cpu } from 'lucide-react';

interface ActivationData {
  phoneNumber: string;
  planName: string;
  amount: number;
  currency: string;
  monthlyLimit: number;
  isAnnual?: boolean;
  nextBillingDate?: string | null;
}

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

const ActivationSuccess: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user;
  const { language } = useLanguage();
  
  const [data, setData] = useState<ActivationData | null>(null);
  const [copied, setCopied] = useState(false);
  const [desktop, setDesktop] = useState(isDesktop());

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      try {
        const response = await fetch(`/api/checkout?action=verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const result = await response.json();
        if (result.status === 'completed') {
          setData({
            phoneNumber: result.phoneNumber,
            planName: result.planName,
            amount: result.amount,
            currency: 'USD', 
            monthlyLimit: result.monthlyLimit,
            isAnnual: false, 
            nextBillingDate: null
          });
          
          await completeOnboarding();
        }
      } catch (err) {
        console.error("Failed to load activation data:", err);
      }
    };
    load();
  }, [sessionId]);

  const formatPhone = (num: string) => {
    if (!num) return '— — — — — —';
    const c = num.replace(/\D/g, '');
    if (c.startsWith('569') && c.length === 11) return `+56 9 ${c.substring(3,7)} ${c.substring(7)}`;
    return num.startsWith('+') ? num : `+${num}`;
  };

  const handleCopyPhone = () => {
    if (!data?.phoneNumber) return;
    navigator.clipboard.writeText(formatPhone(data.phoneNumber));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-slate-950 flex items-center justify-center">
      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-background-dark font-display flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in transition-all duration-1000">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <div className="relative z-10 size-24 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-emerald-500/20 shadow-2xl flex items-center justify-center">
            <CheckCircle2 className="size-12 text-emerald-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">¡Activación Lista!</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tu nueva línea ha sido aprovisionada con éxito.</p>
        </div>

        <div className="bg-white dark:bg-[#1A2230] rounded-[2.5rem] p-10 border-2 border-emerald-500/10 shadow-xl flex flex-col items-center gap-2 relative overflow-hidden">
           <div className="flex flex-col items-center gap-1 relative z-10">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full mb-3">
                <Zap className="size-3 text-emerald-500" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Servicio Verificado</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Número de SIM:</p>
              <h2 className="text-3xl font-black font-mono tracking-tighter text-slate-900 dark:text-white tabular-nums">
                {formatPhone(data.phoneNumber)}
              </h2>
              <button 
                onClick={handleCopyPhone}
                className="mt-2 text-[10px] font-bold text-primary flex items-center gap-1 hover:opacity-80 active:scale-95 transition-all"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
           </div>
        </div>

        <div className="space-y-3 w-full">
          <button 
            onClick={() => router.push('/app/dashboard')} 
            className="group w-full h-16 bg-primary hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
          >
            <span className="text-[14px] uppercase tracking-widest">Entrar al Panel</span>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => router.push('/app/numbers')} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <Smartphone className="size-4" />
              <span className="text-xs">Mis Líneas</span>
            </button>
            <button 
              onClick={() => router.push('/app/billing')} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <CreditCard className="size-4" />
              <span className="text-xs">Facturación</span>
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 flex items-center gap-4 opacity-20">
        <Cpu className="size-4" />
        <span className="text-[8px] font-black uppercase tracking-[0.5em]">TELSIM CORE RT-v2.0</span>
      </div>
    </div>
  );
};

export default ActivationSuccess;
