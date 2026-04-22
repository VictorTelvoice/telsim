'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  Headphones, Plus, MessageSquare, ChevronRight, Loader2,
  TicketCheck, Clock, CheckCircle2, AlertCircle, X, Send,
  Wrench, CreditCard, TrendingUp, User, HelpCircle, Tag,
  Smartphone, Globe, Zap, ArrowLeft,
} from 'lucide-react';
import { createTicket, type TicketCategory, type TicketStatus } from '@/actions/supportActions';

interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  unread: boolean;
}

interface SupportContentProps {
  initialTickets: Ticket[];
}

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  open:    { label: 'Abierto',    color: 'text-blue-500',    bg: 'bg-blue-500/10',    icon: <AlertCircle  size={12} /> },
  pending: { label: 'Respondido', color: 'text-amber-500',   bg: 'bg-amber-500/10',   icon: <Clock        size={12} /> },
  closed:  { label: 'Cerrado',    color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: <CheckCircle2 size={12} /> },
};

const CATEGORIES: { id: TicketCategory; label: string; icon: React.ReactNode; color: string; bg: string; desc: string }[] = [
  { id: 'technical', label: 'Soporte Técnico',  icon: <Wrench      size={18} />, color: 'text-violet-500',  bg: 'bg-violet-500/10',  desc: 'Problemas con SIMs, SMS o API' },
  { id: 'billing',   label: 'Facturación',       icon: <CreditCard  size={18} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Pagos, facturas y reembolsos' },
  { id: 'sales',     label: 'Ventas',             icon: <TrendingUp  size={18} />, color: 'text-sky-500',     bg: 'bg-sky-500/10',     desc: 'Planes, upgrades y precios' },
  { id: 'account',   label: 'Mi Cuenta',          icon: <User        size={18} />, color: 'text-amber-500',   bg: 'bg-amber-500/10',   desc: 'Acceso, perfil y seguridad' },
  { id: 'other',     label: 'Otro',               icon: <HelpCircle  size={18} />, color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-800',  desc: 'Cualquier otra consulta' },
];

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export default function SupportContent({ initialTickets }: SupportContentProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<'category' | 'form'>('category');
  const [category, setCategory] = useState<TicketCategory>('technical');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => ({
    open:    tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    closed:  tickets.filter(t => t.status === 'closed').length,
  }), [tickets]);

  const displayed = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  const resetForm = () => {
    setShowForm(false);
    setStep('category');
    setSubject('');
    setMessage('');
    setError(null);
  };

  const handleCreate = () => {
    if (!subject.trim() || !message.trim()) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await createTicket({ subject, category, message });
        if (result.success) {
          // Optimistically add to list
          const newTicket: Ticket = {
            id: result.ticketId,
            subject: subject.trim(),
            category,
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastMessage: message.trim(),
            unread: false,
          };
          setTickets(prev => [newTicket, ...prev]);
          resetForm();
        }
      } catch (e: any) {
        setError(e?.message || 'Error creando el ticket. Intenta de nuevo.');
      }
    });
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-3xl text-primary">
            <Headphones size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Soporte</h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Centro de atención al cliente</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setStep('category'); }}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={16} />
          Nuevo Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Hero + Channels */}
        <div className="space-y-5">
          {/* Hero card */}
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Soporte activo</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">¿Cómo podemos<br />ayudarte hoy?</h2>
              <p className="text-[12px] text-white/60 leading-relaxed">
                Nuestro equipo responde en menos de 4 horas en días hábiles.
              </p>
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Canales de Atención</h3>

            {/* Ticket */}
            <button
              onClick={() => { setShowForm(true); setStep('category'); }}
              className="w-full bg-[var(--card)] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.01] active:scale-[0.99] transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-lg">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Ticket de Soporte</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Disponible para todos los planes</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock size={10} className="text-slate-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tiempo: 1-4 horas</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
            </button>

            {/* WhatsApp — locked */}
            <div className="w-full bg-[var(--card)] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-[var(--shadow)] opacity-70 relative overflow-hidden">
              <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white/50 dark:from-slate-900/50 to-transparent pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Smartphone size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">WhatsApp Directo</p>
                  <span className="text-[7px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase">Power</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Canal prioritario para clientes Power</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock size={10} className="text-slate-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tiempo: 24/7</span>
                </div>
              </div>
            </div>

            {/* AI Bot — coming soon */}
            <div className="w-full bg-[var(--card)] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-[var(--shadow)] opacity-60">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                <Zap size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Bot IA</p>
                  <span className="text-[7px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full uppercase">Próximamente</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Asistente automatizado en tiempo real</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Ticket list */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          {tickets.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {(['open', 'pending', 'closed'] as TicketStatus[]).map(s => {
                const cfg = STATUS_CFG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(filter === s ? 'all' : s)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-2xl border transition-all ${
                      filter === s
                        ? `${cfg.bg} border-transparent`
                        : 'bg-[var(--card)] border-slate-200 dark:border-slate-800 hover:border-primary/30'
                    }`}
                  >
                    <p className={`text-2xl font-black ${filter === s ? cfg.color : 'text-slate-900 dark:text-white'}`}>{counts[s]}</p>
                    <p className="text-[9px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-wider">{cfg.label}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter pills */}
          {tickets.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl">
              {(['all', 'open', 'pending', 'closed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    filter === s
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s === 'all' ? 'Todos' : STATUS_CFG[s].label}
                </button>
              ))}
            </div>
          )}

          {/* Ticket list */}
          {tickets.length === 0 ? (
            <div className="bg-[var(--card)] rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700 p-16 flex flex-col items-center gap-5 text-center shadow-[var(--shadow)]">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <TicketCheck size={36} className="text-slate-400 dark:text-slate-600" />
              </div>
              <div>
                <p className="text-base font-black text-slate-900 dark:text-white mb-1">Sin tickets todavía</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Usa el botón "Nuevo Ticket" para abrir tu primera solicitud.</p>
              </div>
              <button
                onClick={() => { setShowForm(true); setStep('category'); }}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                <Plus size={16} />
                Crear primer ticket
              </button>
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-500">No hay tickets con este filtro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
                {displayed.length} ticket{displayed.length !== 1 ? 's' : ''}
              </p>
              {displayed.map(ticket => {
                const sc = STATUS_CFG[ticket.status];
                const cat = CATEGORIES.find(c => c.id === ticket.category);

                return (
                  <Link
                    key={ticket.id}
                    href={`/app/support/${ticket.id}`}
                    className="block bg-[var(--card)] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.005] active:scale-[0.999] transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-2xl ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                        <div className={sc.color}><MessageSquare size={18} /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{ticket.subject}</p>
                          {ticket.unread && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        {ticket.lastMessage && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mb-2">{ticket.lastMessage}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                            {sc.icon} {sc.label}
                          </span>
                          {cat && (
                            <span className={`flex items-center gap-1 text-[9px] font-black uppercase ${cat.color}`}>
                              <Tag size={10} /> {cat.label}
                            </span>
                          )}
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-600">
                            {timeAgo(ticket.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-8 pt-20">
          <div className="w-full max-w-lg bg-[var(--card)] rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Nuevo Ticket</h2>
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                  {step === 'category' ? 'Selecciona el tipo de soporte' : `Categoría: ${CATEGORIES.find(c => c.id === category)?.label}`}
                </p>
              </div>
              <button onClick={resetForm} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Step 1: Category selection */}
            {step === 'category' && (
              <div className="p-5 space-y-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setStep('form'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary/40 bg-white dark:bg-slate-800/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${cat.bg} ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{cat.label}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{cat.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Form */}
            {step === 'form' && (
              <div className="p-5 space-y-4">
                <button
                  onClick={() => setStep('category')}
                  className="flex items-center gap-1.5 text-[11px] font-black text-primary uppercase tracking-wider"
                >
                  <ArrowLeft size={12} /> Cambiar categoría
                </button>

                <div>
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 block">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Describe brevemente el problema..."
                    maxLength={80}
                    autoFocus
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 block">
                    Descripción detallada
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Explica con el mayor detalle posible. Incluye números de SIM, mensajes de error, etc..."
                    rows={5}
                    maxLength={1000}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary outline-none resize-none leading-relaxed transition-all"
                  />
                  <p className="text-right text-[9px] text-slate-500 mt-1">{message.length}/1000</p>
                </div>

                {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}

                <button
                  onClick={handleCreate}
                  disabled={!subject.trim() || !message.trim() || isPending}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                  {isPending ? 'Enviando...' : 'Enviar Ticket'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
