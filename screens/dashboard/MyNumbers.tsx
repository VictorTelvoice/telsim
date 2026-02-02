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
    
    // Modals state
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [slotToRelease, setSlotToRelease] = useState<Slot | null>(null);
    const [confirmRelease, setConfirmRelease] = useState(false);
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

    const formatPhoneNumber = (num: string) => {
        if (!num) return '---';
        const cleaned = ('' + num).replace(/\D/g, '');
        
        // Formato Chileno: +56 9 XXXX XXXX
        if (cleaned.startsWith('569') && cleaned.length === 11) {
            return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
        }
        // Formato Argentino: +54 ...
        if (cleaned.startsWith('54') && cleaned.length >= 10) {
            return `+54 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
        }
        
        return num.startsWith('+') ? num : `+${num}`;
    };

    const handleCopy = (num: string) => {
        const formatted = formatPhoneNumber(num);
        navigator.clipboard.writeText(formatted);
        alert(`Número copiado: ${formatted}`);
    };

    const getCountryCode = (slot: Slot) => {
        if (slot.region && slot.region.length === 2) return slot.region.toLowerCase();
        const num = slot.phone_number || '';
        if (num.includes('56') || num.startsWith('+56')) return 'cl';
        if (num.includes('54') || num.startsWith('+54')) return 'ar';
        return 'cl';
    };

    return (
        <div className="min-h-screen relative bg-background-light dark:bg-background-dark font-display pb-20">
            <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <span className="material-icons-round">arrow_back</span>
                </button>
                <h1 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">Mis Números SIM</h1>
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -mr-2 text-primary dark:text-blue-400">
                    <span className="material-icons-round">add_circle</span>
                </button>
            </header>

            <main className="px-4 py-6 space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                    </div>
                ) : slots.length === 0 ? (
                    <div className="text-center py-20 px-10 bg-white dark:bg-surface-dark rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 mb-6 font-medium italic">No tienes SIMs activas.</p>
                        <button onClick={() => navigate('/onboarding/region')} className="bg-primary text-white font-bold px-6 py-3 rounded-xl shadow-button">Activar SIM</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {slots.map((slot) => {
                            const isPro = slot.plan_type?.toLowerCase().includes('power') || slot.plan_type?.toLowerCase().includes('pro');
                            return (
                                <div key={slot.port_id} className={`rounded-[2rem] p-5 transition-all border-2 ${isPro ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400/50 shadow-xl' : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center">
                                                <img src={`https://flagcdn.com/w80/${getCountryCode(slot)}.png`} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h3 className={`text-xl font-black tabular-nums tracking-tighter ${isPro ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{formatPhoneNumber(slot.phone_number)}</h3>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isPro ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{slot.plan_type || 'Flex'}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleCopy(slot.phone_number)}
                                                className={`p-2 rounded-xl backdrop-blur-md transition-all ${isPro ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                <span className="material-icons-round text-lg">content_copy</span>
                                            </button>
                                            {isPro && (
                                                <button onClick={() => openFwdModal(slot)} className={`p-2 rounded-xl backdrop-blur-md transition-all ${slot.is_forwarding_active ? 'bg-emerald-400 text-emerald-950 scale-105 shadow-lg shadow-emerald-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                                    <span className="material-icons-round text-lg">notifications_active</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => navigate('/dashboard/messages')} className={`h-12 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${isPro ? 'bg-white/10 text-white border border-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                                            <span className="material-icons-round text-base">mail</span>
                                            Inbox
                                        </button>
                                        {isPro && (
                                            <button onClick={() => openFwdModal(slot)} className="h-12 bg-white text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95">
                                                <span className="material-icons-round text-base">settings_input_component</span>
                                                Configurar
                                            </button>
                                        )}
                                        {!isPro && (
                                            <div className="col-span-1 h-12 flex items-center justify-center opacity-40 text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                Standard Port
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Forwarding Modal */}
            {isFwdModalOpen && slotToFwd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/5">
                        <div className="bg-primary p-6 text-white relative">
                            <button onClick={() => setIsFwdModalOpen(false)} className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                                <span className="material-icons-round text-sm">close</span>
                            </button>
                            <h2 className="text-lg font-black tracking-tight mb-1">📍 Reenvío de Mensajes</h2>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Línea Pro: {formatPhoneNumber(slotToFwd.phone_number)}</p>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">Estado del Reenvío</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Activar Bypass Directo</span>
                                </div>
                                <button onClick={() => setFwdActive(!fwdActive)} className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${fwdActive ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <div className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all duration-300 ${fwdActive ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {fwdActive && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { id: 'telegram', label: 'Telegram', icon: 'send', color: 'bg-[#0088cc]' },
                                          { id: 'discord', label: 'Discord', icon: 'forum', color: 'bg-[#5865F2]' },
                                          { id: 'webhook', label: 'Webhook', icon: 'webhook', color: 'bg-slate-700' }
                                        ].map((ch) => (
                                            <button key={ch.id} onClick={() => setFwdChannel(ch.id as any)} className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${fwdChannel === ch.id ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary shadow-lg shadow-primary/5' : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60 grayscale'}`}>
                                                <span className="material-icons-round text-xl">{ch.icon}</span>
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
                                                1. Inicia un chat con nuestro bot <span className="underline font-black">@TelsimBot</span>.<br/>
                                                2. Escribe tu ID de chat aquí.
                                              </p>
                                            </div>
                                            <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="Tu Telegram Chat ID (Ex: 12345678)" className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:border-primary outline-none" />
                                          </div>
                                        )}

                                        {fwdChannel === 'discord' && (
                                          <div className="space-y-2">
                                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de tu Webhook de Discord</label>
                                              <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:border-primary outline-none" />
                                          </div>
                                        )}

                                        {fwdChannel === 'webhook' && (
                                          <div className="space-y-2">
                                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endpoint URL (POST)</label>
                                              <input type="text" value={fwdConfig} onChange={(e) => setFwdConfig(e.target.value)} placeholder="https://tu-servidor.com/webhook" className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:border-primary outline-none" />
                                          </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 pt-2">
                                <button onClick={handleSaveFwd} disabled={savingFwd} className="w-full h-14 bg-slate-900 dark:bg-blue-600 hover:opacity-90 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-black/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                    {savingFwd ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : <><span className="material-icons-round text-lg">save</span> Guardar Configuración</>}
                                </button>
                                <button onClick={() => setIsFwdModalOpen(false)} className="w-full h-10 text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold uppercase tracking-widest text-[9px] transition-colors">Descartar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;