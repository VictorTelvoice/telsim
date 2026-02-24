import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Notification } from '../../types';
import { 
  ArrowLeft, 
  Trash2, 
  Smartphone, 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  X,
  History,
  Activity,
  Cpu
} from 'lucide-react';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { notifications, markAsRead, clearAll } = useNotifications();
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const getNotifConfig = (type: Notification['type']) => {
    switch (type) {
      case 'activation':
        return { 
          icon: <Smartphone className="size-6" />, 
          color: 'bg-blue-50 dark:bg-blue-900/20 text-primary dark:text-blue-400',
          accent: 'border-primary/30 dark:border-blue-500/30',
          label: t('notif.type.new_line')
        };
      case 'subscription':
        return { 
          icon: <CreditCard className="size-6" />, 
          color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
          accent: 'border-violet-200 dark:border-violet-800',
          label: t('notif.type.success_purchase')
        };
      case 'success':
        return { 
          icon: <CheckCircle2 className="size-6" />, 
          color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
          accent: 'border-emerald-200 dark:border-emerald-800',
          label: t('notif.type.success')
        };
      case 'security':
      case 'error':
        return { 
          icon: <ShieldCheck className="size-6" />, 
          color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
          accent: 'border-rose-200 dark:border-rose-800',
          label: t('notif.type.security')
        };
      default:
        return { 
          icon: <History className="size-6" />, 
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
          accent: 'border-slate-200 dark:border-slate-700',
          label: t('notif.type.system')
        };
    }
  };

  const handleNotifClick = (notif: Notification) => {
    markAsRead(notif.id);
    setSelectedNotif(notif);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMin < 1) return t('messages.now');
    if (diffInMin < 60) return `${diffInMin}m`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h`;
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="min-h-screen relative pb-32 bg-[#F8FAFC] dark:bg-background-dark font-display">
      <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('notif.control_center')}</h1>
        <button onClick={clearAll} className="p-2 -mr-2 text-slate-400 hover:text-rose-500">
          <Trash2 className="size-5" />
        </button>
      </header>
      
      <main className="px-5 py-8 space-y-10 max-w-lg mx-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
               <History className="size-10" />
            </div>
            <p className="text-sm font-bold text-slate-400 italic">{t('notif.no_activity')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-6">{t('notif.infra_logs')}</h3>
            {notifications.map((notif, idx) => {
              const config = getNotifConfig(notif.type);
              return (
                <div 
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  className={`flex gap-4 p-5 rounded-[2rem] bg-white dark:bg-surface-dark shadow-sm border transition-all cursor-pointer relative overflow-hidden group active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-500 ${notif.is_read ? 'border-slate-100 dark:border-slate-800 opacity-60' : `border-transparent ring-1 ring-inset ${config.accent} shadow-blue-500/5`}`}
                >
                  <div className="absolute top-5 right-6 text-[9px] font-bold text-slate-300">{formatTime(notif.created_at)}</div>
                  <div className="flex-shrink-0">
                    <div className={`size-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${config.color}`}>
                      {config.icon}
                    </div>
                  </div>
                  <div className="flex-1 pr-6">
                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-1 block">{config.label}</span>
                    <h4 className={`text-base font-black mb-1 leading-tight tracking-tight ${notif.is_read ? 'text-slate-600' : 'text-slate-900 dark:text-white'}`}>{notif.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
                        {notif.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/5">
            <div className={`p-10 text-white relative overflow-hidden ${getNotifConfig(selectedNotif.type).color.split(' ')[2].replace('text-', 'bg-')}`}>
              <div className="absolute inset-0 bg-black/20"></div>
              <button onClick={() => setSelectedNotif(null)} className="absolute top-6 right-6 size-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
                <X className="size-5" />
              </button>
              <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 relative z-10">
                {getNotifConfig(selectedNotif.type).icon}
              </div>
              <h2 className="text-2xl font-black leading-tight tracking-tight relative z-10">{selectedNotif.title}</h2>
              <p className="text-white/80 text-xs mt-3 font-bold uppercase tracking-widest relative z-10">TELSIM CORE V2.0</p>
            </div>

            <div className="p-8 space-y-6">
              {selectedNotif.details ? (
                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-1 mb-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('notif.assigned_port')}</span>
                      <span className="font-mono font-black text-slate-900 dark:text-white text-2xl tracking-tighter">
                          {selectedNotif.details.number}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{t('notif.service')}</span>
                        <span className="text-[10px] font-black text-primary uppercase">{selectedNotif.details.plan}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{t('notif.activation')}</span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{selectedNotif.details.activationDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center gap-4">
                     <div className="size-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                        <Cpu className="size-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{t('notif.physical_infra')}</p>
                        <p className="text-[9px] font-bold text-slate-400">{t('notif.line_connected')}</p>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{selectedNotif.message}</p>
                </div>
              )}
              <button onClick={() => setSelectedNotif(null)} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                {t('notif.close_record')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;