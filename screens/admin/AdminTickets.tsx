import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MessageSquare, ChevronRight, Loader2 } from 'lucide-react';

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  user_email?: string | null;
};

const AdminTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('*, users(*)')
      .in('status', ['open', 'pending'])
      .order('updated_at', { ascending: false });

    if (ticketsError || !ticketsData?.length) {
      setTickets([]);
      return;
    }

    setTickets(
      (ticketsData as (SupportTicket & { users?: { id: string; email: string | null } | null })[]).map((t) => ({
        id: t.id,
        user_id: t.user_id,
        subject: t.subject,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
        user_email: t.users?.email ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTickets().finally(() => setLoading(false));
  }, [fetchTickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-black text-white mb-2">Centro de Soporte</h2>
      <p className="text-sm text-slate-400 mb-6">Tickets abiertos. Entra a uno para responder al cliente.</p>

      {tickets.length === 0 ? (
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-8 text-center">
          <MessageSquare size={40} className="mx-auto text-slate-500 mb-3" />
          <p className="text-slate-400">No hay tickets abiertos</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => navigate(`/admin/tickets/${t.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{t.subject || 'Sin asunto'}</p>
                  <p className="text-xs text-slate-400">{t.user_email ?? t.user_id}</p>
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-500">{t.status}</span>
                <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminTickets;
