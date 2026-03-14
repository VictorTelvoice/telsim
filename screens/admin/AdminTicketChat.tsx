import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, Send, Loader2 } from 'lucide-react';

type Message = {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  created_at: string;
};

type AdminTicketChatProps = { backTo?: string };

const AdminTicketChat: React.FC<AdminTicketChatProps> = ({ backTo = '/admin/tickets' }) => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticketId) return;
    (async () => {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('subject, user_id')
        .eq('id', ticketId)
        .single();
      if (ticket) {
        setSubject((ticket as { subject: string }).subject ?? '');
        const { data: user } = await supabase.from('users').select('email').eq('id', (ticket as { user_id: string }).user_id).single();
        setUserEmail((user as { email: string | null } | null)?.email ?? null);
      }
    })();
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('support_messages')
        .select('id, ticket_id, sender_type, content, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);
      setLoading(false);
    })();
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      if (inserted) setMessages((m) => [...m, inserted as Message]);
      await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
      setReply('');

      // Notificar por Telegram al cliente si tiene bot configurado
      if (session?.access_token) {
        fetch('/api/support/notify-ticket-reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ticket_id: ticketId }),
        }).catch(() => {});
      }
    } finally {
      setSending(false);
    }
  };

  if (!ticketId) return null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(backTo)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{subject || 'Ticket'}</h2>
          <p className="text-xs text-slate-400">{userEmail ?? ticketId}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="text-slate-500 animate-spin" />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2 ${
                  msg.sender_type === 'admin' ? 'bg-emerald-600/80 text-white' : 'bg-slate-800 text-slate-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleString('es-CL')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Escribe tu respuesta..."
          rows={2}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendReply();
            }
          }}
        />
        <button
          onClick={sendReply}
          disabled={!reply.trim() || sending}
          className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 self-end"
        >
          {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
};

export default AdminTicketChat;
