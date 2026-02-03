
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, Bot, Cpu, Terminal, ZapOff, ArrowRight, CheckCircle2, Globe } from 'lucide-react';

const BypassAntibots: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Cpu className="size-6" />,
      title: "1. Puerto Físico Dedicado",
      desc: "A diferencia de los números virtuales (VoIP), nuestras SIMs tienen un ID de hardware real que los sistemas antibots no pueden bloquear."
    },
    {
      icon: <Terminal className="size-6" />,
      title: "2. Integración vía API",
      desc: "Conecta tus scripts o bots a nuestro endpoint. Recibe el contenido del SMS en JSON en menos de 500ms."
    },
    {
      icon: <Zap className="size-6" />,
      title: "3. Ejecución Instantánea",
      desc: "Supera procesos de 3D Secure y verificaciones de identidad en tiempo récord sin intervención humana."
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-32">
      {/* Header Estilo Tech/Cyber */}
      <div className="relative h-72 overflow-hidden bg-[#0F0A1E]">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent z-10"></div>
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute top-40 left-10 w-48 h-48 bg-fuchsia-600 rounded-full blur-[80px]"></div>
        </div>
        
        <header className="relative z-20 flex items-center justify-between px-6 py-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-white/5 backdrop-blur-md text-white border border-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">Protocolo Pro Automation</span>
          <div className="w-9"></div>
        </header>

        <div className="relative z-20 px-8 pt-6 flex flex-col items-center text-center">
          <div className="size-20 bg-gradient-to-b from-violet-500 to-fuchsia-600 rounded-3xl border border-white/20 flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)] transform rotate-3">
            <Bot className="size-10" />
          </div>
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
            Bypass <span className="text-violet-400">Antibots</span>
          </h1>
        </div>
      </div>

      <main className="px-6 -mt-8 relative z-30 space-y-8">
        {/* Tech Comparison Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex gap-4 items-center mb-6">
            <div className="flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 opacity-50">
                <ZapOff className="size-5 text-slate-400" />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">VoIP (Virtual)</span>
                <span className="text-[10px] font-bold text-red-500">Bloqueado</span>
            </div>
            <div className="size-8 flex items-center justify-center text-slate-300">
                <span className="material-icons-round">bolt</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 shadow-sm ring-2 ring-violet-500/20">
                <Globe className="size-5 text-violet-500" />
                <span className="text-[9px] font-black uppercase text-violet-600 dark:text-violet-400 tracking-widest">TELSIM SIM</span>
                <span className="text-[10px] font-bold text-emerald-500">Aceptado</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed text-center px-4">
            Nuestra red utiliza infraestructura móvil real. Los sistemas antibots nos detectan como un usuario legítimo con un smartphone en mano.
          </p>
        </div>

        {/* Integration Steps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Flujo de Implementación</h3>
          {steps.map((step, idx) => (
            <div key={idx} className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft flex items-start gap-5 group transition-all">
              <div className="size-12 rounded-2xl bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-100 dark:border-violet-900/30 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-500">
                {step.icon}
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">{step.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pro Platforms Section */}
        <div className="bg-slate-900 dark:bg-violet-950/20 rounded-[2.5rem] p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-6">
             <div className="size-2 bg-violet-500 rounded-full animate-pulse"></div>
             <h3 className="text-sm font-black text-white uppercase tracking-widest">Plataformas de Éxito</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Ticketmaster", "Nike SNKRS", "Mercado Libre", 
              "Google Cloud", "AWS Verified", "Revolut",
              "Bancos (Visa/MC)", "Discord Pro"
            ].map((text, i) => (
              <div key={i} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
                <CheckCircle2 className="size-3 text-violet-500" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/90 dark:via-background-dark/90 to-transparent z-40">
        <button 
          onClick={() => navigate('/onboarding/region')}
          className="group w-full max-w-md mx-auto h-16 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(139,92,246,0.3)] flex items-center justify-between px-2 transition-all active:scale-[0.98]"
        >
          <div className="w-12"></div>
          <span className="text-[15px] uppercase tracking-widest">Activar Bypass Pro</span>
          <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors">
            <ArrowRight className="size-6" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default BypassAntibots;
