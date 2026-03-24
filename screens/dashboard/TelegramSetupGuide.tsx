import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ArrowLeft, 
  Send, 
  User, 
  Key, 
  Copy, 
  Check, 
  ExternalLink,
  MessageSquare,
  Bot,
  Info,
  Zap,
  X,
  Smartphone
} from 'lucide-react';

const TelegramSetupGuide: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const steps = [
        {
            id: 'step1',
            number: '01',
            icon: <Bot className="size-6" />,
            title: t('tg_guide.step1_title'),
            botHandle: "@BotFather",
            desc: [
                t('tg_guide.step1_desc1'),
                t('tg_guide.step1_desc2'),
                t('tg_guide.step1_desc3')
            ],
            actionText: t('tg_guide.step1_action'),
            command: "/newbot"
        },
        {
            id: 'step2',
            number: '02',
            icon: <User className="size-6" />,
            title: t('tg_guide.step2_title'),
            botHandle: "@userinfobot",
            desc: [
                t('tg_guide.step2_desc1'),
                t('tg_guide.step2_desc2')
            ],
            actionText: t('tg_guide.step2_action')
        },
        {
            id: 'step3',
            number: '03',
            icon: <Key className="size-6" />,
            title: t('tg_guide.step3_title'),
            desc: [
                t('tg_guide.step3_desc1'),
                t('tg_guide.step3_desc2')
            ],
            important: t('tg_guide.step3_important')
        },
        {
            id: 'step4',
            number: '04',
            icon: <Zap className="size-6" />,
            title: t('tg_guide.step4_title'),
            desc: [
                t('tg_guide.step4_desc1'),
                t('tg_guide.step4_desc2')
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display pb-24">
            <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('tg_guide.title')}</h1>
                </div>
                <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="size-5" />
                </button>
            </header>

            <main className="px-6 py-8 max-w-lg mx-auto space-y-10">
                <div className="text-center space-y-3">
                    <div className="size-16 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-sm">
                        <Send className="size-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t('tg_guide.header')}</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[30ch] mx-auto leading-relaxed italic">
                        {t('tg_guide.subheader')}
                    </p>
                </div>

                <div className="space-y-6">
                    {steps.map((step) => (
                        <div key={step.id} className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-soft relative overflow-hidden group transition-all hover:border-blue-500/20">
                            <div className="absolute top-0 right-0 p-8 text-5xl font-black text-slate-50 dark:text-slate-900/50 pointer-events-none transition-transform group-hover:scale-110">
                                {step.number}
                            </div>
                            
                            <div className="relative z-10">
                                <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-5 shadow-inner">
                                    {step.icon}
                                </div>
                                
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">{step.title}</h3>
                                
                                {step.botHandle && (
                                    <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[11px] font-black text-primary dark:text-blue-400">{step.botHandle}</span>
                                        <button 
                                            onClick={() => handleCopy(step.botHandle!, `${step.id}-bot`)}
                                            className="ml-auto p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-primary"
                                        >
                                            {copiedId === `${step.id}-bot` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                                        </button>
                                    </div>
                                )}

                                <ul className="space-y-3 mb-6">
                                    {step.desc.map((line, lIdx) => (
                                        <li key={lIdx} className="flex gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed pr-8">
                                            <div className="size-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5 opacity-40"></div>
                                            {line}
                                        </li>
                                    ))}
                                </ul>

                                {step.command && (
                                    <div className="mb-6">
                                        <button 
                                            onClick={() => handleCopy(step.command!, `${step.id}-cmd`)}
                                            className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                copiedId === `${step.id}-cmd` ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-slate-800 text-white'
                                            }`}
                                        >
                                            {copiedId === `${step.id}-cmd` ? <Check className="size-3" /> : <Copy className="size-3" />}
                                            {copiedId === `${step.id}-cmd` ? t('tg_guide.command_copied') : `${t('tg_guide.copy_command')} ${step.command}`}
                                        </button>
                                    </div>
                                )}

                                {step.actionText && (
                                    <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 mb-2">
                                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                            <Info className="size-3" />
                                            {t('tg_guide.action')}: {step.actionText}
                                        </p>
                                    </div>
                                )}

                                {step.important && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/40">
                                        <p className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest leading-relaxed">
                                            {step.important}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-4 pb-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-full h-16 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-sm hover:border-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <X className="size-4" />
                        {t('tg_guide.close_guide')}
                    </button>
                </div>

                <div className="bg-slate-900 dark:bg-blue-950/20 p-8 rounded-[2.5rem] text-center text-white space-y-4 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
                    <MessageSquare className="size-8 mx-auto text-blue-400" />
                    <h4 className="text-sm font-black uppercase tracking-widest relative z-10">{t('tg_guide.extra_help')}</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed relative z-10">{t('tg_guide.extra_help_desc')}</p>
                    <button onClick={() => navigate('/dashboard/support')} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline relative z-10">{t('tg_guide.go_to_support')}</button>
                </div>

                <div className="text-center opacity-30 pb-12">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">TELSIM AUTOMATION DOCS v1.5</p>
                </div>
            </main>
        </div>
    );
};

export default TelegramSetupGuide;