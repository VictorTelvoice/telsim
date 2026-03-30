
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Slot, SMSLog } from '../../types';
import SideDrawer from '../../components/SideDrawer';
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
  ArrowUpDown,
} from 'lucide-react';

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { refreshUnreadCount, setUnreadSmsCount } = useMessagesCount();
  const { unreadCount: unreadNotificationsCount } = useNotifications();
  
  const [messages, setMessages] = useState<SMSLog[]>([]);
  const [userSlots, setUserSlots] = useState<Slot[]>([]);
  const [slotMap, setSlotMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'all' | 'verifications' | 'others'>('verifications');
  const [messageSearch, setMessageSearch] = useState('');
  const markTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReadIdsRef = useRef<Set<string>>(new Set());
  const markingReadRef = useRef(false);

  const filterNum = searchParams.get('num');
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const savedPlanId = localStorage.getItem('selected_plan') || 'starter';
  const planName = savedPlanId.charAt(0).toUpperCase() + savedPlanId.slice(1);

  const flushPendingReadMarks = useCallback(async () => {
    if (!user || markingReadRef.current) return;
    const uniqueIds = [...pendingReadIdsRef.current].filter(Boolean);
    if (uniqueIds.length === 0) return;

    pendingReadIdsRef.current.clear();
    markingReadRef.current = true;

    const { error } = await supabase
      .from('sms_logs')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('id', uniqueIds)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
      refreshUnreadCount();
    } else {
      setMessages((prev) => prev.map((msg) => (
        uniqueIds.includes(msg.id) ? { ...msg, is_read: true } : msg
      )));
      setUnreadSmsCount((prev) => Math.max(0, prev - uniqueIds.length));
    }

    markingReadRef.current = false;
  }, [user, refreshUnreadCount, setUnreadSmsCount]);

  const scheduleMarkMessagesAsRead = useCallback((ids: string[]) => {
    if (!user || ids.length === 0) return;

    ids.filter(Boolean).forEach((id) => pendingReadIdsRef.current.add(id));
    if (markTimerRef.current) return;

    markTimerRef.current = setTimeout(() => {
      markTimerRef.current = null;
      void flushPendingReadMarks();
    }, 800);
  }, [user, flushPendingReadMarks]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const response = await fetch('/api/manage', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'mobile-messages-snapshot',
            accessToken: session?.access_token || null,
          }),
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((body as { error?: string }).error || 'No se pudieron cargar los mensajes.');
        }

        const nextSlots = (((body as { slots?: Slot[] }).slots) || []) as Slot[];
        const nextMessages = (((body as { messages?: SMSLog[] }).messages) || []) as SMSLog[];

        setUserSlots(nextSlots);
        setSlotMap(nextSlots.reduce((acc, s) => {
          acc[s.slot_id] = s.phone_number;
          return acc;
        }, {} as Record<string, string>));
        setMessages(nextMessages);

        const unreadIds = nextMessages.filter((msg) => !msg.is_read).map((msg) => msg.id);
        if (unreadIds.length > 0) {
          scheduleMarkMessagesAsRead(unreadIds);
        }
      } catch (snapshotError) {
        console.warn('[Messages] mobile-messages-snapshot fallback', snapshotError);

        const { data: slotsData } = await supabase
          .from('slots')
          .select('slot_id, phone_number, plan_type, assigned_to, created_at')
          .eq('assigned_to', user.id);

        if (slotsData) {
          setUserSlots(slotsData);
          const mapping = slotsData.reduce((acc, s) => {
            acc[s.slot_id] = s.phone_number;
            return acc;
          }, {} as Record<string, string>);
          setSlotMap(mapping);
        }

        const { data, error } = await supabase
          .from('sms_logs')
          .select('id, user_id, sender, content, received_at, slot_id, service_name, verification_code, is_read')
          .eq('user_id', user.id)
          .order('received_at', { ascending: false });

        if (error) throw error;
        const nextMessages = data || [];
        setMessages(nextMessages);

        const unreadIds = nextMessages.filter((msg) => !msg.is_read).map((msg) => msg.id);
        if (unreadIds.length > 0) {
          scheduleMarkMessagesAsRead(unreadIds);
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user, scheduleMarkMessagesAsRead]);

  useEffect(() => {
    // Reset local state on user change for clean load
    setMessages([]);
    fetchData();

    if (!user) return () => undefined;

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
        if (!newMsg.is_read) {
          scheduleMarkMessagesAsRead([newMsg.id]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (markTimerRef.current) {
        clearTimeout(markTimerRef.current);
        markTimerRef.current = null;
      }
      pendingReadIdsRef.current.clear();
      markingReadRef.current = false;
    };
  }, [user, fetchData, scheduleMarkMessagesAsRead]);

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
      if (messageType === 'verifications' && !hasCode) return false;
      if (messageType === 'others' && hasCode) return false;
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

    return [...base].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  }, [messages, messageType, filterNum, slotMap, messageSearch]);

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
        <h1 className="text-center text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('messages.title')}</h1>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          aria-label="Actualizar mensajes"
        >
          <RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="px-5 pt-4 max-w-lg mx-auto lg:max-w-4xl lg:px-10">

        <section className="space-y-2 pb-2">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {filteredMessages.length} SMS
          </p>
          <div className="rounded-[1.5rem] border border-slate-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm px-2 py-1.5 flex items-center gap-1.5 flex-nowrap overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 rounded-xl bg-slate-50/90 dark:bg-slate-800/90 px-2 py-1.5 border border-slate-200/70 dark:border-slate-700/70">
              <Search className="size-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                placeholder="Buscar"
                className="min-w-0 w-full bg-transparent outline-none text-[11px] font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="relative w-[88px] shrink-0">
              <SlidersHorizontal className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as typeof messageType)}
                className="w-full appearance-none bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-xl pl-7 pr-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="all">Todos</option>
                <option value="verifications">OTP</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div className="relative w-[96px] shrink-0">
              <ArrowUpDown className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
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
          </div>
        </section>
      </div>
      
      <main className="px-5 max-w-lg mx-auto lg:max-w-4xl lg:px-10 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('messages.syncing')}</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-32 px-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="size-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-slate-700">
              <span className="material-symbols-rounded text-[40px] opacity-20">{filterNum ? 'filter_alt_off' : (messageType === 'verifications' ? 'key' : 'mail')}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{filterNum ? t('messages.no_traffic') : (messageType === 'verifications' ? t('messages.waiting_codes') : t('messages.empty_inbox'))}</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed italic">{filterNum ? t('messages.no_records_for').replace('{num}', formatPhoneNumber(filterNum)) : t('messages.codes_appear_here')}</p>
          </div>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
            {filteredMessages.map((msg, idx) => {
              const style = getServiceStyle(msg.service_name, msg.sender);
              const realNumber = slotMap[msg.slot_id] || msg.slot_id;
              return (
                <div key={msg.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <div />
                      <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 tabular-nums shrink-0">{formatTime(msg.received_at)}</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className={`size-9 rounded-[1rem] flex items-center justify-center shadow-lg flex-shrink-0 mt-1 ${style.bg} ${style.text}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 bg-white dark:bg-surface-dark rounded-[1.25rem] rounded-tl-[0.35rem] px-3 py-2.5 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.99]">
                      <div className="mb-1">
                        <span className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                          {style.label}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <img src={`https://flagcdn.com/w40/${getCountryCode(realNumber)}.png`} className="w-3.5 h-2.5 object-cover rounded-sm opacity-60" alt="" />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">SIM: {formatPhoneNumber(realNumber)}</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <p className="flex-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium">{msg.content}</p>
                        {msg.verification_code ? (
                          <button
                            onClick={(e) => handleCopy(e, msg.verification_code!, msg.id)}
                            className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-all text-[10px] font-black uppercase tracking-wide ${
                              copyingId === msg.id
                                ? 'bg-emerald-500 text-white shadow-lg'
                                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-90 dark:bg-slate-950'
                            }`}
                            aria-label={copyingId === msg.id ? 'Código copiado' : 'Copiar código'}
                          >
                            {copyingId === msg.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                          </button>
                        ) : null}
                      </div>
                      </div>
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

      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={{ name: userName, plan: planName }}
        unreadMessages={0}
        unreadNotifications={unreadNotificationsCount}
        currentLang={language}
        onLangChange={(lang) => setLanguage(lang as 'es' | 'en')}
      />
    </div>
  );
};

export default Messages;
