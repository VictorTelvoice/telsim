
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
  Tag,
  Save,
  Cpu
} from 'lucide-react';

const MyNumbers: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [slots, setSlots] = useState<Slot[]>([]);
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
            const { data, error } = await supabase
                .from('slots')
                .select('*')
                .eq('assigned_to', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSlots(data || []);
        } catch (err) {
            console.error("Error fetching slots:", err);
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

    const handleStartEditLabel = (slot: Slot) => {
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

    const getCountryCode = (slot: Slot) => {
        if (slot.region && slot.region.length === 2) return slot.region.toLowerCase();
        const num = slot.phone_number || '';
        if (num.includes('56')) return 'cl';
        if (num.includes('54')) return 'ar';
        return 'cl';
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
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1);

            if (subData && subData.length > 0) {
                await supabase
                    .from('subscriptions')
                    .update({ 
                        status: 'canceled',
                        cancel_at_period_end: true,
                        canceled_at: new Date().toISOString()
                    })
                    .eq('id', subData[0].id);
            }

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

            showToast("Número eliminado correctamente.");
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

    // Nueva función para navegar a mensajes con filtro
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando SIMs...</p>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-20 px-10 bg-white dark:bg-surface-dark rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Globe className="size-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 font-bold italic text-sm">No tienes numeraciones activas.</p>
                        <button onClick={() => navigate('/onboarding/region')} className="mt-6 bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-button uppercase text-xs tracking-widest">Activar SIM</button>
                    </div>
                ) : (
                    <div className="space-y-14">
                        {slots.map((slot) => {
                            const isPro = slot.plan_type?.toLowerCase().includes('power') || slot.plan_type?.toLowerCase().includes('pro');
                            const country = getCountryCode(slot);
                            const isEditing = editingLabelId === slot.port_id;
                            
                            return (
                                <div key={slot.port_id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative shadow-2xl rounded-[2rem] overflow-hidden group/sim transition-all duration-500">
                                        <div 
                                            style={{ clipPath: 'polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)' }}
                                            className={`relative aspect-[1.58/1] w-full p-7 flex flex-col justify-between transition-all duration-500 ${
                                                isPro 
                                                ? 'bg-[#0f172a] text-white ring-1 ring-white/10' 
                                                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="flex flex-col gap-1 max-w-[70%]">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[12px] font-black tracking-tighter uppercase ${isPro ? 'text-blue-400' : 'text-primary'}`}>
                                                            Telsim Online
                                                        </span>
                                                        <div className={`size-1.5 rounded-full ${isPro ? 'bg-blue-400' : 'bg-emerald-500'} animate-pulse`}></div>
                                                    </div>
                                                    
                                                    <div className="mt-1 min-h-[22px] flex items-center">
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                                                <input 
                                                                    type="text"
                                                                    value={tempLabelValue}
                                                                    onChange={(e) => setTempLabelValue(e.target.value)}
                                                                    className="bg-transparent border-none p-0 px-1 text-[10px] font-black text-slate-700 dark:text-white w-24 outline-none uppercase"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleSaveLabel(slot.port_id)} className="text-emerald-500 p-0.5">
                                                                    <Check className="size-3" />
                                                                </button>
                                                                <button onClick={handleCancelEditLabel} className="text-slate-400 p-0.5">
                                                                    <X className="size-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleStartEditLabel(slot)}
                                                                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                                                            >
                                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic truncate max-w-[120px]">
                                                                    {slot.label || 'Sin Etiqueta'}
                                                                </span>
                                                                <Pencil className="size-2.5 text-slate-300" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1.5">
                                                    <div className={`size-8 rounded-full overflow-hidden border-2 shadow-sm ${isPro ? 'border-white/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                                        <img src={`https://flagcdn.com/w80/${country}.png`} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className={`relative w-16 h-11 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-black/10 shadow-inner group-hover/sim:scale-[1.02] transition-transform duration-500 ${
                                                    isPro 
                                                    ? 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500' 
                                                    : 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500'
                                                }`}>
                                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-[1px] p-2">
                                                        {[...Array(6)].map((_, i) => (
                                                            <div key={i} className="border border-black/10 rounded-[1px] opacity-40 shadow-sm bg-black/5"></div>
                                                        ))}
                                                    </div>
                                                    <div className="absolute inset-x-0 h-[1px] bg-black/10 top-1/2 -translate-y-1/2"></div>
                                                    <div className="absolute inset-y-0 w-[1px] bg-black/10 left-1/2 -translate-x-1/2"></div>
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 ${isPro ? 'text-white/30' : 'text-slate-400'}`}>Subscriber Number</span>
                                                    <h3 className={`text-[24px] font-black font-mono tracking-tighter leading-none whitespace-nowrap overflow-hidden text-ellipsis ${isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                        {formatPhoneNumber(slot.phone_number)}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        isPro ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                    }`}>
                                                        {slot.plan_type || 'FLEX'}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[7px] font-bold opacity-20 uppercase">TELSIM INFRA v1.5</span>
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
                                        {isPro && (
                                            <button 
                                                onClick={() => openFwdModal(slot)}
                                                className="size-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:translate-y-[-2px] transition-all active:scale-95"
                                            >
                                                <Settings className="size-4" />
                                            </button>
                                        )}
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

            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
                        <div className="bg-rose-500 p-8 text-white">
                            <AlertTriangle className="size-10 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight mb-2">¿Liberar Línea?</h2>
                            <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Plan: {slotToRelease.plan_type}</p>
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

            {isFwdModalOpen && slotToFwd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
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
