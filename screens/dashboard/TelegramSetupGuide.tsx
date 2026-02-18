import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  // Add Info import
  Info
} from 'lucide-react';

const TelegramSetupGuide: React.FC = () => {
    const navigate = useNavigate();
    const [copied, setCopied] = React.useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const steps = [
        {
            id: 'botfather',
            number: '01',
            icon: <Bot className="size-6" />,
            title: "Crea tu Bot",
            desc: "Busca a @BotFather en Telegram y envíale el comando para iniciar un nuevo bot.",
            command: "/newbot",
            actionText: "Copiar Comando",
            footer: "BotFather te entregará un TOKEN (Ej: 7123...:AAH...)"
        },
        {
            id: 'userinfo',
            number: '02',
            icon: <User className="size-6" />,
            title: "Obtén tu Chat ID",
            desc: "Busca a @userinfobot e inicia una conversación. Te responderá con tu ID numérico personal.",
            command: "ID de Usuario",
            actionText: "Ir a @userinfobot",
            isLink: true,
            url: "https://t.me/userinfobot",
            footer: "Copia el número ID que recibas (Ej: 98765432)"
        },
        {
            id: 'telsim',
            number: '03',
            icon: <Key className="size-6" />,
            title: "Vincula en TELSIM",
            desc: "Regresa a tu panel de 'Mis Números' > Engranaje y pega el Token y el Chat ID en los campos correspondientes.",
            footer: "¡No olvides activar el switch para cada número!"
        }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
            <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Configuración Telegram</h1>
                <div className="w-9"></div>
            </header>

            <main className="px-6 py-8 max-w-lg mx-auto space-y-10">
                <div className="text-center space-y-2">
                    <div className="size-16 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <Send className="size-8" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Puente de Notificaciones</h2>
                    <p className="text-sm font-medium text-slate-500 max-w-[30ch] mx-auto leading-relaxed italic">Sigue estos pasos para recibir tus SMS directamente en tu móvil.</p>
                </div>

                <div className="space-y-6">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="bg-white dark:bg-surface-dark rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-5xl font-black text-slate-50 dark:text-slate-900/50 pointer-events-none transition-transform group-hover:scale-110">
                                {step.number}
                            </div>
                            
                            <div className="relative z-10">
                                <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-5 shadow-inner">
                                    {step.icon}
                                </div>
                                
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{step.title}</h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6 pr-8">{step.desc}</p>

                                {step.command && (
                                    <div className="mb-6">
                                        {step.isLink ? (
                                            <a 
                                                href={step.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-full h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                            >
                                                {step.actionText} <ExternalLink className="size-3" />
                                            </a>
                                        ) : (
                                            <button 
                                                onClick={() => handleCopy(step.command!, step.id)}
                                                className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    copied === step.id ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-slate-800 text-white'
                                                }`}
                                            >
                                                {copied === step.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                                                {copied === step.id ? "Comando Copiado" : step.actionText}
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Info className="size-3 text-blue-400" />
                                        {step.footer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-900 dark:bg-blue-950/20 p-8 rounded-[2.5rem] text-center text-white space-y-4 border border-white/5 shadow-2xl">
                    <MessageSquare className="size-8 mx-auto text-blue-400" />
                    <h4 className="text-sm font-black uppercase tracking-widest">¿Necesitas ayuda extra?</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">Si no logras configurar tu bot, contacta a nuestro nodo de soporte 24/7.</p>
                    <button onClick={() => navigate('/dashboard/support')} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">Ir a Soporte Técnico</button>
                </div>
            </main>
        </div>
    );
};

export default TelegramSetupGuide;