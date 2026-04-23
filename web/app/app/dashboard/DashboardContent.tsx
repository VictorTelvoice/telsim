'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { 
  Zap, 
  Smartphone, 
  MessageSquare, 
  CreditCard, 
  ArrowUpRight, 
  Clock,
  Copy,
  Check,
  Globe,
  Activity,
  Shield,
  Search
} from 'lucide-react';
import { detectService, extractCode } from '@/utils/serviceDetector';
import BrandLogos from '@/components/common/BrandLogos';
import { useTheme } from 'next-themes';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface DashboardContentProps {
  initialData: any;
}

export default function DashboardContent({ initialData }: DashboardContentProps) {
  const { data: messages, mutate } = useSWR('/api/dashboard/messages', fetcher, {
    fallbackData: initialData.recentMessages,
    refreshInterval: 5000,
    revalidateOnFocus: true
  });

  const stats = initialData.stats;
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          Buenos días, {initialData?.user?.name || 'Alexander'} <span>☀️</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Resumen de tu actividad en Telsim.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard 
          icon={<Smartphone />} 
          label="Números" 
          value={stats.activeNumbers} 
          sub="SIMs Activas"
          color="#3b82f6"
        />
        <KpiCard 
          icon={<MessageSquare />} 
          label="Mensajes" 
          value={stats.totalSms} 
          sub="Total Recibidos"
          color="#a855f7"
        />
        <KpiCard 
          icon={<Activity />} 
          label="Créditos" 
          value={stats.remainingCredits} 
          sub="Saldo Disponible"
          color="#10b981"
        />
        <KpiCard 
          icon={<Shield />} 
          label="Estado" 
          value="Protegido" 
          sub="Shield v4 Pro"
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--card)] rounded-[1.5rem] border border-slate-200 dark:border-slate-800/60 p-6 shadow-[var(--shadow)]">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
              Actividad SMS
            </h2>
            {/* Chart emulator */}
            <div className="h-64 flex items-end justify-between gap-2 px-4">
               {[20, 45, 15, 30, 25, 40, 55].map((h, i) => (
                 <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div 
                      className="w-full bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/40 rounded-t-lg transition-all duration-500 relative" 
                      style={{ height: `${h}%` }}
                    >
                      {i === 6 && <div className="absolute -top-1 left-0 right-0 h-1 bg-primary rounded-full" />}
                    </div>
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">{['Ju', 'Vi', 'Sá', 'Do', 'Lu', 'Ma', 'Mi'][i]}</span>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-[1.5rem] border border-slate-200 dark:border-slate-800/60 p-6 shadow-[var(--shadow)]">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  Estado de SIMs
                </h2>
                <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Ver todo</button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SimSummaryCard number="+56 9 4810 7688" msgs="0 msgs" active />
                <SimSummaryCard number="+56 9 9310 7110" msgs="9 msgs" active />
             </div>
          </div>
        </div>

        {/* Right column - Live Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              Feed en Vivo
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
              <Search size={16} />
            </button>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar">
            {messages && messages.length > 0 ? (
              messages
                .filter((msg: any) => !msg.isSpam)
                .map((msg: any) => (
                  <LiveFeedCard
                    key={msg.id}
                    msg={msg}
                    onCopy={() => handleCopy(extractCode(msg.content) || msg.content, msg.id)}
                    isCopied={copiedId === msg.id}
                    isDark={isDark}
                    mounted={mounted}
                  />
                ))
            ) : (
              <div className="py-16 text-center bg-[var(--card)] rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
                <MessageSquare className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={32} />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Sin mensajes recientes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: any; sub: string; color: string }) {
  return (
    <div className="bg-[var(--card)] rounded-[1.5rem] border border-slate-200 dark:border-slate-800/80 p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.05] rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125 duration-700" style={{ backgroundColor: color }} />
      
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        <ArrowUpRight size={16} className="text-slate-400 dark:text-slate-600 group-hover:text-primary transition-colors" />
      </div>

      <div>
        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">
          {value}
        </h3>
        <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
          {label}
        </p>
        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mt-1">{sub}</p>
      </div>
    </div>
  );
}

function SimSummaryCard({ number, msgs, active }: { number: string; msgs: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
          <Smartphone size={18} />
        </div>
        {active && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-900 dark:text-white font-mono truncate">{number}</p>
        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{msgs}</p>
      </div>
      <ArrowUpRight size={14} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
    </div>
  );
}

function LiveFeedCard({ msg, onCopy, isCopied, isDark, mounted }: any) {
  const service = detectService(msg.sender, msg.content);
  const code = extractCode(msg.content);

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] transition-all group">
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-black/5 flex-shrink-0" 
          style={{ 
            backgroundColor: mounted ? (isDark ? service.darkBg : service.bg) : service.bg,
          }}
        >
          <BrandLogos brand={service.key} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black uppercase tracking-tight leading-none mb-0.5" style={{ color: service.color }}>
            {service.label}
          </h4>
          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest truncate">
            De: {msg.sender}
          </p>
        </div>
        <span className="text-[8px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">Nuevo</span>
      </div>

      <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <p className="text-[12px] leading-relaxed font-medium text-slate-700 dark:text-slate-300 italic">
          "{msg.content}"
        </p>
      </div>

      {code && (
        <div className="flex items-center justify-between gap-3">
          <div className="px-4 py-2.5 bg-slate-900 dark:bg-slate-950 border border-slate-800 flex flex-col min-w-[120px] rounded-xl">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Código</span>
            <span className="text-lg font-black tracking-[0.3em] text-white font-mono leading-none">{code}</span>
          </div>
          <button 
            onClick={onCopy}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
              isCopied 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-95'
            }`}
          >
            {isCopied ? <Check size={16} /> : <Copy size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
