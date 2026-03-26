import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  HelpCircle,
  Smartphone,
  CreditCard,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HELP_FAQ_DATA } from '../../lib/helpFaqData';

const CATEGORIES = [
  { id: 'all', icon: <HelpCircle className="size-5" />, label: 'Todos', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'sims', icon: <Smartphone className="size-5" />, label: 'SIMs', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'payments', icon: <CreditCard className="size-5" />, label: 'Pagos', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'privacy', icon: <ShieldCheck className="size-5" />, label: 'Privacidad', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  { id: 'technical', icon: <Zap className="size-5" />, label: 'API / Técnico', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
];

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredFAQs = useMemo(() => {
    let items = HELP_FAQ_DATA;
    if (activeCategory !== 'all') items = items.filter((f) => f.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }
    return items;
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white pb-32">
      <header className="grid grid-cols-[40px_1fr_40px] items-center gap-3 px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-[#1e3a8a] dark:text-blue-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          aria-label="Volver a ajustes"
        >
          <span className="material-icons-round text-[20px]">arrow_back</span>
        </button>
        <h1 className="text-center text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
          Preguntas Frecuentes
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-5 pt-3 pb-10 space-y-5 max-w-lg mx-auto">
        <section className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en preguntas frecuentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-13 pl-11 pr-4 py-3.5 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm outline-none focus:border-primary transition-all font-medium text-sm"
          />
        </section>

        {!searchQuery && (
          <section className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 border ${
                  activeCategory === cat.id
                    ? `${cat.bg} ${cat.color} border-transparent shadow-sm`
                    : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <span className={`size-3.5 ${activeCategory === cat.id ? cat.color : 'text-slate-300'}`}>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </section>
        )}

        <section className="space-y-2">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-10">
              <Search className="size-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">Sin resultados para "{searchQuery}"</p>
              <p className="text-xs font-medium text-slate-300 mt-1">Prueba con otras palabras o crea un ticket de soporte.</p>
            </div>
          ) : (
            filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left gap-4"
                >
                  <span className="text-sm font-bold text-slate-800 dark:text-white leading-snug">
                    {faq.question}
                  </span>
                  {expandedId === faq.id ? (
                    <ChevronUp className="size-4 text-primary shrink-0" />
                  ) : (
                    <ChevronDown className="size-4 text-slate-300 shrink-0" />
                  )}
                </button>
                {expandedId === faq.id && (
                  <div className="px-5 pb-5">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};

export default FAQ;
