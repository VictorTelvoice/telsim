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
  forwarding_active?: boolean;
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

    // MODAL DE AUTOMATIZACIÓN DUAL
    const [isFwdModalOpen, setIsFwdModalOpen] = useState(false);
    const [savingFwd, setSavingFwd] = useState(false);
    const [activeConfigSlot, setActiveConfigSlot] = useState<SlotWithPlan | null>(null);
    
    // Estados API
    const [apiEnabled, setApiEnabled] = useState(false);
    const [apiUrl, setApiUrl] = useState('');
    const [testingApi, setTestingApi] = useState(false);

    // Estados Telegram
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
                numberColor: 'text-white',
                progressBase: 'bg-white/10',
                progressFill: 'bg-white'
            };
        }
        if (rawName.includes('PRO')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00E0FF] text-white shadow-[0_15px_40_px_-10px_rgba(0,148,255,0.4)]',
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

    const handleReleaseSlot = async () => {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        try {
            const { error } = await supabase
                .from('slots')
                .update({ 
                    assigned_to: null, 
                    status: 'libre',
                    plan_type: null,
                    label: null,
                    is_forwarding_active: false,
                    forwarding_active: false
                })
                .eq('port_id', slotToRelease.port_id);
            if (error) throw error;
            showToast("Número liberado con éxito.");
            setIsReleaseModalOpen(false);
            fetchSlots();
        } catch (err) {
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

        console.log("TELSIM - Datos a enviar (Update Config):", { 
          telegram_token: tgToken, 
          telegram_chat_id: tgChatId, 
          telegram_enabled: tgEnabled, 
          api_enabled: apiEnabled, 
          api_url: apiUrl,
          slot_id: activeConfigSlot.port_id,
          forwarding_active: slotFwdActive
        });

        setSavingFwd(true);
        try {
            // 1. Actualizar configuración global del usuario
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

            // 2. Actualizar switch individual del slot
            const { error: slotError } = await supabase
                .from('slots')
                .update({ forwarding_active: slotFwdActive })
                .eq('port_id', activeConfigSlot.port_id);

            if (slotError) throw slotError;

            showToast("Configuración guardada");
            setIsFwdModalOpen(false);
            fetchSlots(); // Recargar para feedback visual en iconos
        } catch (err: any) { 
            console.error("Supabase Patch Error:", err);
            alert(`Fallo al actualizar Ledger:\n${err.message || '400 Bad Request'}`);
        } finally { 
            setSavingFwd(false); 
        }
    };

    const handleTestApi = async () => {
        if (!apiUrl || !apiUrl.startsWith('http')) return showToast("URL de API inválida", "error");
        setTestingApi(true);
        try {
            await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telsim_test: true, event: 'test.ping' }),
                mode: 'no-cors'
            });
            showToast("Test API enviado");
        } catch (err) {
            showToast("Error de conexión API", "error");
        } finally {
            setTestingApi(false);
        }
    };

    const handleTestTg = async () => {
        if (!tgToken || !tgChatId) {
            return alert("El Token y el Chat ID son obligatorios para el test.");
        }

        console.log("TELSIM - Datos a enviar (Test Telegram):", { 
          telegram_token: tgToken, 
          telegram_chat_id: tgChatId 
        });

        setTestingTg(true);
        try {
            const url = `https://api.telegram.org/bot${tgToken.trim()}/sendMessage`;
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: String(tgChatId).trim(),
                    text: '[TELSIM] ✅ Bot vinculado correctamente. Tu infraestructura de reenvío está lista.',
                    parse_mode: 'HTML'
                })
            });
            const data = await resp.json();
            if (!data.ok) throw new Error(data.description || "Token o ChatID inválido");
            
            showToast("Mensaje de prueba enviado");
        } catch (err: any) {
            console.error("Telegram API Error:", err);
            alert(`Error en Bot Telegram:\n${err.message}`);
        } finally {
            setTestingTg(false);
        }
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
                            
                            const creditsUsed = slot.credits_used || 0;
                            const monthlyLimit = slot.monthly_limit || 150;
                            const usagePercent = Math.min(100, (creditsUsed / monthlyLimit) * 100);
                            const isLowCredits = usagePercent > 80;

                            return (
                                <div key={slot.port_id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative shadow-2xl rounded-[2rem] overflow-hidden group/sim transition-all duration-500">
                                        <div 
                                            style={{ clipPath: 'polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)' }}
                                            className={`relative aspect-[1.58/1] w-full p-7 flex flex-col justify-between transition-all duration-500 ${style.cardBg}`}
                                        >
                                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="flex flex-col gap-1 max-w-[70%]">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[12px] font-black tracking-tighter uppercase ${style.accentText}`}>Telsim Online</span>
                                                        <div className={`size-1.5 rounded-full ${style.indicator} animate-pulse`}></div>
                                                    </div>
                                                    <div className="mt-1 min-h-[22px] flex items-center">
                                                        {isEditing ? (
                                                            <div className={`flex items-center gap-1.5 p-1 rounded-lg ${isPower || isPro ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                                <input type="text" value={tempLabelValue} onChange={(e) => setTempLabelValue(e.target.value)} className="bg-transparent border-none p-0 px-1 text-[10px] font-black w-24 outline-none uppercase" autoFocus />
                                                                <button onClick={() => handleSaveLabel(slot.port_id)} className="text-emerald-400 p-0.5"><Check className="size-3" /></button>
                                                                <button onClick={handleCancelEditLabel} className="text-white/50 p-0.5"><X className="size-3" /></button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => handleStartEditLabel(slot)} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                                                <span className={`text-[10px] font-black uppercase tracking-widest italic truncate max-w-[120px] ${isPower || isPro ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                                                                    {(slot.label || 'Mi Línea').toString().toUpperCase()}
                                                                </span>
                                                                <Pencil className={`size-2.5 ${isPower || isPro ? 'text-white/40' : 'text-slate-300'}`} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`size-8 rounded-full overflow-hidden border-2 shadow-sm ${isPower || isPro ? 'border-white/40' : 'border-slate-100 dark:border-slate-700'}`}>
                                                    <img src={`https://flagcdn.com/w80/${country}.png`} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className={`relative w-16 h-11 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-black/10 shadow-inner ${style.chip}`}>
                                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-[1px] p-2">
                                                        {[...Array(6)].map((_, i) => <div key={i} className="border border-black/10 rounded-[1px] opacity-40 bg-black/5"></div>)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 ${isPower || isPro ? 'text-white/40' : 'text-slate-400'}`}>Subscriber Number</span>
                                                    <h3 className={`text-[24px] font-black font-mono tracking-tighter leading-none whitespace-nowrap overflow-hidden text-ellipsis ${style.numberColor}`}>{formatPhoneNumber(slot.phone_number)}</h3>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end relative z-10">
                                                <div className="flex flex-col gap-2">
                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${style.badgeBg}`}>
                                                        {style.icon} {style.label}
                                                    </div>
                                                    <div className="flex flex-col gap-1 w-24">
                                                        <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-wider opacity-60">
                                                            <span className={isPower || isPro ? 'text-white' : 'text-slate-400'}>SMS Usage</span>
                                                            <span className={isPower || isPro ? 'text-white' : (isLowCredits ? 'text-rose-500' : 'text-slate-400')}>{creditsUsed}/{monthlyLimit}</span>
                                                        </div>
                                                        <div className={`h-[3px] w-full rounded-full overflow-hidden ${style.progressBase}`}>
                                                            <div className={`h-full transition-all duration-700 ease-out ${usagePercent > 90 ? 'bg-rose-400' : (usagePercent > 70 ? 'bg-amber-400' : style.progressFill)}`} style={{ width: `${usagePercent}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`text-[7px] font-bold opacity-20 uppercase ${isPower || isPro ? 'text-white' : ''}`}>TELSIM INFRA v2.9.2</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 flex items-center justify-center gap-3 px-1">
                                        <button onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)} className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm hover:translate-y-[-2px] transition-all text-slate-600 dark:text-slate-300"><Mail className="size-4 text-primary" /> Bandeja</button>
                                        <button onClick={() => handleCopy(slot.phone_number)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm hover:translate-y-[-2px] transition-all"><Copy className="size-4 text-slate-400" /></button>
                                        <button onClick={() => { setSlotForPlan(slot); setIsPlanModalOpen(true); }} className={`size-12 rounded-2xl flex items-center justify-center shadow-lg hover:translate-y-[-2px] transition-all ${isPower ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 border border-amber-500/30' : isPro ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-500/30' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-500/30'}`}><RefreshCw className="size-4" /></button>
                                        <button onClick={() => openConfigModal(slot)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm hover:translate-y-[-2px] transition-all">
                                            <Settings className={`size-4 ${slot.forwarding_active ? 'text-primary animate-pulse' : 'text-slate-400'}`} />
                                        </button>
                                        <button onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }} className="size-12 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center transition-all"><Trash2 className="size-4" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL INTEGRACIÓN DUAL stack */}
            {isFwdModalOpen && activeConfigSlot && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <Terminal className="size-4 text-primary" />
                                    <h2 className="text-sm font-black tracking-tight uppercase">Configurar Puerto</h2>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 tabular-nums uppercase">{formatPhoneNumber(activeConfigSlot.phone_number)}</p>
                            </div>
                            <button onClick={() => setIsFwdModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="size-5" /></button>
                        </div>
                        
                        <div className="p-8 pt-6 space-y-8 overflow-y-auto no-scrollbar">
                            {/* SWITCH INDIVIDUAL DE NOTIFICACIONES */}
                            <div className="bg-primary/5 dark:bg-primary/10 p-5 rounded-3xl border border-primary/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Puente de Notificaciones</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Activar para este número</span>
                                    </div>
                                    <button onClick={() => setSlotFwdActive(!slotFwdActive)} className={`transition-colors ${slotFwdActive ? 'text-primary' : 'text-slate-300'}`}>
                                        {slotFwdActive ? <ToggleRight className="size-10" /> : <ToggleLeft className="size-10" />}
                                    </button>
                                </div>
                            </div>

                            {/* SECCIÓN API */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Globe className="size-4 text-primary" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Custom API (JSON)</span>
                                    </div>
                                    <button onClick={() => setApiEnabled(!apiEnabled)} className={`transition-colors ${apiEnabled ? 'text-primary' : 'text-slate-300'}`}>
                                        {apiEnabled ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8" />}
                                    </button>
                                </div>
                                {apiEnabled && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <input type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://tu-servidor.com/webhook" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-primary transition-all" />
                                        <button onClick={handleTestApi} disabled={testingApi} className="w-full h-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200">
                                            {testingApi ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} Test API
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                            {/* SECCIÓN TELEGRAM */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Send className="size-4 text-blue-400" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Telegram Bot</span>
                                    </div>
                                    <button onClick={() => setTgEnabled(!tgEnabled)} className={`transition-colors ${tgEnabled ? 'text-blue-400' : 'text-slate-300'}`}>
                                        {tgEnabled ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8" />}
                                    </button>
                                </div>
                                {tgEnabled && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <button onClick={() => navigate('/dashboard/telegram-guide')} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">
                                            <HelpCircle className="size-4" /> ¿Cómo configurar mi Bot? ❓
                                        </button>
                                        <input type="text" value={tgToken} onChange={(e) => setTgToken(e.target.value)} placeholder="Bot Token (7123456:AAH...)" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-blue-400 transition-all" />
                                        <input type="text" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="Chat ID (Ej: 98765432)" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-blue-400 transition-all" />
                                        <button onClick={handleTestTg} disabled={testingTg} className="w-full h-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200">
                                            {testingTg ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Test Telegram
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                            <button onClick={handleSaveAutomation} disabled={savingFwd} className="w-full h-16 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                                {savingFwd ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-5" />} ACTUALIZAR CONFIGURACIÓN
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OTROS MODALES... */}
            {isPlanModalOpen && slotForPlan && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 flex justify-between items-start sticky top-0 bg-white dark:bg-slate-900 z-10">
                           <div className="flex flex-col">
                              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestionar Plan</h2>
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Línea: {formatPhoneNumber(slotForPlan.phone_number)}</p>
                           </div>
                           <button onClick={() => setIsPlanModalOpen(false)} className="size-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400"><X className="size-5" /></button>
                        </div>
                        <div className="p-6 pt-2 space-y-4 overflow-y-auto no-scrollbar">
                            <div className="space-y-4">
                                {OFFICIAL_PLANS.map((plan) => {
                                    const isCurrent = (slotForPlan.actual_plan_name || 'Starter').toString().toLowerCase() === plan.id.toLowerCase();
                                    return (
                                        <div key={plan.id} className={`p-5 rounded-3xl border-2 transition-all relative ${isCurrent ? 'border-primary ring-2 ring-primary/10' : 'border-slate-100 dark:border-slate-800'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{plan.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">${plan.price.toFixed(2)} / mes • {plan.limit} SMS</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => { setIsPlanModalOpen(false); navigate('/dashboard/upgrade-summary', { state: { phoneNumber: slotForPlan.phone_number, port_id: slotForPlan.port_id, planName: plan.name, price: plan.price, limit: plan.limit, stripePriceId: plan.stripePriceId, oldPlanName: slotForPlan.actual_plan_name } }); }} disabled={isCurrent} className={`w-full h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 ${isCurrent ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white shadow-lg active:scale-95'}`}>
                                                {isCurrent ? 'Tu Plan Actual' : `Actualizar a ${plan.name}`}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
                        <div className="bg-rose-500 p-8 text-white">
                            <AlertTriangle className="size-10 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight">¿Liberar Línea?</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">Esta acción cancelará tu suscripción definitivamente.</p>
                            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setConfirmReleaseCheck(!confirmReleaseCheck)}>
                                <div className={`mt-0.5 size-5 shrink-0 rounded border-2 transition-all flex items-center justify-center ${confirmReleaseCheck ? 'bg-rose-50 border-rose-500' : 'border-slate-200'}`}>
                                    {confirmReleaseCheck && <Check className="size-3 text-white" />}
                                </div>
                                <span className="text-[11px] font-bold text-slate-400">Entiendo los riesgos.</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleReleaseSlot} disabled={!confirmReleaseCheck || releasing} className={`w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${confirmReleaseCheck ? 'bg-rose-50 text-white shadow-xl' : 'bg-slate-100 text-slate-300'}`}>
                                    {releasing ? 'PROCESANDO...' : 'CONFIRMAR'}
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