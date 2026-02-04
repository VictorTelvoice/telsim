import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Settings, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Zap,
  Trash2,
  Info
} from 'lucide-react';
import { useNotifications, Notification } from '../contexts/NotificationsContext';

const NotificationsMenu: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, loading } = useNotifications();
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMin < 1) return 'Ahora';
    if (diffInMin < 60) return `${diffInMin}m`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return <Zap className="size-4 text-emerald-500" />;
      case 'error': return <AlertCircle className="size-4 text-rose-500" />;
      default: return <Info className="size-4 text-primary" />;
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
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
          <span className="absolute top-1.5 right-1.5 size-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-background-dark animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Notificaciones</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{unreadCount} sin leer</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={markAllAsRead}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-all"
                title="Marcar todo como leído"
              >
                <CheckCheck className="size-4" />
              </button>
              <button 
                onClick={clearAll}
                className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-all"
                title="Limpiar"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto no-scrollbar py-2">
            {loading ? (
               <div className="py-10 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
               </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center px-8">
                <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mb-4">
                  <Bell className="size-8" />
                </div>
                <p className="text-xs font-bold text-slate-400">Todo al día por aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`px-6 py-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group ${!notif.is_read ? 'bg-blue-50/20 dark:bg-primary/5' : ''}`}
                  >
                    {!notif.is_read && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full"></div>
                    )}
                    <div className={`size-10 rounded-xl shrink-0 flex items-center justify-center border ${
                      notif.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50' :
                      notif.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50' :
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50'
                    }`}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className={`text-xs font-black truncate pr-2 ${!notif.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-300 whitespace-nowrap flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
                        {notif.message}
                      </p>
                      {notif.link && (
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Ver detalle</span>
                          <ExternalLink className="size-2.5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
             <button 
                onClick={() => { navigate('/dashboard/notifications'); setIsOpen(false); }}
                className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:text-primary transition-all flex items-center justify-center gap-2"
             >
                Ver todas
                <ExternalLink className="size-3" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsMenu;