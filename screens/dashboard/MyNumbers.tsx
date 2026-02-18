import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Slot } from '../../types';
import { 
  Copy, 
  Settings, 
  Mail, 
  PlusCircle, 
  ArrowLeft, 
  X, 
  Globe, 
  Crown,
  Zap,
  Leaf,
  Loader2,
  Terminal,
  Play,
  Send,
  ToggleLeft,
  ToggleRight,
  ShieldCheck
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
    
    // MODAL DE AUTOMATIZACIÓN DUAL
    const [isFwdModalOpen, setIsFwdModalOpen] = useState(false);
    const [savingFwd, setSavingFwd] = useState(false);
    
    // Estados API
    const [apiEnabled, setApiEnabled] = useState(false);
    const [apiUrl, setApiUrl] = useState('');
    const [testingApi, setTestingApi] = useState(false);

    // Estados Telegram
    const [tgEnabled, setTgEnabled] = useState(false);
    const [tgToken, setTgToken] = useState('');
    const [tgChatId, setTgChatId] = useState('');
    const [testingTg, setTestingTg] = useState(false);

    const fetchSlots = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: slotsData } = await supabase
                .from('slots')
                .select('*')
                .eq('assigned_to', user.id)
                .order('created_at', { ascending: false });

            // Cargar Configuración Dual del Usuario desde el Ledger
            const { data: userData } = await supabase
                .from('users')
                .select('api_enabled, api_url, telegram_enabled, telegram_bot_token, telegram_chat_id')
                .eq('id', user.id)
                .single();

            if (userData) {
                setApiEnabled(userData.api_enabled || false);
                setApiUrl(userData.api_url || '');
                setTgEnabled(userData.telegram_enabled || false);
                setTgToken(userData.telegram_bot_token || '');
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
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchSlots(); }, [user]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'} backdrop-blur-md text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10`;
        toast.innerHTML = `<span class="text-[11px] font-black uppercase tracking-widest">${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const handleSaveConfig = async () => {
        if (!user) return;
        setSavingFwd(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ 
                    api_enabled: apiEnabled,
                    api_url: apiUrl,
                    telegram_enabled: tgEnabled,
                    telegram_bot_token: tgToken,
                    telegram_chat_id: tgChatId
                })
                .eq('id', user.id);
            
            if (error) throw error;
            showToast("✅ CONFIGURACIÓN DE REENVÍO ACTIVA");
            setIsFwdModalOpen(false);
        } catch (err) { 
            showToast("Error al sincronizar Ledger", "error");
        } finally { setSavingFwd(false); }
    };

    const handleTestApi = async () => {
        if (!apiUrl.startsWith('http')) return showToast("URL de API inválida", "error");
        setTestingApi(true);
        try {
            await fetch(apiUrl, { 
                method: 'POST', 
                mode: 'no-cors', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({telsim_test: true, event: 'test.ping'}) 
            });
            showToast("Petición de prueba API lanzada");
        } catch (e) { showToast("Fallo de conexión API", "error"); } finally { setTestingApi(false); }
    };

    const handleTestTg = async () => {
        if (!tgToken || !tgChatId) return showToast("Datos de Telegram incompletos", "error");
        setTestingTg(true);
        try {
            const url = `https://api.telegram.org/bot${tgToken}/sendMessage`;
            await fetch(url, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({
                    chat_id: tgChatId,
                    text: "[TELSIM] ⚡ Test de conexión exitoso. Tu bot está validado para el Bridge v4.5.",
                    parse_mode: 'HTML'
                })
            });
            showToast("Test de Telegram enviado");
        } catch (e) { showToast("Token o ChatID inválido", "error"); } finally { setTestingTg(false); }
    };

    const formatPhoneNumber = (num: string) => {
        if (!num) return '---';
        const cleaned = ('' + num).replace(/\D/g, '');
        if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
        return num.startsWith('+') ? num : `+${num}`;
    };

    const getPlanStyle = (planName: string | undefined | null) => {
        const rawName = (planName || 'Starter').toString().toUpperCase();
        if (rawName.includes('POWER')) return { cardBg: 'bg-gradient-to-br from-[#B49248] to-[#8C6B1C] text-white', label: 'POWER', icon: <Crown className="size-3" />, numberColor: 'text-white' };
        if (rawName.includes('PRO')) return { cardBg: 'bg-gradient-to-br from-[#0047FF] to-[#00E0FF] text-white', label: 'PRO', icon: <Zap className="size-3" />, numberColor: 'text-white' };
        return { cardBg: 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700', label: 'STARTER', icon: <Leaf className="size-3" />, numberColor: 'text-slate-900 dark:text-white' };
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
                            return (
                                <div key={slot.port_id} className="relative group">
                                    <div className="relative shadow-2xl rounded-[2rem] overflow-hidden">
                                        <div className={`relative aspect-[1.58/1] w-full p-7 flex flex-col justify-between transition-all duration-500 ${style.cardBg}`}>
                                            <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                            <div className="flex justify-between items-start z-10">
                                                <span className="text-[12px] font-black tracking-tighter uppercase opacity-80">Telsim Online</span>
                                                <div className="size-8 rounded-full overflow-hidden border-2 border-white/20">
                                                    <img src={`https://flagcdn.com/w80/${(slot.phone_number.includes('56') ? 'cl' : 'ar')}.png`} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            </div>
                                            <div className="z-10">
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Subscriber Number</span>
                                                <h3 className={`text-2xl font-black font-mono tracking-tighter ${style.numberColor}`}>{formatPhoneNumber(slot.phone_number)}</h3>
                                            </div>
                                            <div className="flex justify-between items-end z-10">
                                                <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md flex items-center gap-1.5">
                                                    {style.icon} {style.label}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-center gap-3 px-1">
                                        <button onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)} className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all text-slate-600 dark:text-slate-300">
                                            <Mail className="size-4 text-primary" /> Bandeja
                                        </button>
                                        <button onClick={() => setIsFwdModalOpen(true)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                                            <Settings className="size-4 text-slate-400" />
                                        </button>
                                        <button onClick={() => { navigator.clipboard.writeText(slot.phone_number); showToast("Número Copiado"); }} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                                            <Copy className="size-4 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL INTEGRACIÓN DUAL */}
            {isFwdModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><Terminal className="size-5" /></div>
                                <h2 className="text-xl font-black tracking-tight uppercase">Canal de Reenvío</h2>
                            </div>
                            <button onClick={() => setIsFwdModalOpen(false)} className="text-slate-400"><X className="size-5" /></button>
                        </div>
                        
                        <div className="p-8 pt-6 space-y-8 overflow-y-auto no-scrollbar">
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
                                        <input type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://make.com/webhook/..." className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-primary transition-all" />
                                        <button onClick={handleTestApi} disabled={testingApi} className="w-full h-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                                            {testingApi ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} Probar API
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
                                        <input type="text" value={tgToken} onChange={(e) => setTgToken(e.target.value)} placeholder="Bot Token (7123456:AAH...)" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-blue-400 transition-all" />
                                        <input type="text" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="Chat ID (Ej: -98765432)" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-blue-400 transition-all" />
                                        <button onClick={handleTestTg} disabled={testingTg} className="w-full h-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                                            {testingTg ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Probar Telegram
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                            <button 
                                onClick={handleSaveConfig} 
                                disabled={savingFwd} 
                                className="w-full h-16 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                {savingFwd ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-5" />}
                                ACTUALIZAR CONFIGURACIÓN
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;