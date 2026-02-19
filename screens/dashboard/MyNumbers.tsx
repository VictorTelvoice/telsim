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
  Info,
  Loader2,
  BarChart3,
  Terminal,
  ExternalLink,
  Play,
  Send,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

interface SlotWithPlan extends Slot {
  actual_plan_name?: string;
  monthly_limit?: number;
  credits_used?: number;
}

const OFFICIAL_PLANS = [
  {
    id: 'Starter',
    name: 'Starter',
    price: 19.90,
    limit: 150,
    stripePriceId: 'price_1SzJRLEADSrtMyiaQaDEp44E',
    color: 'emerald',
    icon: <Leaf className="size-5" />,
    features: ['Acceso total vía App', 'Soporte vía Ticket', 'Notificaciones Push']
  },
  {
    id: 'Pro',
    name: 'Pro',
    price: 39.90,
    limit: 500,
    stripePriceId: 'price_1SzJS9EADSrtMyiagxHUI2qM',
    color: 'blue',
    icon: <Zap className="size-5" />,
    features: ['Acceso a API Telsim', 'Webhooks en tiempo real', 'Soporte vía Chat']
  },
  {
    id: 'Power',
    name: 'Power',
    price: 99.00,
    limit: 1400,
    stripePriceId: 'price_1SzJSbEADSrtMyiaPEMzNKUe',
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
    const [savingFwd, setSavingFwd] = useState(false);
    const [activeConfigSlot, setActiveConfigSlot] = useState<SlotWithPlan | null>(null);
    
    const [apiEnabled, setApiEnabled] = useState(false);
    const [apiUrl, setApiUrl] = useState('');
    const [testingApi, setTestingApi] = useState(false);

    const [tgEnabled, setTgEnabled] = useState(false);
    const [tgToken, setTgToken] = useState('');
    const [tgChatId, setTgChatId] = useState('');
    const [testingTg, setTestingTg] = useState(false);
    const [slotFwdActive, setSlotFwdActive] = useState(false);

    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [slotForPlan, setSlotForPlan] = useState<SlotWithPlan | null>(null);

    const fetchSlots = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: slotsData } = await supabase
                .from('slots')
                .select('*')
                .eq('assigned_to', user.id)
                .order('created_at', { ascending: false });

            const { data: userData } = await supabase
                .from('users')
                .select('api_enabled, api_url, telegram_enabled, telegram_token, telegram_chat_id')
                .eq('id', user.id)
                .single();

            if (userData) {
                setApiEnabled(userData.api_enabled || false);
                setApiUrl(userData.api_url || '');
                setTgEnabled(userData.telegram_enabled || false);
                setTgToken(userData.telegram_token || '');
                setTgChatId(userData.telegram_chat_id || '');
            }

            const { data: subsData } = await supabase
                .from('subscriptions')
                .select('phone_number, plan_name, monthly_limit, credits_used')
                .eq('user_id', user.id)
                .eq('status', 'active');

            const enrichedSlots = (slotsData || []).map(slot => {
                const subscription = subsData?.find(s => s.phone_number === slot.phone_number);
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

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'} backdrop-blur-md text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10`;
        toast.innerHTML = `<span class="text-[11px] font-black uppercase tracking-widest">${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    };

    const handleCopy = (num: string) => {
        const formatted = formatPhoneNumber(num);
        navigator.clipboard.writeText(formatted);
        showToast("Número Copiado");
    };

    const handleStartEditLabel = (slot: SlotWithPlan) => {
        setEditingLabelId(slot.slot_id);
        setTempLabelValue(slot.label || '');
    };

    const handleCancelEditLabel = () => {
        setEditingLabelId(null);
        setTempLabelValue('');
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
            // 1. CANCELAR SUSCRIPCIÓN (Lógica de Backend solicitada)
            // Se usa slot_id en lugar del erróneo sim_id
            const { error: subError } = await supabase
                .from('subscriptions')
                .update({ status: 'canceled' })
                .eq('slot_id', slotToRelease.slot_id)
                .eq('user_id', user.id);

            // Nota: Si no hay suscripción activa (ej. trial manual), ignoramos el error silenciosamente
            // pero si existe, debe marcarse como cancelada.

            // 2. LIBERAR SLOT FÍSICO
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
            
            showToast("Número liberado con éxito.");
            setIsReleaseModalOpen(false);
            setSlotToRelease(null);
            fetchSlots();
        } catch (err) {
            console.error("Release error:", err);
            showToast("Error al procesar la baja", "error");
        } finally {
            setReleasing(false);
        }
    };

    const openConfigModal = (slot: SlotWithPlan) => {
        setActiveConfigSlot(slot);
        setSlotFwdActive(slot.forwarding_active || false);
        setIsFwdModalOpen(true);
    };

    const handleSaveAutomation = async () => {
        if (!user || !activeConfigSlot) return;
        setSavingFwd(true);
        try {
            const { error: userError } = await supabase
                .from('users')
                .update({ 
                    telegram_token: tgToken, 
                    telegram_chat_id: tgChatId, 
                    telegram_enabled: tgEnabled, 
                    api_enabled: apiEnabled, 
                    api_url: apiUrl 
                })
                .eq('id', user.id);
            
            if (userError) throw userError;

            const { error: slotError } = await supabase
                .from('slots')
                .update({ forwarding_active: slotFwdActive })
                .eq('slot_id', activeConfigSlot.slot_id);

            if (slotError) throw slotError;

            showToast("Configuración guardada");
            setIsFwdModalOpen(false);
            fetchSlots();
        } catch (err: any) { 
            console.error("Automation save error:", err);
            showToast("Error al sincronizar", "error");
        } finally { 
            setSavingFwd(false); 
        }
    };

    const getPlanStyle = (planName: string | undefined | null) => {
        const rawName = (planName || 'Starter').toString().toUpperCase();
        if (rawName.includes('POWER')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#B49248] via-[#D4AF37] to-[#8C6B1C] text-white shadow-xl',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-amber-100',
                indicator: 'bg-white',
                chip: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-100',
                icon: <Crown className="size-3" />,
                label: 'POWER',
                numberColor: 'text-white',
                progressBase: 'bg-white/10',
                progressFill: 'bg-white'
            };
        }
        if (rawName.includes('PRO')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00E0FF] text-white shadow-xl',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-blue-50',
                indicator: 'bg-white',
                chip: 'bg-gradient-to-br from-slate-200 via-slate-100 to-white',
                icon: <Zap className="size-3" />,
                label: 'PRO',
                numberColor: 'text-white',
                progressBase: 'bg-white/10',
                progressFill: 'bg-white'
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
            numberColor: 'text-slate-900 dark:text-white',
            progressBase: 'bg-slate-100 dark:bg-slate-700',
            progressFill: 'bg-emerald-500'
        };
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
                                                            <button onClick={handleCancelEditLabel} className="text-white/50 p-0.5"><X className="size-3" /></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => handleStartEditLabel(slot)} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
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
                                                <div className="w-24">
                                                    <div className={`h-[3px] w-full rounded-full overflow-hidden ${style.progressBase}`}>
                                                        <div className={`h-full ${style.progressFill}`} style={{ width: `${usagePercent}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[7px] font-bold opacity-20 uppercase">Puerto: {slot.slot_id}</span>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-center gap-3">
                                        <button onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)} className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"><Mail className="size-4 text-primary" /> Bandeja</button>
                                        <button onClick={() => handleCopy(slot.phone_number)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm"><Copy className="size-4 text-slate-400" /></button>
                                        <button onClick={() => openConfigModal(slot)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm">
                                            <Settings className={`size-4 ${slot.forwarding_active ? 'text-primary' : 'text-slate-400'}`} />
                                        </button>
                                        <button onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }} className="size-12 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center"><Trash2 className="size-4" /></button>
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
                                <button onClick={handleReleaseSlot} disabled={!confirmReleaseCheck || releasing} className={`w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${confirmReleaseCheck ? 'bg-rose-600 text-white shadow-xl' : 'bg-slate-100 text-slate-300'}`}>
                                    {releasing ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'CONFIRMAR BAJA TOTAL'}
                                </button>
                                <button onClick={() => setIsReleaseModalOpen(false)} className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;