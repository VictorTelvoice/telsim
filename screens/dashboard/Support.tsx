import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  Headphones,
  Zap
} from 'lucide-react';

type SupportTier = 'starter' | 'pro' | 'power' | 'none';
type LockedChannelState = {
  title: string;
  requirement: string;
  hint: string;
} | null;

const Support: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [supportTier, setSupportTier] = useState<SupportTier>('none');
  const [loadingTier, setLoadingTier] = useState(true);
  const [lockedChannel, setLockedChannel] = useState<LockedChannelState>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSupportTier = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setSupportTier('none');
          setLoadingTier(false);
        }
        return;
      }

      setLoadingTier(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_name, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Support] loadSupportTier error:', error);
        if (!cancelled) {
          setSupportTier('none');
          setLoadingTier(false);
        }
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const normalized = rows.map((row) => String(row.plan_name ?? '').trim().toLowerCase());
      const tier: SupportTier = normalized.includes('power')
        ? 'power'
        : normalized.includes('pro')
          ? 'pro'
          : normalized.includes('starter')
            ? 'starter'
            : 'none';

      if (!cancelled) {
        setSupportTier(tier);
        setLoadingTier(false);
      }
    };

    void loadSupportTier();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const supportChannels = useMemo(() => [
    {
      id: 'ticket',
      icon: <Mail className="size-6" />,
      title: t('support.send_ticket'),
      desc: 'Siempre disponible para todos los planes.',
      wait: '1-4 horas',
      color: 'bg-slate-900 dark:bg-slate-800 text-white',
      enabled: true,
      tag: null,
      upgradeHint: null,
    },
    {
      id: 'chat',
      icon: <MessageSquare className="size-6" />,
      title: 'Bot de soporte IA',
      desc: 'Atención automatizada por bot dentro de la app. Próximamente disponible.',
      wait: 'Pronto',
      color: 'bg-primary text-white',
      enabled: false,
      tag: 'Próximamente',
      upgradeHint: 'Este canal será atendido por un bot y se habilitará pronto.',
    },
    {
      id: 'whatsapp',
      icon: <Smartphone className="size-6" />,
      title: 'WhatsApp Directo',
      desc: supportTier === 'power'
        ? t('support.whatsapp_desc')
        : 'Canal prioritario reservado para clientes Power.',
      wait: '24/7',
      color: 'bg-emerald-500 text-white',
      enabled: supportTier === 'power',
      tag: supportTier === 'power' ? null : 'Requiere Power',
      upgradeHint: supportTier === 'power' ? null : 'Sube a Power para atención prioritaria por WhatsApp 24/7.',
    },
  ], [supportTier, t]);

  const handleChannelClick = (channelId: string, enabled: boolean) => {
    if (channelId === 'ticket') {
      navigate('/dashboard/support/tickets');
      return;
    }

    if (!enabled) {
      setLockedChannel({
        title: channelId === 'chat' ? 'Bot de soporte IA' : 'WhatsApp Directo',
        requirement: channelId === 'chat' ? 'Este canal será atendido por un bot y aún no está habilitado.' : 'Disponible solo para clientes con plan Power.',
        hint: channelId === 'chat'
          ? 'Muy pronto podrás conversar con un asistente automatizado desde esta misma sección.'
          : 'Sube a Power para desbloquear soporte prioritario por WhatsApp 24/7.',
      });
      return;
    }

    if (channelId === 'chat') {
      navigate('/dashboard/support/tickets');
      return;
    }

    if (channelId === 'whatsapp') {
      window.open('https://wa.me/', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display pb-32">
      {lockedChannel && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 backdrop-blur-[2px] px-4 pb-6 pt-24">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-5">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-[24px]">workspace_premium</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">Canal restringido</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{lockedChannel.title}</h3>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{lockedChannel.requirement}</p>
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{lockedChannel.hint}</p>
            </div>
            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setLockedChannel(null)}
                className="h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm font-bold"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setLockedChannel(null);
                  navigate('/dashboard/numbers');
                }}
                className="h-12 rounded-xl bg-primary hover:bg-blue-700 text-white text-sm font-black shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
              >
                Hacer upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">{t('support.title')}</h1>
        <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Headphones className="size-4 text-primary" />
        </div>
      </header>

      <main className="px-5 py-8 max-w-lg mx-auto space-y-8">
        
        {/* LIVE STATUS CARD */}
        <section className="bg-slate-900 dark:bg-blue-950/20 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                 <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                   {loadingTier ? 'Evaluando cobertura' : supportTier === 'power' ? 'Power support activo' : supportTier === 'pro' ? 'Soporte Pro activo' : 'Soporte esencial activo'}
                 </span>
              </div>
              <h2 className="text-2xl font-black mb-2 tracking-tight" dangerouslySetInnerHTML={{ __html: t('support.how_can_we_help').replace('?', '? <br/>') }}></h2>
           </div>
        </section>

        {/* CHANNELS GRID */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('support.attention_channels')}</h3>
          
          <div className="space-y-4">
            {supportChannels.map((channel) => (
              <button 
                key={channel.id} 
                onClick={() => handleChannelClick(channel.id, channel.enabled)}
                className={`w-full p-6 rounded-[2rem] border flex items-center gap-5 transition-all text-left relative overflow-hidden group ${
                  channel.enabled
                    ? 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 shadow-soft hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gradient-to-br from-slate-50 to-slate-100/90 dark:from-slate-900 dark:to-slate-800 border-slate-200/90 dark:border-slate-700 shadow-[0_16px_35px_rgba(15,23,42,0.08)]'
                }`}
              >
                 {!channel.enabled && (
                  <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/50 to-transparent dark:from-slate-900/30 pointer-events-none" />
                 )}
                 <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${channel.color}`}>
                    {channel.icon}
                 </div>
                 
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                       <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{channel.title}</h4>
                       {channel.tag && (
                         <span className="text-[7px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-tighter">{channel.tag}</span>
                       )}
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{channel.desc}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                       <Clock className="size-3 text-slate-300" />
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('support.wait_time')}: {channel.wait}</span>
                    </div>
                    {channel.upgradeHint && (
                      <p className="text-[10px] font-semibold text-primary mt-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[13px]">workspace_premium</span>
                        {channel.upgradeHint}
                      </p>
                    )}
                  </div>

                 <div className={`shrink-0 ${channel.enabled ? '' : 'flex items-center justify-center size-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 shadow-sm'}`}>
                  {channel.enabled ? (
                    <ChevronRight className="size-5 text-slate-200 group-hover:text-primary transition-colors" />
                  ) : (
                    <ShieldCheck className="size-4 text-slate-400 dark:text-slate-500" />
                  )}
                 </div>
              </button>
            ))}
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="flex flex-col items-center gap-6 pt-8">
           <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('support.available_languages')}</span>
           </div>
        </div>

      </main>
    </div>
  );
};

export default Support;
