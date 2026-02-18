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
  Info,
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
    
    const [isFwdModalOpen, setIsFwdModalOpen] = useState(false);
    const [savingFwd, setSavingFwd] = useState(false);
    
    // Estados API (Mapeo estricto)
    const [apiEnabled, setApiEnabled] = useState(false);
    const [apiUrl, setApiUrl] = useState('');
    const [testingApi, setTestingApi] = useState(false);

    // Estados Telegram (Mapeo estricto: telegram_token)
    const [tgEnabled, setTgEnabled] = useState(false);
    const [tgToken, setTgToken] = useState('');
    const [tgChatId, setTgChatId] = useState('');
    const [testingTg, setTestingTg] = useState(false);

    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [tempLabelValue, setTempLabelValue] = useState('');
    
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [slotToRelease, setSlotToRelease] = useState<SlotWithPlan | null>(null);
    const [confirmReleaseCheck, setConfirmReleaseCheck] = useState(false);

    const fetchSlots = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: slotsData } = await supabase
                .from('slots')
                .select('*')
                .eq('assigned_to', user.id)
                .order('created_at', { ascending: false });

            // Cargar Configuración desde Users Ledger
            const { data: userData, error: userFetchError } = await supabase
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
                    credits_used: subscription?.credits_used || 0
                };
            });

            setSlots(enrichedSlots);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchSlots(); }, [user]);

    const showToast = (message: string) => {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10`;
        toast.innerHTML = `<span class="text-[11px] font-black uppercase tracking-widest">${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const handleSaveConfig = async () => {
        if (!user) return;
        setSavingFwd(true);
        try {
            // Fix Actualización: Mapeo exacto de columnas y cláusula WHERE
            const { error } = await supabase
                .from('users')
                .update({ 
                    api_enabled: apiEnabled,
                    api_url: apiUrl,
                    telegram_enabled: tgEnabled,
                    telegram_token: tgToken,
                    telegram_chat_id: tgChatId
                })
                .eq('id', user.id);
            
            if (error) throw error;
            
            showToast("Configuración guardada");
            setIsFwdModalOpen(false);
        } catch (err: any) { 
            console.error("Save Error:", err);
            alert(`Error técnico al actualizar Ledger:\n${err.message || 'Error desconocido'}`);
        } finally { setSavingFwd(false); }
    };

    const handleTestApi = async () => {
        if (!apiUrl.startsWith('http')) return alert("Por favor ingresa una URL válida (http/https)");
        setTestingApi(true);
        try {
            await fetch(apiUrl, { 
                method: 'POST', 
                mode: 'no-cors', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ telsim_test: true, event: 'test.ping' }) 
            });
            showToast("Test API lanzado");
        } catch (e) { alert("Error al conectar con la URL de API"); } finally { setTestingApi(false); }
    };

    const handleTestTg = async () => {
        if (!tgToken || !tgChatId) return alert("Ingresa el Token y ChatID para la prueba.");
        setTestingTg(true);
        try {
            // Fix de Test: Llamada directa a Telegram para validación inmediata del token
            const url = `https://api.telegram.org/bot${tgToken}/sendMessage`;
            const response = await fetch(url, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({
                    chat_id: tgChatId,
                    text: "[TELSIM] ✅ Bot vinculado correctamente. Tu infraestructura de reenvío está lista.",
                    parse_mode: 'HTML'
                })
            });
            const data = await response.json();
            if (data.ok) {
                showToast("Mensaje de prueba enviado");
            } else {
                throw new Error(data.description || "Token inválido");
            }
        } catch (e: any) { 
            alert(`Fallo en el Test de Telegram:\n${e.message}`);
        } finally { setTestingTg(false); }
    };

    const formatPhoneNumber = (num: string) => {
        if (!num) return '---';
        const cleaned = ('' + num).replace(/\D/g, '');
        if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
        return num.startsWith('+') ? num : `+${num}`;
    };

    const getPlanStyle = (planName: string | undefined | null) => {
        const rawName = (planName || 'Starter').toString().toUpperCase();
        if (rawName.includes('POWER')) return { cardBg: 'bg-gradient-to-br from-[#B49248] to-[#8C6B1C] text-white', label: 'POWER', icon: <Crown className="size-3" /> };
        if (rawName.includes('PRO')) return { cardBg: 'bg-gradient-to-br from-[#0047FF] to-[#00E0FF] text-white', label: 'PRO', icon: <Zap className="size-3" /> };
        return { cardBg: 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700', label: 'STARTER', icon: <Leaf className="size-3" /> };
    };

    return (
        <div className="min-h-screen relative bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Mis Tarjetas Sim</h1>
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -mr-2 text-primary">
                    <PlusCircle className="size-5" />
                </button>
            </header>

            <main className="px-5 py-8 space-y-12 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="size-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-14">
                        {slots.map((slot) => {
                            const style = getPlanStyle(slot.actual_plan_name);
                            return (
                                <div key={slot.port_id} className="relative">
                                    <div className={`relative aspect-[1.58/1] w-full p-7 rounded-[2rem] shadow-2xl flex flex-col justify-between overflow-hidden ${style.cardBg}`}>
                                        <div className="flex justify-between items-start z-10">
                                            <span className="text-[12px] font-black uppercase opacity-80">Telsim Online</span>
                                            <div className="size-8 rounded-full overflow-hidden border-2 border-white/20">
                                                <img src={`https://flagcdn.com/w80/${(slot.phone_number.includes('56') ? 'cl' : 'ar')}.png`} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        </div>
                                        <div className="z-10">
                                            <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Subscriber Number</span>
                                            <h3 className="text-2xl font-black font-mono tracking-tighter">{formatPhoneNumber(slot.phone_number)}</h3>
                                        </div>
                                        <div className="z-10 flex items-center">
                                             <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md flex items-center gap-1.5">
                                                {style.icon} {style.label}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 flex items-center justify-center gap-3">
                                        <button onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)} className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                            <Mail className="size-4 text-primary" /> Bandeja
                                        </button>
                                        <button onClick={() => setIsFwdModalOpen(true)} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm">
                                            <Settings className="size-4 text-slate-400" />
                                        </button>
                                        <button onClick={() => { navigator.clipboard.writeText(slot.phone_number); showToast("Número Copiado"); }} className="size-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-sm">
                                            <Copy className="size-4 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL PUENTE DE DATOS */}
            {isFwdModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><Terminal className="size-5" /></div>
                                <h2 className="text-xl font-black tracking-tight uppercase">Puente de Datos</h2>
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
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <input type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://tu-servidor.com/webhook" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-primary transition-all" />
                                        <button onClick={handleTestApi} disabled={testingApi} className="w-full h-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
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
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <input type="text" value={tgToken} onChange={(e) => setTgToken(e.target.value)} placeholder="Bot Token (7123456:AAH...)" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-blue-400 transition-all" />
                                        <input type="text" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="Chat ID (Ej: 98765432)" className="w-full h-12 px-4 rounded-xl border-2 border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold outline-none focus:border-blue-400 transition-all" />
                                        <button onClick={handleTestTg} disabled={testingTg} className="w-full h-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                                            {testingTg ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />} Test Telegram
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