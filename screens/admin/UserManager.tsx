import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Loader2 } from 'lucide-react';
import AdminFicha360 from '../../components/admin/AdminFicha360';

export type UserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  active_sims: number;
  ltv: number;
  last_seen: string | null;
};

/**
 * Gestión de usuarios: Email, Fecha de registro, SIMs activas, Gasto total (LTV), Última conexión.
 */
const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fichaUserId, setFichaUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data: usersData } = await supabase
      .from('users')
      .select('*, subscriptions(*)')
      .order('created_at', { ascending: false });

    if (!usersData?.length) {
      setUsers([]);
      return;
    }

    setUsers(
      (usersData as { id: string; email: string | null; created_at: string | null; subscriptions?: { user_id: string; amount: number | null; status: string }[] }[]).map((u) => {
        const subs = u.subscriptions ?? [];
        const active_sims = subs.filter((s) => s.status === 'active' || s.status === 'trialing').length;
        const ltv = subs.reduce((sum, s) => sum + (s.amount != null ? Number(s.amount) : 0), 0);
        return {
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at ?? null,
          active_sims,
          ltv,
          last_seen: null,
        };
      })
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-xl font-black text-slate-900 mb-1">Usuarios</h2>
      <p className="text-sm text-slate-500 mb-6">
        Email, fecha de registro, número de SIMs activas, gasto total (LTV) y última conexión.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Email</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Fecha de registro</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">SIMs activas</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Gasto total (LTV)</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Última conexión</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setFichaUserId(u.id)}
                  className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 truncate max-w-[280px]" title={u.email ?? ''}>
                    {u.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{u.active_sims}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                    ${u.ltv.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                    {u.last_seen ? new Date(u.last_seen).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
          <Users size={40} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500">No hay usuarios registrados.</p>
        </div>
      )}

      <AdminFicha360
        open={fichaUserId !== null}
        onClose={() => setFichaUserId(null)}
        userId={fichaUserId}
      />
    </div>
  );
};

export default UserManager;
