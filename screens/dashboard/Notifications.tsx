
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Notification } from '../../types';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, clearAll } = useNotifications();
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  // Added success/error/info/warning cases to match the consolidated type
  const getNotifConfig = (type: Notification['type']) => {
    switch (type) {
      case 'activation':
      case 'success':
        return { 
          icon: 'sim_card', 
          color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
          accent: 'border-blue-200 dark:border-blue-800'
        };
      case 'message':
      case 'info':
        return { 
          icon: 'chat_bubble', 
          color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
          accent: 'border-emerald-200 dark:border-emerald-800'
        };
      case 'security':
      case 'error':
      case 'warning':
        return { 
          icon: 'security', 
          color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
          accent: 'border-rose-200 dark:border-rose-800'
        };
      case 'subscription':
        return { 
          icon: 'credit_card', 
          color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
          accent: 'border-violet-200 dark:border-violet-800'
        };
      case 'system':
      default:
        return { 
          icon: 'info', 
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
          accent: 'border-slate-200 dark:border-slate-700'
        };
    }
  };

  const handleNotifClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.type === 'activation' || notif.details) {
      setSelectedNotif(notif);
    }
  };

  const closeDetail = () => setSelectedNotif(null);

  // Helper to format created_at date to a friendly time string
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMin < 1) return 'Ahora';
    if (diffInMin < 60) return `${diffInMin}m`;
    if (diffInMin < 1440) return `${Math.floor(diffInMin / 60)}h`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="min-h-screen relative pb-20 bg-background-light dark:bg-background-dark font-display">
      {/* Header Premium */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-800 dark:text-white"
          aria-label="Volver"
        >
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white absolute left-1/2 transform -translate-x-1/2">
            Centro de Control
        </h1>
        <button 
          onClick={clearAll}
          className="text-[11px] font-black text-primary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all uppercase tracking-widest px-2"
        >
            Limpiar
        </button>
      </header>
      
      <main className="px-5 py-6 space-y-8 max-w-lg mx-auto">
        {/* Status Section */}
        <section className="bg-slate-900 dark:bg-blue-950/40 rounded-[2rem] p-6 border border-white/10 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-1000"></div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Estado del Nodo</h3>
                    <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[8px] font-black text-emerald-500 uppercase">Operational</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Ports</span>
                        <span className="text-lg font-black text-white tabular-nums">1,240</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Flow</span>
                        <span className="text-lg font-black text-emerald-400 tracking-tighter">99.8%</span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Latency</span>
                        <span className="text-lg font-black text-white tabular-nums">42ms</span>
                    </div>
                </div>
            </div>
        </section>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700">
              <span className="material-icons-round text-5xl">notifications_off</span>
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400">Bandeja Vacía</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[20ch]">Los registros de procesos y alertas aparecerán aquí.</p>
          </div>
        ) : (
          <div>
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 pl-1">Registros Recientes</h3>
            <div className="space-y-4">
              {notifications.map((notif, idx) => {
                const config = getNotifConfig(notif.type);
                return (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    style={{ animationDelay: `${idx * 100}ms` }}
                    className={`flex gap-4 p-5 rounded-[2rem] bg-white dark:bg-surface-dark shadow-soft border transition-all cursor-pointer relative overflow-hidden group active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-500 ${notif.is_read ? 'border-slate-100 dark:border-slate-800 opacity-60' : `ring-1 ring-inset ${config.accent} shadow-sm shadow-blue-500/5`}`}
                  >
                    <div className="absolute top-5 right-5 flex flex-col items-end gap-2">
                      <span className="text-[9px] font-bold text-slate-400">{formatTime(notif.created_at)}</span>
                      {!notif.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-blue-500/50 animate-pulse"></span>}
                    </div>
                    
                    <div className="flex-shrink-0">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${config.color}`}>
                        <span className="material-symbols-rounded text-[32px] fill-1">{config.icon}</span>
                      </div>
                    </div>

                    <div className="flex-1 pr-8">
                      <h4 className={`text-base font-black mb-1 leading-tight tracking-tight ${notif.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{notif.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
                          {notif.message}
                      </p>
                    </div>
                    
                    {(notif.type === 'activation' || notif.details) && (
                      <div className="absolute bottom-4 right-6 text-[8px] font-black text-primary uppercase flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                        <span>Detalles</span>
                        <span className="material-icons-round text-[12px]">keyboard_arrow_right</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/5">
            <div className="bg-primary p-10 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <button onClick={closeDetail} className="absolute top-6 right-6 size-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
                <span className="material-icons-round text-xl">close</span>
              </button>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 relative z-10">
                <span className="material-symbols-rounded text-[40px] fill-1">{getNotifConfig(selectedNotif.type).icon}</span>
              </div>
              <h2 className="text-2xl font-black leading-tight tracking-tight relative z-10">{selectedNotif.title}</h2>
              <p className="text-white/70 text-sm mt-3 font-medium leading-relaxed relative z-10">{selectedNotif.message}</p>
            </div>

            <div className="p-8 space-y-6">
              {selectedNotif.details && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-800 pb-5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Puerto Asignado</span>
                    <div className="flex items-center justify-between">
                       <span className="font-mono font-black text-slate-900 dark:text-white text-2xl tracking-tighter">
                          {selectedNotif.details.number}
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio</span>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{selectedNotif.details.plan}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activo desde</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedNotif.details.activationDate}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Coste Mensual</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{selectedNotif.details.price}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-black text-primary uppercase tracking-widest block">Próxima Factura</span>
                       <span className="text-[10px] font-bold text-slate-500">{selectedNotif.details.nextBilling}</span>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={closeDetail} className="w-full bg-primary hover:bg-blue-700 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
