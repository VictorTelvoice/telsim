
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
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
  Crown,
  Zap,
  Leaf,
  RefreshCw,
  Loader2,
  TrendingUp,
  ArrowUpCircle,
  Bot,
  ToggleLeft,
  ToggleRight,
  Send
} from 'lucide-react';

interface SlotWithPlan extends Slot {
  actual_plan_name?: string;
  monthly_limit?: number;
  credits_used?: number;
}

const OFFICIAL_PLANS_DATA = [
  { id: 'Starter', name: 'Starter', price: 19.90, limit: 150, stripePriceId: 'price_1SzJRLEADSrtMyiaQaDEp44E', icon: <Leaf className="size-4" /> },
  { id: 'Pro', name: 'Pro', price: 39.90, limit: 400, stripePriceId: 'price_1SzJS9EADSrtMyiagxHUI2qM', icon: <Zap className="size-4" /> },
  { id: 'Power', name: 'Power', price: 99.00, limit: 1400, stripePriceId: 'price_1SzJSbEADSrtMyiaPEMzNKUe', icon: <Crown className="size-4" /> }
];

const MyNumbers: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { refreshUnreadCount } = useMessagesCount();
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
    const [activeConfigSlot, setActiveConfigSlot] = useState<SlotWithPlan | null>(null);
    const [savingFwd, setSavingFwd] = useState(false);
    const [tgEnabled, setTgEnabled] = useState(false);
    const [tgToken, setTgToken] = useState('');
    const [tgChatId, setTgChatId] = useState('');
    const [slotFwdActive, setSlotFwdActive] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [slotToUpgrade, setSlotToUpgrade] = useState<SlotWithPlan | null>(null);

    const fetchSlots = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: slotsData } = await supabase.from('slots').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false });
            const { data: subsData } = await supabase.from('subscriptions').select('phone_number, plan_name, monthly_limit, credits_used, slot_id').eq('user_id', user.id).eq('status', 'active');
            const { data: userData } = await supabase.from('users').select('telegram_token, telegram_chat_id, telegram_enabled').eq('id', user.id).single();
            if (userData) {
                setTgToken(userData.telegram_token || '');
                setTgChatId(userData.telegram_chat_id || '');
                setTgEnabled(userData.telegram_enabled || false);
            }
            const enrichedSlots = (slotsData || []).map(slot => {
                const subscription = subsData?.find(s => s.slot_id === slot.slot_id || s.phone_number === slot.phone_number);
                return {
                    ...slot,
                    actual_plan_name: subscription?.plan_name || slot.plan_type || 'Starter',
                    monthly_limit: subscription?.monthly_limit || 150,
                    credits_used: subscription?.credits_used || 0,
                    forwarding_active: slot.forwarding_active || false
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
        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    const handleCopy = (num: string) => { navigator.clipboard.writeText(formatPhoneNumber(num)); showToast("Número Copiado"); };

    const handleSaveLabel = async (slotId: string) => {
        setSavingLabel(true);
        try {
            await supabase.from('slots').update({ label: tempLabelValue }).eq('slot_id', slotId);
            setSlots(prev => prev.map(s => s.slot_id === slotId ? { ...s, label: tempLabelValue } : s));
            setEditingLabelId(null);
        } catch (err) { console.error(err); } finally { setSavingLabel(false); }
    };

    const formatPhoneNumber = (num: string) => {
        if (!num) return '---';
        const cleaned = ('' + num).replace(/\D/g, '');
        if (cleaned.startsWith('569') && cleaned.length === 11) return `+56 9 ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
        return num.startsWith('+') ? num : `+${num}`;
    };

    const handleReleaseSlot = async () => {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        try {
            await supabase.from('subscriptions').update({ status: 'canceled' }).eq('slot_id', slotToRelease.slot_id).eq('user_id', user.id);
            await supabase.from('slots').update({ assigned_to: null, status: 'libre', plan_type: null, label: null, forwarding_active: false }).eq('slot_id', slotToRelease.slot_id);
            refreshUnreadCount(); showToast("Número liberado con éxito."); setIsReleaseModalOpen(false); setSlotToRelease(null); setConfirmReleaseCheck(false); fetchSlots();
        } catch (err: any) { showToast(err.message || "Fallo en la comunicación", "error"); } finally { setReleasing(false); }
    };

    const handleUpgradeSelect = (slot: SlotWithPlan) => { setSlotToUpgrade(slot); setIsUpgradeModalOpen(true); };

    const confirmUpgrade = (plan: any) => {
        if (!slotToUpgrade) return;
        navigate('/dashboard/upgrade-summary', {
            state: {
                phoneNumber: slotToUpgrade.phone_number,
                planName: plan.id,
                currentPlanName: slotToUpgrade.actual_plan_name,
                price: plan.price,
                limit: plan.limit,
                stripePriceId: plan.stripePriceId,
                slot_id: slotToUpgrade.slot_id
            }
        });
        setIsUpgradeModalOpen(false);
    };

    return (
        <div className="min-h-screen relative bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400"><ArrowLeft className="size-5" /></button>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Mis Tarjetas Sim</h1>
                <button onClick={() => navigate('/onboarding/region')} className="p-2 -mr-2 text-primary dark:text-blue-400"><PlusCircle className="size-5" /></button>
            </header>
            <main className="px-5 py-8 space-y-12 max-w-lg mx-auto">
                {loading ? <Loader2 className="size-10 text-primary animate-spin mx-auto mt-24" /> : (
                    <div className="space-y-14">
                        {slots.map((slot) => (
                            <div key={slot.slot_id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-7 aspect-[1.58/1] flex flex-col justify-between shadow-soft border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-[12px] font-black text-primary uppercase">Telsim Online</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{slot.actual_plan_name}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Subscriber Number</span>
                                        <h3 className="text-[24px] font-black font-mono tracking-tighter">{formatPhoneNumber(slot.phone_number)}</h3>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[7px] font-bold opacity-20 uppercase">Nodo: {slot.slot_id}</span>
                                    </div>
                                </div>
                                <div className="mt-5 flex gap-3">
                                    <button onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)} className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"><Mail className="size-4 text-primary" /> Bandeja</button>
                                    <button onClick={() => handleUpgradeSelect(slot)} className="size-12 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-primary rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"><TrendingUp className="size-4" /></button>
                                    <button onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }} className="size-12 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center transition-transform active:scale-90"><Trash2 className="size-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* MODAL UPGRADE */}
            {isUpgradeModalOpen && slotToUpgrade && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-lg animate-in fade-in">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
                        <div className="bg-primary p-8 text-white relative">
                            <button onClick={() => setIsUpgradeModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
                            <ArrowUpCircle className="size-10 mb-4" />
                            <h2 className="text-2xl font-black uppercase">Cambiar Plan</h2>
                        </div>
                        <div className="p-8 space-y-4">
                            {OFFICIAL_PLANS_DATA.map((plan) => {
                                const isCurrent = slotToUpgrade.actual_plan_name === plan.id;
                                return (
                                    <button key={plan.id} onClick={() => !isCurrent && confirmUpgrade(plan)} disabled={isCurrent} className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${isCurrent ? 'bg-slate-50 opacity-60 grayscale' : 'bg-white hover:border-primary active:scale-[0.98]'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">{plan.icon}</div>
                                            <div className="text-left"><span className="text-sm font-black uppercase">{plan.name}</span><p className="text-[9px] font-bold text-slate-400">{plan.limit} SMS / Mes</p></div>
                                        </div>
                                        <span className="text-sm font-black">${plan.price}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyNumbers;
