import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, CreditCard, Shield, Settings, Search, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { resolveAvatarUrlForUi } from '../../../lib/resolveAvatarUrl';

const nav = [
  { to: 'inventory', label: 'Inventario', icon: LayoutGrid },
  { to: 'subscriptions', label: 'Suscripciones', icon: Users },
  { to: 'support', label: 'Soporte', icon: CreditCard },
  { to: 'logs', label: 'Logs', icon: Shield },
  { to: 'content', label: 'CMS', icon: Settings },
];

/**
 * Shell del panel admin: sidebar oscura (bg-slate-950), header blanco con buscador y perfil,
 * contenedor bg-slate-50 con contenido en tarjetas blancas.
 */
const AdminShell: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const resolvedAvatarUrl = resolveAvatarUrlForUi(user);
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => {
    setAvatarError(false);
  }, [resolvedAvatarUrl]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar: panel lateral oscuro con íconos */}
      <aside className="w-56 flex-shrink-0 h-screen sticky top-0 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <button
            onClick={() => navigate('/web')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium w-full"
          >
            <ChevronLeft size={18} />
            Salir
          </button>
        </div>
        <nav className="p-3 flex-1 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to !== 'support'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header: blanco limpio, buscador global + perfil */}
        <header className="sticky top-0 z-10 flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold overflow-hidden">
                {resolvedAvatarUrl && !avatarError ? (
                  <img
                    src={resolvedAvatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700 truncate max-w-[120px]">{userName}</span>
            </div>
          </div>
        </header>

        {/* Contenedor: fondo slate-50, contenido en tarjeta blanca con bordes y sombra suave */}
        <main className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[calc(100vh-12rem)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
