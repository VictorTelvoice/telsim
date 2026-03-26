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

interface FAQItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  { id: 1, category: 'sims', question: '¿Son estas SIMs realmente físicas?', answer: 'Sí. A diferencia de los servicios VoIP convencionales, Telsim opera con infraestructura de puertos físicos reales. Esto garantiza que plataformas como WhatsApp, bancos o Google detecten el número como un dispositivo móvil legítimo, sin bloqueos ni restricciones de uso.' },
  { id: 2, category: 'sims', question: '¿Cómo recibo mis códigos SMS?', answer: 'Una vez activado tu número, cualquier SMS enviado a ese puerto llegará instantáneamente a tu sección de "Mensajes" en el panel de Telsim. También puedes configurar notificaciones en tiempo real por Telegram para recibirlos sin abrir la app.' },
  { id: 3, category: 'sims', question: '¿Puedo renovar mi número después del mes?', answer: 'Sí. Puedes activar la renovación automática desde los ajustes de tu número para mantener el puerto indefinidamente. Si no activas la renovación, el número se libera automáticamente al vencer el periodo.' },
  { id: 4, category: 'sims', question: '¿En qué países están disponibles los números?', answer: 'Actualmente ofrecemos números de múltiples países incluyendo Estados Unidos, Reino Unido, Canadá, España, México y más. La disponibilidad de cada región se muestra en tiempo real al seleccionar tu plan.' },
  { id: 5, category: 'sims', question: '¿Puedo usar el número para llamadas de voz?', answer: 'Nuestros puertos físicos están optimizados para la recepción de SMS y códigos de verificación. Las llamadas de voz no están disponibles en los planes actuales, ya que el servicio se centra en la integridad del canal SMS.' },
  { id: 6, category: 'payments', question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, Amex), así como pagos por transferencia bancaria en algunos planes. Los pagos son procesados de forma segura por Stripe con encriptación SSL.' },
  { id: 7, category: 'payments', question: '¿Puedo cancelar mi suscripción en cualquier momento?', answer: 'Sí, puedes cancelar tu suscripción desde el panel de Facturación en cualquier momento. El acceso continúa hasta el fin del periodo pagado. No cobramos penalizaciones por cancelación anticipada.' },
  { id: 8, category: 'payments', question: '¿Ofrecen reembolsos?', answer: 'Ofrecemos reembolso completo dentro de las primeras 24 horas si el servicio no funciona correctamente y el equipo técnico no logra resolverlo. Para casos fuera de ese plazo, evaluamos cada solicitud individualmente. Crea un ticket de soporte con tu solicitud.' },
  { id: 9, category: 'payments', question: '¿Qué diferencia hay entre los planes?', answer: 'Los planes difieren en el número de puertos activos simultáneos, la velocidad de activación y el acceso a números premium de ciertos países. El plan Pro incluye acceso a API, renovación automática y notificaciones por Telegram.' },
  { id: 10, category: 'privacy', question: '¿Mis datos están seguros?', answer: 'Sí. Telsim aplica encriptación de extremo a extremo en todas las comunicaciones. No compartimos datos personales con terceros. Cumplimos con las normativas GDPR y de protección de datos locales. Puedes revisar nuestra política de privacidad completa en Ajustes → Términos y Privacidad.' },
  { id: 11, category: 'privacy', question: '¿Qué pasa si pierdo el acceso a mi cuenta?', answer: 'Contamos con protocolos de recuperación de identidad. Si tienes activada la Verificación de Identidad en Ajustes, podrás recuperar tu saldo y números vinculados. Sin verificación, el proceso es más lento y requiere validación manual por soporte.' },
  { id: 12, category: 'privacy', question: '¿Puedo activar autenticación de dos factores?', answer: 'Sí. Desde Ajustes → Seguridad puedes activar 2FA con cualquier aplicación TOTP (Google Authenticator, Authy, etc.). Es altamente recomendable para proteger el acceso a tus puertos activos.' },
  { id: 13, category: 'technical', question: '¿Tienen API para automatizar la recepción de SMS?', answer: 'Sí. El plan Pro incluye acceso completo a nuestra API REST. Puedes consultar la documentación desde el panel principal → Guía API. La API permite listar números, leer SMS y configurar webhooks para recibir mensajes en tiempo real en tu sistema.' },
  { id: 14, category: 'technical', question: '¿Qué son los webhooks y cómo los configuro?', answer: 'Los webhooks envían automáticamente cada SMS recibido a una URL de tu servidor al instante. Ve a tu número → Configuración → Webhooks. Puedes probar el webhook, ver los logs de entrega y manejar reintentos en caso de fallo.' },
  { id: 15, category: 'technical', question: '¿Por qué no llega un SMS esperado?', answer: 'Las causas más comunes son: (1) La plataforma bloqueó el número por uso previo — prueba activar otro número. (2) El SMS fue enviado pero hay retraso del operador — espera hasta 2 minutos. (3) La plataforma requiere un número de un país específico. Si el problema persiste, crea un ticket con el número afectado y la plataforma de origen.' },
  { id: 16, category: 'technical', question: '¿Cómo configuro las notificaciones por Telegram?', answer: 'Ve a tu perfil → Telegram. Sigue los pasos para conectar tu bot de Telegram personal. Una vez configurado, recibirás cada SMS directamente en tu chat de Telegram con el número, remitente y contenido completo.' },
];

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
    let items = FAQ_DATA;
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
