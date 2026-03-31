import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, Users, History, MessageSquare, ChevronLeft, UserCircle, BellRing, LayoutTemplate, Inbox } from 'lucide-react';
import AdminGlobalSearch from '../../screens/admin/AdminGlobalSearch';

const nav = [
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'inventory', label: 'Inventario', icon: Database },
  { to: 'users', label: 'Usuarios', icon: UserCircle },
  { to: 'subscriptions', label: 'Suscripciones', icon: Users },
  { to: 'incoming-sms', label: 'SMS Entrantes', icon: Inbox },
  { to: 'logs', label: 'Logs de Sistema', icon: History },
  { to: 'support', label: 'Soporte / Tickets', icon: MessageSquare },
  { to: 'notifications', label: 'Notificaciones', icon: BellRing },
  { to: 'templates', label: 'Plantillas', icon: LayoutTemplate },
];

/**
 * Layout para todas las rutas de administración: sidebar estrecha (bg-slate-900) + área principal (bg-slate-50).
 */
const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar lateral estrecha — azul casi negro, todo el alto */}
      <aside className="w-52 flex-shrink-0 h-screen sticky top-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={() => navigate('/web')}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium w-full"
          >
            <ChevronLeft size={18} />
            Salir al Dashboard
          </button>
        </div>
        <nav className="p-3 flex-1 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === 'overview' ? true : to !== 'support'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Área principal — barra de búsqueda global + contenido */}
      <main className="flex-1 min-w-0 min-h-screen bg-slate-50 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-end px-4 py-2 bg-white border-b border-slate-200 shadow-sm">
          <AdminGlobalSearch />
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
