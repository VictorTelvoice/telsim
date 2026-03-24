import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ChevronLeft, MessageSquare, X } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { supabase } from '../../lib/supabase';

interface TicketToast {
  id: string;
  subject: string;
  ticketId: string;
  senderEmail?: string;
}

const AdminShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<TicketToast[]>([]);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
    const timer = toastTimers.current.get(toastId);
    if (timer) { clearTimeout(timer); toastTimers.current.delete(toastId); }
  }, []);

  const addToast = useCallback((toast: TicketToast) => {
    setToasts(prev => {
      if (prev.some(t => t.id === toast.id)) return prev;
      return [...prev, toast];
    });
    const timer = setTimeout(() => dismissToast(toast.id), 7000);
    toastTimers.current.set(toast.id, timer);
  }, [dismissToast]);

  useEffect(() => {
    // Fetch initial unread count (open tickets with recent messages)
    const fetchUnread = async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      setUnreadCount((data as unknown as { count: number })?.count ?? 0);
    };
    fetchUnread();

    // Realtime: listen for new user messages across all tickets
    const ch = supabase
      .channel('admin-shell-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        async (payload) => {
          const msg = payload.new as { ticket_id: string; sender_type: string; id: string };
          // Only notify for user messages (not admin's own replies)
          if (msg.sender_type !== 'user') return;

          // Don't toast if already viewing that ticket
          const isViewingTicket = location.pathname.includes(msg.ticket_id);
          if (isViewingTicket) return;

          setUnreadCount(n => n + 1);

          // Fetch ticket subject + user email for toast
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('subject, user_id')
            .eq('id', msg.ticket_id)
            .single();

          let email: string | undefined;
          if (ticket?.user_id) {
            const { data: profile } = await supabase
              .from('users')
              .select('email')
              .eq('id', ticket.user_id)
              .maybeSingle();
            email = profile?.email ?? undefined;
          }

          addToast({
            id: msg.id,
            subject: ticket?.subject ?? 'Nuevo mensaje',
            ticketId: msg.ticket_id,
            senderEmail: email,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        async (payload) => {
          const ticket = payload.new as { id: string; subject: string; user_id: string };
          setUnreadCount(n => n + 1);

          let email: string | undefined;
          const { data: profile } = await supabase
            .from('users').select('email').eq('id', ticket.user_id).maybeSingle();
          email = profile?.email ?? undefined;

          addToast({
            id: `ticket-${ticket.id}`,
            subject: ticket.subject ?? 'Nuevo ticket',
            ticketId: ticket.id,
            senderEmail: email,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [addToast, location.pathname]);

  // Reset unread count when visiting support page
  useEffect(() => {
    if (location.pathname.includes('/admin/support')) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur flex items-center gap-4 px-4 py-3">
        <button
          onClick={() => navigate('/web')}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="text-emerald-500" />
          <h1 className="text-lg font-black text-white">Dashboard Admin Integral</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar unreadTickets={unreadCount} />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 sm:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── Toast notifications ── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 w-80 animate-slide-up"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nuevo mensaje de ticket</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">{toast.subject}</p>
              {toast.senderEmail && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{toast.senderEmail}</p>
              )}
              <button
                onClick={() => { dismissToast(toast.id); navigate(`/admin/support/${toast.ticketId}`); }}
                className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
              >
                Ver ticket →
              </button>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors shrink-0 -mt-0.5 -mr-0.5"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AdminShell;
