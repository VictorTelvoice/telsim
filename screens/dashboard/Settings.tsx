import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { resolveAvatarUrlForUi } from '../../lib/resolveAvatarUrl';
import SideDrawer from '../../components/SideDrawer';
import NotificationsMenu from '../../components/NotificationsMenu';
import RatingModal from '../../components/RatingModal';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, invalidateProfile, refreshProfile, signOut } = useAuth();
  const { notifications } = useNotifications();
  const { toggleTheme, theme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { language: lang, setLanguage: setLang, t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const resolvedAvatarUrl = resolveAvatarUrlForUi(user);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(resolvedAvatarUrl);
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    setAvatarUrl(resolvedAvatarUrl);
    setAvatarError(false);
  }, [resolvedAvatarUrl]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('common.user_fallback');
  const userEmail = user?.email || '';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const savedPlanId = localStorage.getItem('selected_plan') || 'starter';
  const planName = savedPlanId.charAt(0).toUpperCase() + savedPlanId.slice(1);
  const feedbackStorageKey = user?.id ? `telsim_feedback_completed:${user.id}` : null;

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
      navigate('/', { replace: true });
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    if (feedbackStorageKey && localStorage.getItem(feedbackStorageKey)) {
      doLogout();
      return;
    }

    // Only show rating if user hasn't completed it before
    if (user?.id) {
      const [{ data: ratingData }, { data: feedbackStatus }] = await Promise.all([
        supabase
          .from('user_ratings')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_feedback_status')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (ratingData || feedbackStatus) {
        if (feedbackStorageKey) {
          localStorage.setItem(feedbackStorageKey, feedbackStatus?.status || 'rated');
        }
        doLogout();
        return;
      }
    }
    setShowRating(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      const avatarUrlWithVersion = `${publicUrl}?t=${Date.now()}`;
      const { error: authError } = await (supabase.auth as any).updateUser({
        data: { avatar_url: avatarUrlWithVersion }
      });
      if (authError) throw authError;
      await supabase.from('users').update({ avatar_url: avatarUrlWithVersion }).eq('id', user.id);
      setAvatarUrl(avatarUrlWithVersion);

      invalidateProfile();
      await refreshProfile();
    } catch (err) {
      console.error('Error subiendo avatar:', err);
    } finally {
      setUploading(false);
    }
  };

  const Row = ({
    icon, title, sub, onClick, right
  }: {
    icon: React.ReactNode; title: string; sub?: string;
    onClick?: () => void; right?: React.ReactNode;
  }) => (
      <div
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/70 transition-colors"
      >
      <div className="w-10 h-10 rounded-xl bg-[#eef2f7] dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0 [&_svg]:stroke-[#1e3a8a] dark:[&_svg]:stroke-blue-400 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">{title}</p>
        {sub && <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 leading-snug">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-1.5 flex-shrink-0">{right}</div>}
    </div>
  );

  const Chevron = () => (
    <div className="size-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  );

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <div onClick={onToggle} className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}>
      <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-200 ${enabled ? 'right-[3px]' : 'left-[3px]'}`} />
    </div>
  );

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="flex items-center justify-between gap-3 px-1 mb-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display flex flex-col">
      {showRating && (
        <RatingModal onDone={() => { setShowRating(false); doLogout(); }} />
      )}

      <header className="grid grid-cols-[40px_1fr_40px] items-center gap-3 px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 lg:px-12">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-[#1e3a8a] dark:text-blue-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          aria-label="Abrir menu"
        >
          <svg width="16" height="12" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="0" y1="1" x2="18" y2="1"/>
            <line x1="0" y1="7" x2="18" y2="7"/>
            <line x1="0" y1="13" x2="18" y2="13"/>
          </svg>
        </button>

        <h1 className="text-center text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('settings.title')}</h1>

        <div className="flex items-center justify-end flex-shrink-0">
            <NotificationsMenu />
        </div>
      </header>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-28 space-y-5 max-w-lg mx-auto w-full">

        {/* Profile Card — sin tarjeta de plan */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center gap-3.5">
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            {uploading ? (
              <div className="w-[62px] h-[62px] rounded-[18px] bg-slate-100 dark:bg-slate-800 border-[3px] border-white dark:border-slate-600 shadow-lg flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={userName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-[62px] h-[62px] rounded-[18px] object-cover border-[3px] border-white dark:border-slate-600 shadow-lg"
              />
            ) : (
              <div className="w-[62px] h-[62px] rounded-[18px] bg-gradient-to-br from-[#0ea5e9] to-primary flex items-center justify-center text-white text-[22px] font-black border-[3px] border-white dark:border-slate-600 shadow-lg">
                {userInitials}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full bg-primary border-2 border-white dark:border-slate-600 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate mb-2">{userEmail}</p>
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-[9.5px] font-medium text-slate-500 dark:text-slate-400">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {t('common.country_chile')}
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard/profile')}
            className="bg-primary/10 dark:bg-blue-500/10 border border-primary/15 dark:border-blue-500/25 text-primary dark:text-blue-400 text-[10px] font-bold px-3.5 py-2 rounded-xl uppercase tracking-wider flex-shrink-0"
          >
            {t('settings.edit')}
          </button>
        </div>

        {/* CUENTA */}
        <div>
          <SectionLabel label={t('settings.section_account')} />
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm shadow-slate-200/40 dark:shadow-none divide-y divide-slate-100 dark:divide-slate-800">
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.5" fill={isDark ? "#60a5fa" : "#1e3a8a"} stroke="none"/></svg>} title={t('settings.security_title')} sub={t('settings.security_sub')} onClick={() => navigate('/dashboard/security')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>} title={t('settings.billing_title')} sub={t('settings.billing_sub')} onClick={() => navigate('/dashboard/billing')} right={<Chevron/>} />
          </div>
        </div>

        {/* CONFIGURACIÓN */}
        <div>
          <SectionLabel label={t('settings.section_config')} />
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm shadow-slate-200/40 dark:shadow-none divide-y divide-slate-100 dark:divide-slate-800">
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M9.5 16.5l-2-6.5L20 6l-4 13-3.5-3.5L9.5 16.5z"/><path d="M7.5 10l5.5 3.5"/></svg>} title={t('profile.telegram_bot')} sub={t('settings.telegram_bot_sub')} onClick={() => navigate('/dashboard/telegram-config')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>} title={t('settings.api_webhooks_title')} sub={t('settings.api_webhooks_sub')} onClick={() => navigate('/dashboard/webhooks')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} title={t('webhook_logs.title')} sub={t('webhook_logs.api_logs')} onClick={() => navigate('/dashboard/webhook-logs')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>} title={t('profile.push_notifications')} sub={t('settings.push_notifications_sub')} onClick={() => navigate('/dashboard/notification-settings')} right={<Chevron/>} />
            <Row
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
              title={t('settings.language_title')} sub={t('settings.language_sub')}
              right={
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 overflow-hidden text-[10px] font-black border border-slate-200 dark:border-slate-700">
                  <span onClick={(e) => { e.stopPropagation(); setLang('es'); }} className={`px-2.5 py-1.5 cursor-pointer transition-all ${lang === 'es' ? 'bg-primary text-white rounded-[10px]' : 'text-slate-400 dark:text-slate-500'}`}>ES</span>
                  <span onClick={(e) => { e.stopPropagation(); setLang('en'); }} className={`px-2.5 py-1.5 cursor-pointer transition-all ${lang === 'en' ? 'bg-primary text-white rounded-[10px]' : 'text-slate-400 dark:text-slate-500'}`}>EN</span>
                </div>
              }
            />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>} title={t('settings.dark_mode_title')} sub={t('settings.dark_mode_sub')} right={<Toggle enabled={isDark} onToggle={toggleTheme} />} />
          </div>
        </div>

        {/* AYUDA */}
        <div>
          <SectionLabel label={t('settings.section_help')} />
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm shadow-slate-200/40 dark:shadow-none divide-y divide-slate-100 dark:divide-slate-800">
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>} title={t('settings.support_title')} sub={t('settings.support_sub')} onClick={() => navigate('/dashboard/support')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>} title="Preguntas frecuentes" sub="Respuestas rapidas" onClick={() => navigate('/dashboard/faq')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="16" y2="7"/><line x1="9" y1="11" x2="16" y2="11"/></svg>} title={t('settings.docs_title')} sub={t('settings.docs_sub')} onClick={() => window.open('https://docs.telsim.app', '_blank')} right={<Chevron/>} />
            <Row icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} title={t('settings.terms_title')} sub={t('settings.terms_sub')} onClick={() => navigate('/dashboard/terms')} right={<Chevron/>} />
          </div>
        </div>

        {/* LOGOUT */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm shadow-slate-200/40 dark:shadow-none">
          <div
            onClick={handleLogout}
            aria-disabled={loggingOut}
            className="flex items-center justify-center gap-2 py-[13px] cursor-pointer active:bg-red-50 dark:active:bg-red-900/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.3" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="text-[13px] font-semibold text-red-500">{t('settings.logout')}</span>
          </div>
        </div>

        <p className="text-center text-[9px] font-medium text-slate-300 dark:text-slate-600 tracking-widest uppercase pb-2">{t('settings.version')}</p>
      </div>

      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={{ name: userName, plan: planName }}
        unreadMessages={0}
        unreadNotifications={unreadCount}
        currentLang={lang}
        onLangChange={(l) => setLang(l as 'es' | 'en')}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />
    </div>
  );
};

export default Settings;
