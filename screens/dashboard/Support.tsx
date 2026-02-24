import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ArrowLeft, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  Headphones,
  Zap,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

const Support: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const supportChannels = [
    {
      id: 'chat',
      icon: <MessageSquare className="size-6" />,
      title: t('support.live_chat'),
      desc: t('support.live_chat_desc'),
      wait: "< 2 min",
      primary: true,
      color: "bg-primary text-white",
      tag: t('support.recommended')
    },
    {
      id: 'whatsapp',
      icon: <Smartphone className="size-6" />,
      title: t('support.whatsapp'),
      desc: t('support.whatsapp_desc'),
      wait: "~ 5 min",
      primary: false,
      color: "bg-emerald-500 text-white",
    },
    {
      id: 'ticket',
      icon: <Mail className="size-6" />,
      title: t('support.send_ticket'),
      desc: t('support.send_ticket_desc'),
      wait: "1-4 hours",
      primary: false,
      color: "bg-slate-900 dark:bg-slate-800 text-white",
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display pb-32">
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
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t('support.operational_247')}</span>
              </div>
              <h2 className="text-2xl font-black mb-2 tracking-tight" dangerouslySetInnerHTML={{ __html: t('support.how_can_we_help').replace('?', '? <br/>') }}></h2>
              <p className="text-white/50 text-xs font-medium leading-relaxed max-w-[28ch]">
                 {t('support.engineers_ready')}
              </p>
           </div>
        </section>

        {/* CHANNELS GRID */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('support.attention_channels')}</h3>
          
          <div className="space-y-4">
            {supportChannels.map((channel) => (
              <button 
                key={channel.id} 
                className={`w-full bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all text-left relative overflow-hidden group`}
              >
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
                 </div>

                 <ChevronRight className="size-5 text-slate-200 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* SELF-SERVICE SECTION */}
        <div className="bg-primary/5 dark:bg-blue-950/10 rounded-[2.5rem] p-8 border border-primary/10 space-y-6">
           <div className="flex items-center gap-3">
              <Zap className="size-5 text-primary" />
              <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">{t('support.instant_answers')}</h3>
           </div>
           
           <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => navigate('/dashboard/help')}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group"
              >
                 <div className="flex items-center gap-3">
                    <HelpCircle className="size-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('support.explore_help')}</span>
                 </div>
                 <ExternalLink className="size-3 text-slate-300 group-hover:text-primary" />
              </button>
              
              <button className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group">
                 <div className="flex items-center gap-3">
                    <ShieldCheck className="size-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('support.report_bug')}</span>
                 </div>
                 <ExternalLink className="size-3 text-slate-300 group-hover:text-primary" />
              </button>
           </div>
        </div>

        {/* FOOTER INFO */}
        <div className="flex flex-col items-center gap-6 pt-8">
           <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('support.available_languages')}</span>
           </div>
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] text-center px-12">{t('support.node_id')}: TS-SUP-GLOBAL-882</p>
        </div>

      </main>
    </div>
  );
};

export default Support;