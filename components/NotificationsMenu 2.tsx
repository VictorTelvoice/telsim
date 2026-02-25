import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  Zap,
  Trash2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';
import { useLanguage } from '../contexts/LanguageContext';
// Fix: Notification type is defined in types.ts
import { Notification } from '../types';

const NotificationsMenu: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, loading } = useNotifications();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Marcar todas como leídas al abrir el menú (Senior Requirement)
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMin < 1) return t('notifications_menu.now');
    if (diffInMin < 60) return `${diffInMin}m`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h`;
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short' });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return <Zap className="size-4 text-emerald-500" />;
      case 'error': return <AlertCircle className="size-4 text-rose-500" />;
      case 'warning': return <AlertTriangle className="size-4 text-amber-500" />;
      default: return <Info className="size-4 text-primary" />;
    }
  };

  const getNotifStyles = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/50';
      case 'error': return 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800/50';
      case 'warning': return 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-800/50';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50';
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-800 dark:text-white group"
      >
        <Bell className={`size-5 transition-transform ${isOpen ? 'scale-110' : 'group-hover:rotate-12'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 size-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-background-dark animate-in zoom-in shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex flex-col">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('notifications_menu.title')}</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('notifications_menu.sync_realtime')}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-all flex items-center gap-1 group/btn"
              title={t('notifications_menu.clear_all')}
            >
              <Trash2 className="size-4" />
              <span className="text-[8px] font-black uppercase opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">{t('notifications_menu.clear')}</span>
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto no-scrollbar py-2">
            {loading ? (
               <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('notifications_menu.consulting_ledger')}</span>
               </div>
            ) : notifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center px-8 animate-in fade-in">
                <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mb-4 border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <Bell className="size-10" />
                </div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('notifications_menu.no_new_alerts')}</h4>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`px-6 py-5 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group ${!notif.is_read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    {!notif.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                    )}
                    <div className={`size-11 rounded-2xl shrink-0 flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 ${getNotifStyles(notif.type)}`}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-xs font-black truncate pr-2 ${!notif.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-300 whitespace-nowrap flex items-center gap-1 tabular-nums">
                          <Clock className="size-2.5" />
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
                        {notif.message}
                      </p>
                      {notif.link && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-[0.1em]">
                          <span>{t('notifications_menu.resolve_now')}</span>
                          <ExternalLink className="size-3" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-slate-800">
             <button 
                onClick={() => { navigate('/dashboard/notifications'); setIsOpen(false); }}
                className="w-full h-11 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2 group"
             >
                {t('notifications_menu.go_to_control_center')}
                <CheckCheck className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsMenu;