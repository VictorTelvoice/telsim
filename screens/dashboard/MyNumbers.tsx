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
  Zap,
  Diamond,
  Leaf,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface SlotWithSub extends Slot {
  subscription?: {
    credits_used: number;
    monthly_limit: number;
    plan_name: string;
    alias?: string;
  } | null;
}

const MyNumbers: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [slots, setSlots] = useState<SlotWithSub[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [tempLabelValue, setTempLabelValue] = useState('');
    const [savingLabel, setSavingLabel] = useState(false);

    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [slotToRelease, setSlotToRelease] = useState<Slot | null>(null);
    const [confirmReleaseCheck, setConfirmReleaseCheck] = useState(false);
    const [releasing, setReleasing] = useState(false);

    const [isFwdModalOpen, setIsFwdModalOpen] = useState(false);
    const [slotToFwd, setSlotToFwd] = useState<Slot | null>(null);
    const [fwdActive, setFwdActive] = useState(false);
    const [fwdChannel, setFwdChannel] = useState<'telegram' | 'discord' | 'webhook'>('telegram');
    const [fwdConfig, setFwdConfig] = useState('');
    const [savingFwd, setSavingFwd] = useState(false);

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
                .select('phone_number, credits_used, monthly_limit, plan_name, alias')
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (subsError) throw subsError;

            const merged: SlotWithSub[] = (slotsData || []).map(slot => {
                const sub = subsData?.find(s => s.phone_number === slot.phone_number);
                return {
                    ...slot,
                    subscription: sub || null
                };
            });

            setSlots(merged);
        } catch (err) {
            console.error("Error fetching slots data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlots();
    }, [user]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-slate-900/95' : 'bg-red-600'} backdrop-blur-md text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10`;
        toast.innerHTML = `<span class="text-[10px] font-black uppercase tracking-widest">${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const handleCopy = (num: string) => {
        const formatted = formatPhoneNumber(num);
        navigator.clipboard.writeText(formatted);
        showToast("Número Copiado");
    };

    const handleStartEditLabel = (slot: SlotWithSub) => {
        setEditingLabelId(slot.port_id);
        setTempLabelValue(slot.subscription?.alias || slot.label || '');
    };

    const handleCancelEditLabel = () => {
        setEditingLabelId(null);
        setTempLabelValue('');
    };

    const handleSaveLabel = async (portId: string) => {
        setSavingLabel(true);
        try {
            const slot = slots.find(s => s.port_id === portId);
            if (!slot) return;

            const { error: slotErr } = await supabase
                .from('slots')
                .update({ label: tempLabelValue })
                .eq('port_id', portId);
            
            if (slotErr) throw slotErr;

            if (slot.phone_number) {
                await supabase
                    .from('subscriptions')
                    .update({ alias: tempLabelValue })
                    .eq('phone_number', slot.phone_number)
                    .eq('user_id', user?.id);
            }
            
            setSlots(prev => prev.map(s => s.port_id === portId ? { ...s, label: tempLabelValue, subscription: s.subscription ? { ...s.subscription, alias: tempLabelValue } : null } : s));
            setEditingLabelId(null);
        } catch (err) {
            console.error("Error saving label:", err);
        } finally {
            setSavingLabel(false);
        }
    };

    const formatPhoneNumber = (num: string | undefined | null) => {
        if (!num) return '---';
        const cleaned = ('' + num).replace(/\D/g, '');
        if (cleaned.startsWith('569') && cleaned.length === 11) {
            return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
        }
        return num.toString().startsWith('+') ? num.toString() : `+${num}`;
    };

    const getPlanBadge = (plan: string | undefined | null) => {
        const p = (plan || 'STARTER').toString().toUpperCase();
        if (p.includes('POWER')) return { 
            bg: 'bg-amber-500', 
            text: 'text-amber-500',
            border: 'border-amber-500/20',
            icon: <Zap className="size-3 fill-current" />,
            label: 'POWER'
        };
        if (p.includes('PRO')) return { 
            bg: 'bg-blue-500', 
            text: 'text-blue-500',
            border: 'border-blue-500/20',
            icon: <Diamond className="size-3 fill-current" />,
            label: 'PRO'
        };
        return { 
            bg: 'bg-emerald-500', 
            text: 'text-emerald-500',
            border: 'border-emerald-500/20',
            icon: <Leaf className="size-3 fill-current" />,
            label: 'STARTER'
        };
    };

    const openReleaseModal = (slot: Slot) => {
        setSlotToRelease(slot);
        setConfirmReleaseCheck(false);
        setIsReleaseModalOpen(true);
    };

    const openFwdModal = (slot: Slot) => {
        setSlotToFwd(slot);
        setFwdActive(slot.is_forwarding_active || false);
        setFwdChannel(slot.forwarding_channel || 'telegram');
        setFwdConfig(slot.forwarding_config || '');
        setIsFwdModalOpen(true);
    };

    const handleReleaseSlot = async () => {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        try {
            const { error: releaseError } = await supabase
                .from('slots')
                .update({ assigned_to: null, status: 'libre', plan_type: null, label: null, is_forwarding_active: false })
                .eq('port_id', slotToRelease.port_id);
            if (releaseError) throw releaseError;
            showToast("Número liberado con éxito");
            setIsReleaseModalOpen(false);
            fetchSlots();
        } catch (err) {
            showToast("Error al procesar", "error");
        } finally {
            setReleasing(false);
        }
    };

    const handleSaveFwd = async () => {
        if (!slotToFwd) return;
        setSavingFwd(true);
        try {
            await supabase.from('slots').update({ is_forwarding_active: fwdActive, forwarding_channel: fwdChannel, forwarding_config: fwdConfig }).eq('port_id', slotToFwd.port_id);
            setIsFwdModalOpen(false);
            fetchSlots();
        } catch (err) { console.error(err); } finally { setSavingFwd(false); }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Mis Numeraciones</h1>
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -mr-2 text-primary dark:text-blue-400">
                    <PlusCircle className="size-5" />
                </button>
            </header>

            <main className="px-5 py-8 space-y-6 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="animate-spin size-8 text-primary" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando red móvil...</p>
                    </div>
                ) : slots?.length === 0 ? (
                    <div className="text-center py-20 px-10 bg-white dark:bg-surface-dark rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Globe className="size-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 font-bold italic text-sm">No tienes numeraciones activas.</p>
                        <button onClick={() => navigate('/onboarding/region')} className="mt-6 bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-button uppercase text-xs tracking-widest">Activar SIM</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {slots?.map((slot) => {
                            const badge = getPlanBadge(slot.subscription?.plan_name || slot.plan_type);
                            const creditsUsed = slot.subscription?.credits_used || 0;
                            const monthlyLimit = slot.subscription?.monthly_limit || 0;
                            const usagePercent = monthlyLimit > 0 ? (creditsUsed / monthlyLimit) * 100 : 0;
                            const isNearLimit = usagePercent >= 90;
                            const isEditing = editingLabelId === slot.port_id;

                            // Definir nombre de visualización seguro con los fallbacks requeridos
                            const displayName = (slot.subscription?.alias || slot.label || 'Mi Línea').toString().toUpperCase();
                            const planDisplayName = (slot.subscription?.plan_name || slot.plan_type || 'Starter').toString().toUpperCase();

                            return (
                                <div key={slot.port_id} className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 shadow-soft border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-2">
                                    {/* ALIAS / LABEL */}
                                    <div className="mb-4">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-primary/20">
                                                <input 
                                                    type="text"
                                                    value={tempLabelValue}
                                                    onChange={(e) => setTempLabelValue(e.target.value)}
                                                    className="bg-transparent border-none p-0 px-2 text-[11px] font-black text-slate-700 dark:text-white flex-1 outline-none uppercase tracking-widest"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveLabel(slot.port_id)} className="text-emerald-500 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg">
                                                    <Check className="size-4" />
                                                </button>
                                                <button onClick={handleCancelEditLabel} className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between group">
                                                <button 
                                                    onClick={() => handleStartEditLabel(slot)}
                                                    className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                                                >
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic">
                                                        {displayName}
                                                    </span>
                                                    <Pencil className="size-3 text-slate-300 group-hover:text-primary transition-colors" />
                                                </button>
                                                <div className={`px-3 py-1 rounded-full border ${badge.border} flex items-center gap-1.5`}>
                                                    <span className={badge.text}>{badge.icon}</span>
                                                    <span className={`text-[9px] font-black tracking-widest ${badge.text}`}>{planDisplayName}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PHONE NUMBER - ELEMENTO PRINCIPAL */}
                                    <div className="mb-8">
                                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter font-mono tabular-nums">
                                            {formatPhoneNumber(slot.phone_number)}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Línea Física Activa - Red 4G LTE</span>
                                        </div>
                                    </div>

                                    {/* SMS CREDIT COUNTER */}
                                    {slot.subscription && (
                                        <div className="space-y-3 mb-8">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uso de Créditos SMS</span>
                                                <span className={`text-[11px] font-black tabular-nums ${isNearLimit ? 'text-red-500' : 'text-primary'}`}>
                                                    {(creditsUsed || 0).toString()} / {(monthlyLimit || 0).toString()}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ease-out rounded-full ${isNearLimit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-primary'}`} 
                                                    style={{ width: `${usagePercent}%` }}
                                                ></div>
                                            </div>
                                            {isNearLimit && (
                                                <div className="flex items-center gap-1.5 text-red-500 animate-pulse">
                                                    <AlertCircle className="size-3" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Créditos Críticos</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ACTION BUTTONS */}
                                    <div className="grid grid-cols-4 gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                                        <button 
                                            onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)}
                                            className="flex flex-col items-center gap-2 group"
                                            title="Mensajes"
                                        >
                                            <div className="size-11 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                <Mail className="size-5" />
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Bandeja</span>
                                        </button>
                                        <button 
                                            onClick={() => handleCopy(slot.phone_number)}
                                            className="flex flex-col items-center gap-2 group"
                                            title="Copiar"
                                        >
                                            <div className="size-11 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                <Copy className="size-5" />
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Copiar</span>
                                        </button>
                                        <button 
                                            onClick={() => openFwdModal(slot)}
                                            className="flex flex-col items-center gap-2 group"
                                            title="Configurar"
                                        >
                                            <div className="size-11 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                <Settings className="size-5" />
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Ajustes</span>
                                        </button>
                                        <button 
                                            onClick={() => openReleaseModal(slot)}
                                            className="flex flex-col items-center gap-2 group"
                                            title="Dar de baja"
                                        >
                                            <div className="size-11 rounded-2xl bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
                                                <Trash2 className="size-5" />
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-rose-400 tracking-widest">Baja</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL RELEASE (BAJA) */}
            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
                        <div className="bg-rose-500 p-8 text-white">
                            <AlertTriangle className="size-10 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight mb-2">¿Liberar Línea?</h2>
                            <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Número: {formatPhoneNumber(slotToRelease.phone_number)}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">Esta acción cancelará tu suscripción y liberará el puerto físico de tu cuenta de forma inmediata.</p>
                            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setConfirmReleaseCheck(!confirmReleaseCheck)}>
                                <div className={`mt-0.5 size-5 shrink-0 rounded border-2 transition-all flex items-center justify-center ${confirmReleaseCheck ? 'bg-rose-500 border-rose-500 shadow-sm' : 'border-slate-200'}`}>
                                    {confirmReleaseCheck && <Check className="size-3 text-white" />}
                                </div>
                                <span className="text-[11px] font-bold text-slate-400 leading-tight">Entiendo los riesgos y confirmo la liberación del puerto.</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleReleaseSlot} disabled={!confirmReleaseCheck || releasing} className={`w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${confirmReleaseCheck ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                                    {releasing ? 'PROCESANDO...' : 'CONFIRMAR BAJA'}
                                </button>
                                <button onClick={() => setIsReleaseModalOpen(false)} className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL FWD (AJUSTES) */}
            {isFwdModalOpen && slotToFwd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <Settings className="size-5" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Ajustes del Puerto</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reenvío de SMS: {fwdActive ? 'ACTIVO' : 'OFF'}</span>
                                <button onClick={() => setFwdActive(!fwdActive)} className={`w-12 h-6 rounded-full relative transition-colors ${fwdActive ? 'bg-primary' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 size-4 rounded-full bg-white transition-all shadow-sm ${fwdActive ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            {fwdActive && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Canal de Destino</label>
                                        <select value={fwdChannel} onChange={(e) => setFwdChannel(e.target.value as any)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent text-[11px] font-black uppercase outline-none focus:border-primary transition-all">
                                            <option value="telegram">Telegram Bot</option>
                                            <option value="discord">Discord Webhook</option>
                                            <option value="webhook">Custom API (JSON)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endpoint / Token</label>
                                        <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="Bot Token o Webhook URL..." className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent text-xs font-bold outline-none focus:border-primary transition-all" />
                                    </div>
                                </div>
                            )}
                            <button onClick={handleSaveFwd} disabled={savingFwd} className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 active:scale-95 transition-all">
                                {savingFwd ? 'SINCRONIZANDO...' : 'ACTUALIZAR NODO'}
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