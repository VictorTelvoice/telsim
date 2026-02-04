
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  Mail, 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Zap,
  HelpCircle
} from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 1,
    question: "¿Son estas SIMs realmente físicas?",
    answer: "Sí, a diferencia de los servicios VoIP convencionales, TELSIM opera con infraestructura de puertos físicos reales. Esto garantiza que las plataformas (como WhatsApp, Bancos o Google) detecten el número como un dispositivo móvil legítimo."
  },
  {
    id: 2,
    question: "¿Cómo recibo mis códigos SMS?",
    answer: "Una vez activado tu número, cualquier SMS enviado a ese puerto llegará instantáneamente a tu sección de 'Mensajes' en el panel de control de TELSIM."
  },
  {
    id: 3,
    question: "¿Puedo renovar mi número después del mes?",
    answer: "Por supuesto. Puedes activar la renovación automática en los ajustes de tu número para asegurar que conservas el puerto indefinidamente."
  },
  {
    id: 4,
    question: "¿Qué pasa si pierdo el acceso a mi cuenta?",
    answer: "Contamos con protocolos de recuperación de identidad. Si tienes activada la Verificación de Identidad en tus ajustes, podrás recuperar tu saldo y números vinculados."
  }
];

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFAQ = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const categories = [
    { icon: <Smartphone className="size-5" />, label: "SIMs y Números", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { icon: <CreditCard className="size-5" />, label: "Pagos y Planes", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { icon: <ShieldCheck className="size-5" />, label: "Privacidad", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { icon: <Zap className="size-5" />, label: "Técnico / API", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white pb-32">
      <header className="sticky top-0 z-30 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/dashboard/profile')}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-black tracking-tight">Centro de Ayuda</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="¿Cómo podemos ayudarte?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm outline-none focus:border-primary transition-all font-bold text-sm"
          />
        </div>
      </header>

      <main className="px-6 py-8 space-y-10 max-w-lg mx-auto">
        
        {/* Grid de Categorías */}
        <section className="grid grid-cols-2 gap-4">
          {categories.map((cat, i) => (
            <button 
              key={i}
              className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl shadow-soft hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className={`size-12 rounded-2xl flex items-center justify-center ${cat.bg} ${cat.color}`}>
                {cat.icon}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {cat.label}
              </span>
            </button>
          ))}
        </section>

        {/* FAQs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="size-4 text-primary" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Preguntas Frecuentes</h3>
          </div>
          <div className="space-y-3">
            {FAQ_DATA.map((faq) => (
              <div 
                key={faq.id}
                className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm"
              >
                <button 
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-bold text-slate-800 dark:text-white pr-4">
                    {faq.question}
                  </span>
                  {expandedId === faq.id ? (
                    <ChevronUp className="size-4 text-primary shrink-0" />
                  ) : (
                    <ChevronDown className="size-4 text-slate-300 shrink-0" />
                  )}
                </button>
                {expandedId === faq.id && (
                  <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Canales de Contacto */}
        <section className="space-y-4 pt-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 text-center">¿No encontraste lo que buscabas?</h3>
          <div className="grid grid-cols-1 gap-3">
            <button className="flex items-center gap-4 p-5 bg-primary rounded-3xl text-white shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all group">
              <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <MessageCircle className="size-6" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-black uppercase tracking-widest">Chat en Vivo</p>
                <p className="text-[10px] font-bold text-white/70">Tiempo de respuesta: ~5 min</p>
              </div>
              <ChevronDown className="-rotate-90 size-5 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl text-slate-900 dark:text-white shadow-soft active:scale-[0.98] transition-all group">
              <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-primary">
                <Mail className="size-6" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-black uppercase tracking-widest">Soporte vía Email</p>
                <p className="text-[10px] font-bold text-slate-400">Atención las 24 horas</p>
              </div>
              <ChevronDown className="-rotate-90 size-5 opacity-30 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        <footer className="text-center pt-8 pb-4 opacity-30">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM Knowledge Base v1.2</p>
        </footer>
      </main>
    </div>
  );
};

export default HelpCenter;
