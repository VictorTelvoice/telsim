import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Loader2, Send } from 'lucide-react';
import AdminFicha360 from '../../components/admin/AdminFicha360';

export type UserRow = {
  id: string;
  nombre: string | null;
  email: string | null;
  pais: string | null;
  moneda: string | null;
  telegram_enabled: boolean;
  created_at: string | null;
  active_sims: number;
  ltv: number;
};

const COUNTRY_TO_CODE: Record<string, string> = {
  Chile: 'CL',
  Argentina: 'AR',
  México: 'MX',
  Colombia: 'CO',
  Perú: 'PE',
  España: 'ES',
  'United States': 'US',
  USA: 'US',
  Brazil: 'BR',
  Ecuador: 'EC',
};

function countryToFlag(pais: string | null): string {
  if (!pais || !String(pais).trim()) return '🌐';
  const name = String(pais).trim();
  const code = COUNTRY_TO_CODE[name] || (name.length === 2 ? name.toUpperCase() : null);
  if (!code || code.length !== 2) return '🌐';
  return code.split('').map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}

/**
 * Gestión de usuarios: nombre, email, pais, moneda, telegram_enabled. Bandera e indicador Telegram.
 */
const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fichaUserId, setFichaUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, nombre, email, pais, moneda, telegram_enabled, created_at, subscriptions(amount, subscription_status, status)')
      .order('created_at', { ascending: false });

    if (!usersData?.length) {
      setUsers([]);
      return;
    }

    const statusOf = (s: { subscription_status?: string; status?: string }) => (s.subscription_status ?? s.status ?? '').toLowerCase();
    setUsers(
      (usersData as {
        id: string;
        nombre?: string | null;
        email?: string | null;
        pais?: string | null;
        moneda?: string | null;
        telegram_enabled?: boolean;
        created_at?: string | null;
        subscriptions?: { amount: number | null; subscription_status?: string; status?: string }[];
      }[]).map((u) => {
        const subs = u.subscriptions ?? [];
        const active_sims = subs.filter((s) => statusOf(s) === 'active' || statusOf(s) === 'trialing').length;
        const ltv = subs.reduce((sum, s) => sum + (s.amount != null ? Number(s.amount) : 0), 0);
        return {
          id: u.id,
          nombre: u.nombre ?? null,
          email: u.email ?? null,
          pais: u.pais ?? null,
          moneda: u.moneda ?? null,
          telegram_enabled: Boolean(u.telegram_enabled),
          created_at: u.created_at ?? null,
          active_sims,
          ltv,
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
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-1">Usuarios</h2>
          <p className="text-sm text-slate-500">
            nombre, email, pais, moneda, telegram_enabled. Bandera e indicador de Telegram.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Nombre</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Email</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">País</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Moneda</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Telegram</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">SIMs</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">LTV</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setFichaUserId(u.id)}
                  className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 truncate max-w-[160px]" title={u.nombre ?? ''}>
                    {u.nombre || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 truncate max-w-[220px]" title={u.email ?? ''}>
                    {u.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                    <span className="mr-1.5" title={u.pais ?? ''}>{countryToFlag(u.pais)}</span>
                    {u.pais || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{u.moneda || '—'}</td>
                  <td className="px-4 py-3">
                    {u.telegram_enabled ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600" title="Bot de Telegram activo">
                        <Send size={14} />
                        <span className="text-xs font-medium">Sí</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{u.active_sims}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-700">${u.ltv.toFixed(2)}</td>
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
