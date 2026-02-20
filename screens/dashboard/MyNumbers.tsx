import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
import { Slot } from '../../types';
import { 
  Copy, 
  Trash2, 
  Settings, 
  Mail, 
  PlusCircle, 
  ArrowLeft, 
  AlertTriangle,
  Pencil, 
  Check, 
  X, 
  Crown,
  Zap,
  Leaf,
  ChevronRight,
  Loader2,
  Bot,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Send
} from 'lucide-react';

interface SlotWithPlan extends Slot {
  actual_plan_name?: string;
  monthly_limit?: number;
  credits_used?: number;
}

const OFFICIAL_PLANS_DATA = [
  { 
    id: 'Starter', 
    name: 'Starter', 
    subtitle: '150 Créditos SMS',
    price: 19.90, 
    limit: 150, 
    stripePriceId: 'price_1SzJRLEADSrtMyiaQaDEp44E', 
    icon: 'shield',
    features: [
        'Número SIM Real (no VoIP baratos)',
        'Notificaciones en tiempo real',
        'Visualización en App',
        'Capacidad: 150 SMS mensuales',
        'Soporte técnico vía Ticket'
    ],
    accent: 'text-slate-400',
    iconBg: 'bg-slate-100',
    border: 'border-slate-100 dark:border-slate-800'
  },
  { 
    id: 'Pro', 
    name: 'Pro', 
    subtitle: '400 Créditos SMS',
    price: 39.90, 
    limit: 400, 
    stripePriceId: 'price_1SzJS9EADSrtMyiagxHUI2qM', 
    icon: 'bolt',
    features: [
        'Todo lo incluido en Starter',
        'SMS 100% automatizados',
        'Acceso a API y Webhooks',
        'Capacidad: 400 SMS mensuales',
        'Soporte vía Ticket y Chat'
    ],
    popularBadge: 'MÁS POPULAR',
    accent: 'text-[#0047FF]',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500/40'
  },
  { 
    id: 'Power', 
    name: 'Power', 
    subtitle: '1,400 Créditos SMS',
    price: 99.00, 
    limit: 1400, 
    stripePriceId: 'price_1SzJSbEADSrtMyiaPEMzNKUe', 
    icon: 'electric_bolt',
    features: [
        'Todo lo incluido en Pro',
        'Seguridad y Control Empresarial',
        'Integraciones y Escalabilidad',
        'Capacidad: 1,400 SMS mensuales',
        'Soporte Prioritario 24/7'
    ],
    premiumBadge: 'POTENCIA TOTAL',
    accent: 'text-[#B49248]',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-400/50'
  }
];

const MyNumbers: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { refreshUnreadCount } = useMessagesCount();
    const [slots, setSlots] = useState<SlotWithPlan[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [tempLabelValue, setTempLabelValue] = useState('');
    const [savingLabel, setSavingLabel] = useState(false);

    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [slotToRelease, setSlotToRelease] = useState<SlotWithPlan | null>(null);
    const [confirmReleaseCheck, setConfirmReleaseCheck] = useState(false);
    const [releasing, setReleasing] = useState(false);

    const [isFwdModalOpen, setIsFwdModalOpen] = useState(false);
    const [activeConfigSlot, setActiveConfigSlot] = useState<SlotWithPlan | null>(null);
    const [savingFwd, setSavingFwd] = useState(false);
    
    const [tgEnabled, setTgEnabled] = useState(false);
    const [tgToken, setTgToken] = useState('');
    const [tgChatId, setTgChatId] = useState('');
    const [slotFwdActive, setSlotFwdActive] = useState(false);

    const [showUpgradeView, setShowUpgradeView] = useState(false);
    const [slotToUpgrade, setSlotToUpgrade] = useState<SlotWithPlan | null>(null);

    const fetchSlots = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: slotsData } = await supabase
                .from('slots')
                .select('*')
                .eq('assigned_to', user.id)
                .order('created_at', { ascending: false });

            const { data: subsData } = await supabase
                .from('subscriptions')
                .select('phone_number, plan_name, monthly_limit, credits_used, slot_id')
                .eq('user_id', user.id)
                .eq('status', 'active');

            const { data: userData } = await supabase
                .from('users')
                .select('telegram_token, telegram_chat_id, telegram_enabled')
                .eq('id', user.id)
                .single();

            if (userData) {
                setTgToken(userData.telegram_token || '');
                setTgChatId(userData.telegram_chat_id || '');
                setTgEnabled(userData.telegram_enabled || false);
            }

            const enrichedSlots = (slotsData || []).map(slot => {
                const subscription = subsData?.find(s => s.slot_id === slot.slot_id || s.phone_number === slot.phone_number);
                return {
                    ...slot,
                    actual_plan_name: subscription?.plan_name || slot.plan_type || 'Starter',
                    monthly_limit: subscription?.monthly_limit || 150,
                    credits_used: subscription?.credits_used || 0,
                    forwarding_active: slot.forwarding_active || false
                };
            });

            setSlots(enrichedSlots);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlots();
    }, [user]);

    // Lógica para detectar si volvemos desde el resumen de upgrade
    useEffect(() => {
      if (location.state?.reopenUpgrade && slots.length > 0) {
        const slot = slots.find(s => s.slot_id === location.state.slotId);
        if (slot) {
          setSlotToUpgrade(slot);
          setShowUpgradeView(true);
          // Limpiamos el estado para que no se reabra innecesariamente en futuros renders
          window.history.replaceState({}, document.title);
        }
      }
    }, [location.state, slots]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'} backdrop-blur-md text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10`;
        toast.innerHTML = `<span class="text-[11px] font-black uppercase tracking-widest">${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    const handleCopy = (num: string) => {
        const formatted = formatPhoneNumber(num);
        navigator.clipboard.writeText(formatted);
        showToast("Número Copiado");
    };

    const handleSaveLabel = async (slotId: string) => {
        setSavingLabel(true);
        try {
            const { error } = await supabase
                .from('slots')
                .update({ label: tempLabelValue })
                .eq('slot_id', slotId);
            
            if (error) throw error;
            setSlots(prev => prev.map(s => s.slot_id === slotId ? { ...s, label: tempLabelValue } : s));
            setEditingLabelId(null);
        } catch (err) {
            console.error(err);
        } finally {
            setSavingLabel(false);
        }
    };

    const formatPhoneNumber = (num: string) => {
        if (!num) return '---';
        const cleaned = ('' + num).replace(/\D/g, '');
        if (cleaned.startsWith('569') && cleaned.length === 11) {
            return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
        }
        return num.startsWith('+') ? num : `+${num}`;
    };

    const getCountryCode = (slot: SlotWithPlan) => {
        if (slot.region && slot.region.length === 2) return slot.region.toLowerCase();
        const num = slot.phone_number || '';
        if (num.includes('56')) return 'cl';
        if (num.includes('54')) return 'ar';
        return 'cl';
    };

    const handleReleaseSlot = async () => {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        try {
            await supabase
                .from('subscriptions')
                .update({ status: 'canceled' })
                .eq('slot_id', slotToRelease.slot_id)
                .eq('user_id', user.id);

            const { error: slotError } = await supabase
                .from('slots')
                .update({ 
                    assigned_to: null, 
                    status: 'libre',
                    plan_type: null,
                    label: null,
                    forwarding_active: false
                })
                .eq('slot_id', slotToRelease.slot_id);
            
            if (slotError) throw slotError;
            
            refreshUnreadCount();
            showToast("Número liberado con éxito.");
            setIsReleaseModalOpen(false);
            setSlotToRelease(null);
            setConfirmReleaseCheck(false);
            fetchSlots();
        } catch (err: any) {
            console.error("[RELEASE ERROR]", err);
            showToast(err.message || "Fallo en la comunicación con el Ledger", "error");
        } finally {
            setReleasing(false);
        }
    };

    const openAutomationConfig = (slot: SlotWithPlan) => {
        setActiveConfigSlot(slot);
        setSlotFwdActive(slot.forwarding_active || false);
        setIsFwdModalOpen(true);
    };

    const handleSaveAutomation = async () => {
        if (!user || !activeConfigSlot) return;
        setSavingFwd(true);
        try {
            const { error: userErr } = await supabase
                .from('users')
                .update({
                    telegram_enabled: tgEnabled,
                    telegram_token: tgToken,
                    telegram_chat_id: tgChatId
                })
                .eq('id', user.id);

            if (userErr) throw userErr;

            const { error: slotErr } = await supabase
                .from('slots')
                .update({ forwarding_active: slotFwdActive })
                .eq('slot_id', activeConfigSlot.slot_id);

            if (slotErr) throw slotErr;

            showToast("Automatización guardada");
            setIsFwdModalOpen(false);
            fetchSlots();
        } catch (err) {
            console.error(err);
            showToast("Error al guardar config.", "error");
        } finally {
            setSavingFwd(false);
        }
    };

    const handleUpgradeSelect = (slot: SlotWithPlan) => {
        setSlotToUpgrade(slot);
        setShowUpgradeView(true);
    };

    const confirmUpgrade = (plan: any) => {
        if (!slotToUpgrade) return;
        navigate('/dashboard/upgrade-summary', {
            state: {
                phoneNumber: slotToUpgrade.phone_number,
                planName: plan.id,
                currentPlanName: slotToUpgrade.actual_plan_name,
                currentLimit: slotToUpgrade.monthly_limit,
                price: plan.price,
                limit: plan.limit,
                stripePriceId: plan.stripePriceId,
                slot_id: slotToUpgrade.slot_id
            }
        });
        setShowUpgradeView(false);
    };

    const getPlanStyle = (planName: string | undefined | null) => {
        const rawName = (planName || 'Starter').toString().toUpperCase();
        if (rawName.includes('POWER')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#B49248] via-[#D4AF37] to-[#8C6B1C] text-white shadow-xl',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-amber-100',
                chip: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-100',
                icon: <Crown className="size-3" />,
                label: 'POWER',
                progressFill: 'bg-white'
            };
        }
        if (rawName.includes('PRO')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00E0FF] text-white shadow-xl',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-blue-50',
                chip: 'bg-gradient-to-br from-slate-200 via-slate-100 to-white',
                icon: <Zap className="size-3" />,
                label: 'PRO',
                progressFill: 'bg-white'
            };
        }
        return {
            cardBg: 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 shadow-soft',
            badgeBg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
            accentText: 'text-primary',
            chip: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
            icon: <Leaf className="size-3" />,
            label: 'STARTER',
            progressFill: 'bg-emerald-500'
        };
    };

    if (showUpgradeView && slotToUpgrade) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex flex-col animate-in fade-in duration-300">
            {/* Header Integrado */}
            <header className="flex items-center justify-between px-6 py-6 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md sticky top-0 z-50">
                <button onClick={() => setShowUpgradeView(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-6" />
                </button>
                <div className="text-center flex-1">
                   <h1 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Cambiar Plan</h1>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Puerto {formatPhoneNumber(slotToUpgrade.phone_number)}</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 flex flex-col gap-4 px-6 pb-12 overflow-hidden max-w-lg mx-auto w-full">
                <div className="text-center mb-2">
                    <h2 className="text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight">Elige tu plan</h2>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    {OFFICIAL_PLANS_DATA.map((plan) => {
                        const isCurrent = (slotToUpgrade.actual_plan_name || 'Starter').toUpperCase() === plan.id.toUpperCase();
                        
                        return (
                            <div 
                                key={plan.id}
                                onClick={() => !isCurrent && confirmUpgrade(plan)}
                                className={`relative flex-1 flex flex-col justify-between bg-white dark:bg-surface-dark rounded-[2.2rem] p-5 border-2 transition-all cursor-pointer ${
                                  isCurrent 
                                  ? 'border-slate-100 dark:border-slate-800 opacity-60 pointer-events-none' 
                                  : `hover:scale-[1.01] ${plan.border} shadow-sm active:scale-[0.99]`
                                }`}
                            >
                                {/* Badges Integrados */}
                                {plan.popularBadge && (
                                  <div className="absolute -top-2.5 left-8 bg-[#0047FF] text-white text-[7px] font-black px-3 py-1 rounded-full shadow-lg border border-white/20 uppercase tracking-widest z-10">
                                    {plan.popularBadge}
                                  </div>
                                )}
                                {plan.premiumBadge && (
                                  <div className="absolute -top-2.5 left-8 bg-gradient-to-r from-[#B49248] to-[#8C6B1C] text-white text-[7px] font-black px-3 py-1 rounded-full shadow-lg border border-white/20 uppercase tracking-widest z-10">
                                    {plan.premiumBadge}
                                  </div>
                                )}

                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 items-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCurrent ? 'bg-slate-100' : `${plan.iconBg} ${plan.accent}`}`}>
                                            <span className="material-symbols-outlined text-[22px]">{plan.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-black uppercase tracking-tight ${isCurrent ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{plan.name}</h3>
                                            <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isCurrent ? 'text-slate-300' : plan.accent}`}>{plan.subtitle}</p>
                                        </div>
                                    </div>
                                    
                                    {isCurrent ? (
                                        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            <div className="size-1 rounded-full bg-emerald-500"></div>
                                            <span className="text-[7px] font-black text-emerald-600 uppercase">Actual</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-baseline gap-0.5">
                                            <span className={`text-2xl font-black tracking-tighter tabular-nums ${isCurrent ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>${plan.price.toFixed(2)}</span>
                                            <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">/m</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-2 mt-2">
                                    {plan.features.map((feat, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={`size-4 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? 'bg-slate-100' : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100/50'}`}>
                                                <span className={`material-symbols-outlined text-[10px] font-black ${isCurrent ? 'text-slate-300' : plan.accent}`}>done</span>
                                            </div>
                                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold leading-none">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
      );
    }

    return (
        <div className="min-h-screen relative bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Mis Tarjetas Sim</h1>
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -mr-2 text-primary dark:text-blue-400">
                    <PlusCircle className="size-5" />
                </button>
            </header>

            <main className="px-5 py-8 space-y-12 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="size-10 text-primary animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando puertos...</p>
                    </div>
                ) : (
                    <div className="space-y-14">
                        {slots.map((slot) => {
                            const style = getPlanStyle(slot.actual_plan_name);
                            const usagePercent = Math.min(100, ((slot.credits_used || 0) / (slot.monthly_limit || 150)) * 100);
                            
                            return (
                                <div key={slot.slot_id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className={`relative shadow-2xl rounded-[2rem] overflow-hidden group/sim transition-all duration-500 p-7 aspect-[1.58/1] flex flex-col justify-between ${style.cardBg}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[12px] font-black tracking-tighter uppercase ${style.accentText}`}>Telsim Online</span>
                                                <div className="mt-1 flex items-center">
                                                    {editingLabelId === slot.slot_id ? (
                                                        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/10">
                                                            <input type="text" value={tempLabelValue} onChange={(e) => setTempLabelValue(e.target.value)} className="bg-transparent border-none p-0 px-1 text-[10px] font-black w-24 outline-none uppercase" autoFocus />
                                                            <button onClick={() => handleSaveLabel(slot.slot_id)} className="text-emerald-400 p-0.5"><Check className="size-3" /></button>
                                                            <button onClick={() => setEditingLabelId(null)} className="text-white/50 p-0.5"><X className="size-3" /></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setEditingLabelId(slot.slot_id); setTempLabelValue(slot.label || ''); }} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                                            <span className="text-[10px] font-black uppercase tracking-widest italic truncate max-w-[120px]">
                                                                {(slot.label || 'Mi Línea').toUpperCase()}
                                                            </span>
                                                            <Pencil className="size-2.5 opacity-40" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="size-8 rounded-full overflow-hidden border-2 shadow-sm border-white/40">
                                                <img src={`https://flagcdn.com/w80/${getCountryCode(slot)}.png`} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-11 rounded-lg border border-black/10 shadow-inner ${style.chip}`}></div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Subscriber Number</span>
                                                <h3 className="text-[24px] font-black font-mono tracking-tighter leading-none">{formatPhoneNumber(slot.phone_number)}</h3>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col gap-2">
                                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${style.badgeBg}`}>
                                                    {style.icon} {style.label}
                                                </div>
                                                <div className="w-24 h-[3px] bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full ${style.progressFill}`} style={{ width: `${usagePercent}%` }}></div>
                                                </div>
                                            </div>
                                            <span className="text-[7px] font-bold opacity-20 uppercase">Nodo: {slot.slot_id}</span>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-center gap-3">
                                        <button onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)} className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"><Mail className="size-4 text-primary" /> Bandeja</button>
                                        <button onClick={() => handleCopy(slot.phone_number)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm"><Copy className="size-4 text-slate-400" /></button>
                                        
                                        <button onClick={() => openAutomationConfig(slot)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm hover:text-primary transition-colors">
                                            <Settings className={`size-4 ${slot.forwarding_active ? 'text-primary' : 'text-slate-400'}`} />
                                        </button>

                                        <button onClick={() => handleUpgradeSelect(slot)} className="size-12 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-primary rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm">
                                            <TrendingUp className="size-4" />
                                        </button>
                                        
                                        <button onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }} className="size-12 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center transition-transform active:scale-90"><Trash2 className="size-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
                        <div className="bg-rose-500 p-8 text-white">
                            <AlertTriangle className="size-10 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight uppercase">Confirmar Baja</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-sm font-bold text-slate-500 leading-relaxed italic">Esta acción cancelará tu suscripción y liberará el puerto físico {formatPhoneNumber(slotToRelease.phone_number)} inmediatamente.</p>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input type="checkbox" checked={confirmReleaseCheck} onChange={(e) => setConfirmReleaseCheck(e.target.checked)} className="mt-1 size-5 rounded border-slate-200 text-rose-500 focus:ring-rose-500" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Entiendo que esta acción es permanente y no hay reembolsos.</span>
                            </label>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleReleaseSlot} disabled={!confirmReleaseCheck || releasing} className={`w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${confirmReleaseCheck ? 'bg-rose-600 text-white shadow-xl active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                                    {releasing ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'CONFIRMAR BAJA TOTAL'}
                                </button>
                                <button onClick={() => { setIsReleaseModalOpen(false); setConfirmReleaseCheck(false); }} className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFwdModalOpen && activeConfigSlot && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="bg-primary p-8 text-white relative">
                            <button onClick={() => setIsFwdModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20">
                                <X className="size-5" />
                            </button>
                            <Bot className="size-10 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight uppercase">Automatización</h2>
                            <p className="text-[10px] font-black uppercase text-white/60 tracking-widest mt-1">Línea: {formatPhoneNumber(activeConfigSlot.phone_number)}</p>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-primary/20">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">Redirección SMS</span>
                                    <span className="text-[9px] font-bold text-slate-400">Estado del puerto</span>
                                </div>
                                <button onClick={() => setSlotFwdActive(!slotFwdActive)} className="text-primary">
                                    {slotFwdActive ? <ToggleRight className="size-10" /> : <ToggleLeft className="size-10 text-slate-300" />}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Send className="size-4 text-primary" />
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telegram Bot Gateway</h3>
                                    <button onClick={() => navigate('/dashboard/telegram-guide')} className="ml-auto text-[9px] font-black text-primary uppercase underline">¿Cómo configurar?</button>
                                </div>
                                
                                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bot API Token</label>
                                        <input 
                                            type="password" 
                                            value={tgToken} 
                                            onChange={(e) => setTgToken(e.target.value)} 
                                            className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-mono"
                                            placeholder="582910... (de BotFather)"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Chat ID</label>
                                        <input 
                                            type="text" 
                                            value={tgChatId} 
                                            onChange={(e) => setTgChatId(e.target.value)} 
                                            className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-mono"
                                            placeholder="91823... (de userinfobot)"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={tgEnabled} onChange={(e) => setTgEnabled(e.target.checked)} className="size-4 rounded border-slate-200 text-primary focus:ring-primary" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Habilitar vía Telegram</span>
                                    </label>
                                </div>
                            </div>

                            <button 
                                onClick={handleSaveAutomation}
                                disabled={savingFwd}
                                className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                {savingFwd ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'Actualizar Configuración'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;