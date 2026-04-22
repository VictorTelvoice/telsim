'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Send, Loader2, CheckCircle2, Clock, AlertCircle,
  Lock, Tag, MessageSquare, Shield
} from 'lucide-react';
import { replyToTicket, closeTicket, type TicketStatus, type TicketCategory } from '@/actions/supportActions';

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  open:    { label: 'Abierto',    color: 'text-blue-500',    bg: 'bg-blue-500/10',    icon: <AlertCircle  size={14} /> },
  pending: { label: 'Respondido', color: 'text-amber-500',   bg: 'bg-amber-500/10',   icon: <Clock        size={14} /> },
  closed:  { label: 'Cerrado',    color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: <CheckCircle2 size={14} /> },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical: 'Soporte Técnico',
  billing:   'Facturación',
  sales:     'Ventas',
  account:   'Mi Cuenta',
  other:     'Otro',
};

interface Message {
  id: string;
  content: string;
  senderType: string;
  createdAt: string;
}

interface TicketDetailProps {
  initialTicket: {
    id: string;
    subject: string;
    category: TicketCategory;
    status: TicketStatus;
    createdAt: string;
    messages: Message[];
  };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function TicketDetail({ initialTicket }: TicketDetailProps) {
  const [ticket, setTicket] = useState(initialTicket);
  const [reply, setReply] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isClosing, startCloseTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sc = STATUS_CFG[ticket.status];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.messages]);

  const handleReply = () => {
    if (!reply.trim() || isPending) return;
    const optimisticMsg: Message = {
      id: 'temp-' + Date.now(),
      content: reply.trim(),
      senderType: 'user',
      createdAt: new Date().toISOString(),
    };
    const replyText = reply.trim();
    setReply('');
    setError(null);

    startTransition(async () => {
      try {
        await replyToTicket(ticket.id, replyText);
        setTicket(prev => ({
          ...prev,
          status: 'open',
          messages: [...prev.messages, optimisticMsg],
        }));
      } catch (e: any) {
        setError(e?.message || 'Error enviando respuesta.');
      }
    });
  };

  const handleClose = () => {
    if (!confirm('¿Cerrar este ticket? No podrás enviar más mensajes.')) return;
    startCloseTransition(async () => {
      await closeTicket(ticket.id);
      setTicket(prev => ({ ...prev, status: 'closed' }));
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-h-[900px] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-shrink-0">
        <div className="flex items-start gap-4 min-w-0">
          <Link href="/app/support" className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex-shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              {ticket.subject}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                {sc.icon} {sc.label}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                <Tag size={10} /> {CATEGORY_LABELS[ticket.category]}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-600">
                #{ticket.id.slice(-6).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {ticket.status !== 'closed' && (
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <Lock size={12} />
            Cerrar ticket
          </button>
        )}
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1 no-scrollbar">
        {ticket.messages.map((msg, idx) => {
          const isUser = msg.senderType === 'user';
          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isUser ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {isUser ? <MessageSquare size={14} /> : <Shield size={14} />}
              </div>
              <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-5 py-3.5 rounded-[1.5rem] ${
                  isUser
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-[var(--card)] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                }`}>
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                </div>
                <span className={`text-[9px] font-bold text-slate-500 dark:text-slate-600 uppercase px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                  {isUser ? 'Tú' : 'Soporte Telsim'} · {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      {ticket.status === 'closed' ? (
        <div className="flex-shrink-0 mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
          <Lock size={16} className="text-slate-400" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Este ticket está cerrado. Abre uno nuevo si necesitas más ayuda.</p>
          <Link href="/app/support" className="flex-shrink-0 text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
            Nuevo ticket →
          </Link>
        </div>
      ) : (
        <div className="flex-shrink-0 mt-4">
          {error && <p className="text-xs font-bold text-red-500 mb-2 px-1">{error}</p>}
          <div className="flex items-end gap-3 bg-[var(--card)] border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-[var(--shadow)]">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
              placeholder="Escribe tu respuesta... (Enter para enviar)"
              rows={3}
              maxLength={2000}
              className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none resize-none leading-relaxed px-2 py-1"
            />
            <button
              onClick={handleReply}
              disabled={!reply.trim() || isPending}
              className="flex items-center justify-center w-12 h-12 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 flex-shrink-0 self-end"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-600 mt-2 text-center uppercase tracking-widest">
            Nuestro equipo responde en menos de 4 horas en días hábiles
          </p>
        </div>
      )}
    </div>
  );
}
