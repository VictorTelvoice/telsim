'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Smartphone, 
  CreditCard, 
  Settings, 
  HelpCircle,
  BarChart3,
  Globe,
  Bell
} from 'lucide-react';
import TelsimBrandLogo from '../TelsimBrandLogo';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app/dashboard' },
  { icon: MessageSquare, label: 'Mensajes', href: '/app/messages' },
  { icon: Smartphone, label: 'Mis Números', href: '/app/numbers' },
  { icon: BarChart3, label: 'Estadísticas', href: '/app/stats' },
  { icon: Globe, label: 'API & Webhooks', href: '/app/api' },
  { icon: CreditCard, label: 'Facturación', href: '/app/billing' },
  { icon: Settings, label: 'Ajustes', href: '/app/settings' },
  { icon: HelpCircle, label: 'Soporte', href: '/app/support' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: stats } = useSWR('/api/user/stats', fetcher);

  const activeLines = stats?.activeLines ?? 0;

  return (
    <aside className="hidden lg:flex w-72 flex-col bg-[var(--header-bg)] border-r border-slate-100 dark:border-slate-800/60 transition-all duration-400">
      <div className="p-8 pb-2">
        <Link href="/app/dashboard" className="flex items-center" onClick={() => {}}>
          <TelsimBrandLogo compact={false} />
        </Link>

        {/* Active Lines Widget - Vite Style */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--bg-body)] rounded-xl shadow-sm">
               <Globe size={16} className="text-primary" />
            </div>
            <div>
               <p className="text-[9px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">Infraestructura IA</p>
               <p className="text-xs font-black text-slate-900 dark:text-white leading-none">
                {activeLines} {activeLines === 1 ? 'Línea activa' : 'Líneas activas'}
               </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar py-6">
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-500 mb-4 font-display">
          Main Menu
        </p>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all group ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-primary dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-800'
              }`}
            >
              <div className={`flex-shrink-0 transition-all ${
                isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-primary'
              }`}>
                <Icon size={18} strokeWidth={2.5} />
              </div>
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer / Plan Card */}
      <div className="p-6">
        <div className="bg-gradient-to-br from-slate-900 to-primary-dark rounded-3xl p-5 text-white shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <h4 className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Plan Power
          </h4>
          <p className="text-[10px] text-white/70 leading-relaxed mb-4">
            Tu suscripción está activa y protegida por Telsim Shield.
          </p>
          <Link 
            href="/app/billing" 
            className="block text-center py-2.5 bg-primary hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 border border-white/10"
          >
            Gestionar Plan
          </Link>
        </div>
      </div>
    </aside>
  );
}
