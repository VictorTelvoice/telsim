import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
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
  Globe, 
  Crown,
  Zap,
  Leaf,
  RefreshCw,
  ChevronRight,
  Info
} from 'lucide-react';

interface SlotWithPlan extends Slot {
  actual_plan_name?: string;
}

const OFFICIAL_PLANS = [
  {
    id: 'Starter',
    name: 'Starter',
    price: 19.90,
    color: 'emerald',
    icon: <Leaf className="size-5" />,
    features: ['Acceso total vía App', 'Soporte vía Ticket', 'Notificaciones Push']
  },
  {
    id: 'Pro',
    name: 'Pro',
    price: 39.90,
    color: 'blue',
    icon: <Zap className="size-5" />,
    features: ['Acceso a API Telsim', 'Webhooks en tiempo real', 'Soporte vía Chat']
  },
  {
    id: 'Power',
    name: 'Power',
    price: 99.00,
    color: 'amber',
    icon: <Crown className="size-5" />,
    features: ['Infraestructura Dedicada', 'Soporte VIP 24/7', 'Escalabilidad P2P']
  }
];

const MyNumbers: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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
    const [slotToFwd, setSlotToFwd] = useState<SlotWithPlan | null>(null);
    const [fwdActive, setFwdActive] = useState(false);
    const [fwdChannel, setFwdChannel] = useState<'telegram' | 'discord' | 'webhook'>('telegram');
    const [fwdConfig, setFwdConfig] = useState('');
    const [savingFwd, setSavingFwd] = useState(false);

    // Nuevo estado para gestión de planes
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [slotForPlan, setSlotForPlan] = useState<SlotWithPlan | null>(null);

    const fetchSlots = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: slotsData, error: slotsError } = await supabase
                .from('slots')
                .select('*')
                .eq('assigned_to', user.id)
                .order('created_at', { ascending: false });

            if (slotsError) throw slotsError;

            const { data: subsData, error: subsError } = await supabase
                .from('subscriptions')
                .select('phone_number, plan_name')
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (subsError) throw subsError;

            const enrichedSlots = (slotsData || []).map(slot => {
                const subscription = subsData?.find(s => s.phone_number === slot.phone_number);
                return {
                    ...slot,
                    actual_plan_name: subscription?.plan_name || slot.plan_type || 'Starter'
                };
            });

            setSlots(enrichedSlots);
        } catch (err) {
            console.error("Error fetching slots and plans:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlots();
    }, [user]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const toast = document.createElement('div');
        const bgClass = type === 'success' ? 'bg-slate-900/95' : type === 'error' ? 'bg-rose-600' : 'bg-primary';
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${bgClass} backdrop-blur-md text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10`;
        toast.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest">${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const handleCopy = (num: string) => {
        const formatted = formatPhoneNumber(num);
        navigator.clipboard.writeText(formatted);
        showToast("Número Copiado");
    };

    const handleStartEditLabel = (slot: SlotWithPlan) => {
        setEditingLabelId(slot.port_id);
        setTempLabelValue(slot.label || '');
    };

    const handleCancelEditLabel = () => {
        setEditingLabelId(null);
        setTempLabelValue('');
    };

    const handleSaveLabel = async (portId: string) => {
        setSavingLabel(true);
        try {
            const { error } = await supabase
                .from('slots')
                .update({ label: tempLabelValue })
                .eq('port_id', portId);
            
            if (error) throw error;
            
            setSlots(prev => prev.map(s => s.port_id === portId ? { ...s, label: tempLabelValue } : s));
            setEditingLabelId(null);
        } catch (err) {
            console.error("Error saving label:", err);
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

    const getPlanStyle = (planName: string | undefined | null) => {
        const rawName = (planName || 'Starter').toString().toUpperCase();
        
        if (rawName.includes('POWER')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#B49248] via-[#D4AF37] to-[#8C6B1C] text-white shadow-[0_15px_40px_-10px_rgba(180,146,72,0.3)]',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-amber-100',
                indicator: 'bg-white',
                chip: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-100',
                icon: <Crown className="size-3" />,
                label: 'POWER',
                numberColor: 'text-white'
            };
        }
        if (rawName.includes('PRO')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00E0FF] text-white shadow-[0_15px_40px_-10px_rgba(0,148,255,0.4)]',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-blue-50',
                indicator: 'bg-white',
                chip: 'bg-gradient-to-br from-slate-200 via-slate-100 to-white',
                icon: <Zap className="size-3" />,
                label: 'PRO',
                numberColor: 'text-white'
            };
        }
        return {
            cardBg: 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 shadow-soft',
            badgeBg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
            accentText: 'text-primary',
            indicator: 'bg-emerald-500',
            chip: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
            icon: <Leaf className="size-3" />,
            label: 'STARTER',
            numberColor: 'text-slate-900 dark:text-white'
        };
    };

    const openReleaseModal = (slot: SlotWithPlan) => {
        setSlotToRelease(slot);
        setConfirmReleaseCheck(false);
        setIsReleaseModalOpen(true);
    };

    const openFwdModal = (slot: SlotWithPlan) => {
        setSlotToFwd(slot);
        setFwdActive(slot.is_forwarding_active || false);
        setFwdChannel(slot.forwarding_channel || 'telegram');
        setFwdConfig(slot.forwarding_config || '');
        setIsFwdModalOpen(true);
    };

    const openPlanModal = (slot: SlotWithPlan) => {
        setSlotForPlan(slot);
        setIsPlanModalOpen(true);
    };

    const handleUpdatePlanClick = (planId: string) => {
        console.log(`[Action Log] User requested to switch to: ${planId}`);
        showToast("Módulo de pago en mantenimiento programado", "info");
    };

    const handleReleaseSlot = async () => {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        
        try {
            const { error: releaseError } = await supabase
                .from('slots')
                .update({ 
                    assigned_to: null, 
                    status: 'libre',
                    plan_type: null,
                    label: null,
                    is_forwarding_active: false
                })
                .eq('port_id', slotToRelease.port_id);

            if (releaseError) throw releaseError;

            showToast("Número liberado con éxito.");
            setIsReleaseModalOpen(false);
            fetchSlots();
        } catch (err: any) {
            console.error("Error en el proceso de liberación:", err);
            showToast("Error al procesar la baja", "error");
        } finally {
            setReleasing(false);
        }
    };

    const handleSaveFwd = async () => {
        if (!slotToFwd) return;
        setSavingFwd(true);
        try {
            await supabase.from('slots').update({ 
                is_forwarding_active: fwdActive, 
                forwarding_channel: fwdChannel, 
                forwarding_config: fwdConfig 
            }).eq('port_id', slotToFwd.port_id);
            setIsFwdModalOpen(false);
            fetchSlots();
        } catch (err) { console.error(err); } finally { setSavingFwd(false); }
    };

    const goToMessagesWithFilter = (phoneNumber: string) => {
      navigate(`/dashboard/messages?num=${encodeURIComponent(phoneNumber)}`);
    };

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
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando puertos...</p>
                    </div>
                ) : slots?.length === 0 ? (
                    <div className="text-center py-20 px-10 bg-white dark:bg-surface-dark rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Globe className="size-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 font-bold italic text-sm">No tienes numeraciones activas.</p>
                        <button onClick={() => navigate('/onboarding/region')} className="mt-6 bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-button uppercase text-xs tracking-widest">Activar SIM</button>
                    </div>
                ) : (
                    <div className="space-y-14">
                        {slots?.map((slot) => {
                            const country = getCountryCode(slot);
                            const isEditing = editingLabelId === slot.port_id;
                            const style = getPlanStyle(slot.actual_plan_name);
                            const isPower = (slot.actual_plan_name || '').toUpperCase().includes('POWER');
                            const isPro = (slot.actual_plan_name || '').toUpperCase().includes('PRO');
                            
                            return (
                                <div key={slot.port_id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative shadow-2xl rounded-[2rem] overflow-hidden group/sim transition-all duration-500">
                                        <div 
                                            style={{ clipPath: 'polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)' }}
                                            className={`relative aspect-[1.58/1] w-full p-7 flex flex-col justify-between transition-all duration-500 ${style.cardBg}`}
                                        >
                                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="flex flex-col gap-1 max-w-[70%]">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[12px] font-black tracking-tighter uppercase ${style.accentText}`}>
                                                            Telsim Online
                                                        </span>
                                                        <div className={`size-1.5 rounded-full ${style.indicator} animate-pulse`}></div>
                                                    </div>
                                                    
                                                    <div className="mt-1 min-h-[22px] flex items-center">
                                                        {isEditing ? (
                                                            <div className={`flex items-center gap-1.5 p-1 rounded-lg ${isPower || isPro ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                                <input 
                                                                    type="text" 
                                                                    value={tempLabelValue}
                                                                    onChange={(e) => setTempLabelValue(e.target.value)}
                                                                    className="bg-transparent border-none p-0 px-1 text-[10px] font-black w-24 outline-none uppercase placeholder:text-white/50"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleSaveLabel(slot.port_id)} className="text-emerald-400 p-0.5">
                                                                    <Check className="size-3" />
                                                                </button>
                                                                <button onClick={handleCancelEditLabel} className="text-white/50 p-0.5">
                                                                    <X className="size-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleStartEditLabel(slot)}
                                                                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                                                            >
                                                                <span className={`text-[10px] font-black uppercase tracking-widest italic truncate max-w-[120px] ${isPower || isPro ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                    {(slot.label || 'Mi Línea').toString().toUpperCase()}
                                                                </span>
                                                                <Pencil className={`size-2.5 ${isPower || isPro ? 'text-white/40' : 'text-slate-300'}`} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1.5">
                                                    <div className={`size-8 rounded-full overflow-hidden border-2 shadow-sm ${isPower || isPro ? 'border-white/40' : 'border-slate-100 dark:border-slate-700'}`}>
                                                        <img src={`https://flagcdn.com/w80/${country}.png`} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className={`relative w-16 h-11 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-black/10 shadow-inner group-hover/sim:scale-[1.02] transition-transform duration-500 ${style.chip}`}>
                                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-[1px] p-2">
                                                        {[...Array(6)].map((_, i) => (
                                                            <div key={i} className="border border-black/10 rounded-[1px] opacity-40 shadow-sm bg-black/5"></div>
                                                        ))}
                                                    </div>
                                                    <div className="absolute inset-x-0 h-[1px] bg-black/10 top-1/2 -translate-y-1/2"></div>
                                                    <div className="absolute inset-y-0 w-[1px] bg-black/10 left-1/2 -translate-x-1/2"></div>
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 ${isPower || isPro ? 'text-white/40' : 'text-slate-400'}`}>Subscriber Number</span>
                                                    <h3 className={`text-[24px] font-black font-mono tracking-tighter leading-none whitespace-nowrap overflow-hidden text-ellipsis ${style.numberColor}`}>
                                                        {formatPhoneNumber(slot.phone_number)}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${style.badgeBg}`}>
                                                        {style.icon}
                                                        {style.label}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-[7px] font-bold opacity-20 uppercase ${isPower || isPro ? 'text-white' : ''}`}>TELSIM INFRA v2.9.2</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-center gap-3 px-1">
                                        <button 
                                            onClick={() => goToMessagesWithFilter(slot.phone_number)}
                                            className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm hover:translate-y-[-2px] transition-all active:scale-95 text-slate-600 dark:text-slate-300"
                                        >
                                            <Mail className="size-4 text-primary" />
                                            Bandeja
                                        </button>
                                        <button 
                                            onClick={() => handleCopy(slot.phone_number)}
                                            className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm hover:translate-y-[-2px] transition-all active:scale-95"
                                        >
                                            <Copy className="size-4 text-slate-400" />
                                        </button>
                                        
                                        {/* NUEVO BOTÓN: GESTIONAR PLAN */}
                                        <button 
                                            onClick={() => openPlanModal(slot)}
                                            className={`size-12 rounded-2xl flex items-center justify-center shadow-lg hover:translate-y-[-2px] transition-all active:scale-95 ${
                                              isPower 
                                              ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 border border-amber-500/30' 
                                              : isPro
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-500/30'
                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-500/30'
                                            }`}
                                        >
                                            <RefreshCw className="size-4" />
                                        </button>

                                        <button 
                                            onClick={() => openFwdModal(slot)}
                                            className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm hover:translate-y-[-2px] transition-all active:scale-95"
                                        >
                                            <Settings className="size-4 text-slate-400" />
                                        </button>
                                        <button 
                                            onClick={() => openReleaseModal(slot)}
                                            className="size-12 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL DE GESTIÓN DE PLANES (UI ONLY) */}
            {isPlanModalOpen && slotForPlan && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="p-8 pb-4 flex justify-between items-start sticky top-0 bg-white dark:bg-slate-900 z-10">
                           <div className="flex flex-col">
                              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestionar Plan</h2>
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Línea: {formatPhoneNumber(slotForPlan.phone_number)}</p>
                           </div>
                           <button onClick={() => setIsPlanModalOpen(false)} className="size-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400">
                              <X className="size-5" />
                           </button>
                        </div>

                        {/* Contenido Scrollable */}
                        <div className="p-6 pt-2 space-y-4 overflow-y-auto no-scrollbar">
                            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                               <Info className="size-4 text-primary shrink-0" />
                               <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                                  Al cambiar de plan, la nueva configuración de red se aplicará de forma instantánea al puerto físico.
                               </p>
                            </div>

                            <div className="space-y-4">
                                {OFFICIAL_PLANS.map((plan) => {
                                    const isCurrent = (slotForPlan.actual_plan_name || 'Starter').toString().toLowerCase() === plan.id.toLowerCase();
                                    const isDowngradeBlocked = (slotForPlan.actual_plan_name || '').toUpperCase().includes('POWER') && plan.id !== 'Power';
                                    
                                    // Dinamic Color Maps
                                    const colorsMap: Record<string, any> = {
                                        emerald: { 
                                            bg: 'bg-emerald-500', 
                                            lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', 
                                            text: 'text-emerald-500', 
                                            border: 'border-emerald-100 dark:border-emerald-800' 
                                        },
                                        blue: { 
                                            bg: 'bg-primary', 
                                            lightBg: 'bg-blue-50 dark:bg-blue-900/20', 
                                            text: 'text-primary', 
                                            border: 'border-blue-100 dark:border-blue-800' 
                                        },
                                        amber: { 
                                            bg: 'bg-amber-500', 
                                            lightBg: 'bg-amber-50 dark:bg-amber-900/20', 
                                            text: 'text-amber-500', 
                                            border: 'border-amber-100 dark:border-amber-800' 
                                        }
                                    };
                                    const c = colorsMap[plan.color];

                                    return (
                                        <div 
                                            key={plan.id}
                                            className={`p-5 rounded-3xl border-2 transition-all relative ${isCurrent ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100 dark:border-slate-800'}`}
                                        >
                                            {isCurrent && (
                                                <div className="absolute -top-3 right-6 bg-primary text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                                                    Plan Actual
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-10 rounded-xl flex items-center justify-center ${c.lightBg} ${c.text}`}>
                                                        {plan.icon}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{plan.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">${plan.price.toFixed(2)} / mes</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <ul className="space-y-2 mb-6">
                                                {plan.features.map((f, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                        <Check className={`size-3 ${c.text}`} />
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>

                                            <button 
                                                disabled={isCurrent || isDowngradeBlocked}
                                                onClick={() => handleUpdatePlanClick(plan.id)}
                                                className={`w-full h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                    isCurrent 
                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                                                    : isDowngradeBlocked
                                                        ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-300 cursor-not-allowed'
                                                        : `${c.bg} text-white shadow-lg active:scale-95`
                                                }`}
                                            >
                                                {isCurrent 
                                                  ? 'Tu Plan Actual' 
                                                  : isDowngradeBlocked 
                                                    ? 'Contactar Soporte para Downgrade' 
                                                    : `Actualizar a ${plan.name}`
                                                }
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Modal */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                           <button 
                             onClick={() => setIsPlanModalOpen(false)}
                             className="w-full h-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                           >
                             Cerrar Ventana
                           </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE LIBERACIÓN */}
            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
                        <div className="bg-rose-500 p-8 text-white">
                            <AlertTriangle className="size-10 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight mb-2">¿Liberar Línea?</h2>
                            <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Plan: {(slotToRelease.actual_plan_name || 'Starter').toString().toUpperCase()}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">Esta acción cancelará tu suscripción y liberará el número {formatPhoneNumber(slotToRelease.phone_number)} de tu cuenta.</p>
                            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setConfirmReleaseCheck(!confirmReleaseCheck)}>
                                <div className={`mt-0.5 size-5 shrink-0 rounded border-2 transition-all flex items-center justify-center ${confirmReleaseCheck ? 'bg-rose-500 border-rose-500 shadow-sm' : 'border-slate-200'}`}>
                                    {confirmReleaseCheck && <Check className="size-3 text-white" />}
                                </div>
                                <span className="text-[11px] font-bold text-slate-400 leading-tight">Entiendo los riesgos y confirmo la cancelación definitiva.</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleReleaseSlot} disabled={!confirmReleaseCheck || releasing} className={`w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${confirmReleaseCheck ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                                    {releasing ? 'PROCESANDO BAJA...' : 'CONFIRMAR CANCELACIÓN'}
                                </button>
                                <button onClick={() => setIsReleaseModalOpen(false)} className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE REENVÍO */}
            {isFwdModalOpen && slotToFwd && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <Settings className="size-5" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Canal de Reenvío</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Activo: {fwdActive ? 'SÍ' : 'NO'}</span>
                                <button onClick={() => setFwdActive(!fwdActive)} className={`w-12 h-6 rounded-full relative transition-colors ${fwdActive ? 'bg-primary' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 size-4 rounded-full bg-white transition-all shadow-sm ${fwdActive ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            {fwdActive && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor de Destino</label>
                                        <select value={fwdChannel} onChange={(e) => setFwdChannel(e.target.value as any)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent text-[11px] font-black uppercase outline-none focus:border-primary transition-all">
                                            <option value="telegram">Telegram Bot</option>
                                            <option value="discord">Discord Webhook</option>
                                            <option value="webhook">Custom API (JSON)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Configuración del Puerto</label>
                                        <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="Bot Token o Webhook URL..." className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent text-xs font-bold outline-none focus:border-primary transition-all" />
                                    </div>
                                </div>
                            )}
                            <button onClick={handleSaveFwd} disabled={savingFwd} className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 active:scale-95 transition-all">
                                {savingFwd ? 'Sincronizando...' : 'Actualizar Configuración'}
                            </button>
                            <button onClick={() => setIsFwdModalOpen(false)} className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;