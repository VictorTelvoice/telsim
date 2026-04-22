'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, MessageSquare, Smartphone, BarChart3, Globe, CreditCard, Settings, HelpCircle } from 'lucide-react';
import TelsimBrandLogo from '../TelsimBrandLogo';

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

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Menu Content */}
      <div className="fixed inset-y-0 left-0 w-[85%] max-w-xs bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <Link href="/app/dashboard" onClick={onClose}>
            <TelsimBrandLogo compact />
          </Link>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-500 mb-4">
            Menú Principal
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[13px] font-bold transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-primary'
                }`}>
                  <Icon size={18} strokeWidth={2.5} />
                </div>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="bg-gradient-to-br from-slate-900 to-primary-dark rounded-2xl p-5 text-white border border-white/5 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl transition-transform duration-700" />
            <h4 className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Plan Power
            </h4>
            <p className="text-[10px] text-white/70 leading-relaxed">
              Tu suscripción está activa y protegida por Telsim Shield Pro x64.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
