import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, MessageSquare, Package, CreditCard, ScrollText } from 'lucide-react';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

const nav = [
  { to: 'inventory', label: 'Inventario', icon: Package },
  { to: 'subscriptions', label: 'Suscripciones', icon: CreditCard },
  { to: 'content', label: 'CMS', icon: FileText },
  { to: 'support', label: 'Soporte', icon: MessageSquare },
  { to: '/dashboard/admin/logs', label: 'Logs', icon: ScrollText, external: true },
];

/**
 * Sidebar lateral del Dashboard Admin. Solo se muestra para el UID del administrador.
 */
const AdminSidebar: React.FC = () => {
  const { user } = useAuth();

  if (user?.id !== ADMIN_UID) {
    return null;
  }

  return (
    <>
      <aside className="w-56 border-r border-slate-800 bg-slate-900/50 flex-shrink-0 hidden sm:block">
        <nav className="p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, external }) =>
            external ? (
              <a
                key={to}
                href={`#${to}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
              >
                <Icon size={18} />
                {label}
              </a>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to !== 'support'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          )}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur flex justify-around py-2 px-2 safe-pb z-30">
        {nav.filter((n) => !n.external).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to !== 'support'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-500'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default AdminSidebar;
