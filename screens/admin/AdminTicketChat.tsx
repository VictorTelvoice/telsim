import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChevronLeft, Send, Loader2, AlertCircle, Clock, CheckCircle2,
  Lock, Tag, User, RefreshCw,
} from 'lucide-react';

type Message = {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  created_at: string;
};

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketCategory = 'technical' | 'billing' | 'sales' | 'account' | 'other';

interface TicketInfo {
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  created_at: string;
  user_id: string;
}

type AdminTicketChatProps = { backTo?: string };

const statusConfig: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  open:    { label: 'Abierto',    color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',   icon: <AlertCircle className="size-3" /> },
  pending: { label: 'Respondido', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20', icon: <Clock className="size-3" /> },
  closed:  { label: 'Resuelto',   color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',       icon: <CheckCircle2 className="size-3" /> },
};

const categoryLabels: Record<string, string> = {
  technical: 'Técnico', billing: 'Facturación', sales: 'Ventas',
  account: 'Cuenta', other: 'Otro',
};

const AdminTicketChat: React.FC<AdminTicketChatProps> = ({ backTo = '/admin/support' }) => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchTicketInfo = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('subject, status, category, created_at, user_id')
      .eq('id', ticketId)
      .single();
    if (!data) return;
    setTicket({
      subject: data.subject ?? '',
      status: (data.status as TicketStatus) ?? 'open',
      category: (data.category as TicketCategory) ?? null,
      created_at: data.created_at,
      user_id: data.user_id,
    });
    // Two-step: get user email from public.users (not auth.users)
    const { data: profileData } = await supabase
      .from('users')
      .select('email')
      .eq('id', data.user_id)
      .maybeSingle();
    setUserEmail(profileData?.email ?? null);
  }, [ticketId]);

  const fetchMessages = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from('support_messages')
      .select('id, ticket_id, sender_type, content, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTicketInfo(), fetchMessages()]).finally(() => setLoading(false));
  }, [fetchTicketInfo, fetchMessages]);

  useEffect(() => {
    if (!ticketId) return;
    const ch = supabase
      .channel(`admin-ticket-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const m = payload.new as Message;
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, scrollToBottom]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !ticketId || sending) return;
    setSending(true);
    try {
      const { data: inserted } = await supabase
        .from('support_messages')
        .insert({ ticket_id: ticketId, sender_type: 'admin', content: text })
        .select('id, ticket_id, sender_type, content, created_at')
        .single();
      if (inserted) setMessages(m => [...m, inserted as Message]);
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString(), status: 'pending' })
        .eq('id', ticketId);
      setTicket(prev => prev ? { ...prev, status: 'pending' } : prev);
      setReply('');
      textareaRef.current?.focus();
      if (session?.access_token) {
        fetch('/api/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'notify-ticket-reply', ticket_id: ticketId }),
        }).catch(() => {});
      }
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (newStatus: TicketStatus) => {
    if (!ticketId || updatingStatus) return;
    setUpdatingStatus(true);
    await supabase
      .from('support_tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    setTicket(prev => prev ? { ...prev, status: newStatus } : prev);
    setUpdatingStatus(false);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
  };

  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const label = formatDate(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.date === label) { last.msgs.push(msg); }
    else { acc.push({ date: label, msgs: [msg] }); }
    return acc;
  }, []);

  if (!ticketId) return null;

  const sc = statusConfig[ticket?.status ?? 'open'];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-3 shadow-sm">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(backTo)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shrink-0 mt-0.5"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-black text-slate-900 dark:text-white truncate leading-tight">
              {ticket?.subject || 'Cargando...'}
            </h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <User className="size-3" />
                <span className="truncate max-w-[200px]">{userEmail ?? '—'}</span>
              </div>
              {ticket?.category && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Tag className="size-3" />
                  <span>{categoryLabels[ticket.category] ?? ticket.category}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${sc.color} ${sc.bg}`}>
              {sc.icon} {sc.label}
            </span>
            <div className="flex gap-1">
              {(['open', 'pending', 'closed'] as TicketStatus[])
                .filter(s => s !== (ticket?.status ?? 'open'))
                .map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={updatingStatus}
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {updatingStatus ? <RefreshCw className="size-2.5 animate-spin inline" /> : statusConfig[s].label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 min-h-0">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="size-6 text-slate-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="size-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <AlertCircle className="size-6 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-400">Sin mensajes en este ticket aún.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map(({ date, msgs }) => (
              <div key={date}>
                <div className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{date}</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  {msgs.map(msg => {
                    const isAdmin = msg.sender_type === 'admin';
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        {!isAdmin && (
                          <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                            <User className="size-3.5 text-slate-500 dark:text-slate-400" />
                          </div>
                        )}
                        <div className="max-w-[80%]">
                          {!isAdmin && (
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">
                              {userEmail ?? 'Cliente'}
                            </p>
                          )}
                          <div className={`px-4 py-3 rounded-2xl ${
                            isAdmin
                              ? 'bg-primary text-white rounded-tr-sm shadow-md shadow-primary/20'
                              : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                          }`}>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-[9px] font-bold mt-1.5 text-right ${isAdmin ? 'text-white/60' : 'text-slate-400'}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 mt-3">
        {ticket?.status === 'closed' ? (
          <div className="flex items-center justify-center gap-2 h-11 text-xs font-bold text-slate-400">
            <Lock className="size-4" />
            <span>Ticket cerrado — cambia el estado para responder</span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={reply}
              onChange={e => {
                setReply(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
              }}
              placeholder="Escribe tu respuesta al cliente..."
              rows={1}
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-primary transition-all resize-none overflow-hidden leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-500"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              className="size-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 disabled:opacity-40 transition-all active:scale-90 shrink-0"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTicketChat;
