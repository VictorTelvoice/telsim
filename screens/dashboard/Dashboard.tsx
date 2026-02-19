
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Slot, SMSLog } from '../../types';
import NotificationsMenu from '../../components/NotificationsMenu';
import { 
  ShieldCheck, 
  Bot, 
  TrendingUp, 
  Lock, 
  ShoppingBag, 
  Vault, 
  Zap, 
  CandlestickChart, 
  Terminal, 
  Megaphone, 
  Globe,
  ArrowRight,
  RefreshCw,
  Copy,
  CheckCircle2,
  Clock,
  Target,
  MessageCircle,
  Instagram,
  Facebook,
  Chrome,
  Smartphone,
  Music,
  Send,
  MessageSquare,
  ShoppingCart,
  Check,
  Landmark,
  User,
  CreditCard
} from 'lucide-react';

type CategoryId = 'privacy' | 'automation' | 'growth';

interface UseCaseCardData {
  id?: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag?: string;
  isPro?: boolean;
}

const USE_CASES: Record<CategoryId, UseCaseCardData[]> = {
  privacy: [
    {
      id: 'vault-2fa',
      icon: <Vault className="size-6" />,
      title: "Bóveda 2FA",
      desc: "Separa tus claves bancarias o Crypto de tu teléfono diario para evitar hackeos.",
      tag: "Seguridad Alta"
    },
    {
      id: 'anonymous',
      icon: <Lock className="size-6" />,
      title: "Registro Anónimo",
      desc: "Verifica WhatsApp, Telegram o Tinder sin revelar tu número personal.",
      tag: "Popular"
    },
    {
      id: 'secure-shopping',
      icon: <ShoppingBag className="size-6" />,
      title: "Compras Seguras",
      desc: "Ideal para MercadoLibre o Marketplace. Evita spam y estafas."
    }
  ],
  automation: [
    {
      id: 'bypass-antibots',
      icon: <Zap className="size-6" />,
      title: "Bypass Antibots",
      desc: "Nuestras SIMs reales superan validaciones bancarias (3D Secure) que bloquean a la competencia.",
      isPro: true
    },
    {
      id: 'sniper-bots',
      icon: <Target className="size-6" />,
      title: "Sniper Bots",
      desc: "Compra ediciones limitadas (Nike, Ticketmaster) automatizando la recepción del SMS.",
      isPro: true
    },
    {
      icon: <CandlestickChart className="size-6" />,
      title: "Arbitraje Crypto",
      desc: "Valida retiros en exchanges automáticamente vía API para trading de alta frecuencia.",
      isPro: true
    },
    {
      icon: <Terminal className="size-6" />,
      title: "QA Testing",
      desc: "Prueba flujos de registro en tus Apps con números reales integrados a tu CI/CD.",
      isPro: true
    }
  ],
  growth: [
    {
      id: 'scale-ads',
      icon: <Megaphone className="size-6" />,
      title: "Escala tus Ads",
      desc: "Crea múltiples cuentas de Facebook/Google Ads sin bloqueos por teléfono repetido."
    },
    {
      icon: <Globe className="size-5" />,
      title: "Cuentas Globales",
      desc: "Accede a servicios de streaming o software geobloqueados en otros países."
    }
  ]
};

const UseCasesShowcase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('privacy');
  const navigate = useNavigate();

  const categories = [
    { id: 'privacy', label: "🛡️ Privacidad", icon: <ShieldCheck className="size-4" /> },
    { id: 'automation', label: "🤖 Automatización", icon: <Bot className="size-4" /> },
    { id: 'growth', label: "📈 Growth", icon: <TrendingUp className="size-4" /> }
  ];

  const handleUseCaseClick = (useCase: UseCaseCardData) => {
    if (useCase.id === 'anonymous') {
      navigate('/use-case/anonymous');
    } else if (useCase.id === 'vault-2fa') {
      navigate('/use-case/vault-2fa');
    } else if (useCase.id === 'bypass-antibots') {
      navigate('/use-case/bypass-antibots');
    } else if (useCase.id === 'sniper-bots') {
      navigate('/use-case/sniper-bots');
    } else if (useCase.id === 'secure-shopping') {
      navigate('/use-case/secure-shopping');
    } else if (useCase.id === 'scale-ads') {
      navigate('/use-case/scale-ads');
    } else {
      navigate('/onboarding/region');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Guías de Uso</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as CategoryId)}
            className={`whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-black transition-all border-2 ${
              activeCategory === cat.id
                ? 'bg-primary border-primary text-white shadow-lg shadow-blue-500/20 scale-105'
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 pb-4">
        {USE_CASES[activeCategory].map((useCase, idx) => (
          <div
            key={idx}
            onClick={() => handleUseCaseClick(useCase)}
            className={`flex-shrink-0 w-64 rounded-3xl p-6 border transition-all duration-300 group relative overflow-hidden cursor-pointer active:scale-[0.98] ${
              useCase.isPro 
              ? 'bg-slate-900 dark:bg-slate-800 border-blue-500/40 shadow-xl shadow-blue-500/10 hover:border-blue-400' 
              : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 shadow-soft hover:border-primary/40'
            }`}
          >
            {useCase.isPro && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
            )}

            <div className={`size-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 ${
              useCase.isPro ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-primary'
            }`}>
              {useCase.icon}
            </div>

            {useCase.tag && (
              <span className="absolute top-6 right-6 text-[8px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                {useCase.tag}
              </span>
            )}

            <h4 className={`text-base font-black mb-2 leading-tight ${useCase.isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
              {useCase.title}
            </h4>
            
            <p className={`text-[11px] font-medium leading-relaxed mb-6 line-clamp-3 ${useCase.isPro ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
              {useCase.desc}
            </p>

            <div 
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                useCase.isPro ? 'text-blue-400 group-hover:text-white' : 'text-primary group-hover:text-blue-700'
              }`}
            >
              <span>Ver Más</span>
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LiveOTPFeed: React.FC<{ messages: SMSLog[] }> = ({ messages }) => {
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  const formatSenderNumber = (num: string) => {
    if (!num) return '---';
    const cleaned = ('' + num).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
        return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    }
    if (cleaned.startsWith('54') && cleaned.length >= 10) {
        return `+54 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
    }
    if (/[a-zA-Z]/.test(num)) return num;
    return num.startsWith('+') ? num : `+${num}`;
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
    if (name.includes('bank') || name.includes('banco') || name.includes('santander') || name.includes('bci')) return { bg: 'bg-slate-700 dark:bg-slate-900', text: 'text-white', icon: <Landmark className="size-6 text-blue-300" />, label: 'Entidad Bancaria' };

    return {
      bg: isPhoneNumber ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      icon: isPhoneNumber ? <User className="size-6" /> : <MessageSquare className="size-6" />,
      label: originalName
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monitor de Tráfico</h3>
            <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">On-Air</span>
            </div>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 py-8 flex flex-col items-center text-center px-6">
            <RefreshCw className="size-6 text-slate-300 dark:text-slate-600 animate-spin mb-3" />
            <p className="text-[11px] font-bold text-slate-400 italic">Esperando tráfico entrante...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const style = getServiceStyle(msg.service_name, msg.sender);
            return (
              <div 
                  key={msg.id} 
                  className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col animate-in slide-in-from-left-4 duration-500 group overflow-hidden relative"
                  style={{ animationDelay: `${idx * 100}ms` }}
              >
                  {idx === 0 && (
                     <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none"></div>
                  )}

                  <div className="flex items-center gap-4 mb-3">
                      <div className={`size-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-all group-hover:scale-105 ${style.bg} ${style.text}`}>
                          {style.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate pr-2">
                                  {style.label}
                              </span>
                              <span className="text-[9px] font-bold text-slate-300 tabular-nums flex items-center gap-1 shrink-0">
                                  <Clock className="size-2.5" />
                                  {formatTime(msg.received_at)}
                              </span>
                          </div>
                          <p className="text-[9px] font-medium text-slate-400 truncate uppercase tracking-widest">de: {formatSenderNumber(msg.sender)}</p>
                      </div>
                  </div>
                  
                  <div className="px-1 mb-4">
                    <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400 italic font-medium">
                      {msg.content}
                    </p>
                  </div>

                  {msg.verification_code && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center justify-between border border-slate-100/50 dark:border-slate-700/50">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CÓDIGO DETECTADO</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-[0.15em] tabular-nums leading-none">
                              {msg.verification_code}
                          </span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleCopy(msg.verification_code!, msg.id); }}
                            className={`size-10 rounded-lg flex items-center justify-center transition-all ${
                                copyingId === msg.id 
                                ? 'bg-emerald-500 text-white shadow-lg' 
                                : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-primary active:scale-90 border border-slate-100 dark:border-slate-700 shadow-sm'
                            }`}
                        >
                            {copyingId === msg.id ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                        </button>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [recentMessages, setRecentMessages] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: slotsData } = await supabase
        .from('slots')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (slotsData) {
        setAllSlots(slotsData);
        const newLineParam = searchParams.get('new_line');
        if (newLineParam) {
          const matchingSlot = slotsData.find(s => s.phone_number === newLineParam);
          if (matchingSlot) setActiveSlot(matchingSlot);
          else if (slotsData.length > 0) setActiveSlot(slotsData[0]);
        } else if (!activeSlot && slotsData.length > 0) {
          setActiveSlot(slotsData[0]);
        }
      }

      // Consulta a sms_logs
      const { data: smsData } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(5);

      if (smsData) setRecentMessages(smsData);
    } catch (err) {
      console.debug("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (!user) return;
    
    // Suscripción a sms_logs
    const channel = supabase
      .channel('dashboard_feed_sync')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sms_logs',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newMsg = payload.new as SMSLog;
        setRecentMessages(prev => [newMsg, ...prev.slice(0, 4)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSelectSlot = (slot: Slot) => {
    setActiveSlot(slot);
    setMenuOpen(false);
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '---';
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
    if (cleaned.startsWith('54') && cleaned.length >= 10) return `+54 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  };

  const getCountryCode = (slot: Slot | null) => {
    if (!slot) return 'cl';
    if (slot.region && slot.region.length === 2) return slot.region.toLowerCase();
    const num = slot.phone_number || '';
    if (num.includes('56')) return 'cl';
    if (num.includes('54')) return 'ar';
    return 'cl';
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10";
    toast.innerHTML = `<div class="size-5 bg-emerald-500 rounded-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div><span class="text-[10px] font-black uppercase tracking-widest">${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <header className="flex items-center gap-3 px-6 py-4 bg-background-light dark:bg-background-dark sticky top-0 z-50">
        <button className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-800 dark:text-white flex-shrink-0">
            <span className="material-icons-round">menu</span>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0 relative">
            <div className="relative group w-full max-w-[220px]">
                <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="relative z-50 flex items-center gap-2 bg-white dark:bg-slate-800 py-2 pl-3 pr-2 rounded-full shadow-md border border-blue-200 dark:border-blue-900 ring-2 ring-blue-500/10 dark:ring-blue-500/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all w-full h-11"
                >
                    <div className="flex items-center gap-2 truncate flex-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                            {loading ? (
                                <span className="animate-pulse">Sincronizando...</span>
                            ) : activeSlot ? (
                                <>
                                    <div className="size-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                      <img src={`https://flagcdn.com/w80/${getCountryCode(activeSlot)}.png`} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex flex-col items-start truncate">
                                      <span className="truncate tracking-tight leading-none text-[13px]">{formatPhoneNumber(activeSlot.phone_number)}</span>
                                    </div>
                                </>
                            ) : (
                                <span className="text-slate-400 italic">Sin puertos activos</span>
                            )}
                        </span>
                    </div>
                    <span className={`material-icons-round text-primary text-lg transition-transform ${menuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {menuOpen && (
                    <>
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setMenuOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700/60 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Infraestructura Vinculada</span>
                            </div>
                            <div className="p-1.5 space-y-1 max-h-[320px] overflow-y-auto no-scrollbar">
                                {allSlots.length > 0 ? (
                                  allSlots.map((slot) => (
                                    <div 
                                      key={slot.slot_id} 
                                      onClick={() => handleSelectSlot(slot)}
                                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group ${activeSlot?.slot_id === slot.slot_id ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                                          <img src={`https://flagcdn.com/w80/${getCountryCode(slot)}.png`} className="w-full h-full object-cover" alt="" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate tabular-nums">{formatPhoneNumber(slot.phone_number)}</span>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block truncate">
                                            Puerto ID: {slot.slot_id}
                                          </span>
                                      </div>
                                      {activeSlot?.slot_id === slot.slot_id && (
                                        <span className="material-icons-round text-primary text-sm shrink-0">check_circle</span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-xs text-slate-400 italic">Inicia una activación en la tienda</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
        <div className="flex-shrink-0">
            <NotificationsMenu />
        </div>
      </header>

      <main className="px-5 py-4 space-y-8 pb-32">
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        {activeSlot ? 'NODO ACTIVO' : 'SIN ASIGNACIÓN'}
                    </span>
                </div>
                <div className="size-8 bg-primary rounded-lg items-center justify-center text-white flex shadow-sm">
                   <span className="material-symbols-outlined text-[18px]">sim_card</span>
                </div>
            </div>
            <div className="text-center mb-6">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Línea Principal TELSIM</p>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {activeSlot ? formatPhoneNumber(activeSlot.phone_number) : '--- --- ---'}
                </h2>
                {activeSlot && (
                    <div className="mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <span className="material-icons-round text-xs">signal_cellular_alt</span>
                        CONECTADO A LA RED
                    </div>
                )}
            </div>
            
            {activeSlot ? (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { navigator.clipboard.writeText(formatPhoneNumber(activeSlot.phone_number)); showToast("Número Copiado"); }}
                  className="bg-primary hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <span className="material-icons-round text-lg">content_copy</span>
                    <span>Copiar</span>
                </button>
                <button 
                  onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(activeSlot.phone_number)}`)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <span className="material-icons-round text-lg">chat_bubble</span>
                    <span>Bandeja</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/onboarding/region')}
                className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                  <span className="material-symbols-outlined text-lg">add</span>
                  {t('dashboard.get_first')}
              </button>
            )}
        </div>

        <LiveOTPFeed messages={recentMessages} />

        <UseCasesShowcase />
      </main>
    </div>
  );
};

export default Dashboard;