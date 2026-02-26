import { useNavigate } from 'react-router-dom';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; plan: string };
  unreadMessages: number;
  unreadNotifications: number;
  currentLang: string;
  onLangChange: (lang: string) => void;
}

export default function SideDrawer({
  isOpen, onClose, user, unreadMessages, unreadNotifications, currentLang, onLangChange
}: SideDrawerProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const NavItem = ({
    icon, title, sub, onClick, active = false, right
  }: {
    icon: React.ReactNode; title: string; sub: string;
    onClick: () => void; active?: boolean; right?: React.ReactNode;
  }) => (
    <div
      onClick={() => { onClick(); onClose(); }}
      className={`flex items-center gap-3 px-[18px] py-[10px] cursor-pointer relative transition-colors ${active ? 'bg-blue-50' : 'active:bg-slate-50'}`}
    >
      {active && <div className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-r-sm bg-primary" />}
      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 relative ${active ? 'bg-blue-100' : 'bg-[#eef2f7]'}`}>
        <div className={active ? '[&_svg]:stroke-primary' : '[&_svg]:stroke-[#1e3a8a]'}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12.5px] font-bold leading-tight ${active ? 'text-primary' : 'text-slate-900'}`}>{title}</p>
        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{sub}</p>
      </div>
      {right && <div className="flex items-center gap-1 flex-shrink-0">{right}</div>}
    </div>
  );

  const Chevron = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
  );

  const IconBadge = ({ count }: { count: number }) => count > 0 ? (
    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[8px] font-black text-white leading-none">
      {count > 9 ? '9+' : count}
    </span>
  ) : null;

  const Badge = ({ label, color }: { label: string; color: 'blue' | 'green' | 'red' }) => {
    const colors = { blue: 'bg-blue-100 text-primary', green: 'bg-emerald-100 text-emerald-600', red: 'bg-red-100 text-red-500' };
    return <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full ${colors[color]}`}>{label}</span>;
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 px-[18px] pt-[10px] pb-[3px]">{label}</p>
  );

  const Divider = () => <div className="h-px bg-slate-50 mx-3.5 my-[3px]" />;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-slate-900/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-[295px] bg-white rounded-r-[28px] z-50 flex flex-col overflow-hidden shadow-2xl animate-slideIn">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] px-5 pt-12 pb-[18px] relative overflow-hidden flex-shrink-0">
          <div className="absolute -top-11 -right-9 w-[120px] h-[120px] rounded-full bg-white/[0.07]" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-[14px] bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-base flex-shrink-0">
              {user.name.slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="text-[14px] font-black text-white mb-1">{user.name}</p>
              <span className="inline-flex items-center gap-1 bg-white/[0.14] border border-white/20 px-2 py-[3px] rounded-full text-[9px] font-black text-white/90 uppercase tracking-wider">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 flex-shrink-0" />
                {user.plan} · Activo
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-1.5 no-scrollbar">

          <SectionLabel label="Principal" />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>} title="Inicio" sub="Panel principal" onClick={() => navigate('/dashboard')} active />
          <NavItem
            icon={<div className="relative"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><IconBadge count={unreadMessages}/></div>}
            title="Mensajes" sub="Inbox SMS recibidos" onClick={() => navigate('/dashboard/messages')}
          />
          <NavItem
            icon={<div className="relative"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><IconBadge count={unreadNotifications}/></div>}
            title="Notificaciones" sub={unreadNotifications > 0 ? `${unreadNotifications} nuevas sin leer` : 'Sin notificaciones nuevas'} onClick={() => navigate('/dashboard/notifications')}
          />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><rect x="9" y="7" width="6" height="4" rx="1"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="12" y2="18"/></svg>} title="Mis Números" sub="Gestiona tus SIMs" onClick={() => navigate('/dashboard/numbers')} right={<Badge label="1" color="blue"/>} />

          <Divider />
          <SectionLabel label="Herramientas" />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} title="Traffic Monitor" sub="Actividad en tiempo real" onClick={() => navigate('/dashboard/monitor')} right={<Badge label="ON" color="green"/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>} title="API & Webhooks" sub="Credenciales y config" onClick={() => navigate('/dashboard/api')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>} title="Estadísticas" sub="Uso y métricas de SMS" onClick={() => navigate('/dashboard/stats')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M9.5 16.5l-2-6.5L20 6l-4 13-3.5-3.5L9.5 16.5z"/><path d="M7.5 10l5.5 3.5"/></svg>} title="Telegram Bot" sub="Recibe SMS en Telegram" onClick={() => navigate('/dashboard/telegram')} right={<Chevron/>} />

          <Divider />
          <SectionLabel label="Preferencias" />
          <NavItem
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
            title="Idioma" sub="Español / English" onClick={() => {}}
            right={
              <div className="flex bg-slate-100 rounded-lg overflow-hidden text-[10px] font-black">
                <span onClick={(e) => { e.stopPropagation(); onLangChange('es'); }} className={`px-[7px] py-1 cursor-pointer transition-all ${currentLang==='es' ? 'bg-primary text-white rounded-[7px]' : 'text-slate-400'}`}>ES</span>
                <span onClick={(e) => { e.stopPropagation(); onLangChange('en'); }} className={`px-[7px] py-1 cursor-pointer transition-all ${currentLang==='en' ? 'bg-primary text-white rounded-[7px]' : 'text-slate-400'}`}>EN</span>
              </div>
            }
          />

          <Divider />
          <SectionLabel label="Cuenta" />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>} title="Plan y Facturación" sub="Upgrades y pagos" onClick={() => navigate('/dashboard/billing')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>} title="Mi Perfil" sub="Datos y contraseña" onClick={() => navigate('/dashboard/profile')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} title="Ajustes" sub="Notificaciones y app" onClick={() => navigate('/dashboard/settings')} right={<Chevron/>} />

          <Divider />
          <SectionLabel label="Soporte" />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>} title="Soporte" sub="Respuesta en minutos" onClick={() => navigate('/dashboard/support')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>} title="Documentación API" sub="Guías y referencia" onClick={() => navigate('/docs')} right={<Chevron/>} />

        </div>

        {/* Footer */}
        <div className="px-3.5 pt-2.5 pb-8 border-t border-slate-50 flex-shrink-0">
          <div onClick={() => window.open('https://telsim.app', '_blank')} className="flex items-center justify-center gap-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white px-4 py-3 rounded-[13px] text-[12.5px] font-black cursor-pointer mb-1.5 active:opacity-85">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Ir al sitio web
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div onClick={() => { /* tu función de logout existente */ }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-[11px] text-[12px] font-bold text-red-500 cursor-pointer active:bg-red-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.3" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </div>
        </div>
      </div>
    </>
  );
}
