
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getPostAuthRoute } from '../../lib/routing';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
import { Slot, SMSLog } from '../../types';
import { 
  X, 
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
  Shield,
  ShoppingCart,
  User,
  Search,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { refreshUnreadCount, setUnreadSmsCount } = useMessagesCount();
  
  const [messages, setMessages] = useState<SMSLog[]>([]);
  const [userSlots, setUserSlots] = useState<Slot[]>([]);
  const [slotMap, setSlotMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'verifications' | 'others'>('verifications');
  const [messageSearch, setMessageSearch] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'oldest' | 'service'>('recent');

  const filterNum = searchParams.get('num');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Obtener solo los slots que pertenecen al usuario actual
      const { data: slotsData } = await supabase
        .from('slots')
        .select('*')
        .eq('assigned_to', user.id);

      if (slotsData) {
        setUserSlots(slotsData);
        const mapping = slotsData.reduce((acc, s) => {
          acc[s.slot_id] = s.phone_number;
          return acc;
        }, {} as Record<string, string>);
        setSlotMap(mapping);
      }

      // 2. PRIVACIDAD CRÍTICA: Filtro obligatorio por user_id
      // Evita que un nuevo dueño vea SMS de un dueño anterior del mismo hardware/número
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
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const { error, count } = await supabase
      .from('sms_logs')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select();
    console.log('Marcados como leídos:', count, 'Error:', error);
    refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    // Reset local state on user change for clean load
    setMessages([]);
    fetchData();
    markAllAsRead();

    if (!user) return;

    // Marcar como leído periódicamente mientras se está en esta pantalla
    const interval = setInterval(() => {
      markAllAsRead();
    }, 5000); // Cada 5 segundos para mayor respuesta

    // También marcar al enfocar la ventana
    const handleFocus = () => markAllAsRead();
    window.addEventListener('focus', handleFocus);

    // 3. Suscripción Realtime con filtro por user_id
    const channel = supabase
      .channel(`private_messages_${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sms_logs',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newMsg = payload.new as SMSLog;
        setMessages(prev => [newMsg, ...prev]);
        // Si el usuario está en la pantalla de mensajes, marcamos como leído inmediatamente
        markAllAsRead();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, fetchData]);

  useEffect(() => {
    if (filterNum) {
      const isStillOwned = userSlots.some(s => s.phone_number === filterNum);
      if (!isStillOwned && userSlots.length > 0) {
          searchParams.delete('num');
          setSearchParams(searchParams);
      }
    }
  }, [userSlots, filterNum, searchParams, setSearchParams]);

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

  const getCountryCode = (num: string) => {
    if (num.includes('56') || num.startsWith('+56')) return 'cl';
    if (num.includes('54') || num.startsWith('+54')) return 'ar';
    return 'cl';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return t('messages.now');
    if (diffInMinutes < 60) return `${t('messages.ago')} ${diffInMinutes} ${t('messages.min')}`;
    
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short' });
  };

  const getServiceStyle = (serviceName: string | undefined, sender: string) => {
    const originalName = serviceName || sender || '';
    const name = originalName.toLowerCase();
    const isPhoneNumber = /^(\+?\d+){5,}$/.test(name.replace(/\s/g, ''));
    
    if (name.includes('whatsapp')) return { bg: 'bg-[#25D366]', text: 'text-white', icon: <MessageCircle className="size-6" />, label: 'WhatsApp' };
    if (name.includes('instagram')) return { bg: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]', text: 'text-white', icon: <Instagram className="size-6" />, label: 'Instagram' };
    if (name.includes('facebook')) return { bg: 'bg-[#1877F2]', text: 'text-white', icon: <Facebook className="size-6" />, label: 'Facebook' };
    if (name.includes('google')) return { bg: 'bg-white border-2 border-slate-100', text: 'text-slate-900', icon: <Chrome className="size-6 text-[#4285F4]" />, label: 'Google' };
    if (name.includes('uber')) return { bg: 'bg-black', text: 'text-white', icon: <Smartphone className="size-6" />, label: 'Uber' };
    if (name.includes('tiktok')) return { bg: 'bg-black border-l-4 border-cyan-400', text: 'text-white', icon: <Music className="size-6 text-[#ff0050]" />, label: 'TikTok' };
    if (name.includes('telegram')) return { bg: 'bg-[#0088cc]', text: 'text-white', icon: <Send className="size-6" />, label: 'Telegram' };
    if (name.includes('ebay')) return { bg: 'bg-white border-2 border-blue-500 shadow-sm', text: 'text-slate-900', icon: <ShoppingCart className="size-6 text-blue-600" />, label: 'eBay' };
    
    return {
      bg: isPhoneNumber ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      icon: isPhoneNumber ? <User className="size-6" /> : <MessageSquare className="size-6" />,
      label: originalName
    };
  };

  const filteredMessages = useMemo(() => {
    const base = messages.filter(msg => {
      const hasCode = msg.verification_code && msg.verification_code.trim() !== '';
      const tabMatch = activeTab === 'verifications' ? hasCode : !hasCode;
      if (!tabMatch) return false;
      if (filterNum) {
        const msgNum = slotMap[msg.slot_id];
        const cleanFilter = filterNum.replace(/\D/g, '');
        const cleanMsgNum = (msgNum || '').replace(/\D/g, '');
        if (!cleanMsgNum.includes(cleanFilter)) return false;
      }
      const q = messageSearch.trim().toLowerCase();
      if (!q) return true;
      const haystack = [
        msg.content,
        msg.sender,
        msg.service_name,
        msg.verification_code,
        slotMap[msg.slot_id] || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    return [...base].sort((a, b) => {
      if (sortMode === 'oldest') {
        return new Date(a.received_at).getTime() - new Date(b.received_at).getTime();
      }
      if (sortMode === 'service') {
        return (a.service_name || a.sender || '').localeCompare(b.service_name || b.sender || '', language === 'es' ? 'es' : 'en');
      }
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
    });
  }, [messages, activeTab, filterNum, slotMap, messageSearch, sortMode, language]);

  const toggleFilter = (num: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (num) {
      nextParams.set('num', num);
    } else {
      nextParams.delete('num');
    }
    setSearchParams(nextParams);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-background-dark font-display pb-32">
      <header className="px-6 pt-12 pb-2 bg-[#F2F2F7]/80 dark:bg-background-dark/80 backdrop-blur-xl sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 shadow-sm shadow-black/5">
        <div className="max-w-lg mx-auto lg:max-w-5xl lg:px-4">
        <div className="flex justify-between items-end mb-4">
          <div>
            <button onClick={() => navigate(getPostAuthRoute())} className="mb-2 flex items-center gap-1 text-primary font-bold text-sm">
              <span className="material-icons-round text-lg">chevron_left</span>
              {t('messages.back')}
            </button>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('messages.title')}</h1>
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="bg-white dark:bg-slate-800 size-10 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90 mb-1 border border-slate-100 dark:border-slate-700"
          >
            <RefreshCw className={`size-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <section className="space-y-2 pb-3">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {filteredMessages.length} SMS
          </p>
          <div className="rounded-[1.5rem] border border-slate-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm px-2 py-1.5 flex items-center gap-1.5 flex-nowrap overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 w-[33%] flex-none rounded-xl bg-slate-50/90 dark:bg-slate-800/90 px-2 py-1.5 border border-slate-200/70 dark:border-slate-700/70">
              <Search className="size-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                placeholder="Buscar"
                className="min-w-0 w-full bg-transparent outline-none text-[11px] font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="relative w-[112px] shrink-0">
              <SlidersHorizontal className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={filterNum || 'all'}
                onChange={(e) => toggleFilter(e.target.value === 'all' ? null : e.target.value)}
                className="w-full appearance-none bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-xl pl-7 pr-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="all">Todas</option>
                {userSlots.map((slot) => (
                  <option key={slot.slot_id} value={slot.phone_number}>
                    {slot.phone_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative w-[92px] shrink-0">
              <ArrowUpDown className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                className="w-full appearance-none bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-xl pl-7 pr-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="recent">Nuevos</option>
                <option value="oldest">Antiguos</option>
                <option value="service">Servicio</option>
              </select>
            </div>
          </div>
        </section>

        <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl flex items-center mb-2">
            <button onClick={() => setActiveTab('verifications')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[11px] font-black transition-all uppercase tracking-tight ${activeTab === 'verifications' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t('messages.verifications')}</button>
            <button onClick={() => setActiveTab('others')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[11px] font-black transition-all uppercase tracking-tight ${activeTab === 'others' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>{t('messages.others')}</button>
        </div>
        </div>{/* end desktop centering wrapper */}
      </header>
      
      <main className="px-5 max-w-lg mx-auto lg:max-w-5xl lg:px-10 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('messages.syncing')}</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-32 px-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="size-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-slate-700">
              <span className="material-symbols-rounded text-[40px] opacity-20">{filterNum ? 'filter_alt_off' : (activeTab === 'verifications' ? 'key' : 'mail')}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{filterNum ? t('messages.no_traffic') : (activeTab === 'verifications' ? t('messages.waiting_codes') : t('messages.empty_inbox'))}</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed italic">{filterNum ? t('messages.no_records_for').replace('{num}', formatPhoneNumber(filterNum)) : t('messages.codes_appear_here')}</p>
          </div>
        ) : (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
            {filteredMessages.map((msg, idx) => {
              const style = getServiceStyle(msg.service_name, msg.sender);
              const realNumber = slotMap[msg.slot_id] || msg.slot_id;
              return (
                <div key={msg.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-end gap-3">
                    {/* Avatar / Service icon */}
                    <div className={`size-11 rounded-[1.2rem] flex items-center justify-center shadow-lg flex-shrink-0 ${style.bg} ${style.text}`}>
                      {style.icon}
                    </div>

                    {/* Bubble area */}
                    <div className="flex-1 min-w-0">
                      {/* Meta row: service name + timestamp */}
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{style.label}</span>
                        <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 tabular-nums">{formatTime(msg.received_at)}</span>
                      </div>

                      {/* Port / phone number */}
                      <div className="flex items-center gap-1.5 mb-2 px-1">
                        <img src={`https://flagcdn.com/w40/${getCountryCode(realNumber)}.png`} className="w-3.5 h-2.5 object-cover rounded-sm opacity-60" alt="" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.port')}: {formatPhoneNumber(realNumber)}</span>
                      </div>

                      {/* SMS Bubble */}
                      <div className="bg-white dark:bg-surface-dark rounded-[1.4rem] rounded-tl-[0.35rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.99]">
                        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium">{msg.content}</p>
                      </div>

                      {/* Verification code block — action compacta al final del mensaje */}
                      {msg.verification_code && (
                        <div className="mt-1.5 bg-slate-900 dark:bg-slate-950 rounded-[1.4rem] rounded-tl-[0.35rem] border border-slate-800 p-4">
                          <div className="flex items-end justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span className="text-3xl font-black font-mono tracking-[0.2em] text-white tabular-nums leading-none">{msg.verification_code}</span>
                            </div>
                            <button
                              onClick={(e) => handleCopy(e, msg.verification_code!, msg.id)}
                              className={`h-10 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wide ${copyingId === msg.id ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/10 text-white/80 hover:bg-white/20 active:scale-90'}`}
                            >
                              {copyingId === msg.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                              {copyingId === msg.id ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="py-16 flex flex-col items-center text-center opacity-10">
            <Shield className="size-10 mb-2 text-slate-400" />
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">PRIVACY CORE INFRASTRUCTURE</p>
        </div>
      </main>
    </div>
  );
};

export default Messages;
