import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { resolveAvatarUrlForUi, sanitizeHttpUrl } from '../lib/resolveAvatarUrl';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; plan: string };
  unreadMessages: number;
  unreadNotifications: number;
  currentLang: string;
  onLangChange: (lang: string) => void;
  onLogout?: () => void;
  loggingOut?: boolean;
}

export default function SideDrawer({
  isOpen, onClose, user, unreadMessages, unreadNotifications, currentLang, onLangChange, onLogout, loggingOut
}: SideDrawerProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user: authUser, profile, version } = useAuth();
  const resolvedAvatarUrl =
    sanitizeHttpUrl(profile?.avatar_url) ?? resolveAvatarUrlForUi(authUser);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [resolvedAvatarUrl, version]);

  const isDark = theme === 'dark';

  const displayName =
    user.name?.trim() ||
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split('@')[0] ||
    'Usuario';
  const userInitials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!isOpen) return null;

  const NavItem = ({
    icon, title, sub, onClick, active = false, right, closeOnClick = true
  }: {
    icon: React.ReactNode; title: string; sub: string;
    onClick: () => void; active?: boolean; right?: React.ReactNode; closeOnClick?: boolean;
  }) => (
    <div
      onClick={() => { onClick(); if (closeOnClick) onClose(); }}
      className={`flex items-center gap-3 px-[18px] py-[11px] cursor-pointer relative transition-colors ${active ? 'bg-blue-50/70 dark:bg-blue-900/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 active:bg-slate-50 dark:active:bg-slate-800'}`}
    >
      {active && <div className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-r-sm bg-primary" />}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative border ${active ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200/80 dark:border-blue-800/60' : 'bg-[#eef2f7] dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
        <div className={active ? '[&_svg]:stroke-primary dark:[&_svg]:stroke-blue-400' : '[&_svg]:stroke-[#1e3a8a] dark:[&_svg]:stroke-slate-400'}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold leading-tight ${active ? 'text-primary dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>{title}</p>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
      </div>
      {right && <div className="flex items-center gap-1 flex-shrink-0">{right}</div>}
    </div>
  );

  const Chevron = () => (
    <div className="size-7 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.3" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  );

  const IconBadge = ({ count }: { count: number }) => count > 0 ? (
    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-white leading-none">
      {count > 9 ? '9+' : count}
    </span>
  ) : null;

  const Badge = ({ label, color }: { label: string; color: 'blue' | 'green' | 'red' }) => {
    const colors = { 
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-primary dark:text-blue-400', 
      green: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', 
      red: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' 
    };
    return <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full ${colors[color]}`}>{label}</span>;
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-[18px] pt-[12px] pb-[4px]">{label}</p>
  );

  const Divider = () => <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4 my-1.5" />;
  const nextLang = currentLang === 'es' ? 'en' : 'es';
  const languageSub = currentLang === 'es' ? 'Español activo' : 'English active';
  const copy = currentLang === 'es'
    ? {
        main: 'Principal',
        mainSub: 'Panel principal',
        messagesSub: 'Inbox SMS recibidos',
        notificationsSub: unreadNotifications > 0 ? `${unreadNotifications} nuevas sin leer` : 'Sin notificaciones nuevas',
        numbersSub: 'Gestiona tus SIMs',
        tools: 'Herramientas',
        trafficTitle: t('dashboard.traffic.title'),
        trafficSub: 'Actividad en tiempo real',
        statsTitle: 'Estadísticas',
        statsSub: 'Uso y métricas de SMS',
        account: 'Cuenta',
        profileSub: 'Datos y contraseña',
        prefs: 'Preferencias',
        support: 'Soporte',
        supportSub: 'Respuesta en minutos',
      }
    : {
        main: 'Main',
        mainSub: 'Main panel',
        messagesSub: 'Received SMS inbox',
        notificationsSub: unreadNotifications > 0 ? `${unreadNotifications} unread alerts` : 'No new notifications',
        numbersSub: 'Manage your SIMs',
        tools: 'Tools',
        trafficTitle: 'Traffic Monitor',
        trafficSub: 'Real-time activity',
        statsTitle: 'Stats',
        statsSub: 'Usage and SMS metrics',
        account: 'Account',
        profileSub: 'Profile and password',
        prefs: 'Preferences',
        support: 'Support',
        supportSub: 'Fast response',
      };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-[295px] bg-white dark:bg-slate-900 rounded-r-[28px] z-50 flex flex-col overflow-hidden shadow-2xl animate-slideIn">

        {/* Header */}
        <div className="px-5 pt-12 pb-5 relative overflow-hidden flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-[#eef4ff] to-[#f8fbff] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/30 to-transparent dark:from-white/[0.02] dark:to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <div className="w-11 h-11 rounded-[14px] flex-shrink-0 overflow-hidden border border-white/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              {resolvedAvatarUrl && !avatarError ? (
                <img
                  src={resolvedAvatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10 dark:bg-slate-700 text-base font-black text-primary dark:text-white">
                  {userInitials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-1 truncate text-[14px] font-semibold text-slate-900 dark:text-white">{displayName}</p>
              <span className="inline-flex items-center gap-1 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-[3px] rounded-full text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 flex-shrink-0" />
                {user.plan} · Activo
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-1.5 no-scrollbar">

          <SectionLabel label={copy.main} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>} title={t('nav.home')} sub={copy.mainSub} onClick={() => navigate('/dashboard')} active />
          <NavItem
            icon={<div className="relative"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><IconBadge count={unreadMessages}/></div>}
            title={t('nav.messages')} sub={copy.messagesSub} onClick={() => navigate('/dashboard/messages')}
          />
          <NavItem
            icon={<div className="relative"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><IconBadge count={unreadNotifications}/></div>}
            title="Notificaciones" sub={copy.notificationsSub} onClick={() => navigate('/dashboard/notifications')}
          />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><rect x="9" y="7" width="6" height="4" rx="1"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="12" y2="18"/></svg>} title={t('nav.numbers')} sub={copy.numbersSub} onClick={() => navigate('/dashboard/numbers')} />

          <Divider />
          <SectionLabel label={copy.tools} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} title={copy.trafficTitle} sub={copy.trafficSub} onClick={() => navigate('/dashboard/monitor')} right={<Badge label="ON" color="green"/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>} title="API & Webhooks" sub="Credenciales y config" onClick={() => navigate('/dashboard/api')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>} title={copy.statsTitle} sub={copy.statsSub} onClick={() => navigate('/dashboard/stats')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M9.5 16.5l-2-6.5L20 6l-4 13-3.5-3.5L9.5 16.5z"/><path d="M7.5 10l5.5 3.5"/></svg>} title="Telegram Bot" sub="Recibe SMS en Telegram" onClick={() => navigate('/dashboard/telegram')} right={<Chevron/>} />

          <Divider />
          <SectionLabel label={copy.prefs} />
          <NavItem
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
            title={t('settings.language_title')} sub={languageSub} onClick={() => onLangChange(nextLang)} closeOnClick={false}
            right={
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 overflow-hidden text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                <span onClick={(e) => { e.stopPropagation(); onLangChange('es'); }} className={`px-2 py-1.5 cursor-pointer transition-all ${currentLang==='es' ? 'bg-primary text-white rounded-[10px]' : 'text-slate-400 dark:text-slate-500'}`}>ES</span>
                <span onClick={(e) => { e.stopPropagation(); onLangChange('en'); }} className={`px-2 py-1.5 cursor-pointer transition-all ${currentLang==='en' ? 'bg-primary text-white rounded-[10px]' : 'text-slate-400 dark:text-slate-500'}`}>EN</span>
              </div>
            }
          />

          <Divider />
          <SectionLabel label={copy.account} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>} title={t('settings.billing_title')} sub={currentLang === 'es' ? 'Upgrades y pagos' : 'Upgrades and billing'} onClick={() => navigate('/dashboard/billing')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>} title={t('profile.title')} sub={copy.profileSub} onClick={() => navigate('/dashboard/profile')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} title={t('settings.title')} sub={currentLang === 'es' ? 'Notificaciones y app' : 'Notifications and app'} onClick={() => navigate('/dashboard/settings')} right={<Chevron/>} />

          <Divider />
          <SectionLabel label={copy.support} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>} title={t('support.title')} sub={copy.supportSub} onClick={() => navigate('/dashboard/support')} right={<Chevron/>} />
          <NavItem icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>} title={t('settings.docs_title')} sub={t('settings.docs_sub')} onClick={() => navigate('/docs')} right={<Chevron/>} />

        </div>

        {/* Footer */}
        <div className="px-3.5 pt-2.5 pb-8 border-t border-slate-50 dark:border-slate-800 flex-shrink-0">
          <div
            onClick={() => {
              if (!onLogout) return;
              if (loggingOut) return;
              onLogout();
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-[11px] text-[12px] font-semibold text-red-500 cursor-pointer active:bg-red-50 dark:active:bg-red-900/20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.3" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </div>
        </div>
      </div>
    </>
  );
}
