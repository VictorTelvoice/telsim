import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, MessageSquare, Package, CreditCard, ScrollText, BellRing, LayoutTemplate, Star } from 'lucide-react';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

interface AdminSidebarProps {
  unreadTickets?: number;
}

const nav = [
  { to: 'inventory',     label: 'Inventario',    icon: Package },
  { to: 'subscriptions', label: 'Suscripciones', icon: CreditCard },
  { to: 'content',       label: 'CMS',           icon: FileText },
  { to: 'notifications', label: 'Notificaciones',icon: BellRing },
  { to: 'templates',     label: 'Plantillas',     icon: LayoutTemplate },
  { to: 'support',       label: 'Soporte',        icon: MessageSquare, badgeKey: 'support' },
  { to: 'ratings',       label: 'Encuestas',      icon: Star },
  { to: 'logs',          label: 'Logs',           icon: ScrollText },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ unreadTickets = 0 }) => {
  const { user } = useAuth();

  if ((user?.id || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
    return null;
  }

  return (
    <>
      <aside className="w-56 border-r border-slate-800 bg-slate-900/50 flex-shrink-0 hidden sm:block">
        <nav className="p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, badgeKey }) => (
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
              <span className="flex-1">{label}</span>
              {badgeKey === 'support' && unreadTickets > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-sm shadow-red-500/40">
                  {unreadTickets > 99 ? '99+' : unreadTickets}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur flex justify-around py-2 px-2 safe-pb z-30">
        {nav.map(({ to, label, icon: Icon, badgeKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to !== 'support'}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-500'
              }`
            }
          >
            <div className="relative">
              <Icon size={18} />
              {badgeKey === 'support' && unreadTickets > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center px-0.5">
                  {unreadTickets > 9 ? '9+' : unreadTickets}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default AdminSidebar;
