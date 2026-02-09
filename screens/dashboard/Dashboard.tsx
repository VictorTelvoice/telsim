import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Plus
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
            {/* Added missing className attribute to fix JSX syntax error */}
            <div className={`size-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
              useCase.isPro ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-primary'
            }`}>
              {useCase.icon}
            </div>
            <h4 className={`text-base font-black mb-2 leading-tight ${useCase.isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
              {useCase.title}
            </h4>
            <p className={`text-[11px] font-medium leading-relaxed mb-6 line-clamp-3 ${useCase.isPro ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
              {useCase.desc}
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
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [recentMessages, setRecentMessages] = useState<SMSLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const navigate = useNavigate();
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

      if (slotsData) setAllSlots(slotsData);

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
  }, [user]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      <header className="flex items-center justify-between px-6 py-6 bg-background-light dark:bg-background-dark sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined">sim_card</span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter">TELSIM</h1>
        </div>
        <NotificationsMenu />
      </header>

      <main className="px-5 py-4 space-y-8 pb-32">
        {/* LISTADO DE LÍNEAS ACTIVAS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mis Líneas Activas ({allSlots.length})</h3>
             <button onClick={() => navigate('/onboarding/region')} className="text-[10px] font-black text-primary uppercase flex items-center gap-1">
                <Plus className="size-3" />
                Añadir
             </button>
          </div>

          {loadingData ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="size-8 text-primary/30 animate-spin" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando puertos...</p>
             </div>
          ) : allSlots.length === 0 ? (
            <div className="bg-white dark:bg-surface-dark rounded-3xl p-10 border-2 border-dashed border-slate-100 dark:border-slate-800 text-center space-y-6">
                <div className="size-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Smartphone className="size-8" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-lg font-black tracking-tight">Sin puertos activos</h4>
                    <p className="text-sm text-slate-500 font-medium">Activa tu primera línea física privada para empezar a recibir SMS.</p>
                </div>
                <button 
                    onClick={() => navigate('/onboarding/region')}
                    className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-button uppercase tracking-widest text-[11px]"
                >
                    Obtener mi primer número
                </button>
            </div>
          ) : (
            <div className="space-y-4">
              {allSlots.map((slot) => (
                <div 
                  key={slot.port_id} 
                  onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)}
                  className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft hover:scale-[1.01] transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full overflow-hidden border border-slate-100">
                                <img src={`https://flagcdn.com/w80/cl.png`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                    {formatPhoneNumber(slot.phone_number)}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">{slot.plan_type}</span>
                                    <div className="size-1 bg-emerald-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className="size-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                            <MessageSquare className="size-5" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <Zap className="size-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Red 4G LTE Activa</span>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(slot.phone_number);
                            }}
                            className="text-[9px] font-black text-slate-400 uppercase hover:text-primary"
                        >
                            Copiar Número
                        </button>
                    </div>
                </div>
              ))}
              
              {/* BOTÓN PARA AÑADIR MÁS SIEMPRE VISIBLE */}
              <button 
                onClick={() => navigate('/onboarding/region')}
                className="w-full h-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center gap-3 text-slate-400 hover:text-primary hover:border-primary transition-all group"
              >
                  <Plus className="size-6 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-widest">Añadir otra línea privada</span>
              </button>
            </div>
          )}
        </section>

        {/* FEED DE MENSAJES RECIENTES */}
        {recentMessages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Últimos Códigos</h3>
            </div>
            <div className="space-y-3">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-3 overflow-hidden">
                      <div className="size-10 bg-blue-50 dark:bg-blue-900/30 text-primary rounded-xl flex items-center justify-center shrink-0">
                         <MessageSquare className="size-5" />
                      </div>
                      <div className="overflow-hidden">
                         <h5 className="text-xs font-black truncate uppercase tracking-tight">{msg.service_name || msg.sender}</h5>
                         <p className="text-[9px] font-bold text-slate-400 truncate">Vía {formatPhoneNumber(allSlots.find(s => s.port_id === msg.slot_id)?.phone_number || '')}</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-lg font-black font-mono tracking-widest text-primary">{msg.verification_code}</p>
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