import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useMessagesCount } from '../../contexts/MessagesContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Slot } from '../../types';
import SideDrawer from '../../components/SideDrawer';
import { dedupeLatestSubscriptionPerLine, isInventoryVisibleStatus } from '../../components/billing/subscriptionBillingUtils';
import {
    Copy,
    Trash2,
    MessageSquare,
    PlusCircle,
    AlertTriangle,
    Pencil,
    Check,
    X,
    Crown,
    Zap,
    Leaf,
    ChevronRight,
    Loader2,
    Bot,
    ToggleLeft,
    ToggleRight,
    Send,
    Search,
    SlidersHorizontal,
    ArrowUpDown
} from 'lucide-react';

interface SlotWithPlan extends Slot {
    actual_plan_name?: string;
    monthly_limit?: number;
    credits_used?: number;
    billing_type?: string;
    subscription_created_at?: string | null;
}

type SubscriptionSnapshot = {
    id: string;
    phone_number: string;
    plan_name: string;
    monthly_limit: number;
    credits_used: number;
    slot_id: string;
    billing_type: string;
    created_at: string;
    status?: string | null;
};

const MyNumbers: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const { unreadSmsCount: unreadMessages, refreshUnreadCount } = useMessagesCount();
    const { unreadCount: unreadNotificationsCount } = useNotifications();
    const [slots, setSlots] = useState<SlotWithPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [simFilter, setSimFilter] = useState('');
    const [planFilter, setPlanFilter] = useState<'all' | 'start' | 'pro' | 'power'>('all');
    const [sortMode, setSortMode] = useState<'recent' | 'oldest' | 'usage'>('recent');
    const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(null);

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
    const [testingTg, setTestingTg] = useState(false);
    const [slotFwdActive, setSlotFwdActive] = useState(false);
    const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
    const savedPlanId = localStorage.getItem('selected_plan') || 'starter';
    const planName = savedPlanId.charAt(0).toUpperCase() + savedPlanId.slice(1);

    const fetchSlots = async (options?: { silent?: boolean }): Promise<SlotWithPlan[]> => {
        if (!user?.id) return [];
        if (!options?.silent) {
            setLoading(true);
        }
        try {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

                const res = await fetch('/api/manage', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        action: 'mobile-numbers-snapshot',
                        accessToken: session?.access_token || null,
                    }),
                });

                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error((body as { error?: string }).error || 'No se pudieron cargar las líneas.');
                }

                const snapshotSlots = (((body as { slots?: SlotWithPlan[] }).slots) || []) as SlotWithPlan[];
                setSlots(snapshotSlots);
                return snapshotSlots;
            } catch (snapshotError) {
                console.warn('[MyNumbers] mobile-numbers-snapshot fallback', snapshotError);

                const { data: subsData } = await supabase
                    .from('subscriptions')
                    .select('id, phone_number, plan_name, monthly_limit, credits_used, slot_id, billing_type, created_at, status')
                    .eq('user_id', user?.id)
                    .order('created_at', { ascending: false });

                const liveSubs = dedupeLatestSubscriptionPerLine((subsData as SubscriptionSnapshot[] | null) || [])
                    .filter((sub) => isInventoryVisibleStatus(sub.status));
                const slotIdsFromSubs = Array.from(new Set(liveSubs.map((sub) => sub.slot_id).filter(Boolean)));

                const { data: slotsBySubs } = slotIdsFromSubs.length > 0
                    ? await supabase
                        .from('slots')
                        .select('slot_id, phone_number, plan_type, assigned_to, created_at, status, region, label, forwarding_active')
                        .in('slot_id', slotIdsFromSubs)
                        .order('created_at', { ascending: false })
                    : { data: [] as Slot[] };

                const slotsById = new Map<string, Slot>(((slotsBySubs as Slot[] | null) || []).map((slot) => [slot.slot_id, slot]));

                const mergedFromSubscriptions: SlotWithPlan[] = liveSubs
                    .filter((subscription) => Boolean(subscription.slot_id))
                    .map((subscription) => {
                    const slot = slotsById.get(subscription.slot_id);
                    return {
                        slot_id: subscription.slot_id,
                        phone_number: slot?.phone_number || subscription.phone_number,
                        plan_type: slot?.plan_type || subscription.plan_name || 'Starter',
                        assigned_to: slot?.assigned_to || user.id,
                        created_at: slot?.created_at || subscription.created_at,
                        status: slot?.status || 'ocupado',
                        region: slot?.region,
                        label: slot?.label,
                        forwarding_active: slot?.forwarding_active || false,
                        actual_plan_name: subscription.plan_name || slot?.plan_type || 'Starter',
                        monthly_limit: subscription.monthly_limit || 150,
                        credits_used: subscription.credits_used || 0,
                        billing_type: subscription.billing_type || 'monthly',
                        subscription_created_at: subscription.created_at || null,
                    };
                });

                setSlots(mergedFromSubscriptions);
                return mergedFromSubscriptions;
            }
        } catch (err) {
            console.error(err);
            return [];
        } finally {
            if (!options?.silent) {
                setLoading(false);
            }
        }
    };

    const enableTelegramForUserIfConfigured = async () => {
        if (!user?.id) {
            throw new Error(t('common.error'));
        }

        const { data: tgData, error: tgError } = await supabase
            .from('users')
            .select('telegram_token, telegram_chat_id, telegram_enabled')
            .eq('id', user.id)
            .single();

        if (tgError) throw tgError;

        const hasTelegramConfig = Boolean(tgData?.telegram_token?.trim() && tgData?.telegram_chat_id?.trim());

        if (!hasTelegramConfig) {
            throw new Error('Configura tu Bot de Telegram en Ajustes antes de activarlo en una línea.');
        }

        if (!tgData?.telegram_enabled) {
            const { error: enableError } = await supabase
                .from('users')
                .update({ telegram_enabled: true })
                .eq('id', user.id);

            if (enableError) throw enableError;
        }
    };

    // Primera carga en cuanto user.id esté disponible; no se espera a auth loading
    useEffect(() => {
        if (user?.id) fetchSlots();
    }, [user?.id]);

    useEffect(() => {
        if (location.state?.reopenUpgrade && slots.length > 0) {
            const slot = slots.find(s => s.slot_id === location.state.slotId);
            if (slot) {
                handleUpgradeSelect(slot);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, slots]);

    useEffect(() => {
        if (location.state?.openAutomation && slots.length > 0) {
            const slot = slots.find(s => s.phone_number === location.state.phoneNumber);
            if (slot) {
                openAutomationConfig(slot);
                // Limpiamos el estado
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, slots]);

    useEffect(() => {
        const focusSlotId = location.state?.focusSlotId as string | undefined;
        const focusPhoneNumber = location.state?.focusPhoneNumber as string | undefined;
        if ((!focusSlotId && !focusPhoneNumber) || slots.length === 0) return;

        const target = slots.find((slot) =>
            (focusSlotId && slot.slot_id === focusSlotId) ||
            (focusPhoneNumber && slot.phone_number === focusPhoneNumber)
        );
        if (!target) return;

        setHighlightedSlotId(target.slot_id);
        const timer = window.setTimeout(() => {
            document.getElementById(`sim-card-${target.slot_id}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 120);

        window.history.replaceState({}, document.title);
        const clearTimer = window.setTimeout(() => setHighlightedSlotId(null), 2200);

        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(clearTimer);
        };
    }, [location.state, slots]);

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

    const showCancelToast = (payload: { title: string; description: string; type: 'success' | 'error' }) => {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${
            payload.type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'
        } backdrop-blur-md text-white px-8 py-4 rounded-2xl shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10`;

        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-start gap-3';

        const titleEl = document.createElement('p');
        titleEl.className = 'text-[12px] font-black uppercase tracking-widest';
        titleEl.textContent = payload.title;

        const descEl = document.createElement('p');
        descEl.className = 'text-[11px] opacity-90 mt-0.5';
        descEl.textContent = payload.description;

        const textWrap = document.createElement('div');
        textWrap.className = 'flex flex-col';
        textWrap.appendChild(titleEl);
        textWrap.appendChild(descEl);

        wrapper.appendChild(textWrap);
        toast.appendChild(wrapper);
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    const { getAppTemplate } = useSettings();
    const handleCopy = (num: string) => {
        const formatted = formatPhoneNumber(num);
        navigator.clipboard.writeText(formatted);
        showToast(getAppTemplate('number_copied', t('mynumbers.number_copied')));
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

    const formatCreatedAt = (iso?: string | null) => {
        if (!iso) return '—';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString();
    };

    const filteredSlots = [...slots]
        .filter((slot) => {
            const q = simFilter.trim().toLowerCase();
            const planName = String(slot.actual_plan_name || '').toLowerCase();
            const matchesPlan =
                planFilter === 'all' ||
                (planFilter === 'start' && planName.includes('start')) ||
                (planFilter === 'pro' && planName.includes('pro')) ||
                (planFilter === 'power' && planName.includes('power'));
            if (!matchesPlan) return false;
            if (!q) return true;
            const phone = String(slot.phone_number || '').toLowerCase();
            const label = String(slot.label || '').toLowerCase();
            return phone.includes(q) || label.includes(q) || planName.includes(q);
        })
        .sort((a, b) => {
            if (sortMode === 'usage') {
                return (b.credits_used || 0) - (a.credits_used || 0);
            }
            const aTime = new Date(a.subscription_created_at || a.created_at || 0).getTime();
            const bTime = new Date(b.subscription_created_at || b.created_at || 0).getTime();
            return sortMode === 'oldest' ? aTime - bTime : bTime - aTime;
        });

    const handleReleaseSlot = async () => {
        if (!slotToRelease || !user || !confirmReleaseCheck) return;
        setReleasing(true);
        const slotId = slotToRelease.slot_id;
        let releasedFromBackend = false;
        try {
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('stripe_subscription_id')
                .eq('slot_id', slotToRelease.slot_id)
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing'])
                .maybeSingle();

            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

            const body: Record<string, string> = { action: 'cancel' };
            if (subData?.stripe_subscription_id) body.subscriptionId = subData.stripe_subscription_id;
            else body.slot_id = slotId;

            const res = await fetch('/api/manage', {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error((errBody as { error?: string }).error || 'Intenta nuevamente.');
            }

            const okBody = await res.json().catch(() => ({}));
            releasedFromBackend = Boolean(okBody?.released_number);

            refreshUnreadCount();
            const updatedSlots = await fetchSlots();
            const releasedDetected =
                releasedFromBackend ||
                !updatedSlots.some((s) => s.slot_id === slotId);

            showCancelToast({
                type: 'success',
                title: 'Suscripción cancelada',
                description: releasedDetected
                    ? 'La suscripción fue cancelada y el número fue liberado del sistema.'
                    : 'La suscripción fue cancelada correctamente.',
            });
            setIsReleaseModalOpen(false);
            setSlotToRelease(null);
            setConfirmReleaseCheck(false);
            setTimeout(() => {
                void fetchSlots();
            }, 3500);
        } catch (err: any) {
            console.error("[RELEASE ERROR]", err);
            const msg = typeof err?.message === 'string' ? err.message.trim() : '';
            showCancelToast({
                type: 'error',
                title: 'No se pudo cancelar',
                description: msg && msg.length > 0 ? msg : 'Intenta nuevamente.',
            });
        } finally {
            setReleasing(false);
        }
    };

    const openAutomationConfig = (slot: SlotWithPlan) => {
        setActiveConfigSlot(slot);
        setSlotFwdActive(slot.forwarding_active || false);
        setIsFwdModalOpen(true);
    };

    const handleToggleForwarding = async (slotId: string, newVal: boolean) => {
        setTogglingSlot(slotId);
        try {
            if (newVal) {
                await enableTelegramForUserIfConfigured();
            }

            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

            const res = await fetch('/api/manage', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'set-slot-forwarding',
                    slotId,
                    forwardingActive: newVal,
                    accessToken: session?.access_token || null,
                }),
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((body as { error?: string }).error || t('common.error'));
            const persistedForwarding = Boolean((body as { forwardingActive?: boolean }).forwardingActive);

            setSlots(prev => prev.map(slot => (
                slot.slot_id === slotId ? { ...slot, forwarding_active: persistedForwarding } : slot
            )));
        } catch (err) {
            console.error(err);
            const message = err instanceof Error && err.message ? err.message : t('common.error');
            showToast(message, 'error');
        } finally {
            setTogglingSlot(null);
        }
    };

    const handleSaveAutomation = async () => {
        if (!user || !activeConfigSlot) return;
        setSavingFwd(true);
        try {
            if (slotFwdActive) {
                await enableTelegramForUserIfConfigured();
            }

            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

            const res = await fetch('/api/manage', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'set-slot-forwarding',
                    slotId: activeConfigSlot.slot_id,
                    forwardingActive: slotFwdActive,
                    accessToken: session?.access_token || null,
                }),
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((body as { error?: string }).error || t('common.error'));
            const persistedForwarding = Boolean((body as { forwardingActive?: boolean }).forwardingActive);

            setSlots(prev => prev.map(slot => (
                slot.slot_id === activeConfigSlot.slot_id ? { ...slot, forwarding_active: persistedForwarding } : slot
            )));
            setSlotFwdActive(persistedForwarding);

            showToast(getAppTemplate('automation_saved', t('mynumbers.automation_saved')));
            setIsFwdModalOpen(false);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error && err.message ? err.message : t('common.error');
            showToast(message, "error");
        } finally {
            setSavingFwd(false);
        }
    };

    const handleTestTelegram = async () => {
        if (!user) return;
        setTestingTg(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('telegram_token, telegram_chat_id')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            if (!data?.telegram_token || !data?.telegram_chat_id) {
                showToast(getAppTemplate('telegram_test_error', t('tg.test_error')), "error");
                return;
            }

            const response = await fetch(`https://api.telegram.org/bot${data.telegram_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: data.telegram_chat_id,
                    text: t('tg.test_message')
                }),
            });

            if (!response.ok) throw new Error('Telegram API error');
            showToast(getAppTemplate('telegram_test_success', t('tg.test_success')));
        } catch (err) {
            console.error(err);
            showToast(getAppTemplate('telegram_test_error', t('tg.test_error')), "error");
        } finally {
            setTestingTg(false);
        }
    };

    const handleUpgradeSelect = (slot: SlotWithPlan) => {
        navigate('/dashboard/upgrade-plan', {
            state: {
                phoneNumber: slot.phone_number,
                slot_id: slot.slot_id,
                currentPlanName: slot.actual_plan_name || 'Starter',
                billing_type: slot.billing_type || 'monthly',
            }
        });
    };

    const getPlanStyle = (planName: string | undefined | null) => {
        const rawName = (planName || 'Starter').toString().toUpperCase();
        if (rawName.includes('POWER')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#B49248] via-[#D4AF37] to-[#8C6B1C] text-white shadow-xl',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-amber-100',
                chip: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-100',
                icon: <Crown className="size-3" />,
                label: 'POWER',
                progressFill: 'bg-white'
            };
        }
        if (rawName.includes('PRO')) {
            return {
                cardBg: 'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00E0FF] text-white shadow-xl',
                badgeBg: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
                accentText: 'text-blue-50',
                chip: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
                icon: <Zap className="size-3" />,
                label: 'PRO',
                progressFill: 'bg-white'
            };
        }
        return {
            cardBg: 'bg-gradient-to-br from-[#AEB8C8] via-[#D9E0EA] to-[#8E9AAF] text-white border border-white/35 shadow-xl',
            badgeBg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
            accentText: 'text-white',
            chip: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
            icon: <Leaf className="size-3" />,
            label: 'START',
            progressFill: 'bg-emerald-500'
        };
    };

    return (
        <div className="min-h-screen relative bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
            <header className="grid grid-cols-[40px_1fr_40px] items-center gap-3 px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 lg:px-12">
                <button
                    onClick={() => setDrawerOpen(true)}
                    className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-[#1e3a8a] dark:text-blue-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    aria-label="Abrir menu"
                >
                    <svg width="16" height="12" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="0" y1="1" x2="18" y2="1"/>
                        <line x1="0" y1="7" x2="18" y2="7"/>
                        <line x1="0" y1="13" x2="18" y2="13"/>
                    </svg>
                </button>
                <h1 className="text-center text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('mynumbers.title')}</h1>
                <button onClick={() => navigate('/onboarding/region')} className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-primary dark:text-blue-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <PlusCircle className="size-5" />
                </button>
            </header>

            <main className="px-5 py-4 space-y-12 max-w-lg mx-auto lg:max-w-4xl lg:px-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="size-10 text-primary animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('mynumbers.syncing')}</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <section className="space-y-2">
                            <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                {filteredSlots.length} SIM{filteredSlots.length === 1 ? '' : 's'}
                            </p>
                            <div className="rounded-[1.5rem] border border-slate-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-sm px-2 py-1.5 flex items-center gap-1.5 flex-nowrap overflow-hidden">
                                <div className="flex items-center gap-1.5 min-w-0 w-[33%] flex-none rounded-xl bg-slate-50/90 dark:bg-slate-800/90 px-2 py-1.5 border border-slate-200/70 dark:border-slate-700/70">
                                    <Search className="size-3.5 text-slate-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={simFilter}
                                    onChange={(e) => setSimFilter(e.target.value)}
                                    placeholder="Buscar"
                                    className="min-w-0 w-full bg-transparent outline-none text-[11px] font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                </div>
                                <div className="relative w-[84px] shrink-0">
                                    <SlidersHorizontal className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={planFilter}
                                        onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}
                                        className="w-full appearance-none bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-xl pl-7 pr-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none"
                                    >
                                        <option value="all">Todas</option>
                                        <option value="start">Start</option>
                                        <option value="pro">Pro</option>
                                        <option value="power">Power</option>
                                    </select>
                                </div>
                                <div className="relative w-[92px] shrink-0">
                                    <ArrowUpDown className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={sortMode}
                                        onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                                        className="w-full appearance-none bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 rounded-xl pl-7 pr-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none"
                                    >
                                        <option value="recent">Nuevas</option>
                                        <option value="oldest">Antiguas</option>
                                        <option value="usage">Mas uso</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <div className="space-y-14 lg:grid lg:grid-cols-2 lg:gap-10 lg:space-y-0">
                        {filteredSlots.map((slot, index) => {
                            const style = getPlanStyle(slot.actual_plan_name);

                            return (
                                <div
                                    key={slot.slot_id}
                                    id={`sim-card-${slot.slot_id}`}
                                    className={`relative group animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-[1.9rem] transition-all ${
                                        highlightedSlotId === slot.slot_id ? 'ring-4 ring-primary/30 ring-offset-4 ring-offset-[#F8FAFC]' : ''
                                    }`}
                                >
                                    <div
                                        className={`relative shadow-2xl rounded-[1.8rem] overflow-hidden group/sim transition-all duration-500 p-5 min-h-[220px] flex flex-col justify-between ${style.cardBg}`}
                                        style={{
                                            clipPath:
                                                'polygon(14px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 14px 100%, 0 calc(100% - 14px), 0 calc(50% + 18px), 8px calc(50% + 18px), 8px calc(50% - 18px), 0 calc(50% - 18px), 0 14px)',
                                        }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[12px] font-black tracking-tighter uppercase ${style.accentText}`}>Telsim Online</span>
                                                <div className="mt-1 flex items-center">
                                                    {editingLabelId === slot.slot_id ? (
                                                        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/10">
                                                            <input type="text" value={tempLabelValue} onChange={(e) => setTempLabelValue(e.target.value)} className="bg-transparent border-none p-0 px-1 text-[10px] font-black w-24 outline-none uppercase" autoFocus />
                                                            <button onClick={() => handleSaveLabel(slot.slot_id)} className="text-emerald-400 p-0.5"><Check className="size-3" /></button>
                                                            <button onClick={() => setEditingLabelId(null)} className="text-white/50 p-0.5"><X className="size-3" /></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setEditingLabelId(slot.slot_id); setTempLabelValue(slot.label || ''); }} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                                                            <span className="text-[10px] font-black uppercase tracking-widest italic truncate max-w-[120px]">
                                                                {(slot.label || t('mynumbers.my_line')).toUpperCase()}
                                                            </span>
                                                            <Pencil className="size-2.5 opacity-40" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="size-8 rounded-full overflow-hidden border-2 shadow-sm border-white/40">
                                                    <img src={`https://flagcdn.com/w80/${getCountryCode(slot)}.png`} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <span className={`text-[11px] font-black font-mono tracking-widest ${style.accentText}`}>
                                                    #{String(index + 1).padStart(2, '0')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-10 rounded-lg border border-black/10 shadow-inner ${style.chip}`}></div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Subscriber Number</span>
                                                <h3 className="text-[24px] font-black font-mono tracking-tighter leading-none">{formatPhoneNumber(slot.phone_number)}</h3>
                                                <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1 items-start">
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-50">Ciclo</p>
                                                        <p className="text-[12px] font-black">
                                                            {String(slot.billing_type || 'monthly').toLowerCase() === 'annual' ? 'Anual' : 'Mensual'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-50">SMS</p>
                                                        <p className="text-[12px] font-black">{(slot.credits_used || 0)} / {(slot.monthly_limit || 150)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-50">Desde</p>
                                                        <p className="text-[12px] font-black">{formatCreatedAt(slot.subscription_created_at || slot.created_at)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between gap-4">
                                            <div className="flex flex-col gap-2 min-w-0">
                                                <div className={`w-14 justify-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em] flex items-center gap-1 ${style.badgeBg}`}>
                                                    {style.icon} {style.label}
                                                </div>
                                            </div>

                                        </div>

                                        <div className="mt-2 flex items-center justify-end gap-2 flex-wrap">
                                                <button onClick={() => navigate(`/dashboard/messages?num=${encodeURIComponent(slot.phone_number)}`)} className="w-11 h-11 rounded-2xl bg-white/88 dark:bg-white/12 border border-white/45 dark:border-white/15 flex items-center justify-center shadow-sm dark:shadow-[0_12px_30px_-16px_rgba(15,23,42,0.9)] backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-white/16">
                                                    <MessageSquare className="size-4 text-primary dark:text-white" />
                                                </button>
                                                <button onClick={() => handleUpgradeSelect(slot)} className="w-11 h-11 rounded-2xl bg-white/88 dark:bg-white/12 border border-white/45 dark:border-white/15 flex items-center justify-center shadow-sm dark:shadow-[0_12px_30px_-16px_rgba(15,23,42,0.9)] backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-white/16">
                                                    <Zap className="size-4 text-primary dark:text-white" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleForwarding(slot.slot_id, !slot.forwarding_active)}
                                                    disabled={togglingSlot === slot.slot_id}
                                                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-sm backdrop-blur-sm ${
                                                        slot.forwarding_active
                                                            ? 'bg-emerald-500 text-white border-emerald-400/80 ring-2 ring-white/60 shadow-lg shadow-emerald-500/30'
                                                            : 'bg-white/88 dark:bg-white/12 border-white/45 dark:border-white/15 text-slate-500 dark:text-white'
                                                    } ${togglingSlot === slot.slot_id ? 'opacity-70' : ''}`}
                                                    title={slot.forwarding_active ? 'Bot de Telegram activo' : 'Bot de Telegram inactivo'}
                                                >
                                                    {togglingSlot === slot.slot_id ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
                                                </button>
                                                <button onClick={() => handleCopy(slot.phone_number)} className="w-11 h-11 rounded-2xl bg-white/88 dark:bg-white/12 border border-white/45 dark:border-white/15 flex items-center justify-center shadow-sm dark:shadow-[0_12px_30px_-16px_rgba(15,23,42,0.9)] backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-white/16">
                                                    <Copy className="size-4 text-slate-500 dark:text-white" />
                                                </button>
                                                <button onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }} className="w-11 h-11 rounded-2xl bg-rose-50/90 dark:bg-rose-900/20 border border-rose-200/70 dark:border-rose-900/30 text-rose-500 flex items-center justify-center shadow-sm backdrop-blur-sm">
                                                    <Trash2 className="size-4" />
                                                </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                )}
            </main>

            {isReleaseModalOpen && slotToRelease && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
                <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

                  {/* Header rojo */}
                  <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-7 text-white">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                      <AlertTriangle size={24} className="text-white" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight uppercase">{t('mynumbers.release_confirm')}</h2>
                    <p className="text-[12px] font-semibold text-white/70 mt-1">
                      {formatPhoneNumber(slotToRelease.phone_number)}
                    </p>
                  </div>

                  {/* Body */}
                  <div className="p-7 flex flex-col gap-5">
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Al confirmar, programaremos la baja de esta SIM y conservaremos el número reservado durante 48 horas para que puedas reactivarlo. <strong className="text-slate-700 dark:text-slate-200">Durante ese plazo todavía podrás recuperarlo desde Facturación.</strong>
                    </p>

                    {/* Checklist de consecuencias */}
                    <div className="rounded-2xl p-4 flex flex-col gap-2.5 bg-rose-50 dark:bg-slate-800">
                      {[
                        'La suscripción pasará a baja programada',
                        'El número quedará reservado por 48 horas para reactivación',
                        'Tras ese plazo, la línea podrá liberarse definitivamente',
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X size={9} className="text-rose-500" />
                          </div>
                          <span className="text-[11px] font-semibold leading-snug text-slate-500 dark:text-slate-400">{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Checkbox confirmación */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={confirmReleaseCheck}
                        onChange={(e) => setConfirmReleaseCheck(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-rose-500 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-[11px] font-bold leading-snug select-none text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        Confirmo que entiendo las consecuencias y deseo dar de baja este número
                      </span>
                    </label>

                    {/* Botones */}
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        onClick={handleReleaseSlot}
                        disabled={!confirmReleaseCheck || releasing}
                        className={`w-full h-12 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${
                          confirmReleaseCheck
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/30 active:scale-[0.98]'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        }`}>
                        {releasing ? <Loader2 size={15} className="animate-spin" /> : 'Programar baja de la SIM'}
                      </button>
                      <button
                        onClick={() => { setIsReleaseModalOpen(false); setConfirmReleaseCheck(false); }}
                        className="w-full h-10 rounded-2xl text-[11px] font-bold transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                        Cancelar, mantener mi SIM
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isFwdModalOpen && activeConfigSlot && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="bg-primary p-8 text-white relative">
                            <button onClick={() => setIsFwdModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20">
                                <X className="size-5" />
                            </button>
                            <Bot className="size-10 mb-4" />
                            <h2 className="text-2xl font-black leading-tight tracking-tight uppercase">{t('mynumbers.automation')}</h2>
                            <p className="text-[10px] font-black uppercase text-white/60 tracking-widest mt-1">Línea: {formatPhoneNumber(activeConfigSlot.phone_number)}</p>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-primary/20">
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-black text-slate-900 dark:text-white uppercase">{t('mynumbers.telegram_forwarding')}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">{t('mynumbers.receive_sms_bot')}</span>
                                </div>
                                <button onClick={() => setSlotFwdActive(!slotFwdActive)} className="text-primary">
                                    {slotFwdActive ? <ToggleRight className="size-12" /> : <ToggleLeft className="size-12 text-slate-300" />}
                                </button>
                            </div>

                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                                    {t('mynumbers.telegram_warning')}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleTestTelegram}
                                    disabled={testingTg || savingFwd}
                                    className="w-full h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {testingTg ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> {t('tg.test_connection')}</>}
                                </button>

                                <button
                                    onClick={handleSaveAutomation}
                                    disabled={savingFwd || testingTg}
                                    className="w-full h-14 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    {savingFwd ? <Loader2 className="size-4 animate-spin mx-auto" /> : t('common.save_changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SideDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                user={{ name: userName, plan: planName }}
                unreadMessages={unreadMessages}
                unreadNotifications={unreadNotificationsCount}
                currentLang={language}
                onLangChange={(lang) => setLanguage(lang as 'es' | 'en')}
            />
        </div>
    );
};

export default MyNumbers;
