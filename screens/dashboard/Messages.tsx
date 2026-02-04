
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
import { Slot, SMSLog } from '../../types';
import { X, Filter, Smartphone } from 'lucide-react';

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { refreshUnreadCount } = useMessagesCount();
  
  const [messages, setMessages] = useState<SMSLog[]>([]);
  const [slotMap, setSlotMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'verifications' | 'others'>('verifications');

  // Obtener el número de filtro de la URL
  const filterNum = searchParams.get('num');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Obtener los slots del usuario para mapear ID -> Número Real
      const { data: slotsData } = await supabase
        .from('slots')
        .select('port_id, phone_number')
        .eq('assigned_to', user.id);

      if (slotsData) {
        const mapping = slotsData.reduce((acc, s) => {
          acc[s.port_id] = s.phone_number;
          return acc;
        }, {} as Record<string, string>);
        setSlotMap(mapping);
      }

      // 2. Obtener los mensajes reales
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);

      // 3. Marcar como leídos
      await markAllAsRead();
    } catch (err) {
      console.error("Error fetching messages:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('sms_logs')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (!error) {
        refreshUnreadCount();
      }
    } catch (err) {
      console.debug("Error marking as read", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCopy = (e: React.MouseEvent, code: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  const formatPhoneNumber = (num: string) => {
    if (!num) return '---';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
        return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const renderServiceIcon = (serviceName: string | undefined, sender: string) => {
    const name = (serviceName || sender).toLowerCase();
    
    const configs: Record<string, { bg: string, text: string, char: string }> = {
      'google': { bg: 'bg-blue-100', text: 'text-blue-600', char: 'G' },
      'whatsapp': { bg: 'bg-emerald-100', text: 'text-emerald-600', char: 'W' },
      'uber': { bg: 'bg-slate-900', text: 'text-white', char: 'U' },
      'airbnb': { bg: 'bg-rose-100', text: 'text-rose-500', char: 'A' },
      'amazon': { bg: 'bg-amber-100', text: 'text-amber-700', char: 'A' },
      'telsim': { bg: 'bg-primary', text: 'text-white', char: 'T' },
      'facebook': { bg: 'bg-blue-600', text: 'text-white', char: 'F' },
      'instagram': { bg: 'bg-pink-100', text: 'text-pink-600', char: 'I' },
      'apple': { bg: 'bg-slate-200', text: 'text-slate-800', char: 'A' }
    };

    const key = Object.keys(configs).find(k => name.includes(k));
    const config = key ? configs[key] : { bg: 'bg-slate-100', text: 'text-slate-500', char: (serviceName || sender).charAt(0).toUpperCase() };

    return (
      <div className={`size-10 rounded-full flex items-center justify-center font-black text-sm shadow-inner ${config.bg} ${config.text}`}>
        {config.char}
      </div>
    );
  };

  // Lógica de Filtrado Premium
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // Filtro de Pestaña
      const hasCode = msg.verification_code && msg.verification_code.trim() !== '';
      const tabMatch = activeTab === 'verifications' ? hasCode : !hasCode;
      
      if (!tabMatch) return false;

      // Filtro de Número (si existe en URL)
      if (filterNum) {
        const msgNum = slotMap[msg.slot_id];
        // Comparamos números limpios para evitar problemas de formato
        const cleanFilter = filterNum.replace(/\D/g, '');
        const cleanMsgNum = (msgNum || '').replace(/\D/g, '');
        return cleanMsgNum.includes(cleanFilter);
      }

      return true;
    });
  }, [messages, activeTab, filterNum, slotMap]);

  const clearFilter = () => {
    searchParams.delete('num');
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-background-dark font-display pb-32">
      <header className="px-6 pt-12 pb-2 bg-[#F2F2F7]/80 dark:bg-background-dark/80 backdrop-blur-xl sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 shadow-sm shadow-black/5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="mb-2 flex items-center gap-1 text-primary font-bold text-sm">
              <span className="material-icons-round text-lg">chevron_left</span>
              Atrás
            </button>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Recibidos</h1>
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="bg-white dark:bg-slate-800 size-10 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90 mb-1"
          >
            <span className={`material-icons-round text-xl text-slate-400 ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>

        {/* Banner de Filtro Activo */}
        {filterNum && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-2.5 rounded-2xl mb-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white">
                <Smartphone className="size-4" />
              </div>
              <div>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest">Filtrando por línea</p>
                <p className="text-xs font-black text-slate-800 dark:text-white">{formatPhoneNumber(filterNum)}</p>
              </div>
            </div>
            <button 
              onClick={clearFilter}
              className="size-8 rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 shadow-sm flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Tab System */}
        <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl flex items-center mb-2">
            <button 
                onClick={() => setActiveTab('verifications')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all ${activeTab === 'verifications' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <span className="material-icons-round text-sm">verified</span>
                Verificaciones
            </button>
            <button 
                onClick={() => setActiveTab('others')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all ${activeTab === 'others' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                <span className="material-icons-round text-sm">more_horiz</span>
                Otros / Spam
            </button>
        </div>
      </header>
      
      <main className="px-5 max-w-lg mx-auto py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Bandeja...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-32 px-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="size-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-200 dark:text-slate-700">
              <span className="material-symbols-rounded text-[40px] opacity-30">
                  {filterNum ? 'filter_alt_off' : (activeTab === 'verifications' ? 'key' : 'mail')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {filterNum ? 'Sin mensajes para este número' : (activeTab === 'verifications' ? 'No hay códigos' : 'Bandeja vacía')}
            </h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                {filterNum 
                    ? `No hemos recibido mensajes en la línea ${formatPhoneNumber(filterNum)} todavía.` 
                    : (activeTab === 'verifications' ? 'Cuando solicites códigos de verificación, aparecerán aquí.' : 'Notificaciones generales llegarán a esta pestaña.')}
            </p>
            {filterNum && (
              <button 
                onClick={clearFilter}
                className="mt-6 text-primary font-black text-xs uppercase tracking-widest hover:underline"
              >
                Ver todos los mensajes
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg, idx) => {
              const hasCode = msg.verification_code && msg.verification_code.trim() !== '';
              const isSpam = msg.is_spam === true;
              const displayTitle = (msg.service_name && msg.service_name !== 'Unknown') ? msg.service_name : msg.sender;
              const realNumber = slotMap[msg.slot_id] || msg.slot_id;
              
              return (
                <div 
                  key={msg.id} 
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className={`bg-white dark:bg-surface-dark rounded-[1.5rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                    isSpam ? 'opacity-40 grayscale' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {renderServiceIcon(msg.service_name, msg.sender)}
                      <div>
                        <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white leading-tight">
                          {displayTitle}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                           Para: {formatPhoneNumber(realNumber)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {formatTime(msg.received_at)}
                    </span>
                  </div>

                  <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium mb-4">
                    {msg.content}
                  </p>

                  {hasCode && !isSpam && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-50 dark:border-blue-900/20 p-4 flex items-center justify-between group">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">CÓDIGO DE SEGURIDAD</span>
                          <span className="text-2xl font-black font-mono tracking-[0.3em] text-blue-600 dark:text-blue-400 tabular-nums">
                            {msg.verification_code}
                          </span>
                       </div>
                       <button 
                        onClick={(e) => handleCopy(e, msg.verification_code!, msg.id)}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                          copyingId === msg.id 
                            ? 'bg-emerald-500 text-white shadow-lg' 
                            : 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-blue-100 dark:border-blue-700 active:scale-90'
                        }`}
                       >
                         <span className="material-icons-round text-lg">
                           {copyingId === msg.id ? 'check' : 'content_copy'}
                         </span>
                       </button>
                    </div>
                  )}

                  {isSpam && (
                    <div className="mt-2 text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                       <span className="material-icons-round text-sm">block</span>
                       Filtrado por Sistema Anti-Spam
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="py-12 flex flex-col items-center text-center opacity-20">
            <span className="material-symbols-rounded text-3xl mb-2 text-slate-400">security</span>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">END-TO-END ENCRYPTED INBOX</p>
        </div>
      </main>
    </div>
  );
};

export default Messages;
