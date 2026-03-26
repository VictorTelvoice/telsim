import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  TicketCheck,
  CreditCard,
  MessageCircle,
  RefreshCw,
  Lock,
  Wifi,
  Globe,
  Bell,
  Package,
} from 'lucide-react';

const QUICK_LINKS = [
  { icon: <RefreshCw className="size-4" />, label: 'Renovar número', path: '/dashboard/numbers', color: 'text-blue-500' },
  { icon: <CreditCard className="size-4" />, label: 'Ver facturas', path: '/dashboard/billing', color: 'text-emerald-500' },
  { icon: <Lock className="size-4" />, label: 'Cambiar contraseña', path: '/dashboard/security', color: 'text-violet-500' },
  { icon: <Bell className="size-4" />, label: 'Notificaciones', path: '/dashboard/notification-settings', color: 'text-amber-500' },
  { icon: <Globe className="size-4" />, label: 'Guía de API', path: '/dashboard/api-guide', color: 'text-cyan-500' },
  { icon: <Wifi className="size-4" />, label: 'Webhooks', path: '/dashboard/webhooks', color: 'text-rose-500' },
];

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white pb-32">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={() => navigate('/dashboard/profile')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-black tracking-tight">Centro de Ayuda</h1>
        </div>
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en la base de conocimiento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-13 pl-11 pr-4 py-3.5 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm outline-none focus:border-primary transition-all font-medium text-sm"
          />
        </div>
      </header>

      <main className="px-5 py-6 space-y-8 max-w-lg mx-auto">

        {/* ─── SOPORTE POR TICKET (OPCIÓN #1) ─── */}
        {!searchQuery && (
          <section>
            <button
              onClick={() => navigate('/dashboard/support/tickets')}
              className="w-full bg-gradient-to-br from-primary to-blue-600 text-white rounded-3xl p-6 flex items-center gap-5 shadow-xl shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all text-left"
            >
              <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <TicketCheck className="size-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-black uppercase tracking-widest">Soporte por Ticket</p>
                  <span className="text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Recomendado</span>
                </div>
                <p className="text-[11px] font-medium text-white/70 leading-relaxed">
                  Crea un ticket y nuestro equipo responde en menos de 4 horas. Seguimiento en tiempo real.
                </p>
              </div>
              <ChevronRight className="size-5 text-white/50 shrink-0" />
            </button>
          </section>
        )}

        {/* ─── ACCESOS RÁPIDOS ─── */}
        {!searchQuery && (
          <section className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
              <Package className="size-3" /> Accesos Rápidos
            </p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span className={link.color}>{link.icon}</span>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center leading-tight">{link.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {!searchQuery && (
          <section>
            <button
              onClick={() => navigate('/dashboard/faq')}
              className="w-full bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:scale-[1.01] active:scale-[0.98] transition-all text-left flex items-center gap-4"
            >
              <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Base de conocimiento</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">Preguntas Frecuentes</p>
                <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Explora respuestas rápidas sobre SIMs, pagos, privacidad y automatización.
                </p>
              </div>
              <ChevronRight className="size-5 text-slate-300 shrink-0" />
            </button>
          </section>
        )}

        {/* ─── CTA FINAL ─── */}
        {!searchQuery && (
          <section className="pt-2">
            <div className="bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4">
              <MessageCircle className="size-8 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-300">¿No encontraste lo que buscabas?</p>
                <p className="text-xs font-medium text-slate-400 mt-1">Nuestro equipo responde en menos de 4 horas.</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/support/tickets')}
                className="w-full h-12 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
              >
                Crear Ticket de Soporte
              </button>
            </div>
          </section>
        )}

        <footer className="text-center pt-4 pb-2 opacity-30">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Telsim Knowledge Base v2.0</p>
        </footer>
      </main>
    </div>
  );
};

export default HelpCenter;
