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

    // MODAL DE AUTOMATIZACIÓN
    const [isFwdModalOpen, setIsFwdModalOpen] = useState(false);
    const [savingFwd, setSavingFwd] = useState(false);
    const [activeConfigSlot, setActiveConfigSlot] = useState<SlotWithPlan | null>(null);
    
    const [tgEnabled, setTgEnabled] = useState(false);
    const [tgToken, setTgToken] = useState('');
    const [tgChatId, setTgChatId] = useState('');
    const [testingTg, setTestingTg] = useState(false);
    const [slotFwdActive, setSlotFwdActive] = useState(false);

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
                .select('telegram_enabled, telegram_token, telegram_chat_id')
                .eq('id', user.id)
                .single();

            if (userData) {
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
                    credits_used: subscription?.credits_used || 0
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

    const handleStartEditLabel = (slot: SlotWithPlan) => {
        setEditingLabelId(slot.slot_id);
        setTempLabelValue(slot.label || '');
    };

    // Added fix for the error: Define handleCancelEditLabel to reset editing state
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
            showToast("Etiqueta actualizada");
        } catch (err) {
            console.error(err);
            showToast("Error al guardar", "error");
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
            // Actualización corregida para usar slot_id
            const { error } = await supabase
                .from('slots')
                .update({ 
                    assigned_to: null, 
                    status: 'libre',
                    plan_type: null,
                    label: null,
                    forwarding_active: false
                })
                .eq('slot_id', slotToRelease.slot_id);
            
            if (error) throw error;
            
            showToast("Número liberado con éxito.");
            setIsReleaseModalOpen(false);
            setSlotToRelease(null);
            setConfirmReleaseCheck(false);
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
            // 1. Guardar settings de Telegram en tabla users
            const { error: userError } = await supabase
                .from('users')
                .update({ 
                    telegram_token: tgToken, 
                    telegram_chat_id: tgChatId,
                    telegram_enabled: tgEnabled
                })
                .eq('id', user.id);

            if (userError) throw userError;

            // 2. Guardar toggle de reenvío en el slot específico
            const { error: slotError } = await supabase
                .from('slots')
                .update({ forwarding_active: slotFwdActive })
                .eq('slot_id', activeConfigSlot.slot_id);

            if (slotError) throw slotError;

            showToast("Configuración de red guardada");
            setIsFwdModalOpen(false);
            fetchSlots();
        } catch (err) {
            console.error(err);
            showToast("Error al sincronizar", "error");
        } finally {
            setSavingFwd(false);
        }
    };

    const getPlanBadge = (plan: string | undefined) => {
        const p = (plan || 'Starter').toUpperCase();
        if (p.includes('POWER')) return 'bg-amber-500 text-white shadow-amber-500/20';
        if (p.includes('PRO')) return 'bg-blue-600 text-white shadow-blue-500/20';
        return 'bg-emerald-500 text-white shadow-emerald-500/20';
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-6" />
                </button>
                <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Mis Infraestructuras</h1>
                <button onClick={() => navigate('/onboarding/region')} className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <PlusCircle className="size-5" />
                </button>
            </header>

            <main className="px-5 py-8 max-w-lg mx-auto space-y-6">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                        <RefreshCw className="size-8 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando con nodos...</span>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="py-20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                        <div className="size-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm border border-slate-100 dark:border-slate-700">
                            <Zap className="size-12 text-slate-200" />
                        </div>
                        <div className="space-y-2">
                           <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Sin puertos activos</h3>
                           <p className="text-xs font-medium text-slate-500 max-w-[25ch] mx-auto leading-relaxed italic">Despliega tu primera numeración física desde el Marketplace.</p>
                        </div>
                        <button onClick={() => navigate('/onboarding/region')} className="h-14 px-8 bg-primary text-white font-black rounded-2xl uppercase text-[11px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Explorar Regiones</button>
                    </div>
                ) : (
                    slots.map((slot) => (
                        <div key={slot.slot_id} className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
                                            <img src={`https://flagcdn.com/w80/${getCountryCode(slot)}.png`} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div>
                                            {editingLabelId === slot.slot_id ? (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        value={tempLabelValue}
                                                        onChange={(e) => setTempLabelValue(e.target.value)}
                                                        autoFocus
                                                        className="h-8 w-32 px-2 bg-slate-50 dark:bg-slate-900 border-b-2 border-primary outline-none text-xs font-black uppercase text-slate-900 dark:text-white"
                                                    />
                                                    <button onClick={() => handleSaveLabel(slot.slot_id)} disabled={savingLabel} className="text-emerald-500"><Check className="size-4" /></button>
                                                    <button onClick={handleCancelEditLabel} className="text-slate-300"><X className="size-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/label cursor-pointer" onClick={() => handleStartEditLabel(slot)}>
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{slot.label || 'Línea Sin Nombre'}</h3>
                                                    <Pencil className="size-3 text-slate-200 group-hover/label:text-primary opacity-0 group-hover/label:opacity-100 transition-all" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm ${getPlanBadge(slot.actual_plan_name)}`}>
                                                    PLAN {slot.actual_plan_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openConfigModal(slot)} className="size-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
                                            <Settings className="size-4" />
                                        </button>
                                        <button onClick={() => handleCopy(slot.phone_number)} className="size-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
                                            <Copy className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-center mb-8">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums font-mono">
                                        {formatPhoneNumber(slot.phone_number)}
                                    </span>
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Puerto ID: {slot.slot_id}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <button 
                                        onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)}
                                        className="h-12 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                    >
                                        <Mail className="size-3.5" />
                                        Bandeja
                                    </button>
                                    <button 
                                        onClick={() => { setSlotToRelease(slot); setConfirmReleaseCheck(false); setIsReleaseModalOpen(true); }}
                                        className="h-12 bg-white dark:bg-slate-900 text-rose-500 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        <Trash2 className="size-3.5" />
                                        Baja
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Uso de Créditos</span>
                                    <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums">{slot.credits_used || 0} / {slot.monthly_limit || 150} SMS</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(100, ((slot.credits_used || 0) / (slot.monthly_limit || 150)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* MODAL DE BAJA / RELEASE */}
            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 border border-white/5">
                        <div className="p-8 pb-0 text-center">
                            <div className="size-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-rose-500/20 text-rose-500">
                                <Trash2 className="size-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">Liberar Puerto</h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic mb-8">
                                Al liberar <span className="font-black text-slate-900 dark:text-white">{formatPhoneNumber(slotToRelease.phone_number)}</span>, el puerto físico se desconectará y perderás acceso inmediato a futuros mensajes.
                            </p>
                        </div>
                        
                        <div className="px-8 pb-10 space-y-6">
                            <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-[0.98] transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={confirmReleaseCheck}
                                    onChange={(e) => setConfirmReleaseCheck(e.target.checked)}
                                    className="mt-1 size-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-rose-500 focus:ring-rose-500 bg-transparent"
                                />
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-snug">Entiendo que esta acción es permanente y no podré recuperar este número una vez sea reasignado.</span>
                            </label>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleReleaseSlot}
                                    disabled={!confirmReleaseCheck || releasing}
                                    className="h-16 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-rose-500/20 flex items-center justify-center gap-3 transition-all"
                                >
                                    {releasing ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                    Confirmar Baja Total
                                </button>
                                <button 
                                    onClick={() => setIsReleaseModalOpen(false)}
                                    className="h-14 text-slate-400 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Mantener Mi Línea
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIGURACIÓN AUTOMATIZACIÓN */}
            {isFwdModalOpen && activeConfigSlot && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500 border border-white/5 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <header className="p-8 pb-4 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Handshake Automático</h3>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Línea: {formatPhoneNumber(activeConfigSlot.phone_number)}</p>
                            </div>
                            <button onClick={() => setIsFwdModalOpen(false)} className="size-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400">
                                <X className="size-6" />
                            </button>
                        </header>

                        <div className="p-8 pt-2 space-y-8">
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 flex items-start gap-4">
                                <div className="size-10 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                                    <Send className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between w-full">
                                        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Notificaciones vía Telegram</p>
                                        <button onClick={() => setSlotFwdActive(!slotFwdActive)} className="text-primary">
                                            {slotFwdActive ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8 text-slate-300" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">Desvía tus códigos SMS directamente a un chat privado.</p>
                                </div>
                            </div>

                            {slotFwdActive && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-top-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Token del Bot (API Token)</label>
                                        <input 
                                            type="password"
                                            value={tgToken}
                                            onChange={(e) => setTgToken(e.target.value)}
                                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold outline-none focus:border-primary transition-all font-mono"
                                            placeholder="745582:AAE7-X..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID de Chat (Chat ID)</label>
                                        <input 
                                            type="text"
                                            value={tgChatId}
                                            onChange={(e) => setTgChatId(e.target.value)}
                                            className="w-full h-14 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold outline-none focus:border-primary transition-all font-mono"
                                            placeholder="12345678"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => navigate('/dashboard/telegram-guide')}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                    >
                                        <HelpCircle className="size-3.5" />
                                        ¿Cómo configurar mi Bot?
                                    </button>
                                </div>
                            )}

                            <div className="pt-4">
                                <button 
                                    onClick={handleSaveAutomation}
                                    disabled={savingFwd}
                                    className="w-full h-16 bg-primary text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    {savingFwd ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-5" />}
                                    Actualizar Configuración
                                </button>
                                <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mt-8">TELSIM CORE V4.2 ENGINE</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;