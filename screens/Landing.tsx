import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getPostAuthRoute, isMobileDevice } from '../lib/routing';
import { STRIPE_PRICES } from '../constants/stripePrices';

import { useLanguage } from '../contexts/LanguageContext';
import TelsimBrandLogo from '../components/TelsimBrandLogo';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const casosUsoRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const preciosRef = useRef<HTMLDivElement>(null);
  const pricingSectionRef = useRef<HTMLDivElement>(null);
  const pricingAnimatedRef = useRef(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [isTelsim, setIsTelsim] = useState(false);
  const [casosPage, setCasosPage] = useState(0);
  const [planesPage, setPlanesPage] = useState(0);
  const [testimoniosPage, setTestimoniosPage] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    company: '',
    email: '',
    message: '',
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactFeedback, setContactFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // En desktop/tablet, centrar en PRO inmediatamente sin animación
    if (!isMobileDevice() && preciosRef.current) {
      const cardWidth = preciosRef.current.scrollWidth / 3;
      preciosRef.current.scrollTo({ left: cardWidth, behavior: 'auto' });
    }

    // En móvil: IntersectionObserver — anima de Starter → PRO al entrar en viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !pricingAnimatedRef.current && isMobileDevice()) {
            pricingAnimatedRef.current = true;
            const el = preciosRef.current;
            if (!el) return;
            // Paso 1: posicionar en Starter (sin animación)
            el.scrollTo({ left: 0, behavior: 'auto' });
            // Paso 2: después de 500ms deslizar al PRO suavemente
            setTimeout(() => {
              const cardWidth = el.scrollWidth / 3;
              el.scrollTo({ left: cardWidth, behavior: 'smooth' });
            }, 500);
          }
        });
      },
      { threshold: 0.25 }
    );
    if (pricingSectionRef.current) observer.observe(pricingSectionRef.current);

    const autoScroll = (ref: React.RefObject<HTMLDivElement | null>) => {
      const el = ref.current;
      if (!el) return;
      const interval = setInterval(() => {
        const maxScroll = el.scrollWidth - el.clientWidth;
        const cardStep = el.scrollWidth / 10;
        if (maxScroll <= 0) return;
        if (el.scrollLeft >= maxScroll - 2) el.scrollLeft = 0;
        else el.scrollLeft = Math.min(el.scrollLeft + cardStep, maxScroll);
      }, 4000);
      return () => clearInterval(interval);
    };

    const cleanupTestimonials = autoScroll(testimonialsRef);

    const casosEl = casosUsoRef.current;
    const planesEl = preciosRef.current;
    const testimEl = testimonialsRef.current;

    const handleCasos = () => {
      if (!casosEl) return;
      setCasosPage(Math.round(casosEl.scrollLeft / (casosEl.scrollWidth / casosUso.length)));
    };
    const handlePlanes = () => {
      if (!planesEl) return;
      setPlanesPage(Math.round(planesEl.scrollLeft / (planesEl.scrollWidth / 3)));
    };
    const handleTestimonios = () => {
      if (!testimEl) return;
      const total = 10;
      const page = Math.min(total - 1, Math.round(testimEl.scrollLeft / (testimEl.scrollWidth / total)));
      setTestimoniosPage(page);
    };

    casosEl?.addEventListener('scroll', handleCasos, { passive: true });
    planesEl?.addEventListener('scroll', handlePlanes, { passive: true });
    testimEl?.addEventListener('scroll', handleTestimonios, { passive: true });

    const hintScroll = (el: HTMLDivElement | null, delay = 900) => {
      if (!el) return;
      setTimeout(() => {
        el.scrollTo({ left: 52, behavior: 'smooth' });
        setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 520);
      }, delay);
    };
    hintScroll(casosEl, 1100);
    hintScroll(testimEl, 1500);

    return () => {
      observer.disconnect();
      cleanupTestimonials?.();
      casosEl?.removeEventListener('scroll', handleCasos);
      planesEl?.removeEventListener('scroll', handlePlanes);
      testimEl?.removeEventListener('scroll', handleTestimonios);
    };
  }, []);
  const { user, loading } = useAuth();

  const handlePlanSelect = (planId: string) => {
    const plans: Record<string, { monthly: string; annual: string; monthlyPrice: number; annualPrice: number; limit: number }> = {
      starter: {
        monthly: STRIPE_PRICES.STARTER.MONTHLY,
        annual: STRIPE_PRICES.STARTER.ANNUAL,
        monthlyPrice: 19.90,
        annualPrice: 199.00,
        limit: 150,
      },
      pro: {
        monthly: STRIPE_PRICES.PRO.MONTHLY,
        annual: STRIPE_PRICES.PRO.ANNUAL,
        monthlyPrice: 39.90,
        annualPrice: 399.00,
        limit: 400,
      },
      power: {
        monthly: STRIPE_PRICES.POWER.MONTHLY,
        annual: STRIPE_PRICES.POWER.ANNUAL,
        monthlyPrice: 99.00,
        annualPrice: 990.00,
        limit: 1400,
      },
    };
    const selected = plans[planId];
    // Guardar con el mismo formato que usa PlanSelect/RegionSelect
    localStorage.setItem('selected_plan', planId);
    localStorage.setItem('selected_plan_price', String(isAnnual ? selected.annualPrice : selected.monthlyPrice));
    localStorage.setItem('selected_plan_annual', String(isAnnual));
    localStorage.setItem('selected_plan_price_id', isAnnual ? selected.annual : selected.monthly);

    const billing = isAnnual ? 'annual' : 'monthly';
    const nextPath = `/onboarding/region?plan=${planId}&billing=${billing}`;
    localStorage.setItem('post_login_redirect', nextPath);
    localStorage.setItem('selected_billing', billing);
    navigate(nextPath);
  };

  const handleContactFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContactFeedback(null);
    setContactSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          language,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof result?.error === 'string'
            ? result.error
            : language === 'en'
              ? 'We could not send your message.'
              : 'No pudimos enviar tu mensaje.'
        );
      }
      setContactFeedback({
        type: 'success',
        message:
          typeof result?.message === 'string'
            ? result.message
            : language === 'en'
              ? 'Your message has been sent.'
              : 'Tu mensaje fue enviado.',
      });
      setContactForm({
        name: '',
        company: '',
        email: '',
        message: '',
      });
    } catch (error: any) {
      setContactFeedback({
        type: 'error',
        message:
          error?.message ||
          (language === 'en'
            ? 'We could not send your message right now.'
            : 'No pudimos enviar tu mensaje en este momento.'),
      });
    } finally {
      setContactSubmitting(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate(getPostAuthRoute());
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const animateSMS = () => {
      const sms1 = document.querySelector('.sms-item-1') as HTMLElement;
      const sms2 = document.querySelector('.sms-item-2') as HTMLElement;
      const sms3 = document.querySelector('.sms-item-3') as HTMLElement;
      const typing = document.querySelector('.typing-indicator') as HTMLElement;
      if (!sms1) return;

      const showItem = (el: HTMLElement, delay: number, cb?: () => void) => {
        setTimeout(() => {
          el.style.animation = 'slideInSMS 0.4s ease forwards';
          el.style.opacity = '1';
          if (cb) setTimeout(cb, 500);
        }, delay);
      };

      showItem(sms2, 600);
      showItem(sms1, 1400, () => {
        setTimeout(() => {
          typing.style.transition = 'opacity 0.3s';
          typing.style.opacity = '1';
          setTimeout(() => {
            typing.style.opacity = '0';
            showItem(sms3, 300);
          }, 1800);
        }, 400);
      });
    };

    const intervalId = setInterval(() => {
      ['sms-item-1', 'sms-item-2', 'sms-item-3'].forEach(c => {
        const el = document.querySelector('.' + c) as HTMLElement;
        if (el) { el.style.opacity = '0'; el.style.animation = 'none'; }
      });
      const t = document.querySelector('.typing-indicator') as HTMLElement;
      if (t) t.style.opacity = '0';
      setTimeout(animateSMS, 400);
    }, 10000);

    setTimeout(animateSMS, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const casosUso = [
    {
      iconBg: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
      icon: <span className="material-symbols-rounded text-blue-600 text-[28px]">verified_user</span>,
      title: "Uso Individual & Validaciones",
      bullets: [
        "Chips físicos reales para WhatsApp y Telegram.",
        "Evita bloqueos de números virtuales (VoIP).",
        "Privacidad total. Sin depender de tu móvil personal.",
        "Protección de cuentas bancarias y cripto.",
        "Recibe SMS de servicios internacionales (Amazon, Meta)."
      ]
    },
    {
      iconBg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
      icon: <span className="material-symbols-rounded text-emerald-600 text-[28px]">smart_toy</span>,
      title: "IA & Automatización",
      bullets: [
        "Integración nativa con Make, n8n y Zapier.",
        "Agentes de IA autónomos con capacidad OTP.",
        "Webhooks instantáneos para tus propios flujos.",
        "Sincronización multi-número para agentes de ventas.",
        "Chatbot de telegram para recibir tus SMS + OTP"
      ]
    },
    {
      iconBg: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
      icon: <span className="material-symbols-rounded text-amber-600 text-[28px]">account_balance</span>,
      title: "Empresas, Fintech & Growth",
      bullets: [
        "Acceso compartido para equipos sin hardware físico.",
        "Gestiona múltiples cuentas de Sellers (Amazon/ML).",
        "Dashboard para descarga masiva de SMS históricos.",
        "Valida retiros en exchanges (Binance, etc) 24/7.",
        "Validación de leads calificados mediante WhatsApp."
      ]
    }
  ];

  const testimonials = [
    { name: 'Valentina Reyes', initials: 'VR', color: '#dbeafe', textColor: '#1d4ed8', stars: 5, title: 'La herramienta perfecta para mi bot', body: 'Increíble ahorro de tiempo. Accedo a todos los servicios que requieren verificación OTP sin intervención manual. Totalmente automatizado.' },
    { name: 'William Davis', initials: 'WD', color: '#dcfce7', textColor: '#16a34a', stars: 5, title: 'Muy genial', body: 'Es una aplicación increíble para automatizar verificaciones. Este servicio me ahorra horas al día procesando OTPs para mis flujos de trabajo.' },
    { name: 'Isabella P.', initials: 'IP', color: '#fef3c7', textColor: '#d97706', stars: 5, title: '¡Increíblemente bueno!', body: 'Es increíble lo inteligente que es. Los resultados que recibo son consistentemente excelentes para mis procesos de autenticación empresarial.' },
    { name: 'Carlos Mendoza', initials: 'CM', color: '#ede9fe', textColor: '#7c3aed', stars: 5, title: 'API sencilla y confiable', body: 'Integré el webhook en menos de una hora. Mi bot de Telegram ahora recibe los códigos al instante. Sin caídas en 3 meses de uso continuo.' },
    { name: 'Andrea López', initials: 'AL', color: '#fce7f3', textColor: '#db2777', stars: 5, title: 'Soporte excepcional', body: 'Tuve una duda técnica a las 2am y el equipo respondió en 20 minutos. El servicio es de primera y el número funciona perfecto con todas las apps.' },
    { name: 'Rodrigo Gómez', initials: 'RG', color: '#ecfdf5', textColor: '#059669', stars: 5, title: 'Automatización real', body: 'Probé soluciones VoIP antes y siempre me bloqueaban. Con Telsim tengo una SIM real que ningún servicio detecta como bot. Vale cada peso.' },
    { name: 'Andrés M.', initials: 'AM', color: '#dcfce7', textColor: '#16a34a', stars: 5, title: 'Escalabilidad pura', body: 'Increíble para mis bots de Amazon. Corren 24/7 sin bloqueos.' },
    { name: 'Juan P.', initials: 'JP', color: '#fef3c7', textColor: '#d97706', stars: 5, title: 'Soporte de primera', body: 'Me ayudaron a integrar el webhook en 5 minutos. Soporte real.' },
    { name: 'Kevin B.', initials: 'KB', color: '#dbeafe', textColor: '#1d4ed8', stars: 5, title: 'Game changer', body: 'Finally, an API that works with real physical SIMs. Perfect for my agency.' },
    { name: 'Sarah T.', initials: 'ST', color: '#ede9fe', textColor: '#7c3aed', stars: 5, title: 'Flawless API', body: 'Automated my entire 2FA workflow in Node.js easily. Flawless execution.' },
  ];

  const starterCardColors = { phoneColor: 'text-slate-900', labelColor: 'text-slate-600' };

  const ScrollDots = ({
    total,
    current,
    scrollRef,
    alwaysShow,
  }: {
    total: number;
    current: number;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    alwaysShow?: boolean;
  }) => (
    <div className={`flex items-center justify-center gap-1.5 mt-3 ${alwaysShow ? '' : 'md:hidden'}`}>
      {Array.from({ length: total }).map((_, i) => {
        const diff = Math.abs(i - current);
        return (
          <div
            key={i}
            onClick={() => {
              const el = scrollRef.current;
              if (!el || !el.children[i]) return;
              (el.children[i] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
            style={{
              height: '10px',
              width: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'transparent'
            }}
          >
            <div
              style={{
                height: '6px',
                borderRadius: '3px',
                transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                width: diff === 0 ? '20px' : diff === 1 ? '8px' : '6px',
                background: diff === 0 ? '#1d4ed8' : diff === 1 ? '#cbd5e1' : '#e2e8f0',
              }}
            />
          </div>
        );
      })}
    </div>
  );

  if (loading) return null;

  return (
    <div className="text-slate-800 antialiased bg-[#F8FAFC] min-h-screen">
      <style>{`
        .material-symbols-rounded { font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }

        /* Tech grid background */
        .tech-bg {
          background-color: #F8FAFC;
          background-image:
            linear-gradient(rgba(29,78,216,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(29,78,216,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        /* Glowing SIM card */
        .sim-glow {
          box-shadow: 0 0 0 1px rgba(29,78,216,0.2), 0 0 24px rgba(29,78,216,0.15), 0 8px 32px rgba(29,78,216,0.1);
        }

        /* Animated pulse ring */
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .ping-slow { animation: ping-slow 2.5s cubic-bezier(0,0,0.2,1) infinite; }
        .ping-slow-delay { animation: ping-slow 2.5s cubic-bezier(0,0,0.2,1) infinite 1.2s; }

        /* Fade in up */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeInUp 0.6s ease forwards; }
        .fade-in-2 { animation: fadeInUp 0.6s ease 0.15s forwards; opacity: 0; }
        .fade-in-3 { animation: fadeInUp 0.6s ease 0.3s forwards; opacity: 0; }
        .fade-in-4 { animation: fadeInUp 0.6s ease 0.45s forwards; opacity: 0; }

        /* SMS bubble float */
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .float-a { animation: floatA 3.5s ease-in-out infinite; }
        .float-b { animation: floatB 4s ease-in-out infinite 0.8s; }
        .float-c { animation: floatA 3s ease-in-out infinite 1.5s; }

        /* Circuit line */
        .circuit-line {
          position: relative;
        }
        .circuit-line::before {
          content: '';
          position: absolute;
          left: 50%;
          top: -12px;
          width: 1px;
          height: 12px;
          background: linear-gradient(to bottom, transparent, rgba(29,78,216,0.3));
        }

        /* Step connector */
        .step-connector {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(29,78,216,0.3), rgba(29,78,216,0.1), rgba(29,78,216,0.3));
          margin-top: -28px;
          position: relative;
        }

        /* Code block */
        .code-block {
          background: #0f172a;
          border-radius: 12px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12.5px;
          line-height: 1.7;
        }
        .code-keyword { color: #7dd3fc; }
        .code-string { color: #86efac; }
        .code-key { color: #c4b5fd; }
        .code-value { color: #fde68a; }
        .code-comment { color: #64748b; }

        /* Stat card */
        .stat-card {
          background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
        }

        /* Card hover */
        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 28px -4px rgba(0,0,0,0.12); }

        /* Pricing highlight */
        .pro-card {
          background: linear-gradient(160deg, #eff6ff 0%, #ffffff 60%);
          border: 2px solid #1d4ed8;
          box-shadow: 0 8px 32px -4px rgba(29,78,216,0.2);
        }
        .power-card {
          border: 2px solid transparent;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, #F5A623, #F0C040) border-box;
        }

        /* Signal waves animation */
        @keyframes signalPulse {
          0%, 100% { opacity: 0.3; transform: scaleX(0.6); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        .signal-wave-1 { animation: signalPulse 1.5s ease-in-out infinite; }
        .signal-wave-2 { animation: signalPulse 1.5s ease-in-out infinite 0.3s; }
        .signal-wave-3 { animation: signalPulse 1.5s ease-in-out infinite 0.6s; }

        /* Dot typing animation */
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .dot-1 { animation: dotBounce 1.2s ease-in-out infinite; }
        .dot-2 { animation: dotBounce 1.2s ease-in-out infinite 0.2s; }
        .dot-3 { animation: dotBounce 1.2s ease-in-out infinite 0.4s; }

        /* SMS slide in */
        @keyframes slideInSMS {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .signal-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(84, 163, 245, 0); border-color: rgba(255,255,255,0.2); }
          50% { box-shadow: 0 0 15px 2px rgba(84, 163, 245, 0.4); border-color: rgba(84, 163, 245, 0.5); }
        }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

        .use-case-card {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .use-case-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          border-color: rgba(29, 78, 216, 0.3);
          background-color: white;
        }

        @keyframes peekHint {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(-28px); }
          100% { transform: translateX(0); }
        }

        @keyframes whatsapp-pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        .whatsapp-float-btn {
          animation: whatsapp-pulse 2s infinite;
          transition: all 0.3s ease;
        }
        .whatsapp-float-btn:hover {
          transform: scale(1.1) translateY(-5px);
        }
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto h-16 px-3 sm:px-6 flex items-center justify-between">
          <TelsimBrandLogo
            className="shrink-0"
            iconClassName="h-11 w-11 rounded-[0.95rem]"
            textClassName="text-[1.75rem]"
          />
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
            <button
              onClick={() => document.getElementById('usos')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              Usos
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('como-funciona');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-primary transition-colors"
            >
              {t('landing.nav.how_it_works')}
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('precios');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-primary transition-colors"
            >
              Planes
            </button>
            <button
              onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              Contacto
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-[11px] font-black text-slate-500 border border-slate-100"
              title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            >
              <span className="material-symbols-rounded text-[18px]">translate</span>
              <span className="uppercase">{language === 'es' ? 'EN' : 'ES'}</span>
            </button>

            <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">{t('landing.nav.login')}</button>
            <button onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })} className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-button hover:bg-primary-dark transition-colors">
              <span className="hidden sm:inline">{t('landing.nav.start')}</span>
              <span className="sm:hidden">{t('landing.nav.start_mobile')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO CENTRADO */}
      <section className="tech-bg pt-10 md:pt-16 pb-16 md:pb-28">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center fade-in">
          {/* Badge superior */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-bold mb-8">
            <span className="material-symbols-rounded text-emerald-500 text-[15px]">smart_toy</span>
            IA & Automatización
          </div>

          {/* Título Principal */}
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6 lg:px-12">
            {t('landing.hero.title')}
          </h1>

          {/* Subtítulo / Descripción */}
          <p className="text-slate-500 text-lg md:text-xl leading-relaxed font-medium max-w-[75ch] mb-10">
            {t('landing.hero.subtitle')} <br className="hidden md:block" /> {t('landing.hero.desc')}
          </p>

          {/* Botones de Acción */}
          <div className="flex flex-col items-center gap-4 w-full justify-center mb-12">
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary hover:bg-primary-dark text-white font-bold py-4 px-10 rounded-2xl shadow-button flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98]"
              >
                {t('common.try_free')}
                <span className="material-symbols-rounded text-[20px]">arrow_forward</span>
              </button>
              <button
                onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white border border-slate-200 text-slate-700 font-bold py-4 px-10 rounded-2xl flex items-center justify-center gap-2 text-base hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <span className="material-symbols-rounded text-[20px]">calendar_today</span>
                Agenda una demo
              </button>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
              <span className="w-1 h-1 rounded-full bg-slate-200" />
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-rounded text-primary text-[16px]">bolt</span>
                {t('common.instant')}
              </span>
            </div>
          </div>

          {/* Trust badges centrados */}
          <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-emerald-500 text-[16px]">check_circle</span>Números reales</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-emerald-500 text-[16px]">check_circle</span>API/Webhooks</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-emerald-500 text-[16px]">check_circle</span>Sin contratos</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-emerald-500 text-[16px]">check_circle</span>Onboarding rápido</span>
            <span className="flex items-center gap-1.5"><span className="material-symbols-rounded text-emerald-500 text-[16px]">check_circle</span>Sin intervención humana</span>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS — carrusel con autoscroll 4s, 4 visibles en desktop, Dots debajo */}
      <section className="bg-white pt-8 md:pt-14 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative">
            <div
              ref={testimonialsRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pt-2 pb-4 no-scrollbar -mx-6 px-6 md:mx-0 md:px-0"
              style={{ scrollbarWidth: 'none' }}
            >
              {testimonials.map((tCard, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[300px] md:min-w-[280px] md:max-w-[300px] snap-start bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: tCard.stars }).map((_, s) => (
                      <span key={s} className="text-amber-400 text-sm">★</span>
                    ))}
                  </div>
                  <p className="font-black text-slate-900 text-[15px] leading-tight tracking-tight">{tCard.title}</p>
                  <p className="text-slate-500 text-[13px] font-medium leading-relaxed flex-1">{tCard.body}</p>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: tCard.color, color: tCard.textColor }}
                    >
                      {tCard.initials}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{tCard.name}</p>
                      <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">✓ Cliente verificado</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScrollDots total={10} current={testimoniosPage} scrollRef={testimonialsRef} alwaysShow />
          </div>
        </div>
      </section>

      {/* TABLA COMPARATIVA — La automatización se rompe... */}
      <section className="py-16 md:py-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1B3A6B 60%, #1d4ed8 100%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
              La automatización se rompe cuando llega un OTP
            </h2>
            <p className="text-slate-300 text-lg font-medium max-w-2xl mx-auto">
              En un mundo globalizado, tu código no debería depender de tu celular físico.
            </p>
          </motion.div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
            {/* Desktop: tabla con filas animadas (stagger + slide) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Situación</th>
                    <th className="py-4 px-6 text-xs font-bold text-red-400 uppercase tracking-widest">Método Manual</th>
                    <th className="py-4 px-6 text-xs font-bold text-emerald-400 uppercase tracking-widest">Con Telsim</th>
                  </tr>
                </thead>
                <motion.tbody
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
                >
                  {[
                    { label: 'Flujo de Trabajo', manual: 'El bot se detiene. Espera al humano.', telsim: 'El bot detecta el SMS y sigue operando automáticamente.' },
                    { label: 'Disponibilidad', manual: 'Solo si estás atento al celular.', telsim: '24/7 real. Sin pausas, sin depender de humanos.' },
                    { label: 'Escalabilidad', manual: 'Limitado por tus propias manos.', telsim: 'Ilimitado. Escala 100 procesos en paralelo.' },
                  ].map((row, i) => (
                    <motion.tr
                      key={i}
                      className="border-b border-white/10 last:border-b-0"
                      variants={{ hidden: { opacity: 0, x: -24 }, visible: { opacity: 1, x: 0 } }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      <td className="py-4 px-6 font-semibold text-slate-200">{row.label}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-rounded text-red-400 flex-shrink-0 mt-0.5" style={{ fontSize: 20 }}>close</span>
                          <span className="text-slate-300 text-sm">{row.manual}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-rounded text-emerald-400 flex-shrink-0 mt-0.5" style={{ fontSize: 20 }}>check_circle</span>
                          <span className="text-slate-100 text-sm font-medium">{row.telsim}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>

            {/* Mobile: Interactive Before/After Toggle */}
            <div className="md:hidden flex flex-col items-center gap-8 py-6">
              {/* Premium Segmented Control */}
              <div className="bg-white/5 p-1 rounded-2xl flex items-center gap-1 border border-white/10 shadow-lg">
                <button
                  onClick={() => setIsTelsim(false)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    !isTelsim ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  SIN TELSIM
                </button>
                <button
                  onClick={() => setIsTelsim(true)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                    isTelsim ? 'bg-primary text-white shadow-[0_0_15px_rgba(29,78,216,0.4)]' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  CON TELSIM
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
                </button>
              </div>

              {/* Dynamic Comparison Cards */}
              <motion.div
                layout
                className="w-full space-y-4 px-4"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {[
                  {
                    label: 'Flujo de Trabajo',
                    icon: isTelsim ? 'sync_alt' : 'block',
                    text: isTelsim ? 'El bot detecta el SMS y sigue operando automáticamente.' : 'El bot se detiene. Espera al humano.',
                    color: isTelsim ? 'text-emerald-400' : 'text-red-400',
                  },
                  {
                    label: 'Disponibilidad',
                    icon: isTelsim ? 'schedule' : 'history',
                    text: isTelsim ? '24/7 real. Sin pausas, sin depender de humanos.' : 'Solo si estás atento al celular.',
                    color: isTelsim ? 'text-emerald-400' : 'text-red-400',
                  },
                  {
                    label: 'Escalabilidad',
                    icon: isTelsim ? 'trending_up' : 'back_hand',
                    text: isTelsim ? 'Ilimitado. Escala 100 procesos en paralelo.' : 'Limitado por tus propias manos.',
                    color: isTelsim ? 'text-emerald-400' : 'text-red-400',
                  },
                ].map((row, i) => (
                  <motion.div
                    key={i + (isTelsim ? '_on' : '_off')}
                    initial={{ opacity: 0, x: isTelsim ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-5 rounded-2xl border backdrop-blur-sm transition-all duration-500 flex items-start gap-4 ${
                      isTelsim 
                        ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_-10px_rgba(16,185,129,0.3)]' 
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${isTelsim ? 'bg-emerald-500/10' : 'bg-white/5'} transition-colors duration-500`}>
                      <span className={`material-symbols-rounded ${row.color}`} style={{ fontSize: 24 }}>{row.icon}</span>
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 transition-colors duration-500 ${isTelsim ? 'text-emerald-500/80' : 'text-slate-400'}`}>
                        {row.label}
                      </p>
                      <p className={`text-sm font-medium leading-relaxed transition-colors duration-500 ${isTelsim ? 'text-white' : 'text-slate-300 italic'}`}>
                        {row.text}
                      </p>
                    </div>
                    {isTelsim && (
                      <div className="pt-2">
                        <span className="material-symbols-rounded text-emerald-400" style={{ fontSize: 18 }}>check_circle</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CASOS DE USO — en el lugar de Beneficios, con animación staggered */}
      <section id="usos" className="bg-white py-16 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">Casos de uso</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Adecuado a tu infraestructura</h2>
            <p className="text-slate-500 text-base mt-4 font-medium max-w-2xl mx-auto">Conecta tu IA, tus automatizaciones o tu equipo a números reales. Sin depender de un teléfono físico a la mano.</p>
          </motion.div>

          <div className="relative">
            <motion.div
              ref={casosUsoRef}
              className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory no-scrollbar -mx-6 px-6 md:mx-0 md:px-0 pb-4 md:pb-0"
              style={{ scrollbarWidth: 'none' }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {casosUso.map((c, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-[#FAFAFA] rounded-[2rem] border border-slate-100 p-8 flex flex-col hover-lift transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-200 relative overflow-hidden group min-w-[85vw] md:min-w-0 snap-start"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-150 transition-transform duration-700 ease-out">{c.icon}</div>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm shrink-0" style={{ background: c.iconBg }}>{c.icon}</div>
                <h3 className="text-xl font-black text-slate-900 mb-6 relative z-10">{c.title}</h3>
                <ul className="flex flex-col gap-4 relative z-10">
                  {c.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="material-symbols-rounded text-emerald-500 text-[20px] shrink-0 mt-0.5" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                      <span className="text-[14px] font-medium text-slate-600 leading-snug">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
          <div className="md:hidden">
            <ScrollDots total={casosUso.length} current={casosPage} scrollRef={casosUsoRef} />
          </div>
        </div>
      </div>
    </section>

      {/* TELEGRAM SECTION */}
      <section className="py-16 md:py-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1B3A6B 60%, #1d4ed8 100%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 w-fit pulse-glow">
                <span className="text-[11px] font-black tracking-widest flex items-center gap-1.5">
                  <svg className="w-3 h-3 fill-[#54a3f5]" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.499 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.798-1.185-.78-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.481-.428-.008-1.252-.241-1.865-.44-.751-.244-1.348-.372-1.296-.785.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386.402-1.627.674-1.627.06 0 .195.012.284.048.074.03.175.087.218.158.046.076.076.171.089.273z" />
                  </svg>
                  <span className="text-[#54a3f5]">Telegram</span>
                  <span className="text-white">Bot</span>
                </span>
              </div>
              <h2 className="text-4xl font-black text-white leading-tight tracking-tight" dangerouslySetInnerHTML={{ __html: t('landing.telegram.title').replace('<br/>', '<br/>') }}></h2>
              <p className="text-slate-300 text-base leading-relaxed font-medium">
                {t('landing.telegram.desc')}
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { icon: 'bolt', title: t('landing.telegram.feature1.title'), desc: t('landing.telegram.feature1.desc') },
                  { icon: 'hub', title: t('landing.telegram.feature2.title'), desc: t('landing.telegram.feature2.desc') },
                  { icon: 'code_off', title: t('landing.telegram.feature3.title'), desc: t('landing.telegram.feature3.desc') }
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="material-symbols-rounded text-[16px]" style={{ color: '#54a3f5' }}>{f.icon}</span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{f.title}</p>
                      <p className="text-slate-400 text-xs font-medium mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center justify-center gap-2 bg-white text-primary font-black py-4 px-8 rounded-2xl w-full md:w-fit hover:bg-blue-50 transition-all text-sm shadow-xl active:scale-95 mt-6">
                <span className="material-symbols-rounded text-[20px]">send</span>
                {t('landing.telegram.btn')}
              </button>
            </div>

            <div className="hidden md:flex justify-center">
              <div className="w-72 rounded-3xl overflow-hidden shadow-2xl border border-white/10" style={{ background: '#212121' }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#2b2b2b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-rounded text-white text-[18px]">sim_card</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm leading-none">TelsimBot</p>
                    <p className="text-emerald-400 text-[10px] font-semibold mt-0.5">en línea</p>
                  </div>
                  <span className="material-symbols-rounded text-white/30 text-[20px]">more_vert</span>
                </div>
                <div className="px-3 py-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="self-start rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%]" style={{ background: '#2b5278' }}>
                      <p className="text-[10px] font-black text-blue-300 mb-1">📱 SMS recibido · +56 9 3000 7777</p>
                      <p className="text-white/70 text-[10px]">Tu código de verificación:</p>
                      <p className="text-white font-black text-lg tracking-widest leading-tight">726263</p>
                      <p className="text-white/40 text-[9px] mt-1">Binance · hace 3s</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="self-start rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%]" style={{ background: '#2b5278' }}>
                      <p className="text-[10px] font-black text-blue-300 mb-1">📱 SMS recibido · +56 9 3000 7777</p>
                      <p className="text-white/70 text-[10px]">Tu código de acceso Google:</p>
                      <p className="text-white font-black text-lg tracking-widest leading-tight">491823</p>
                      <p className="text-white/40 text-[9px] mt-1">Google · hace 11s</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="self-end rounded-2xl rounded-tr-sm px-3 py-2.5 max-w-[88%]" style={{ background: '#2f5f2f' }}>
                      <p className="text-[10px] font-black text-emerald-300 mb-1">✅ Procesado automáticamente</p>
                      <p className="text-white text-[11px] font-semibold">Código 491823 enviado al flujo de autenticación.</p>
                      <p className="text-white/40 text-[9px] mt-1">TelsimBot · ahora</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Monitoreo activo 24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="tech-bg py-16 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">Flujo Funcional</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">El pipeline de tus SMS</h2>
          </motion.div>

          <div className="relative">
            {/* Desktop Connector Line */}
            <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-slate-100 z-0">
              <motion.div
                className="h-full bg-primary origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>

            <div className="flex flex-col md:flex-row items-stretch gap-8 md:gap-0 mb-4 relative z-10 w-full justify-between">
              {[
                 { icon: 'sim_card', step: '1', title: 'Identidad Real', desc: 'SIMs físicas que saltan los filtros VoIP más exigentes.' },
                 { icon: 'quick_reference', step: '2', title: 'Detección Instantánea', desc: 'Capturamos el código SMS en milisegundos directamente de la red.' },
                 { icon: 'webhook', step: '3', title: 'Entrega Programática', desc: 'Payload JSON seguro directo a tu Webhook o API REST.' },
                 { icon: 'memory', step: '4', title: 'Validación Autónoma', desc: 'Tu sistema extrae y procesa el OTP sin intervención humana.' },
                 { icon: 'rocket_launch', step: '5', title: 'Escalado Global', desc: 'Tus agentes operan 24/7 sin cuellos de botella. Cero fallos, 100% ROI.' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false }}
                  transition={{ delay: i * 0.5, duration: 0.5 }}
                  className="flex-1 flex flex-col items-center text-center px-2 relative"
                >
                  {/* Mobile Connector Line */}
                  {i < 4 && (
                    <div className="md:hidden absolute top-[60px] bottom-[-32px] left-1/2 w-0.5 bg-slate-100 -translate-x-1/2 z-0">
                      <motion.div
                        className="w-full h-full bg-primary origin-top"
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.5, delay: i * 0.5 + 0.2 }}
                      />
                    </div>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    initial={i === 4 ? { backgroundColor: '#1d4ed8' } : {}}
                    whileInView={i === 4 ? { backgroundColor: ['#1d4ed8', '#10b981'] } : {}}
                    viewport={{ once: false }}
                    transition={{ backgroundColor: { delay: 2.2, duration: 0.4 } }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-button mb-3 relative z-10 shrink-0 ${i !== 4 ? 'bg-primary' : ''}`}
                  >
                    {/* Ripple/Ping animation for success state */}
                    {i === 4 && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-emerald-500 z-[-1]"
                        initial={{ scale: 1, opacity: 0 }}
                        whileInView={{ scale: [1, 1.6], opacity: [0, 0.6, 0] }}
                        viewport={{ once: false }}
                        transition={{ duration: 1.5, delay: 2.6, repeat: Infinity, repeatDelay: 0.5 }}
                      />
                    )}

                    {i === 4 ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <motion.span
                          className="material-symbols-rounded text-white text-[26px] absolute"
                          initial={{ opacity: 1, scale: 1 }}
                          whileInView={{ opacity: 0, scale: 0.5 }}
                          viewport={{ once: false }}
                          transition={{ delay: 2.2, duration: 0.3 }}
                        >
                          {item.icon}
                        </motion.span>
                        <motion.span
                          className="material-symbols-rounded text-white text-[26px] absolute"
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: false }}
                          transition={{ delay: 2.2, duration: 0.3 }}
                        >
                          task_alt
                        </motion.span>
                      </div>
                    ) : (
                      <span className="material-symbols-rounded text-white text-[26px]">{item.icon}</span>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0, backgroundColor: '#eff6ff', borderColor: '#1d4ed8', color: '#1d4ed8' }}
                    whileInView={{
                      scale: 1,
                      backgroundColor: i === 4 ? ['#eff6ff', '#ecfdf5'] : '#eff6ff',
                      borderColor: i === 4 ? ['#1d4ed8', '#10b981'] : '#1d4ed8',
                      color: i === 4 ? ['#1d4ed8', '#10b981'] : '#1d4ed8'
                    }}
                    viewport={{ once: false }}
                    transition={{
                      scale: { type: "spring", stiffness: 260, damping: 20, delay: i * 0.5 + 0.2 },
                      backgroundColor: { delay: 2.2, duration: 0.4 },
                      borderColor: { delay: 2.2, duration: 0.4 },
                      color: { delay: 2.2, duration: 0.4 },
                    }}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center mb-2 font-black text-[11px] z-10"
                  >
                    {item.step}
                  </motion.div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1.5 leading-tight">{item.title}</h3>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FORMULARIO — Contacto + Visualización de plataforma (puente a Precios) */}
      <section id="contacto" className="py-20 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1B3A6B 60%, #1d4ed8 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
            {/* Columna Izquierda: Formulario de contacto */}
            <div className="order-2 md:order-1 flex flex-col w-full">
              <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-3">Contáctanos</h2>
              <p className="text-slate-400 text-sm mb-8">
                Escala tu infraestructura de agentes autónomos con soporte técnico especializado.
              </p>
              <form
                onSubmit={handleContactSubmit}
                className="flex flex-col gap-5"
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Nombre"
                  value={contactForm.name}
                  onChange={handleContactFieldChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <input
                  type="text"
                  name="company"
                  placeholder="Empresa"
                  value={contactForm.company}
                  onChange={handleContactFieldChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <input
                  type="email"
                  placeholder="Email Corporativo"
                  name="email"
                  value={contactForm.email}
                  onChange={handleContactFieldChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <textarea
                  name="message"
                  placeholder="Mensaje"
                  rows={4}
                  value={contactForm.message}
                  onChange={handleContactFieldChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                />
                {contactFeedback && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                      contactFeedback.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-400/30'
                        : 'bg-rose-500/15 text-rose-100 border border-rose-400/30'
                    }`}
                  >
                    {contactFeedback.message}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white text-primary font-black py-4 px-8 rounded-2xl shadow-xl hover:bg-blue-50 transition-all mt-2"
                >
                  <span className="material-symbols-rounded text-[20px]">send</span>
                  {contactSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
              </form>
            </div>

            {/* Columna Derecha: Textos + Imagen de plataforma */}
            <div className="order-1 md:order-2 flex flex-col w-full">
              <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-3">
                Gestiona todo desde un solo lugar
              </h2>
              <p className="text-slate-300 font-medium text-lg mb-8">
                Dashboard intuitivo para administrar todas tus líneas, consumos y facturación.
              </p>
              <div className="w-full rounded-3xl border-[8px] border-slate-900/40 shadow-2xl overflow-hidden">
                <img
                  src="/dashboard-captacion.png"
                  alt="Dashboard Telsim — Panel de Automatización y Webhooks"
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" ref={pricingSectionRef} className="tech-bg py-16 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">Planes</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Elige tu plan</h2>
            <p className="text-slate-500 text-base mt-3 font-medium">{t('landing.pricing.subtitle')}</p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-8">
            <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-slate-900' : 'text-slate-400'}`}>
              Mensual
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-bold transition-colors ${isAnnual ? 'text-slate-900' : 'text-slate-400'}`}>
              Anual
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 transition-all duration-200 ${isAnnual ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
              Ahorra hasta 17%
            </span>
          </div>

          <div ref={preciosRef} className="flex md:grid md:grid-cols-3 gap-6 items-stretch overflow-x-auto md:overflow-x-visible pt-4 pb-12 md:pb-4 snap-x snap-mandatory no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {/* STARTER — texto con contraste (phoneColor/labelColor) sobre blanco */}
            <button onClick={() => handlePlanSelect('starter')} className="group relative rounded-3xl p-6 border border-slate-200 bg-white flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-slate-400 hover:shadow-slate-200/80 min-w-[78vw] md:min-w-0 snap-center">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-slate-100/60 group-hover:bg-slate-100 transition-colors duration-300"></div>
              <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-slate-50 group-hover:bg-slate-100/80 transition-colors duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${starterCardColors.labelColor}`}>{t('landing.pricing.starter.name')}</span>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200 group-hover:scale-110 transition-all flex items-center justify-center">
                    <span className={`material-symbols-rounded text-[18px] ${starterCardColors.labelColor}`}>sim_card</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-slate-100 group-hover:bg-slate-200 transition-colors px-3 py-1.5 rounded-full mb-5">
                  <span className={`material-symbols-rounded text-[13px] ${starterCardColors.labelColor}`}>sms</span>
                  <span className={`text-[11px] font-black ${starterCardColors.phoneColor}`}>{t('landing.pricing.starter.credits')}</span>
                </div>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className={`text-5xl font-black group-hover:text-primary transition-colors duration-300 ${starterCardColors.phoneColor}`}>
                    {isAnnual ? '$199' : '$19.90'}
                  </span>
                  <span className={`font-semibold ${starterCardColors.labelColor}`}>{isAnnual ? '/yr' : '/mo'}</span>
                </div>
                {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $39.80 vs plan mensual</p>}
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
              <div className="relative flex flex-col gap-2.5 flex-1">
                {(t('landing.pricing.features.starter') as any).map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-emerald-500 text-[15px] mt-0.5 flex-shrink-0">check_circle</span>
                    <span className={`text-xs font-semibold ${starterCardColors.phoneColor}`}>{f}</span>
                  </div>
                ))}
              </div>
              <div className="relative bg-slate-50 group-hover:bg-slate-100 transition-colors rounded-2xl px-4 py-3">
                <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${starterCardColors.labelColor}`}>{t('common.learn_more')}</p>
                <p className={`text-xs font-bold ${starterCardColors.phoneColor}`}>{t('landing.pricing.starter.desc')}</p>
              </div>
              <div className={`relative flex items-center justify-center gap-1.5 group-hover:text-primary transition-colors pt-1 ${starterCardColors.labelColor}`}>
                <span className={`text-sm font-black ${starterCardColors.phoneColor}`}>{t('common.start_free')}</span>
                <span className="material-symbols-rounded text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </button>

            {/* PRO */}
            <button onClick={() => handlePlanSelect('pro')} className="group relative rounded-3xl p-6 border-2 border-primary bg-white flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_60px_-10px_rgba(29,78,216,0.35)] min-w-[78vw] md:min-w-0 snap-center" style={{ background: 'linear-gradient(160deg,#eff6ff 0%,#ffffff 50%)' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px">
                <div className="bg-primary text-white text-[10px] font-black px-5 py-1.5 rounded-b-2xl shadow-button tracking-widest whitespace-nowrap">{t('landing.pricing.pro.badge')}</div>
              </div>
              <div className="relative pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-primary uppercase tracking-widest">{t('landing.pricing.pro.name')}</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 group-hover:bg-blue-200 group-hover:scale-110 transition-all flex items-center justify-center">
                    <span className="material-symbols-rounded text-primary text-[18px]">rocket_launch</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-blue-100 group-hover:bg-blue-200 transition-colors px-3 py-1.5 rounded-full mb-5">
                  <span className="material-symbols-rounded text-primary text-[13px]">sms</span>
                  <span className="text-[11px] font-black text-primary">{t('landing.pricing.pro.credits')}</span>
                </div>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-5xl font-black text-slate-900 group-hover:text-primary transition-colors duration-300">
                    {isAnnual ? '$399' : '$39.90'}
                  </span>
                  <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
                </div>
                {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $79.80 vs plan mensual</p>}
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
              <div className="relative flex flex-col gap-2.5 flex-1">
                {(t('landing.pricing.features.pro') as any).map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-emerald-500 text-[15px] mt-0.5 flex-shrink-0">check_circle</span>
                    <span className="text-xs font-semibold text-slate-700">{f}</span>
                  </div>
                ))}
              </div>
              <div className="relative bg-blue-50 group-hover:bg-blue-100 transition-colors rounded-2xl px-4 py-3">
                <p className="text-[9px] font-black text-primary/50 uppercase tracking-wider mb-0.5">{t('common.learn_more')}</p>
                <p className="text-xs font-bold text-primary">{t('landing.pricing.pro.desc')}</p>
              </div>
              <div className="relative flex items-center justify-center gap-1.5 text-primary pt-1">
                <span className="text-sm font-black">{t('common.start_free')}</span>
                <span className="material-symbols-rounded text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </button>

            {/* POWER */}
            <button onClick={() => handlePlanSelect('power')} className="group relative rounded-3xl p-6 flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_60px_-10px_rgba(245,166,35,0.45)] min-w-[78vw] md:min-w-0 snap-center" style={{ border: '2px solid transparent', background: 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box', transition: 'all 0.3s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px">
                <div className="text-white text-[10px] font-black px-5 py-1.5 rounded-b-2xl shadow-button tracking-widest whitespace-nowrap" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)' }}>{t('landing.pricing.power.premium')}</div>
              </div>
              <div className="relative pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black uppercase tracking-widest" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('landing.pricing.power.name')}</span>
                  <div className="w-9 h-9 rounded-xl group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(245,166,35,0.5)] transition-all flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }}>
                    <span className="material-symbols-rounded text-[18px]" style={{ color: '#D97706' }}>workspace_premium</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5" style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }}>
                  <span className="material-symbols-rounded text-[13px]" style={{ color: '#D97706' }}>sms</span>
                  <span className="text-[11px] font-black" style={{ color: '#D97706' }}>{t('landing.pricing.power.credits')}</span>
                </div>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-5xl font-black text-slate-900 transition-colors duration-300">
                    {isAnnual ? '$990' : '$99.00'}
                  </span>
                  <span className="text-slate-400 font-semibold">{isAnnual ? '/yr' : '/mo'}</span>
                </div>
                {isAnnual && <p className="text-[11px] font-bold text-emerald-500 mt-1">Ahorras $198.00 vs plan mensual</p>}
              </div>
              <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#F5A623,transparent)' }}></div>
              <div className="relative flex flex-col gap-2.5 flex-1">
                {(t('landing.pricing.features.power') as any).map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-emerald-500 text-[15px] mt-0.5 flex-shrink-0">check_circle</span>
                    <span className="text-xs font-semibold text-slate-700">{f}</span>
                  </div>
                ))}
              </div>
              <div className="relative rounded-2xl px-4 py-3" style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' }}>
                <p className="text-[9px] font-black uppercase tracking-wider mb-0.5" style={{ color: '#D97706', opacity: 0.7 }}>{t('common.learn_more')}</p>
                <p className="text-xs font-bold" style={{ color: '#92400E' }}>{t('landing.pricing.power.desc')}</p>
              </div>
              <div className="relative flex items-center justify-center gap-1.5 pt-1">
                <span className="text-sm font-black group-hover:opacity-80 transition-opacity" style={{ background: 'linear-gradient(90deg,#F5A623,#D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('common.start_free')}</span>
                <span className="material-symbols-rounded text-[18px] group-hover:translate-x-1 transition-transform" style={{ color: '#F5A623' }}>arrow_forward</span>
              </div>
            </button>
          </div>
          <div className="md:hidden">
            <ScrollDots total={3} current={planesPage} scrollRef={preciosRef} />
          </div>
        </div>
      </section>

      {/* COMPATIBILIDAD */}
      <section className="py-14 md:py-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1B3A6B 60%, #1d4ed8 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 mb-8 text-center">
          <span className="inline-block text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1">{t('landing.compatibility.tag')}</span>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">{t('landing.compatibility.title')}</h3>
        </div>

        <div className="flex flex-col gap-8">
          {/* Single Row Carousel */}
          <div className="flex overflow-hidden relative">
            <motion.div
              className="flex gap-20 items-center whitespace-nowrap"
              animate={{ x: [0, -2500] }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            >
              {[
                { name: 'Telegram', slug: 'telegram' },
                { name: 'WhatsApp', slug: 'whatsapp' },
                { name: 'Uber', slug: 'uber' },
                { name: 'Rappi', slug: 'rappi', logo: 'https://cdn.simpleicons.org/rappi' },
                { name: 'Nike', slug: 'nike' },
                { name: 'Airbnb', slug: 'airbnb' },
                { name: 'Google', slug: 'google' },
                { name: 'Apple', slug: 'apple' },
                { name: 'WeChat', slug: 'wechat' },
                { name: 'Discord', slug: 'discord' },
                { name: 'Binance', slug: 'binance' },
                { name: 'Coinbase', slug: 'coinbase' },
                { name: 'Microsoft', slug: 'microsoft', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
                { name: 'Booking', slug: 'bookingdotcom' },
                { name: 'Ebay', slug: 'ebay' },
                { name: 'Amazon', slug: 'amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
                { name: 'Shopify', slug: 'shopify' },
                { name: 'Spotify', slug: 'spotify' },
                { name: 'Netflix', slug: 'netflix' }
              ].map((brand, i) => (
                <div key={i} className="flex flex-col items-center gap-3 group">
                  <img
                    src={brand.logo ?? `https://cdn.simpleicons.org/${brand.slug}`}
                    alt={brand.name}
                    className="h-8 md:h-10 w-auto opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest group-hover:text-white/50 transition-colors">
                    {brand.name}
                  </span>
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {[
                { name: 'Telegram', slug: 'telegram' },
                { name: 'WhatsApp', slug: 'whatsapp' },
                { name: 'Uber', slug: 'uber' },
                { name: 'Rappi', slug: 'rappi', logo: 'https://cdn.simpleicons.org/rappi' },
                { name: 'Nike', slug: 'nike' },
                { name: 'Airbnb', slug: 'airbnb' },
                { name: 'Google', slug: 'google' },
                { name: 'Apple', slug: 'apple' },
                { name: 'WeChat', slug: 'wechat' },
                { name: 'Discord', slug: 'discord' },
                { name: 'Binance', slug: 'binance' },
                { name: 'Coinbase', slug: 'coinbase' },
                { name: 'Microsoft', slug: 'microsoft', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
                { name: 'Booking', slug: 'bookingdotcom' },
                { name: 'Ebay', slug: 'ebay' },
                { name: 'Amazon', slug: 'amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
                { name: 'Shopify', slug: 'shopify' },
                { name: 'Spotify', slug: 'spotify' },
                { name: 'Netflix', slug: 'netflix' }
              ].map((brand, i) => (
                <div key={`dup-${i}`} className="flex flex-col items-center gap-3 group">
                  <img
                    src={brand.logo ?? `https://cdn.simpleicons.org/${brand.slug}`}
                    alt={brand.name}
                    className="h-8 md:h-10 w-auto opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest group-hover:text-white/50 transition-colors">
                    {brand.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50 border-t border-slate-100 py-16 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">Preguntas Frecuentes</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Resolvamos tus dudas</h2>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { q: '¿Cómo se entregan los SMS?', a: 'Por defecto, se envían en tiempo real mediante un Webhook a tu endpoint configurado, pero también puedes recibirlos consultando nuestra API REST o conectando tu cuenta directamente a un bot de Telegram.' },
              { q: '¿Tienen API y webhooks?', a: 'Sí. Toda la plataforma de Telsim fue construida con una filosofía API-first. Podrás gestionar números, leer mensajes y configurar webhooks de forma paramétrica y documentada.' },
              { q: '¿Los números son reales?', a: 'Absolutamente. Utilizamos SIMs físicas reales alojadas en bóvedas de hardware. Son números libres de marcas VoIP, lo que garantiza que evites bloqueos en servicios estrictos como WhatsApp, Meta, OpenAI o bancos.' },
              { q: '¿Para qué casos de uso está pensado?', a: 'Las agencias lo usan para delegar el MFA de sus clientes sin pedirles sus teléfonos; los desarrolladores de IA para saltar el cuello de botella del OTP; y los de Growth para validar la creación automatizada de cuentas.' },
              { q: '¿Hay límites por país o proveedor?', a: 'Proporcionamos números que pueden recibir SMS internacionales de forma fiable y genérica. No ponemos límites a cuántos servicios puedes verificar con un mismo número (sujeto al Fair Use de la línea).' },
              { q: '¿Cómo manejan la seguridad y retención de mensajes?', a: 'Aislamos los números a nivel cuenta para asegurar que solo tú veas tus SMS. Además, aplicamos una política automática de borrado de OTPs en nuestra base de datos para mantener tu privacidad.' },
              { q: '¿Qué plan necesito si opero múltiples flujos?', a: 'Si tienes pocos agentes o un MVP, el plan Starter basta. Si gestionas clientes o flujos pesados de automatización, recomendamos Pro o Power para tener múltiples números.' },
              { q: '¿Cuánto tarda el onboarding?', a: 'Es inmediato. Una vez finalices el pago, se aprovisionará tu número automáticamente en tu nuevo Dashboard y podrás comenzar a trabajar de inmediato.' }
            ].map((faq, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-slate-200 hover:border-primary/50 transition-colors [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-bold text-slate-900 text-[15px] md:text-base">{faq.q}</span>
                  <span className="material-symbols-rounded text-slate-400 group-open:rotate-180 transition-transform duration-300">keyboard_arrow_down</span>
                </summary>
                <div className="px-6 pb-6 text-slate-600 font-medium text-[14px] leading-relaxed border-t border-slate-100 mt-2 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white py-16 md:py-28">
        <div className="max-w-xl mx-auto px-6 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-button">
            <span className="material-symbols-rounded text-white text-[32px]">sim_card</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {t('landing.cta.title')}
          </h2>
          <p className="text-slate-500 text-base font-medium">{t('landing.hero.trial_footer')}</p>
          <button
            onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl shadow-button flex items-center gap-2 text-base transition-all active:scale-[0.98]"
          >
            {t('common.try_free')}
            <span className="material-symbols-rounded">arrow_forward</span>
          </button>
          <p className="text-xs text-slate-400 font-medium">¿Tienes preguntas? <a href="mailto:support@telsim.io" className="text-primary hover:underline">support@telsim.io</a></p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-14 md:py-28">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <TelsimBrandLogo compact iconClassName="h-8 w-8 rounded-[0.8rem]" textClassName="text-[1.2rem]" />
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 text-xs font-medium">{t('landing.compatibility.tag')}</span>
          </button>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400">
            <button
              onClick={() => document.getElementById('usos')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              Usos
            </button>
            <button
              onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              Flujo
            </button>
            <button
              onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              Planes
            </button>
            <button
              onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              FAQ
            </button>
            <button
              onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-primary transition-colors"
            >
              Contacto
            </button>
            <button onClick={() => navigate('/dashboard/help')} className="hover:text-primary transition-colors">Soporte</button>
          </div>
          <p className="text-xs text-slate-400 font-medium">© 2026 Telsim by Telvoice</p>
        </div>
      </footer>

      {/* ── MODAL DE VIDEO ── */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-rounded text-white text-[20px]">close</span>
            </button>

            <video
              src="/explainer.mp4"
              autoPlay
              controls
              playsInline
              className="w-full aspect-video bg-black"
              onEnded={() => setVideoOpen(false)}
            />
          </div>
        </div>
      )}

      {/* BOTÓN WHATSAPP FLOTANTE */}
      <a
        href="https://wa.me/56934449937?text=Hola!%20Vengo%20de%20la%20web%20y%20me%20interesa%20saber%20más%20sobre%20Telsim."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[100] whatsapp-float-btn bg-[#25D366] w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl group"
        title="¿Dudas? Escríbenos"
      >
        {/* Tooltip elegante */}
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
          ¿Dudas? Escríbenos 👋
          <span className="absolute top-1/2 -right-1 -translate-y-1/2 border-8 border-transparent border-l-slate-900"></span>
        </span>

        <img
          src="https://cdn.simpleicons.org/whatsapp/white"
          className="w-7 h-7 md:w-8 md:h-8"
          alt="WhatsApp"
        />
      </a>
    </div>
  );
};

export default Landing;
