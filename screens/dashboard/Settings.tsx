import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import SideDrawer from '../../components/SideDrawer';
import NotificationsMenu from '../../components/NotificationsMenu';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>('es');

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const userEmail = user?.email || '';
  const userAvatar = user?.user_metadata?.avatar_url || null;
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const savedPlan = JSON.parse(localStorage.getItem('selected_plan') || '{}');
  const planName = savedPlan?.planName || 'Starter';

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  const handleLogout = async () => {
    await (supabase.auth as any).signOut();
    navigate('/');
  };

  const Row = ({
    icon, title, sub, onClick, right
  }: {
    icon: React.ReactNode; title: string; sub?: string;
    onClick?: () => void; right?: React.ReactNode;
  }) => (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-[13px] cursor-pointer active:bg-slate-50 relative [&:not(:last-child)]:after:absolute [&:not(:last-child)]:after:bottom-0 [&:not(:last-child)]:after:left-[60px] [&:not(:last-child)]:after:right-4 [&:not(:last-child)]:after:h-px [&:not(:last-child)]:after:bg-slate-50"
    >
      <div className="w-9 h-9 rounded-[10px] bg-[#eef2f7] flex items-center justify-center flex-shrink-0 [&_svg]:stroke-[#1e3a8a]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-900 leading-tight">{title}</p>
        {sub && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-1.5 flex-shrink-0">{right}</div>}
    </div>
  );

  const Chevron = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
  );

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <div onClick={onToggle} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${enabled ? 'bg-primary' : 'bg-slate-200'}`}>
      <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-200 ${enabled ? 'right-[3px]' : 'left-[3px]'}`} />
    </div>
  );

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5 ml-1">{label}</p>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-display flex flex-col">

      {/* Header — mismo patrón que el Dashboard */}
      <div className="bg-[#F0F4F8] pt-12 pb-3 px-5 flex items-center gap-3 flex-shrink-0">
        {/* Hamburger — igual que en Dashboard */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-[38px] h-[38px] rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0"
        >
          <svg width="16" height="12" viewBox="0 0 18 14" fill="none" stroke="#1e3a8a" strokeWidth="2.2" strokeLinecap="round">
            <line x1="0" y1="1" x2="18" y2="1"/>
            <line x1="0" y1="7" x2="18" y2="7"/>
            <line x1="0" y1="13" x2="18" y2="13"/>
          </svg>
        </button>

        <h1 className="flex-1 text-[20px] font-black text-slate-900 tracking-tight">Ajustes</h1>

        {/* Campana — copiar EXACTAMENTE el mismo JSX de la campana del Dashboard/Home, incluyendo el badge de unreadCount */}
        <div className="flex-shrink-0">
            <NotificationsMenu />
        </div>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-3">

        {/* Profile Card — sin tarjeta de plan */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-[62px] h-[62px] rounded-[18px] object-cover border-[3px] border-white shadow-lg"
              />
            ) : (
              <div className="w-[62px] h-[62px] rounded-[18px] bg-gradient-to-br from-[#0ea5e9] to-primary flex items-center justify-center text-white text-[22px] font-black border-[3px] border-white shadow-lg">
                {userInitials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full bg-primary border-2 border-white flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black text-slate-900 truncate">{userName}</p>
            <p className="text-[11px] font-semibold text-slate-400 truncate mb-1.5">{userEmail}</p>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-[3px] rounded-full text-[9.5px] font-semibold text-slate-500">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Chile
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard/profile')}
            className="bg-blue-50 border border-blue-100 text-primary text-[10px] font-black px-3.5 py-1.5 rounded-[10px] uppercase tracking-wider flex-shrink-0"
          >
            Editar
          </button>
        </div>

        {/* CUENTA */}
        <div>
          <SectionLabel label="Cuenta" />
          <div className="bg-white rounded-[18px] border border-slate-100 overflow-hidden">
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.5" fill="#1e3a8a" stroke="none"/></svg>} title="Seguridad y Contraseña" sub="Cambia tu contraseña" onClick={() => navigate('/dashboard/security')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>} title="Plan y Facturación" sub="Upgrades, pagos e historial" onClick={() => navigate('/dashboard/billing')} right={<Chevron/>} />
          </div>
        </div>

        {/* CONFIGURACIÓN */}
        <div>
          <SectionLabel label="Configuración" />
          <div className="bg-white rounded-[18px] border border-slate-100 overflow-hidden">
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M9.5 16.5l-2-6.5L20 6l-4 13-3.5-3.5L9.5 16.5z"/><path d="M7.5 10l5.5 3.5"/></svg>} title="Telegram Bot" sub="Recibe SMS en Telegram" onClick={() => navigate('/dashboard/telegram')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>} title="API & Webhooks" sub="Credenciales y endpoints" onClick={() => navigate('/dashboard/api')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>} title="Push Notifications" sub="Alertas de SMS nuevos" right={<Toggle enabled={notifEnabled} onToggle={() => setNotifEnabled(!notifEnabled)} />} />
            <Row
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
              title="Idioma" sub="Español / English"
              right={
                <div className="flex bg-slate-100 rounded-lg overflow-hidden text-[10px] font-black">
                  <span onClick={(e) => { e.stopPropagation(); setLang('es'); }} className={`px-2 py-1 cursor-pointer transition-all ${lang === 'es' ? 'bg-primary text-white rounded-[7px]' : 'text-slate-400'}`}>ES</span>
                  <span onClick={(e) => { e.stopPropagation(); setLang('en'); }} className={`px-2 py-1 cursor-pointer transition-all ${lang === 'en' ? 'bg-primary text-white rounded-[7px]' : 'text-slate-400'}`}>EN</span>
                </div>
              }
            />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>} title="Modo Oscuro" sub="Tema de la aplicación" right={<Toggle enabled={darkMode} onToggle={() => setDarkMode(!darkMode)} />} />
          </div>
        </div>

        {/* AYUDA */}
        <div>
          <SectionLabel label="Centro de Ayuda" />
          <div className="bg-white rounded-[18px] border border-slate-100 overflow-hidden">
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>} title="Soporte 24/7" sub="Respuesta en minutos vía Telegram" onClick={() => navigate('/dashboard/support')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>} title="Documentación API" sub="Guías y referencia técnica" onClick={() => window.open('https://docs.telsim.app', '_blank')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} title="Términos y Privacidad" sub="Políticas de uso" onClick={() => navigate('/legal')} right={<Chevron/>} />
          </div>
        </div>

        {/* LOGOUT */}
        <div className="bg-white rounded-[18px] border border-slate-100 overflow-hidden">
          <div onClick={handleLogout} className="flex items-center justify-center gap-2 py-[13px] cursor-pointer active:bg-red-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.3" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="text-[13px] font-bold text-red-500">Cerrar Sesión</span>
          </div>
        </div>

        <p className="text-center text-[9px] font-bold text-slate-300 tracking-widest uppercase pb-2">Telsim v2.4.1</p>
      </div>

      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={{ name: userName, plan: planName }}
        unreadMessages={0}
        unreadNotifications={unreadCount}
        currentLang={lang}
        onLangChange={(l) => setLang(l as 'es' | 'en')}
      />
    </div>
  );
};

export default Settings;
