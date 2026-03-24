import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Loader2, Pencil, UserMinus, User, LogIn } from 'lucide-react';
import AdminFicha360 from '../../components/admin/AdminFicha360';
import { useImpersonation } from '../../contexts/ImpersonationContext';

const USERS_STORAGE_KEY = 'telsim_admin_users_state';

export type UserRow = {
  id: string;
  nombre: string | null;
  email: string | null;
  pais: string | null;
  telegram_enabled: boolean;
  created_at: string | null;
  active_sims: number;
  ltv: number;
  avatar_url?: string | null;
  phone?: string | null;
  moneda?: string | null;
};

function formatDDMMYYYY(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getInitials(nombre: string | null, email: string | null): string {
  if (nombre && nombre.trim()) {
    const parts = nombre.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) return email.slice(0, 2).toUpperCase();
  return '?';
}

/**
 * Gestión de usuarios: nombre, email, pais, moneda, telegram_enabled. Bandera e indicador Telegram.
 */
type PersistedState = { searchQuery?: string; columnOrder?: string[] };

const UserManager: React.FC = () => {
  const { setImpersonation } = useImpersonation();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      const parsed: PersistedState = raw ? JSON.parse(raw) : {};
      return parsed.searchQuery ?? '';
    } catch {
      return '';
    }
  });
  const [fichaUserId, setFichaUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const searchFromUrl = searchParams.get('search') ?? searchParams.get('id') ?? '';
  useEffect(() => {
    if (searchFromUrl.trim()) setSearchQuery((q) => (q !== searchFromUrl.trim() ? searchFromUrl.trim() : q));
  }, [searchFromUrl]);

  useEffect(() => {
    try {
      const prev: PersistedState = (() => {
        try {
          const r = localStorage.getItem(USERS_STORAGE_KEY);
          return r ? JSON.parse(r) : {};
        } catch {
          return {};
        }
      })();
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({ ...prev, searchQuery }));
    } catch (_) {}
  }, [searchQuery]);

  const copyUuid = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => { setToast('UUID copiado'); setTimeout(() => setToast(null), 1500); });
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data: usersData, error } = await supabase
      .from('users')
      .select('id, nombre, email, pais, telegram_enabled, created_at, avatar_url, phone, moneda')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[UserManager] Error cargando usuarios:', error);
      setUsers([]);
      return;
    }

    if (!usersData?.length) {
      setUsers([]);
      return;
    }

    const userIds = (usersData as { id: string }[]).map((u) => u.id);
    const [slotsRes, subsRes] = await Promise.all([
      supabase.from('slots').select('assigned_to').not('assigned_to', 'is', null),
      supabase.from('subscriptions').select('user_id, amount').in('user_id', userIds),
    ]);
    const countByUser: Record<string, number> = {};
    (slotsRes.data || []).forEach((s: { assigned_to?: string }) => {
      const uid = s.assigned_to;
      if (uid) countByUser[uid] = (countByUser[uid] || 0) + 1;
    });
    const ltvByUser: Record<string, number> = {};
    (subsRes.data || []).forEach((s: { user_id?: string; amount?: number }) => {
      const uid = s.user_id;
      if (uid) ltvByUser[uid] = (ltvByUser[uid] || 0) + (Number(s.amount) || 0);
    });

    setUsers(
      (usersData as {
        id: string;
        nombre?: string | null;
        email?: string | null;
        pais?: string | null;
        telegram_enabled?: boolean;
        created_at?: string | null;
        avatar_url?: string | null;
        phone?: string | null;
        moneda?: string | null;
      }[]).map((u) => ({
        id: u.id,
        nombre: u.nombre ?? null,
        email: u.email ?? null,
        pais: u.pais ?? null,
        telegram_enabled: Boolean(u.telegram_enabled),
        created_at: u.created_at ?? null,
        active_sims: countByUser[u.id] ?? 0,
        ltv: ltvByUser[u.id] ?? 0,
        avatar_url: u.avatar_url ?? null,
        phone: u.phone ?? null,
        moneda: u.moneda ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  const q = searchQuery.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter(
        (u) =>
          (u.id || '').toLowerCase().includes(q) ||
          (u.nombre || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      )
    : users;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 py-6 px-2 sm:px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-black mb-0">Usuarios</h2>
          <p className="text-sm text-slate-800 mt-1">Usa la lupa del header (o Cmd+K) para buscar por nombre, email o UUID.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse text-sm text-slate-950">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-800 px-4 py-3 w-14">Avatar</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-800 px-4 py-3">Nombre / Email</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-800 px-4 py-3">Phone</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-800 px-4 py-3">Moneda</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-800 px-4 py-3">Registro</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-800 px-4 py-3 text-right">LTV</th>
                <th className="text-[10px] font-black uppercase tracking-wider text-slate-800 px-4 py-3 text-right w-28">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-slate-200 hover:bg-slate-50/80 text-slate-950"
                >
                  <td className="px-4 py-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-200" />
                    ) : (
                      <span className="inline-flex w-9 h-9 rounded-full bg-slate-200 text-slate-950 text-xs font-semibold items-center justify-center">
                        {getInitials(u.nombre, u.email)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-[220px]">
                    <div className="font-bold text-black truncate" title={u.nombre ?? ''}>{u.nombre || '—'}</div>
                    <Link
                      to={`/admin/inventory?user=${encodeURIComponent(u.id)}`}
                      className="text-slate-950 hover:underline truncate block font-medium"
                      title={`Ver slots de ${u.email || u.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {u.email || u.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-950">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-950">{u.moneda || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-950 tabular-nums">{formatDDMMYYYY(u.created_at)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-800 text-right tabular-nums">${u.ltv.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button type="button" onClick={(e) => copyUuid(u.id, e)} title="Copiar UUID" className="p-1.5 rounded text-slate-700 hover:text-slate-950 hover:bg-slate-100">
                        <User className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setImpersonation(u.id, u.nombre); }} title="Login As (ver como este usuario)" className="p-1.5 rounded text-slate-700 hover:text-slate-950 hover:bg-slate-100">
                        <LogIn className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setFichaUserId(u.id); }} title="Editar / Ficha 360" className="p-1.5 rounded text-slate-700 hover:text-slate-950 hover:bg-slate-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" title="Banear / Eliminar" className="p-1.5 rounded text-slate-700 hover:text-red-700 hover:bg-red-50">
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && users.length === 0 && (
        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
          <Users size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-900 font-medium">No hay usuarios registrados.</p>
        </div>
      )}
      {!loading && users.length > 0 && filteredUsers.length === 0 && (
        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
          <p className="text-slate-900 font-medium">Ningún usuario coincide con la búsqueda.</p>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm shadow-lg z-50">
          {toast}
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
