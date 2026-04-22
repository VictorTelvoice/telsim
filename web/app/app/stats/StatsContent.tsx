'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Smartphone,
  Zap,
  ArrowUpRight,
  Calendar,
  Clock,
  Activity,
} from 'lucide-react';
import { detectService } from '@/utils/serviceDetector';
import BrandLogos from '@/components/common/BrandLogos';

interface StatsContentProps {
  initialData: {
    totalMessages: number;
    messages30d: number;
    activeSlots: number;
    last7: number;
    prev7: number;
    weekChange: number;
    dailyChart: { date: string; count: number }[];
    slotBreakdown: {
      slotId: string;
      phoneNumber: string;
      label: string | null;
      msgs30d: number;
      creditsUsed: number;
      monthlyLimit: number;
      planName: string;
    }[];
    topSenders: { sender: string; count: number }[];
    recentMessages: any[];
  };
}

export default function StatsContent({ initialData }: StatsContentProps) {
  const {
    totalMessages,
    messages30d,
    activeSlots,
    last7,
    weekChange,
    dailyChart,
    slotBreakdown,
    topSenders,
  } = initialData;

  const maxDaily = useMemo(() => Math.max(...dailyChart.map(d => d.count), 1), [dailyChart]);
  const totalTopSenders = useMemo(() => topSenders.reduce((a, b) => a + b.count, 0) || 1, [topSenders]);

  const isPositive = weekChange >= 0;

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-3xl text-primary">
            <BarChart3 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Estadísticas
            </h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Análisis de actividad · Últimos 30 días
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--card)] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[var(--shadow)]">
          <Calendar size={14} className="text-primary" />
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
            {new Date(initialData.dailyChart[0]?.date || '').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} — Hoy
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiStat
          icon={<MessageSquare size={20} />}
          label="Total Mensajes"
          value={totalMessages.toLocaleString()}
          sub="Histórico acumulado"
          color="#3b82f6"
        />
        <KpiStat
          icon={<Activity size={20} />}
          label="Últimos 30 días"
          value={messages30d.toLocaleString()}
          sub="Período actual"
          color="#a855f7"
        />
        <KpiStat
          icon={<Smartphone size={20} />}
          label="Líneas Activas"
          value={activeSlots}
          sub="SIMs en uso"
          color="#10b981"
        />
        <KpiStat
          icon={isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          label="Esta Semana"
          value={last7.toLocaleString()}
          sub={`${isPositive ? '+' : ''}${weekChange}% vs semana anterior`}
          color={isPositive ? '#10b981' : '#ef4444'}
          trend={isPositive ? 'up' : 'down'}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Activity Chart - spans 2 cols */}
        <div className="lg:col-span-2 bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Actividad Diaria
              </h2>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                Mensajes recibidos por día
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end gap-1 h-48 w-full">
            {dailyChart.map((day, i) => {
              const pct = maxDaily > 0 ? (day.count / maxDaily) * 100 : 0;
              const isToday = i === dailyChart.length - 1;
              const isWeekend = [0, 6].includes(new Date(day.date + 'T12:00:00').getDay());

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {day.count} msg · {new Date(day.date + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                  </div>
                  {/* Bar */}
                  <div className="w-full relative flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                        isToday
                          ? 'bg-primary shadow-lg shadow-primary/30'
                          : isWeekend
                          ? 'bg-slate-300 dark:bg-slate-700'
                          : 'bg-primary/30 dark:bg-primary/40 group-hover:bg-primary/60 dark:group-hover:bg-primary/70'
                      }`}
                      style={{ height: `${Math.max(pct, day.count > 0 ? 4 : 1)}%` }}
                    />
                  </div>
                  {/* Day label — only show every 5 */}
                  {i % 5 === 0 && (
                    <span className="text-[8px] font-black text-slate-600 dark:text-slate-500 uppercase">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chart legend */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase">Hoy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary/30 dark:bg-primary/40" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase">Días anteriores</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-700" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase">Fin de semana</span>
            </div>
          </div>
        </div>

        {/* Top Senders */}
        <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)]">
          <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
            Top Servicios
          </h2>
          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-6">
            Por volumen de mensajes
          </p>

          {topSenders.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={32} />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest">Sin datos aún</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topSenders.map(({ sender, count }, idx) => {
                const service = detectService(sender, '');
                const pct = Math.round((count / totalTopSenders) * 100);

                return (
                  <div key={sender} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 w-4 text-right flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: service.bg }}>
                        <BrandLogos brand={service.key} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate block">
                          {service.label !== 'SMS Genérico' ? service.label : sender}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 tabular-nums flex-shrink-0">
                        {count}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="ml-7 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: service.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Per-SIM Breakdown */}
      <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Desglose por Línea
            </h2>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-0.5">
              Actividad y consumo de créditos por SIM
            </p>
          </div>
          <Smartphone size={18} className="text-primary" />
        </div>

        {slotBreakdown.length === 0 ? (
          <div className="py-12 text-center">
            <Smartphone className="mx-auto mb-3 text-slate-300 dark:text-slate-700" size={32} />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest">Sin líneas activas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {slotBreakdown.map(slot => {
              const usagePct = Math.min(100, Math.round((slot.creditsUsed / slot.monthlyLimit) * 100));
              const usageColor = usagePct > 80 ? '#ef4444' : usagePct > 50 ? '#f59e0b' : '#10b981';

              return (
                <div key={slot.slotId} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-0.5">
                        {slot.label || 'Sin etiqueta'}
                      </p>
                      <p className="text-sm font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {formatPhone(slot.phoneNumber)}
                      </p>
                    </div>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {slot.planName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3">
                      <p className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase mb-1">30 días</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{slot.msgs30d}</p>
                      <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase">mensajes</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3">
                      <p className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase mb-1">Créditos</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{slot.creditsUsed}</p>
                      <p className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase">de {slot.monthlyLimit}</p>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Uso del plan</span>
                      <span className="text-[8px] font-black tabular-nums" style={{ color: usageColor }}>{usagePct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${usagePct}%`, backgroundColor: usageColor }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Heatmap-style weekly summary */}
      <div className="bg-gradient-to-br from-slate-900 to-primary-dark rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-primary/10">
        <div className="absolute top-0 right-0 p-8 opacity-[0.06] pointer-events-none">
          <Zap size={200} />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-black italic uppercase tracking-tight mb-1">Resumen de la Semana</h2>
          <p className="text-[11px] text-white/60 uppercase tracking-widest mb-8">
            Comparativa vs. semana anterior
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <WeekStat label="Esta semana" value={initialData.last7} icon={<MessageSquare size={16} />} />
            <WeekStat label="Semana anterior" value={initialData.prev7} icon={<Clock size={16} />} />
            <WeekStat
              label="Variación"
              value={`${weekChange >= 0 ? '+' : ''}${weekChange}%`}
              icon={weekChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              highlight={weekChange >= 0 ? 'green' : 'red'}
            />
            <WeekStat label="Promedio/día" value={Math.round(initialData.last7 / 7)} icon={<Activity size={16} />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiStat({ icon, label, value, sub, color, trend }: {
  icon: React.ReactNode;
  label: string;
  value: any;
  sub: string;
  color: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-[var(--card)] rounded-[1.5rem] border border-slate-200 dark:border-slate-800 p-5 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.05] rounded-full -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-700" style={{ backgroundColor: color }} />
      <div className="p-2.5 rounded-xl w-fit mb-3" style={{ backgroundColor: `${color}15` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
        {value}
      </h3>
      <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{label}</p>
      <p className={`text-[9px] font-bold mt-0.5 uppercase tracking-widest ${trend ? '' : 'text-slate-600 dark:text-slate-400'}`} style={{ color: trend ? color : undefined }}>
        {sub}
      </p>
    </div>
  );
}

function WeekStat({ label, value, icon, highlight }: { label: string; value: any; icon: React.ReactNode; highlight?: 'green' | 'red' }) {
  const color = highlight === 'green' ? '#4ade80' : highlight === 'red' ? '#f87171' : 'white';
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-white/60" style={{ color: highlight ? color : undefined }}>
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-black" style={{ color: highlight ? color : 'white' }}>{value}</p>
    </div>
  );
}

function formatPhone(raw: string) {
  const clean = raw.replace(/\D/g, '');
  if (clean.startsWith('569') && clean.length === 11) {
    return `+56 9 ${clean.slice(3, 7)} ${clean.slice(7)}`;
  }
  return raw.startsWith('+') ? raw : `+${raw}`;
}
