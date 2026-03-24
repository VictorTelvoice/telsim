import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
} from 'lucide-react';

type Message = {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  created_at: string;
};

type TicketStatus = 'open' | 'pending' | 'closed';

const statusConfig = {
  open: { label: 'Abierto', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: <AlertCircle className="size-3" /> },
  pending: { label: 'Respondido', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: <Clock className="size-3" /> },
  closed: { label: 'Cerrado', color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', icon: <Lock className="size-3" /> },
};

const UserTicketChat: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<TicketStatus>('open');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('subject, status, category, created_at')
      .eq('id', ticketId)
      .single();
    if (data) {
      setSubject(data.subject ?? '');
      setStatus((data.status as TicketStatus) ?? 'open');
    }
  }, [ticketId]);

  const fetchMessages = useCallback(async () => {
    if (!ticketId || !user?.id) return;
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, ticket_id, sender_type, content, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (!error) {
      setMessages((data as Message[]) ?? []);
    }
  }, [ticketId, user?.id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTicket(), fetchMessages()]).finally(() => {
      setLoading(false);
    });
  }, [fetchTicket, fetchMessages]);

  // Realtime: suscribirse a nuevos mensajes del admin
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Si es respuesta del admin, actualizar status a pending
          if (newMsg.sender_type === 'admin') {
            setStatus('pending');
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const text = reply.trim();
    if (!text || !ticketId || !user?.id || sending || status === 'closed') return;
    setSending(true);
    try {
      const { data: inserted } = await supabase
        .from('support_messages')
        .insert({ ticket_id: ticketId, sender_type: 'user', content: text })
        .select('id, ticket_id, sender_type, content, created_at')
        .single();
      if (inserted) setMessages((m) => [...m, inserted as Message]);
      // Actualizar updated_at del ticket para que aparezca arriba en el admin
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString(), status: 'open' })
        .eq('id', ticketId);
      setStatus('open');
      setReply('');
      textareaRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
  };

  // Agrupar mensajes por fecha
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const dateLabel = formatDate(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.date === dateLabel) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateLabel, msgs: [msg] });
    }
    return acc;
  }, []);

  const sc = statusConfig[status] ?? statusConfig.open;

  return (
    <div className="flex flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white" style={{ height: 'calc(100dvh - 5rem)' }}>
      {/* HEADER */}
      <header className="shrink-0 sticky top-0 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/support/tickets')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate text-slate-900 dark:text-white leading-tight">
              {subject || 'Ticket de soporte'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${sc.color}`}>
                {sc.icon} {sc.label}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MENSAJES */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="size-6 text-slate-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="size-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <CheckCircle2 className="size-6 text-primary" />
            </div>
            <p className="text-xs font-bold text-slate-400">Tu ticket fue enviado. En breve verás el historial de mensajes aquí.</p>
            <button
              onClick={() => fetchMessages()}
              className="text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              Recargar
            </button>
          </div>
        ) : (
          groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              {/* Separador de fecha */}
              <div className="flex items-center gap-3 py-4">
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{date}</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              </div>

              <div className="space-y-2">
                {msgs.map((msg) => {
                  const isUser = msg.sender_type === 'user';
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-md">
                          <span className="text-[10px] font-black text-white">T</span>
                        </div>
                      )}
                      <div className={`max-w-[78%] ${isUser ? '' : ''}`}>
                        {!isUser && (
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">
                            Soporte Telsim
                          </p>
                        )}
                        <div
                          className={`px-4 py-3 rounded-2xl ${
                            isUser
                              ? 'bg-primary text-white rounded-tr-sm shadow-md shadow-primary/20'
                              : 'bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-white rounded-tl-sm shadow-sm'
                          }`}
                        >
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[9px] font-bold mt-1.5 text-right ${isUser ? 'text-white/60' : 'text-slate-300'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 pt-3 pb-4">
        {status === 'closed' ? (
          <div className="flex items-center justify-center gap-2 h-12 text-xs font-bold text-slate-400">
            <Lock className="size-4" />
            <span>Este ticket está cerrado</span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={reply}
              onChange={(e) => {
                setReply(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Escribe tu mensaje..."
              rows={1}
              className="flex-1 px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:border-primary transition-all resize-none overflow-hidden leading-relaxed placeholder:text-slate-300"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!reply.trim() || sending}
              className="size-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 disabled:opacity-40 transition-all active:scale-90 shrink-0"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTicketChat;
