import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Plus, MessageSquare, ChevronRight, Loader2,
  TicketCheck, Clock, CheckCircle2, AlertCircle, X, Send,
  Wrench, CreditCard, TrendingUp, User, HelpCircle, Tag,
} from 'lucide-react';

type Ticket = {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  category: string;
  created_at: string;
  updated_at: string | null;
  last_message?: string | null;
  unread?: boolean;
};

const STATUS_CFG = {
  open:    { label: 'Abierto',    color: 'text-blue-500',    bg: 'bg-blue-500/10',    icon: <AlertCircle  className="size-3" /> },
  pending: { label: 'Respondido', color: 'text-amber-500',   bg: 'bg-amber-500/10',   icon: <Clock        className="size-3" /> },
  closed:  { label: 'Resuelto',   color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: <CheckCircle2 className="size-3" /> },
};

const CATEGORIES = [
  { id: 'technical', label: 'Soporte Técnico',  icon: <Wrench      className="size-4" />, color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'Problemas con SIMs, SMS o API' },
  { id: 'billing',   label: 'Facturación',       icon: <CreditCard  className="size-4" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Pagos, facturas y reembolsos' },
  { id: 'sales',     label: 'Ventas',             icon: <TrendingUp  className="size-4" />, color: 'text-sky-500',    bg: 'bg-sky-500/10',    desc: 'Planes, upgrades y precios' },
  { id: 'account',   label: 'Mi Cuenta',          icon: <User        className="size-4" />, color: 'text-amber-500',  bg: 'bg-amber-500/10',  desc: 'Acceso, perfil y seguridad' },
  { id: 'other',     label: 'Otro',               icon: <HelpCircle  className="size-4" />, color: 'text-slate-500',  bg: 'bg-slate-100 dark:bg-slate-800',  desc: 'Cualquier otra consulta' },
];

const UserTickets: React.FC = () => {
  const navigate  = useNavigate();
  const { user, session } = useAuth();

  const [tickets,    setTickets]    = useState<Ticket[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [step,       setStep]       = useState<'category' | 'form'>('category');
  const [category,   setCategory]   = useState('');
  const [subject,    setSubject]    = useState('');
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState<'all' | 'open' | 'pending' | 'closed'>('all');

  /* ─── fetch ─────────────────────────────────────────────────────────────── */
  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;

    // Ordenar por created_at como fallback seguro si updated_at no existe aún
    const { data, error: qErr } = await supabase
      .from('support_tickets')
      .select('id, subject, status, category, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (qErr || !data) return setTickets([]);

    const enriched = await Promise.all(
      (data as Ticket[]).map(async t => {
        const { data: msgs } = await supabase
          .from('support_messages')
          .select('content, sender_type')
          .eq('ticket_id', t.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const last = msgs?.[0] as { content: string; sender_type: string } | undefined;
        return {
          ...t,
          category: t.category ?? 'technical',
          last_message: last?.content ?? null,
          unread: last?.sender_type === 'admin',
        };
      })
    );
    setTickets(enriched);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  /* ─── create ─────────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!subject.trim() || !message.trim() || !category || !user?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({ user_id: user.id, subject: subject.trim(), category, status: 'open' })
        .select('id')
        .single();

      if (tErr || !ticket) { setError('No pudimos crear el ticket. Intenta de nuevo.'); return; }

      await supabase.from('support_messages').insert({
        ticket_id: ticket.id, sender_type: 'user', content: message.trim(), user_id: user.id,
      });

      if (session?.access_token) {
        fetch('/api/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'notify-new-ticket', ticket_id: ticket.id }),
        }).catch(() => {});
      }

      // Reset form
      setSubject(''); setMessage(''); setCategory('');
      setStep('category'); setShowForm(false);
      await fetchTickets();
      navigate(`/dashboard/support/ticket/${ticket.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => { setShowForm(false); setStep('category'); setCategory(''); setSubject(''); setMessage(''); setError(null); };

  const timeAgo = (iso: string | null) => {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Ahora'; if (m < 60) return `Hace ${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)}d`;
  };

  const displayed = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const counts = {
    open:    tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    closed:  tickets.filter(t => t.status === 'closed').length,
  };

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white pb-32">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <button onClick={() => navigate('/dashboard/help')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[11px] font-black uppercase tracking-[0.22em]">Mis Tickets</h1>
        <button onClick={() => { setShowForm(true); setStep('category'); }} className="p-2 -mr-1 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-md">
          <Plus className="size-5" />
        </button>
      </header>

      {/* ── MODAL NUEVO TICKET ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-8">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-base font-black">Nuevo Ticket</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {step === 'category' ? 'Selecciona el tipo de soporte' : `Categoría: ${CATEGORIES.find(c => c.id === category)?.label}`}
                </p>
              </div>
              <button onClick={resetForm} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="size-4 text-slate-400" />
              </button>
            </div>

            {/* Step 1: Category */}
            {step === 'category' && (
              <div className="px-6 pb-6 space-y-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => { setCategory(cat.id); setStep('form'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 bg-white dark:bg-slate-800/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left group"
                  >
                    <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${cat.bg} ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{cat.label}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{cat.desc}</p>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Form */}
            {step === 'form' && (
              <div className="px-6 pb-6 space-y-4">
                {/* Back button */}
                <button onClick={() => setStep('category')} className="flex items-center gap-1 text-[11px] font-black text-primary uppercase tracking-wider">
                  <ArrowLeft className="size-3" /> Cambiar categoría
                </button>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Asunto</label>
                  <input
                    type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Describe brevemente el problema"
                    maxLength={80} autoFocus
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Descripción detallada</label>
                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Explica con el mayor detalle posible..."
                    rows={4} maxLength={1000}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all resize-none leading-relaxed"
                  />
                  <p className="text-right text-[9px] text-slate-300 mt-1">{message.length}/1000</p>
                </div>

                {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}

                <button
                  onClick={handleCreate}
                  disabled={!subject.trim() || !message.trim() || submitting}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="size-5 animate-spin" /> : <><Send className="size-4" />Enviar Ticket</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="px-5 py-6 max-w-lg mx-auto space-y-5">

        {/* ── Intro banner ── */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/15 rounded-3xl p-5 flex items-start gap-4">
          <div className="size-11 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
            <TicketCheck className="size-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black mb-0.5">Soporte por Ticket</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Nuestro equipo responde en menos de 4 horas. Puedes seguir la conversación aquí.
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        {!loading && tickets.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {(['all', 'open', 'pending', 'closed'] as const).filter(s => s !== 'all').map(s => {
              const cfg = STATUS_CFG[s];
              return (
                <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                    filter === s ? `${cfg.bg} border-transparent` : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <p className={`text-xl font-black ${filter === s ? cfg.color : 'text-slate-700 dark:text-slate-200'}`}>{counts[s]}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{cfg.label}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Filter pills ── */}
        {!loading && tickets.length > 0 && (
          <div className="flex gap-2">
            {(['all', 'open', 'pending', 'closed'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  filter === s ? 'bg-primary text-white border-transparent shadow-md shadow-primary/20' : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                {s === 'all' ? 'Todos' : STATUS_CFG[s].label}
              </button>
            ))}
          </div>
        )}

        {/* ── Ticket list ── */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 text-slate-400 animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <MessageSquare className="size-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">Sin tickets todavía</p>
              <p className="text-xs font-medium text-slate-400">Usa el botón + para abrir tu primer ticket.</p>
            </div>
            <button onClick={() => { setShowForm(true); setStep('category'); }}
              className="px-6 h-12 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <Plus className="size-4" /> Crear ticket
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-8 text-sm font-bold text-slate-400">No hay tickets con este filtro</div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
              {displayed.length} ticket{displayed.length !== 1 ? 's' : ''}
              {filter !== 'all' ? ` · ${STATUS_CFG[filter].label.toLowerCase()}s` : ''}
            </p>
            {displayed.map(ticket => {
              const sc  = STATUS_CFG[ticket.status] ?? STATUS_CFG.open;
              const cat = CATEGORIES.find(c => c.id === ticket.category);
              return (
                <button key={ticket.id} onClick={() => navigate(`/dashboard/support/ticket/${ticket.id}`)}
                  className="w-full bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
                >
                  <div className={`size-10 rounded-2xl ${sc.bg} ${sc.color} flex items-center justify-center shrink-0`}>
                    <MessageSquare className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{ticket.subject}</p>
                      {ticket.unread && <span className="size-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {ticket.last_message && (
                      <p className="text-xs font-medium text-slate-400 truncate">{ticket.last_message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                      {cat && (
                        <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${cat.color}`}>
                          <Tag className="size-2.5" /> {cat.label}
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-slate-300">
                        {timeAgo(ticket.updated_at ?? ticket.created_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserTickets;
