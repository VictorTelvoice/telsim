import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
import { Slot, SMSLog } from '../../types';
import { 
  X, 
  Filter, 
  Smartphone, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Chrome, 
  Music, 
  Send, 
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  Shield
} from 'lucide-react';

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

      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);

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

  const getServiceStyle = (serviceName: string | undefined, sender: string) => {
    const name = (serviceName || sender || '').toLowerCase();
    
    if (name.includes('whatsapp')) return {
      bg: 'bg-[#25D366]',
      text: 'text-white',
      icon: <MessageCircle className="size-6" />,
      label: 'WhatsApp'
    };
    if (name.includes('instagram')) return {
      bg: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
      text: 'text-white',
      icon: <Instagram className="size-6" />,
      label: 'Instagram'
    };
    if (name.includes('facebook')) return {
      bg: 'bg-[#1877F2]',
      text: 'text-white',
      icon: <Facebook className="size-6" />,
      label: 'Facebook'
    };
    if (name.includes('google')) return {
      bg: 'bg-white border-2 border-slate-100',
      text: 'text-slate-900',
      icon: <Chrome className="size-6 text-[#4285F4]" />,
      label: 'Google'
    };
    if (name.includes('uber')) return {
      bg: 'bg-black',
      text: 'text-white',
      icon: <Smartphone className="size-6" />,
      label: 'Uber'
    };
    if (name.includes('tiktok')) return {
      bg: 'bg-black border-l-4 border-cyan-400',
      text: 'text-white',
      icon: <Music className="size-6 text-[#ff0050]" />,
      label: 'TikTok'
    };
    if (name.includes('telegram')) return {
      bg: 'bg-[#0088cc]',
      text: 'text-white',
      icon: <Send className="size-6" />,
      label: 'Telegram'
    };

    return {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-900 dark:text-white',
      icon: <MessageSquare className="size-6 text-slate-400" />,
      label: serviceName || sender
    };
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      const hasCode = msg.verification_code && msg.verification_code.trim() !== '';
      const tabMatch = activeTab === 'verifications' ? hasCode : !hasCode;
      
      if (!tabMatch) return false;

      if (filterNum) {
        const msgNum = slotMap[msg.slot_id];
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
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mensajería</h1>
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="bg-white dark:bg-slate-800 size-10 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90 mb-1 border border-slate-100 dark:border-slate-700"
          >
            {/* Fix: use RefreshCw component instead of incorrect refresh-cw tag */}
            <RefreshCw className={`size-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {filterNum && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-2.5 rounded-2xl mb-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white">
                <Smartphone className="size-4" />
              </div>
              <div>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-none mb-1">Puerto de escucha activo</p>
                <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{formatPhoneNumber(filterNum)}</p>
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

        <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl flex items-center mb-2">
            <button 
                onClick={() => setActiveTab('verifications')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[11px] font-black transition-all uppercase tracking-tight ${activeTab === 'verifications' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Verificaciones
            </button>
            <button 
                onClick={() => setActiveTab('others')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[11px] font-black transition-all uppercase tracking-tight ${activeTab === 'others' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
                Otros
            </button>
        </div>
      </header>
      
      <main className="px-5 max-w-lg mx-auto py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Infraestructura...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-32 px-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="size-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-slate-700">
              <span className="material-symbols-rounded text-[40px] opacity-20">
                  {filterNum ? 'filter_alt_off' : (activeTab === 'verifications' ? 'key' : 'mail')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {filterNum ? 'Sin tráfico de red' : (activeTab === 'verifications' ? 'Esperando códigos' : 'Bandeja vacía')}
            </h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed italic">
                {filterNum 
                    ? `No hay registros entrantes para ${formatPhoneNumber(filterNum)}.` 
                    : 'Tus códigos SMS aparecerán aquí automáticamente.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg, idx) => {
              const style = getServiceStyle(msg.service_name, msg.sender);
              const isSpam = msg.is_spam === true;
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
                      <div className={`size-12 rounded-2xl flex items-center justify-center shadow-inner ${style.bg} ${style.text}`}>
                         {style.icon}
                      </div>
                      <div>
                        <h3 className="text-[15px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                          {style.label}
                        </h3>
                        <p className="text-[9px] font-black text-slate-400 flex items-center gap-1 mt-1 uppercase tracking-widest">
                           Línea: {formatPhoneNumber(realNumber)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 tabular-nums">
                      {formatTime(msg.received_at)}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 font-medium mb-5 px-1 italic">
                    "{msg.content}"
                  </p>

                  {msg.verification_code && !isSpam && (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 flex items-center justify-between group overflow-hidden relative">
                       <div className="absolute inset-0 bg-blue-500/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                       <div className="flex flex-col relative z-10">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CÓDIGO DETECTADO</span>
                          <span className="text-3xl font-black font-mono tracking-[0.2em] text-slate-900 dark:text-white tabular-nums leading-none">
                            {msg.verification_code}
                          </span>
                       </div>
                       <button 
                        onClick={(e) => handleCopy(e, msg.verification_code!, msg.id)}
                        className={`size-12 rounded-xl flex items-center justify-center transition-all relative z-10 ${
                          copyingId === msg.id 
                            ? 'bg-emerald-500 text-white shadow-lg' 
                            : 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm border border-slate-100 dark:border-slate-600 active:scale-90'
                        }`}
                       >
                         {copyingId === msg.id ? <Check className="size-5" /> : <Copy className="size-5" />}
                       </button>
                    </div>
                  )}

                  {isSpam && (
                    <div className="mt-2 text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5 p-2 bg-rose-50/50 rounded-lg">
                       <X className="size-3" />
                       Procesado como tráfico no deseado
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="py-16 flex flex-col items-center text-center opacity-10">
            {/* Fix: Added missing Shield component import and usage */}
            <Shield className="size-10 mb-2 text-slate-400" />
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">PRIVACY CORE INFRASTRUCTURE</p>
        </div>
      </main>
    </div>
  );
};

export default Messages;