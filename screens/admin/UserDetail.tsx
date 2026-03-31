import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, ChevronLeft, User, CreditCard, MessageSquare, Calendar, Mail, Bot } from 'lucide-react';

type TimelineItem = {
  id: string;
  type: 'registration' | 'payment' | 'sms';
  label: string;
  date: string;
  detail?: string;
};

/**
 * Detalle de usuario en panel admin: datos básicos + Timeline de Actividad (audit_logs + último SMS).
 */
const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

const UserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string | null; created_at: string | null } | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; created_at: string; channel: string; event: string; status: string; error_message?: string | null }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!userId) return;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, subscriptions(*), sms_logs(*)')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userData) {
      setUser(null);
      setTimeline([]);
      return;
    }

    const u = userData as {
      id: string;
      email: string | null;
      created_at: string | null;
      subscriptions?: unknown[];
      sms_logs?: { id: string; received_at: string; sender?: string; content?: string; extracted_code?: string }[];
    };
    setUser({ id: u.id, email: u.email ?? null, created_at: u.created_at ?? null });
    const email = u.email?.trim()?.toLowerCase() || '';

    const items: TimelineItem[] = [];

    if (u.created_at) {
      items.push({
        id: 'reg',
        type: 'registration',
        label: 'Se registró',
        date: u.created_at,
        detail: 'Cuenta creada',
      });
    }

    if (email) {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const auditRes = await fetch('/api/manage', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'list-audit-logs',
          emailSearch: email,
          eventTypes: ['PAYMENT_RECEIVED', 'SIM_ACTIVATED'],
          limit: 50,
          accessToken: session?.access_token || null,
        }),
      });
      const auditBody = await auditRes.json().catch(() => ({}));
      const auditData = auditRes.ok ? (((auditBody as { logs?: unknown[] }).logs) || []) as Array<{ id: string; event_type: string; message: string | null; created_at: string }> : [];

      auditData.forEach((a: { id: string; event_type: string; message: string | null; created_at: string }) => {
        const label = a.event_type === 'SIM_ACTIVATED' ? 'SIM activada (Stripe)' : a.event_type === 'PAYMENT_RECEIVED' ? 'Pago recibido (Stripe)' : 'Evento Stripe';
        items.push({
          id: a.id,
          type: 'payment',
          label,
          date: a.created_at,
          detail: a.message || undefined,
        });
      });
    }

    const smsList = u.sms_logs ?? [];
    const lastSms = smsList.length > 0
      ? smsList.slice().sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())[0]
      : null;
    if (lastSms) {
      items.push({
        id: `sms-${lastSms.id}`,
        type: 'sms',
        label: 'Último SMS recibido',
        date: lastSms.received_at,
        detail: lastSms.extracted_code ? `Código: ${lastSms.extracted_code}` : lastSms.sender ? `De: ${lastSms.sender}` : undefined,
      });
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTimeline(items);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchDetail().finally(() => setLoading(false));
  }, [fetchDetail]);

  const fetchNotifications = useCallback(async () => {
    if (!userId || !currentUser?.id || (currentUser.id || '').toLowerCase() !== ADMIN_UID.toLowerCase()) return;
    setNotificationsLoading(true);
    try {
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list-notification-history',
          userId: currentUser.id,
          filterUserId: userId,
          limit: 50,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.list)) setNotifications(data.list);
      else setNotifications([]);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [userId, currentUser?.id]);

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id, fetchNotifications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-slate-500">Usuario no encontrado.</p>
        <button onClick={() => navigate('/admin/users')} className="mt-4 text-sm font-medium text-primary hover:underline">
          Volver a Usuarios
        </button>
      </div>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="max-w-3xl mx-auto p-4">
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
      >
        <ChevronLeft size={18} />
        Volver a Usuarios
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 mb-6">
        <h2 className="text-lg font-black text-slate-900 mb-1">Detalle de usuario</h2>
        <p className="text-sm text-slate-500 mb-4">{user.email || '—'}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-500">ID</dt>
          <dd className="font-mono text-slate-700 truncate" title={user.id}>{user.id}</dd>
          <dt className="text-slate-500">Fecha de registro</dt>
          <dd className="text-slate-700">
            {user.created_at ? formatDate(user.created_at) : '—'}
          </dd>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-base font-black text-slate-900 mb-4">Timeline de Actividad</h3>
        <p className="text-sm text-slate-500 mb-4">
          Cuándo se registró, cuándo pagó (Stripe) y cuándo recibió su último SMS de OTP para soporte técnico.
        </p>

        {timeline.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">No hay eventos en audit_logs ni SMS para este usuario.</p>
        ) : (
          <ul className="space-y-0">
            {timeline.map((item) => (
              <li key={item.id} className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100">
                  {item.type === 'registration' && <User size={16} className="text-slate-600" />}
                  {item.type === 'payment' && <CreditCard size={16} className="text-emerald-600" />}
                  {item.type === 'sms' && <MessageSquare size={16} className="text-blue-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  {item.detail && <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={12} />
                  {formatDate(item.date)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 mt-6">
        <h3 className="text-base font-black text-slate-900 mb-4">Notificaciones Recientes</h3>
        <p className="text-sm text-slate-500 mb-4">
          Historial de correos y mensajes de Telegram enviados a este usuario.
        </p>
        {notificationsLoading ? (
          <p className="text-slate-500 text-sm py-4 flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Cargando…</p>
        ) : notifications.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">No hay notificaciones registradas para este usuario.</p>
        ) : (
          <ul className="space-y-0">
            {notifications.map((row) => (
              <li key={row.id} className="flex gap-4 py-3 border-b border-slate-100 last:border-0 items-center">
                <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100">
                  {row.channel === 'email' ? <Mail size={16} className="text-slate-600" /> : <Bot size={16} className="text-sky-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{row.channel === 'email' ? 'Email' : 'Telegram'} · {row.event}</p>
                  {row.status === 'error' && row.error_message && (
                    <p className="text-xs text-red-600 mt-0.5" title={row.error_message}>{row.error_message.slice(0, 80)}{row.error_message.length > 80 ? '…' : ''}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <span
                    title={row.status === 'error' && row.error_message ? row.error_message : undefined}
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {row.status === 'sent' ? 'Enviado' : 'Error'}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserDetail;
