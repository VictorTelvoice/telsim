
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Slot } from '../../types';

const MyNumbers: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Release (Delete) state
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [slotToRelease, setSlotToRelease] = useState<Slot | null>(null);
    const [confirmReleaseCheck, setConfirmReleaseCheck] = useState(false);
    const [releasing, setReleasing] = useState(false);

    // Forwarding state
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

    // Forwarding Logic
    const openFwdModal = (slot: Slot) => {
        setSlotToFwd(slot);
        setFwdActive(slot.is_forwarding_active || false);
        setFwdChannel(slot.forwarding_channel || 'telegram');
        setFwdConfig(slot.forwarding_config || '');
        setIsFwdModalOpen(true);
    };

    const handleSaveFwd = async () => {
        if (!slotToFwd || !user) return;
        setSavingFwd(true);
        try {
            const { error } = await supabase
                .from('slots')
                .update({
                    is_forwarding_active: fwdActive,
                    forwarding_channel: fwdChannel,
                    forwarding_config: fwdConfig
                })
                .eq('port_id', slotToFwd.port_id);

            if (error) throw error;
            setIsFwdModalOpen(false);
            fetchSlots();
        } catch (err) {
            console.error("Error saving forwarding:", err);
            alert("Error al guardar la configuración.");
        } finally {
            setSavingFwd(false);
        }
    };

    // Release Logic
    const openReleaseModal = (slot: Slot) => {
        setSlotToRelease(slot);
        setConfirmReleaseCheck(false);
        setIsReleaseModalOpen(true);
    };

    const handleReleaseSlot = async () => {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        try {
            // En TELSIM, liberar un número significa borrar la asignación del slot
            const { error } = await supabase
                .from('slots')
                .delete()
                .eq('port_id', slotToRelease.port_id)
                .eq('assigned_to', user.id);

            if (error) throw error;
            
            setIsReleaseModalOpen(false);
            setSlotToRelease(null);
            fetchSlots();
        } catch (err) {
            console.error("Error releasing slot:", err);
            alert("No se pudo liberar el número. Inténtalo más tarde.");
        } finally {
            setReleasing(false);
        }
    };

    const formatPhoneNumber = (num: string) => {
        if (!num) return '---';
        const cleaned = ('' + num).replace(/\D/g, '');
        if (cleaned.startsWith('569') && cleaned.length === 11) {
            return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
        }
        if (cleaned.startsWith('54') && cleaned.length >= 10) {
            return `+54 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
        }
        return num.startsWith('+') ? num : `+${num}`;
    };

    const handleCopy = (num: string) => {
        const formatted = formatPhoneNumber(num);
        navigator.clipboard.writeText(formatted);
        // Simple alert for feedback
        const toast = document.createElement('div');
        toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-bold z-[200] animate-in fade-in slide-in-from-bottom-2";
        toast.innerText = "Número copiado al portapapeles";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    };

    const getCountryCode = (slot: Slot) => {
        if (slot.region && slot.region.length === 2) return slot.region.toLowerCase();
        const num = slot.phone_number || '';
        if (num.includes('56') || num.startsWith('+56')) return 'cl';
        if (num.includes('54') || num.startsWith('+54')) return 'ar';
        return 'cl';
    };

    return (
        <div className="min-h-screen relative bg-background-light dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <span className="material-icons-round">arrow_back</span>
                </button>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Mis Números SIM</h1>
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -mr-2 text-primary dark:text-blue-400">
                    <span className="material-icons-round">add_circle</span>
                </button>
            </header>

            <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando SIMs...</p>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-20 px-10 bg-white dark:bg-surface-dark rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                             <span className="material-icons-round text-4xl">sim_card_alert</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 font-bold italic text-sm">No tienes numeraciones activas en este momento.</p>
                        <button onClick={() => navigate('/onboarding/region')} className="bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-button uppercase text-xs tracking-widest active:scale-95 transition-all">Activar mi primera SIM</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {slots.map((slot) => {
                            const isPro = slot.plan_type?.toLowerCase().includes('power') || slot.plan_type?.toLowerCase().includes('pro');
                            return (
                                <div key={slot.port_id} className={`group relative rounded-[2.5rem] p-6 transition-all border-2 ${isPro ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400/30 shadow-xl' : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="size-14 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center shadow-inner shrink-0">
                                                <img src={`https://flagcdn.com/w80/${getCountryCode(slot)}.png`} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h3 className={`text-2xl font-black tabular-nums tracking-tighter leading-none mb-2 ${isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{formatPhoneNumber(slot.phone_number)}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isPro ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{slot.plan_type || 'Flex'}</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isPro ? 'text-white/60' : 'text-emerald-500'}`}>
                                                        <span className="size-1.5 rounded-full bg-current animate-pulse"></span>
                                                        Online
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={() => handleCopy(slot.phone_number)}
                                                className={`p-2.5 rounded-xl backdrop-blur-md transition-all active:scale-90 ${isPro ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary'}`}
                                            >
                                                <span className="material-icons-round text-xl">content_copy</span>
                                            </button>
                                            <button 
                                                onClick={() => openReleaseModal(slot)}
                                                className={`p-2.5 rounded-xl backdrop-blur-md transition-all active:scale-90 ${isPro ? 'bg-white/10 text-white hover:bg-red-400 hover:text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500'}`}
                                            >
                                                <span className="material-icons-round text-xl">delete_outline</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => navigate('/dashboard/messages')} className={`h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 ${isPro ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                                            <span className="material-icons-round text-lg">mail</span>
                                            Inbox
                                        </button>
                                        {isPro ? (
                                            <button onClick={() => openFwdModal(slot)} className="h-14 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95 hover:bg-slate-50">
                                                <span className="material-icons-round text-lg">settings_input_component</span>
                                                Configurar
                                            </button>
                                        ) : (
                                            <div className="h-14 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Plan Estándar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Release Confirmation Modal */}
            {isReleaseModalOpen && slotToRelease && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/5">
                        <div className="bg-red-500 p-8 text-white relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 size-32 bg-white/10 rounded-full blur-2xl"></div>
                            <span className="material-icons-round text-5xl mb-4 block">warning_amber</span>
                            <h2 className="text-2xl font-black leading-tight tracking-tight mb-2">¿Liberar número?</h2>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Puerto ID: {slotToRelease.port_id}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                                <p className="text-xs font-medium text-red-700 dark:text-red-400 leading-relaxed">
                                    Esta acción es <span className="font-black underline">irreversible</span>. Perderás el acceso a este número y todos los mensajes recibidos serán eliminados permanentemente de nuestra infraestructura segura.
                                </p>
                            </div>

                            <div className="flex items-start gap-3 cursor-pointer group" onClick={() => setConfirmReleaseCheck(!confirmReleaseCheck)}>
                                <div className={`mt-0.5 size-5 shrink-0 rounded border-2 transition-all flex items-center justify-center ${confirmReleaseCheck ? 'bg-red-500 border-red-500' : 'border-slate-200 dark:border-slate-700'}`}>
                                    {confirmReleaseCheck && <span className="material-icons-round text-white text-sm">check</span>}
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                                    Entiendo que perderé este número y no podrá ser recuperado después de la liberación.
                                </span>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleReleaseSlot}
                                    disabled={!confirmReleaseCheck || releasing}
                                    className={`w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${confirmReleaseCheck ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                                >
                                    {releasing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : <><span className="material-icons-round">delete_forever</span> Liberar Numeración</>}
                                </button>
                                <button 
                                    onClick={() => setIsReleaseModalOpen(false)}
                                    disabled={releasing}
                                    className="w-full h-10 text-slate-400 hover:text-slate-900 dark:hover:text-white font-black uppercase tracking-widest text-[9px] transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Forwarding Modal */}
            {isFwdModalOpen && slotToFwd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/5">
                        <div className="bg-primary p-8 text-white relative">
                            <button onClick={() => setIsFwdModalOpen(false)} className="absolute top-6 right-6 size-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                                <span className="material-icons-round text-xl">close</span>
                            </button>
                            <h2 className="text-xl font-black tracking-tight mb-1">📍 Reenvío de Mensajes</h2>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Línea Pro: {formatPhoneNumber(slotToFwd.phone_number)}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">Estado del Reenvío</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Activar Bypass Directo</span>
                                </div>
                                <button onClick={() => setFwdActive(!fwdActive)} className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${fwdActive ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <div className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all duration-300 ${fwdActive ? 'left-8' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {fwdActive && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                          { id: 'telegram', label: 'Telegram', icon: 'send' },
                                          { id: 'discord', label: 'Discord', icon: 'forum' },
                                          { id: 'webhook', label: 'Webhook', icon: 'webhook' }
                                        ].map((ch) => (
                                            <button key={ch.id} onClick={() => setFwdChannel(ch.id as any)} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${fwdChannel === ch.id ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary shadow-lg shadow-primary/5' : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60 grayscale'}`}>
                                                <span className="material-icons-round text-2xl">{ch.icon}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">{ch.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {fwdChannel === 'telegram' && (
                                          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                                            <div className="flex items-start gap-2 mb-3">
                                              <span className="material-icons-round text-blue-500 text-sm mt-0.5">help_outline</span>
                                              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-relaxed">
                                                1. Inicia chat con <span className="underline font-black">@TelsimBot</span>.<br/>
                                                2. Ingresa tu Chat ID aquí.
                                              </p>
                                            </div>
                                            <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="Ej: 12345678" className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none" />
                                          </div>
                                        )}

                                        {fwdChannel === 'discord' && (
                                          <div className="space-y-2">
                                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Webhook URL</label>
                                              <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:border-primary outline-none" />
                                          </div>
                                        )}

                                        {fwdChannel === 'webhook' && (
                                          <div className="space-y-2">
                                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endpoint (POST)</label>
                                              <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="https://tu-servidor.com/webhook" className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:border-primary outline-none" />
                                          </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-2">
                                <button onClick={handleSaveFwd} disabled={savingFwd} className="w-full h-14 bg-slate-900 dark:bg-blue-600 hover:opacity-95 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-black/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                    {savingFwd ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : <><span className="material-icons-round">save</span> Guardar Configuración</>}
                                </button>
                                <button onClick={() => setIsFwdModalOpen(false)} className="w-full h-10 text-slate-400 hover:text-slate-900 dark:hover:text-white font-black uppercase tracking-widest text-[9px] transition-colors">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;
