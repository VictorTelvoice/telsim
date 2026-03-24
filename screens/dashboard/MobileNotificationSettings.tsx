import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Bell, Loader2, Check, ChevronLeft, Mail, Send } from 'lucide-react';

const DEFAULT_PREFS: Record<string, { inapp: boolean; email: boolean; telegram: boolean }> = {
  sms_received:    { inapp: true,  email: false, telegram: false },
  code_detected:   { inapp: true,  email: false, telegram: true  },
  sim_activated:   { inapp: true,  email: true,  telegram: false },
  sim_expired:     { inapp: true,  email: true,  telegram: true  },
  payment_success: { inapp: true,  email: true,  telegram: false },
  payment_failed:  { inapp: true,  email: true,  telegram: true  },
  security_alerts: { inapp: true,  email: true,  telegram: false },
  daily_summary:   { inapp: false, email: false, telegram: false },
};

const SECTIONS: { sectionKey: string; items: { key: string; icon: string }[] }[] = [
  { sectionKey: 'section_sms', items: [
    { key: 'sms_received',  icon: '💬' },
    { key: 'code_detected', icon: '🔐' },
  ]},
  { sectionKey: 'section_sims', items: [
    { key: 'sim_activated', icon: '📱' },
    { key: 'sim_expired',   icon: '⏰' },
  ]},
  { sectionKey: 'section_billing', items: [
    { key: 'payment_success', icon: '✅' },
    { key: 'payment_failed',  icon: '⚠️' },
  ]},
  { sectionKey: 'section_system', items: [
    { key: 'security_alerts', icon: '🛡️' },
    { key: 'daily_summary',   icon: '📊' },
  ]},
];

const TOGGLE_COLUMN_WIDTH = 44;

const MobileNotificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const [notifPrefs, setNotifPrefs] = useState<Record<string, { inapp: boolean; email: boolean; telegram: boolean }>>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testNotifLoading, setTestNotifLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.notification_preferences && typeof data.notification_preferences === 'object') {
        setNotifPrefs(prev => ({ ...prev, ...data.notification_preferences }));
      }
    };
    load().finally(() => setLoading(false));
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const el = document.createElement('div');
    el.className = `fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 text-white text-[11px] font-bold text-center max-w-[90vw] ${type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => {
      el.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => el.remove(), 300);
    }, 2500);
  };

  const handleTestNotification = async () => {
    if (!user) return;
    setTestNotifLoading(true);
    try {
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-test', userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || t('notif_settings.error_sending'), 'error');
        return;
      }
      showToast(t('notif_settings.test_notification_sent'));
    } catch (e) {
      showToast(t('notif_settings.connection_error'), 'error');
    } finally {
      setTestNotifLoading(false);
    }
  };

  const handleToggle = async (key: string, channel: 'inapp' | 'email' | 'telegram') => {
    if (!user) return;
    const updated = {
      ...notifPrefs,
      [key]: { ...notifPrefs[key], [channel]: !notifPrefs[key][channel] },
    };
    setNotifPrefs(updated);
    setSaving(true);
    try {
      await supabase.from('users').update({ notification_preferences: updated }).eq('id', user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-10 h-6 rounded-full relative transition-colors duration-200 flex-shrink-0 ${on ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
    >
      <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-200 ${on ? 'right-[3px]' : 'left-[3px]'}`} />
    </button>
  );

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5 ml-1">{label}</p>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-background-dark font-display flex flex-col">
      {/* Header */}
      <div className="bg-[#F0F4F8] dark:bg-background-dark pt-12 pb-3 px-4 flex items-center gap-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0"
        >
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight">{t('notif_settings.title')}</h1>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{t('notif_settings.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && <Loader2 size={16} className="animate-spin text-slate-400" />}
          {saved && !saving && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
              <Check size={12} /> {t('notif_settings.saved')}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {SECTIONS.map(group => (
              <div key={group.sectionKey}>
                <SectionLabel label={t(`notif_settings.${group.sectionKey}`)} />
                <div className={`rounded-[18px] border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  {/* Header: iconos con color justo encima de cada columna de toggles */}
                  <div className={`flex items-center px-4 pt-3 pb-1 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div className="flex-1 min-w-0" />
                    <div className="flex items-center gap-0" style={{ width: TOGGLE_COLUMN_WIDTH * 3 + 16 }}>
                      <div className="flex items-center justify-center" style={{ width: TOGGLE_COLUMN_WIDTH }}>
                        <Bell size={14} className="text-amber-500" />
                      </div>
                      <div className="flex items-center justify-center" style={{ width: TOGGLE_COLUMN_WIDTH }}>
                        <Mail size={14} className="text-blue-500" />
                      </div>
                      <div className="flex items-center justify-center" style={{ width: TOGGLE_COLUMN_WIDTH }}>
                        <Send size={14} className="text-sky-500" />
                      </div>
                    </div>
                  </div>
                  {group.items.map((item, idx) => {
                    const prefs = notifPrefs[item.key] ?? { inapp: false, email: false, telegram: false };
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-2 px-4 py-3.5 ${idx < group.items.length - 1 ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}` : ''}`}
                      >
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        <p className="flex-1 text-[13px] font-semibold text-slate-900 dark:text-white min-w-0">{t(`notif_settings.event_${item.key}`)}</p>
                        <div className="flex items-center gap-2 flex-shrink-0" style={{ width: TOGGLE_COLUMN_WIDTH * 3 + 16 }}>
                          <div className="flex justify-center" style={{ width: TOGGLE_COLUMN_WIDTH }}>
                            <Toggle on={prefs.inapp} onClick={() => handleToggle(item.key, 'inapp')} />
                          </div>
                          <div className="flex justify-center" style={{ width: TOGGLE_COLUMN_WIDTH }}>
                            <Toggle on={prefs.email} onClick={() => handleToggle(item.key, 'email')} />
                          </div>
                          <div className="flex justify-center" style={{ width: TOGGLE_COLUMN_WIDTH }}>
                            <Toggle on={prefs.telegram} onClick={() => handleToggle(item.key, 'telegram')} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className={`flex gap-3 p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-50 border border-slate-100'}`}>
              <Bell size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('notif_settings.footer_auto_save')}
              </p>
            </div>

            {/* Probar notificaciones */}
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testNotifLoading}
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 text-[13px] font-bold ${isDark ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-200 bg-white text-slate-700'} disabled:opacity-60 disabled:cursor-not-allowed active:opacity-80`}
            >
              {testNotifLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('notif_settings.loading')}
                </>
              ) : (
                `🧪 ${t('notif_settings.test_notifications')}`
              )}
            </button>
            <p className={`text-[10px] text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('notif_settings.configure_bot_hint')}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileNotificationSettings;
