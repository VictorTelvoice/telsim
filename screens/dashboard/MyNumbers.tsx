
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

    const handleCopy = (num: string) => {
        navigator.clipboard.writeText(num);
        const toast = document.createElement('div');
        toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300";
        toast.innerHTML = `<span class="text-[11px] font-black uppercase tracking-widest">Número Copiado</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
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

    // Fix: Added openReleaseModal to handle opening the release confirmation modal
    const openReleaseModal = (slot: Slot) => {
        setSlotToRelease(slot);
        setConfirmReleaseCheck(false);
        setIsReleaseModalOpen(true);
    };

    // Fix: Added openFwdModal to handle opening the forwarding configuration modal
    const openFwdModal = (slot: Slot) => {
        setSlotToFwd(slot);
        setFwdActive(slot.is_forwarding_active || false);
        setFwdChannel(slot.forwarding_channel || 'telegram');
        setFwdConfig(slot.forwarding_config || '');
        setIsFwdModalOpen(true);
    };

    return (
        <div className="min-h-screen relative bg-background-light dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Mis Líneas SIM</h1>
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -mr-2 text-primary dark:text-blue-400">
                    <PlusCircle className="size-5" />
                </button>
            </header>

            <main className="px-5 py-8 space-y-10 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escaneando red...</p>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-20 px-10 bg-white dark:bg-surface-dark rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Globe className="size-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 font-bold italic text-sm">No tienes numeraciones activas.</p>
                        <button onClick={() => navigate('/onboarding/region')} className="mt-6 bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-button uppercase text-xs tracking-widest">Activar SIM</button>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {slots.map((slot) => {
                            const isPro = slot.plan_type?.toLowerCase().includes('power') || slot.plan_type?.toLowerCase().includes('pro');
                            const country = getCountryCode(slot);
                            
                            return (
                                <div key={slot.port_id} className="relative group">
                                    {/* SIM CARD PHYSICAL SHAPE */}
                                    <div 
                                        style={{ clipPath: 'polygon(0% 0%, 88% 0%, 100% 12%, 100% 100%, 0% 100%)' }}
                                        className={`relative aspect-[1.6/1] w-full p-8 flex flex-col justify-between transition-all duration-500 shadow-2xl ${
                                            isPro 
                                            ? 'bg-slate-900 text-white ring-1 ring-white/10' 
                                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700'
                                        }`}
                                    >
                                        {/* Plástico Textura */}
                                        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                        
                                        {/* Top Section: Brand & Label */}
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="flex flex-col">
                                                <span className={`text-[12px] font-black tracking-tighter uppercase ${isPro ? 'text-blue-400' : 'text-primary'}`}>
                                                    TELSIM INFRASTRUCTURE
                                                </span>
                                                <span className="text-[8px] font-bold opacity-40 uppercase tracking-[0.2em]">Secure Virtual Node</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`size-6 rounded-full overflow-hidden border shadow-sm ${isPro ? 'border-white/20' : 'border-slate-200'}`}>
                                                    <img src={`https://flagcdn.com/w80/${country}.png`} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle Section: SIM Chip Visual */}
                                        <div className="flex items-center gap-6 relative z-10">
                                            {/* SIM CHIP Visual Representation */}
                                            <div className={`relative w-16 h-12 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-black/10 shadow-inner ${isPro ? 'bg-gradient-to-br from-slate-300 to-slate-500' : 'bg-gradient-to-br from-yellow-300 to-amber-500'}`}>
                                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
                                                    {[...Array(9)].map((_, i) => (
                                                        <div key={i} className="border border-black/5 opacity-40 rounded-sm"></div>
                                                    ))}
                                                </div>
                                                <div className="w-6 h-8 border border-black/10 rounded-sm opacity-20"></div>
                                            </div>

                                            {/* Phone Number */}
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Subscriber Number</span>
                                                <h3 className="text-2xl font-black font-mono tracking-tighter leading-none">
                                                    {formatPhoneNumber(slot.phone_number)}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Bottom Section: Plan & Metadata */}
                                        <div className="flex justify-between items-end relative z-10">
                                            <div className="flex flex-col">
                                                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest inline-block ${isPro ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                                    {slot.plan_type || 'FLEX'}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] font-bold opacity-40 uppercase">Provisioning ID</span>
                                                <span className="text-[9px] font-mono opacity-60 uppercase">{slot.port_id.substring(0, 12)}...</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ACTIONS OVERLAY (Visible on hover/always on mobile) */}
                                    <div className="mt-4 flex items-center justify-center gap-3">
                                        <button 
                                            onClick={() => navigate('/dashboard/messages')}
                                            className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                                        >
                                            <Mail className="size-4 text-primary" />
                                            Inbox
                                        </button>
                                        <button 
                                            onClick={() => handleCopy(slot.phone_number)}
                                            className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm hover:bg-slate-50 transition-all"
                                        >
                                            <Copy className="size-4 text-slate-400" />
                                        </button>
                                        {isPro && (
                                            <button 
                                                onClick={() => openFwdModal(slot)}
                                                className="size-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                                            >
                                                <Settings className="size-4" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => openReleaseModal(slot)}
                                            className="size-12 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
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

            {/* Modals remain the same functionally, but can use the same dark style */}
            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
                        <div className="bg-red-500 p-8 text-white">
                            <AlertTriangle className="size-12 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight mb-2">¿Confirmar liberación?</h2>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Plan: {slotToRelease.plan_type}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-xs font-medium text-slate-500 leading-relaxed">¿Estás seguro? Esto eliminará el número y cancelará la renovación automática.</p>
                            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setConfirmReleaseCheck(!confirmReleaseCheck)}>
                                <div className={`mt-0.5 size-5 shrink-0 rounded border-2 transition-all flex items-center justify-center ${confirmReleaseCheck ? 'bg-red-500 border-red-500' : 'border-slate-200'}`}>
                                    {confirmReleaseCheck && <Check className="size-3 text-white" />}
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 leading-tight">Entiendo que perderé este número permanentemente.</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleReleaseSlot} disabled={!confirmReleaseCheck || releasing} className={`w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${confirmReleaseCheck ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                                    {releasing ? 'PROCESANDO...' : 'ELIMINAR SIM'}
                                </button>
                                <button onClick={() => setIsReleaseModalOpen(false)} className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFwdModalOpen && slotToFwd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 space-y-6">
                        <h2 className="text-xl font-black tracking-tight">Configuración Pro</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <span className="text-sm font-bold">Reenvío Activo</span>
                                <button onClick={() => setFwdActive(!fwdActive)} className={`w-12 h-6 rounded-full relative transition-colors ${fwdActive ? 'bg-primary' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 size-4 rounded-full bg-white transition-all ${fwdActive ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            {fwdActive && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <select value={fwdChannel} onChange={(e) => setFwdChannel(e.target.value as any)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent text-xs font-bold">
                                        <option value="telegram">Telegram Bot</option>
                                        <option value="discord">Discord Webhook</option>
                                        <option value="webhook">Custom API</option>
                                    </select>
                                    <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="ID o URL..." className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent text-xs" />
                                </div>
                            )}
                            <button onClick={handleSaveFwd} disabled={savingFwd} className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg">
                                {savingFwd ? 'Guardando...' : 'Sincronizar Canal'}
                            </button>
                            <button onClick={() => setIsFwdModalOpen(false)} className="w-full h-10 text-slate-400 font-black uppercase tracking-widest text-[9px]">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    async function handleReleaseSlot() {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        try {
            await supabase.from('slots').update({ assigned_to: null, status: 'libre' }).eq('port_id', slotToRelease.port_id);
            setIsReleaseModalOpen(false);
            fetchSlots();
        } catch (err) { console.error(err); } finally { setReleasing(false); }
    }

    async function handleSaveFwd() {
        if (!slotToFwd) return;
        setSavingFwd(true);
        try {
            await supabase.from('slots').update({ is_forwarding_active: fwdActive, forwarding_channel: fwdChannel, forwarding_config: fwdConfig }).eq('port_id', slotToFwd.port_id);
            setIsFwdModalOpen(false);
            fetchSlots();
        } catch (err) { console.error(err); } finally { setSavingFwd(false); }
    }
};

export default MyNumbers;
