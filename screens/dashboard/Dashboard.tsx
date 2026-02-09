import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Plus,
  Crown
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

const formatPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return '---';
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  if (cleaned.startsWith('569') && cleaned.length === 11) {
      return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
  }
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
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
    } else {
      navigate('/onboarding/region');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sugerencias de Uso</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {categories?.map((cat) => (
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
        {(USE_CASES[activeCategory] || [])?.map((useCase, idx) => (
          <div
            key={idx}
            onClick={() => handleUseCaseClick(useCase)}
            className={`flex-shrink-0 w-64 rounded-3xl p-6 border transition-all duration-300 group relative overflow-hidden cursor-pointer active:scale-[0.98] ${
              useCase.isPro 
              ? 'bg-slate-900 dark:bg-slate-800 border-blue-500/40 shadow-xl shadow-blue-500/10 hover:border-blue-400' 
              : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 shadow-soft hover:border-primary/40'
            }`}
          >
            <div className={`size-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
              useCase.isPro ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-primary'
            }`}>
              {useCase.icon}
            </div>
            <h4 className={`text-base font-black mb-2 leading-tight ${useCase.isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
              {(useCase.title || 'Uso').toString()}
            </h4>
            <p className={`text-[11px] font-medium leading-relaxed mb-6 line-clamp-3 ${useCase.isPro ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
              {(useCase.desc || '').toString()}
            </p>
            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${useCase.isPro ? 'text-blue-400' : 'text-primary'}`}>
              <span>Ver más</span>
              <ArrowRight className="size-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [recentMessages, setRecentMessages] = useState<SMSLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const fetchData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const { data: slotsData } = await supabase
        .from('slots')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (slotsData) {
        setAllSlots(slotsData);
        
        // LÓGICA DE SELECCIÓN INTELIGENTE
        const newlyActivated = location.state?.newlyActivatedNumber;
        if (newlyActivated) {
            const match = slotsData.find(s => s.phone_number === newlyActivated);
            if (match) {
                setActiveSlot(match);
                // Limpiamos el state para que recargas de página no fuercen la selección
                window.history.replaceState({}, document.title);
            } else if (slotsData.length > 0) {
                setActiveSlot(slotsData[0]);
            }
        } else if (!activeSlot && slotsData.length > 0) {
            setActiveSlot(slotsData[0]);
        }
      }

      const { data: smsData } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .not('verification_code', 'is', null)
        .order('received_at', { ascending: false })
        .limit(3);

      if (smsData) setRecentMessages(smsData);
    } catch (err) {
      console.debug("Dashboard fetch error", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, location.state]);

  const handleSelectSlot = (slot: Slot) => {
    setActiveSlot(slot);
    setMenuOpen(false);
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10";
    toast.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest">${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleCopy = () => {
    if (!activeSlot) return;
    navigator.clipboard.writeText(formatPhoneNumber(activeSlot.phone_number));
    showToast("Número Copiado");
  };

  const getCountryCode = (slot: Slot | null) => {
    if (!slot) return 'cl';
    const num = slot.phone_number || '';
    if (num.includes('56')) return 'cl';
    return 'cl';
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <header className="flex items-center gap-3 px-6 py-6 bg-background-light dark:bg-background-dark sticky top-0 z-50">
        <div className="flex items-center gap-3 flex-1 min-w-0 relative">
            <div className="relative group w-full max-w-[220px]">
                <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="relative z-50 flex items-center gap-2 bg-white dark:bg-slate-800 py-2 pl-3 pr-2 rounded-full shadow-md border border-blue-200 dark:border-blue-900 ring-2 ring-blue-500/10 dark:ring-blue-500/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all w-full h-11"
                >
                    <div className="flex items-center gap-2 truncate flex-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                            {loadingData ? (
                                <span className="animate-pulse">Sincronizando...</span>
                            ) : activeSlot ? (
                                <>
                                    <div className="size-5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                      <img 
                                        src={`https://flagcdn.com/w80/${getCountryCode(activeSlot)}.png`}
                                        className="w-full h-full object-cover"
                                        alt=""
                                      />
                                    </div>
                                    <span className="truncate tracking-tight leading-none text-[13px]">{formatPhoneNumber(activeSlot.phone_number)}</span>
                                </>
                            ) : (
                                <span className="text-slate-400 italic">Sin línea activa</span>
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
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Líneas Vinculadas</span>
                            </div>
                            <div className="p-1.5 space-y-1 max-h-[320px] overflow-y-auto no-scrollbar">
                                {allSlots.map((slot) => (
                                    <div 
                                      key={slot.port_id} 
                                      onClick={() => handleSelectSlot(slot)}
                                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group ${activeSlot?.port_id === slot.port_id ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                                          <img 
                                            src={`https://flagcdn.com/w80/${getCountryCode(slot)}.png`}
                                            className="w-full h-full object-cover"
                                            alt=""
                                          />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate tabular-nums">{formatPhoneNumber(slot.phone_number)}</span>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block truncate">
                                            Plan {(slot.plan_type || 'Starter').toString()}
                                          </span>
                                      </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
        <NotificationsMenu />
      </header>

      <main className="px-5 py-4 space-y-8 pb-32">
        {/* CARD PRINCIPAL */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        {activeSlot ? 'PUERTO ACTIVO' : 'SIN LÍNEA'}
                    </span>
                </div>
            </div>
            <div className="text-center mb-6">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Línea de Red Principal</p>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {activeSlot ? formatPhoneNumber(activeSlot.phone_number) : '--- --- ---'}
                </h2>
                {activeSlot && (
                    <div className="mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <span className="material-icons-round text-xs">signal_cellular_alt</span>
                        Sincronizado vía TELSIM Cloud
                    </div>
                )}
            </div>
            
            {activeSlot ? (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleCopy}
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
                  <Plus className="size-5" />
                  Obtener mi primera línea
              </button>
            )}
        </div>

        {/* FEED DE MENSAJES RECIENTES */}
        {recentMessages?.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Últimos Códigos</h3>
            </div>
            <div className="space-y-3">
              {recentMessages?.map((msg) => (
                <div key={msg.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-3 overflow-hidden">
                      <div className="size-10 bg-blue-50 dark:bg-blue-900/30 text-primary rounded-xl flex items-center justify-center shrink-0">
                         <MessageSquare className="size-5" />
                      </div>
                      <div className="overflow-hidden">
                         <h5 className="text-xs font-black truncate uppercase tracking-tight">{(msg.service_name || msg.sender || 'Servicio').toString().toUpperCase()}</h5>
                         <p className="text-[9px] font-bold text-slate-400 truncate">Vía {formatPhoneNumber(allSlots?.find(s => s.port_id === msg.slot_id)?.phone_number || '')}</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-lg font-black font-mono tracking-widest text-primary">{(msg.verification_code || '').toString()}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <UseCasesShowcase />
      </main>
    </div>
  );
};

export default Dashboard;