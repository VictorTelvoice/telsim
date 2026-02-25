import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';

import { useLanguage } from '../contexts/LanguageContext';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const beneficiosRef = useRef<HTMLDivElement>(null);
  const casosUsoRef = useRef<HTMLDivElement>(null);
  const preciosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inicialmente centrar en PRO (segunda tarjeta)
    setTimeout(() => {
      if (preciosRef.current) {
        const cardWidth = preciosRef.current.scrollWidth / 3;
        preciosRef.current.scrollTo({ left: cardWidth, behavior: 'auto' });
      }
    }, 100);

    return () => {};
  }, []);
  const { user, loading } = useAuth();

  const handlePlanSelect = (planId: string) => {
    localStorage.setItem('selected_plan', planId);
    navigate('/register');
  };

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
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
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="material-symbols-rounded text-white text-[20px]">sim_card</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">Telsim</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
            <button 
              onClick={() => {
                const el = document.getElementById('beneficios');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="hover:text-primary transition-colors"
            >
              {t('landing.nav.benefits')}
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
            <button onClick={() => navigate('/api-docs')} className="hover:text-primary transition-colors">{t('landing.nav.api_docs')}</button>
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
            <button onClick={() => navigate('/login')} className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-button hover:bg-primary-dark transition-colors">
              <span className="hidden sm:inline">{t('landing.nav.start')}</span>
              <span className="sm:hidden">{t('landing.nav.start_mobile')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="tech-bg pt-10 pb-12">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-center text-center gap-6 fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-bold">
            <div className="signal-dot"></div>
            {t('landing.hero.badge')}
            <span className="material-symbols-rounded text-emerald-500 text-[15px]">smart_toy</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight">
            {t('landing.hero.title')}<br/><span className="text-primary">{t('landing.hero.subtitle')}</span>
          </h1>

          <p className="text-slate-500 text-lg leading-relaxed font-medium max-w-[52ch] text-center">
            {t('landing.hero.desc')}
          </p>

          {/* Feature card */}
          <div className="relative bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 w-full max-w-lg text-left border border-gray-100 overflow-hidden mx-auto">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-4 py-2 rounded-bl-2xl shadow-sm tracking-wide">
              {t('landing.hero.trial_badge')}
            </div>

            <div className="mb-6 pt-1">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">{t('landing.pricing.tag')}</p>
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <h2 className="text-4xl font-extrabold text-emerald-500 tracking-tight">{t('landing.hero.trial_title')}</h2>
                <span className="text-xl font-bold text-[#1B3A6B]">{t('landing.hero.trial_sub')}</span>
              </div>
              <p className="text-sm font-medium text-gray-400">{t('landing.hero.trial_footer')}</p>
            </div>

            <div className="space-y-4">
              {[
                { label: t('landing.hero.feature1'), sub: t('landing.hero.feature1_sub') },
                { label: t('landing.hero.feature2') },
                { label: t('landing.hero.feature3') },
                { label: t('landing.hero.feature4') },
                { label: t('landing.hero.feature5') }
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5">
                    <span className="material-symbols-rounded text-white text-[13px]">check</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-600">
                    {f.label} {f.sub && <span className="text-slate-400">{f.sub}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => {
                  const el = document.getElementById('precios');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="bg-primary hover:bg-primary-dark text-white font-bold py-4 px-7 rounded-2xl shadow-button flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98]"
              >
                {t('common.try_free')}
                <span className="material-symbols-rounded text-[20px]">arrow_forward</span>
              </button>
              <a href="#como-funciona" className="bg-white border border-slate-200 text-slate-700 font-bold py-4 px-7 rounded-2xl flex items-center justify-center gap-2 text-base hover:border-primary hover:text-primary transition-all">
                <span className="material-symbols-rounded text-[20px]">play_circle</span>
                {t('common.see_how')}
              </a>
            </div>
            <div className="flex items-center gap-5 text-xs font-semibold text-slate-400 flex-wrap justify-center">
              <span className="flex items-center gap-1"><span className="material-symbols-rounded text-emerald-brand text-[14px]">check_circle</span>{t('landing.hero.autonomy')}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-rounded text-emerald-brand text-[14px]">check_circle</span>{t('landing.hero.activation')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="bg-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">{t('landing.benefits.tag')}</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight" dangerouslySetInnerHTML={{ __html: t('landing.benefits.title').replace('<br/>', '<br/>') }}></h2>
          </div>
          <div ref={beneficiosRef} className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-x-visible pb-8 md:pb-0 snap-x snap-mandatory no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {[
              { icon: 'sim_card', title: t('landing.benefits.item1.title'), desc: t('landing.benefits.item1.desc') },
              { icon: 'bolt', title: t('landing.benefits.item2.title'), desc: t('landing.benefits.item2.desc') },
              { icon: 'verified_user', title: t('landing.benefits.item3.title'), desc: t('landing.benefits.item3.desc') },
              { icon: 'shield', title: t('landing.benefits.item4.title'), desc: t('landing.benefits.item4.desc'), color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { icon: 'trending_up', title: t('landing.benefits.item5.title'), desc: t('landing.benefits.item5.desc') },
              { icon: 'api', title: t('landing.benefits.item6.title'), desc: t('landing.benefits.item6.desc') }
            ].map((b, i) => (
              <div key={i} className="bg-slate-50 rounded-3xl p-5 hover-lift border border-slate-100 min-w-[calc(50%-0.5rem)] md:min-w-0 snap-center">
                <div className={`w-10 h-10 ${b.bg || 'bg-blue-50'} rounded-xl flex items-center justify-center ${b.color || 'text-primary'} mb-4`}>
                  <span className="material-symbols-rounded text-[22px]">{b.icon}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{b.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TELEGRAM SECTION */}
      <section className="py-12 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1B3A6B 60%, #1d4ed8 100%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 w-fit pulse-glow">
                <span className="text-[11px] font-black tracking-widest flex items-center gap-1.5">
                  <svg className="w-3 h-3 fill-[#54a3f5]" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.499 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.798-1.185-.78-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.481-.428-.008-1.252-.241-1.865-.44-.751-.244-1.348-.372-1.296-.785.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386.402-1.627.674-1.627.06 0 .195.012.284.048.074.03.175.087.218.158.046.076.076.171.089.273z"/>
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
              <button onClick={() => navigate('/login')} className="inline-flex items-center justify-center gap-2 bg-white text-primary font-black py-4 px-8 rounded-2xl w-full md:w-fit hover:bg-blue-50 transition-all text-sm shadow-xl active:scale-95 mt-6">
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
      <section id="como-funciona" className="tech-bg py-12 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">{t('landing.process.tag')}</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t('landing.process.title')}</h2>
          </motion.div>
          
          <div className="relative">
            {/* Desktop Connector Line */}
            <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-0.5 bg-slate-100 z-0">
              <motion.div 
                className="h-full bg-primary origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </div>

            <div className="flex flex-col md:flex-row items-start gap-12 md:gap-0 mb-4 relative z-10">
              {[
                { icon: 'sim_card', step: '1', title: t('landing.process.step1.title'), desc: t('landing.process.step1.desc') },
                { icon: 'settings_suggest', step: '2', title: t('landing.process.step2.title'), desc: t('landing.process.step2.desc') },
                { icon: 'smart_toy', step: '3', title: t('landing.process.step3.title'), desc: t('landing.process.step3.desc') }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.3, duration: 0.6 }}
                  className="flex-1 flex flex-col items-center text-center px-6 relative"
                >
                  {/* Mobile Connector Line */}
                  {i < 2 && (
                    <div className="md:hidden absolute top-[60px] bottom-[-48px] left-1/2 w-0.5 bg-slate-100 -translate-x-1/2 z-0">
                      <motion.div 
                        className="w-full bg-primary origin-top"
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.3 + 0.3 }}
                      />
                    </div>
                  )}

                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-button mb-4 relative z-10"
                  >
                    <span className="material-symbols-rounded text-white text-[26px]">{item.icon}</span>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.3 + 0.2 }}
                    className="w-8 h-8 rounded-full bg-blue-50 border-2 border-primary flex items-center justify-center mb-3 text-primary font-black text-sm z-10"
                  >
                    {item.step}
                  </motion.div>
                  
                  <h3 className="font-bold text-slate-900 text-base mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CASOS DE USO */}
      <section className="bg-white py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">{t('landing.use_cases.tag')}</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight" dangerouslySetInnerHTML={{ __html: t('landing.use_cases.title').replace('<br/>', '<br/>') }}></h2>
            <p className="text-slate-500 text-base mt-3 font-medium">{t('landing.use_cases.subtitle')}</p>
          </div>
          <div ref={casosUsoRef} className="flex md:grid md:grid-cols-2 gap-4 overflow-x-auto md:overflow-x-visible pb-8 md:pb-0 snap-x snap-mandatory no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {[
              { icon: 'campaign', title: t('landing.use_cases.item1.title'), desc: t('landing.use_cases.item1.desc') },
              { icon: 'how_to_reg', title: t('landing.use_cases.item2.title'), desc: t('landing.use_cases.item2.desc') },
              { icon: 'candlestick_chart', title: t('landing.use_cases.item3.title'), desc: t('landing.use_cases.item3.desc') },
              { icon: 'precision_manufacturing', title: t('landing.use_cases.item4.title'), desc: t('landing.use_cases.item4.desc') },
              { icon: 'storefront', title: t('landing.use_cases.item5.title'), desc: t('landing.use_cases.item5.desc') },
              { icon: 'manage_accounts', title: t('landing.use_cases.item6.title'), desc: t('landing.use_cases.item6.desc') },
              { icon: 'add_business', title: t('landing.use_cases.item7.title'), desc: t('landing.use_cases.item7.desc') },
              { icon: 'integration_instructions', title: t('landing.use_cases.item8.title'), desc: t('landing.use_cases.item8.desc') }
            ].map((c, i) => (
              <div key={i} className="bg-slate-50 rounded-3xl p-6 use-case-card border border-slate-100 flex gap-4 min-w-[85vw] md:min-w-0 snap-center">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-rounded text-[24px]">{c.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{c.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-10" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1B3A6B 60%, #1d4ed8 100%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: t('landing.stats.item1.val'), label: t('landing.stats.item1.label') },
              { val: t('landing.stats.item2.val'), label: t('landing.stats.item2.label') },
              { val: t('landing.stats.item3.val'), label: t('landing.stats.item3.label') },
              { val: t('landing.stats.item4.val'), label: t('landing.stats.item4.label') }
            ].map((s, i) => (
              <div key={i}>
                <p className="text-4xl font-black text-white mb-1">{s.val}</p>
                <p className="text-blue-200 text-sm font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="tech-bg py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest mb-3">Planes</span>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Elige tu plan</h2>
            <p className="text-slate-500 text-base mt-3 font-medium">{t('landing.pricing.subtitle')}</p>
          </div>

          <div ref={preciosRef} className="flex md:grid md:grid-cols-3 gap-6 items-stretch overflow-x-auto md:overflow-x-visible pb-12 md:pb-0 snap-x snap-mandatory no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {/* STARTER */}
            <button onClick={() => handlePlanSelect('starter')} className="group relative rounded-3xl p-6 border border-slate-200 bg-white flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-slate-400 hover:shadow-slate-200/80 min-w-[85vw] md:min-w-0 snap-center">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-slate-100/60 group-hover:bg-slate-100 transition-colors duration-300"></div>
              <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-slate-50 group-hover:bg-slate-100/80 transition-colors duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('landing.pricing.starter.name')}</span>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200 group-hover:scale-110 transition-all flex items-center justify-center">
                    <span className="material-symbols-rounded text-slate-500 text-[18px]">sim_card</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-slate-100 group-hover:bg-slate-200 transition-colors px-3 py-1.5 rounded-full mb-5">
                  <span className="material-symbols-rounded text-slate-500 text-[13px]">sms</span>
                  <span className="text-[11px] font-black text-slate-600">{t('landing.pricing.starter.credits')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-900 group-hover:text-primary transition-colors duration-300">$19.90</span>
                  <span className="text-slate-400 font-semibold">/mo</span>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
              <div className="relative flex flex-col gap-2.5 flex-1">
                {(t('landing.pricing.features.starter') as any).map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-emerald-500 text-[15px] mt-0.5 flex-shrink-0">check_circle</span>
                    <span className="text-xs font-semibold text-slate-700">{f}</span>
                  </div>
                ))}
              </div>
              <div className="relative bg-slate-50 group-hover:bg-slate-100 transition-colors rounded-2xl px-4 py-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t('common.learn_more')}</p>
                <p className="text-xs font-bold text-slate-600">{t('landing.pricing.starter.desc')}</p>
              </div>
              <div className="relative flex items-center justify-center gap-1.5 text-slate-400 group-hover:text-primary transition-colors pt-1">
                <span className="text-sm font-black">{t('common.start_free')}</span>
                <span className="material-symbols-rounded text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </button>

            {/* PRO */}
            <button onClick={() => handlePlanSelect('pro')} className="group relative rounded-3xl p-6 border-2 border-primary bg-white flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_20px_60px_-10px_rgba(29,78,216,0.35)] min-w-[85vw] md:min-w-0 snap-center" style={{ background: 'linear-gradient(160deg,#eff6ff 0%,#ffffff 50%)' }}>
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
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-900 group-hover:text-primary transition-colors duration-300">$39.90</span>
                  <span className="text-slate-400 font-semibold">/mo</span>
                </div>
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
            <button onClick={() => handlePlanSelect('power')} className="group relative rounded-3xl p-6 flex flex-col gap-4 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_-10px_rgba(245,166,35,0.45)] min-w-[85vw] md:min-w-0 snap-center" style={{ border: '2px solid transparent', background: 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#F5A623,#F0C040) border-box', transition: 'all 0.3s' }}>
              <div className="relative">
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
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-900 transition-colors duration-300">$99.00</span>
                  <span className="text-slate-400 font-semibold">/mo</span>
                </div>
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
        </div>
      </section>

      {/* COMPATIBILIDAD */}
      <section className="py-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1B3A6B 60%, #1d4ed8 100%)' }}>
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
                { name: 'Rappi', slug: 'rappi' },
                { name: 'Nike', slug: 'nike' },
                { name: 'Airbnb', slug: 'airbnb' },
                { name: 'Google', slug: 'google' },
                { name: 'Apple', slug: 'apple' },
                { name: 'WeChat', slug: 'wechat' },
                { name: 'Discord', slug: 'discord' },
                { name: 'Binance', slug: 'binance' },
                { name: 'Coinbase', slug: 'coinbase' },
                { name: 'Microsoft', slug: 'microsoft' },
                { name: 'Booking', slug: 'bookingdotcom' },
                { name: 'Ebay', slug: 'ebay' },
                { name: 'Amazon', slug: 'amazon' },
                { name: 'Shopify', slug: 'shopify' },
                { name: 'Spotify', slug: 'spotify' },
                { name: 'Netflix', slug: 'netflix' }
              ].map((brand, i) => (
                <div key={i} className="flex flex-col items-center gap-3 group">
                  <img 
                    src={`https://cdn.simpleicons.org/${brand.slug}/white`} 
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
                { name: 'Rappi', slug: 'rappi' },
                { name: 'Nike', slug: 'nike' },
                { name: 'Airbnb', slug: 'airbnb' },
                { name: 'Google', slug: 'google' },
                { name: 'Apple', slug: 'apple' },
                { name: 'WeChat', slug: 'wechat' },
                { name: 'Discord', slug: 'discord' },
                { name: 'Binance', slug: 'binance' },
                { name: 'Coinbase', slug: 'coinbase' },
                { name: 'Microsoft', slug: 'microsoft' },
                { name: 'Booking', slug: 'bookingdotcom' },
                { name: 'Ebay', slug: 'ebay' },
                { name: 'Amazon', slug: 'amazon' },
                { name: 'Shopify', slug: 'shopify' },
                { name: 'Spotify', slug: 'spotify' },
                { name: 'Netflix', slug: 'netflix' }
              ].map((brand, i) => (
                <div key={`dup-${i}`} className="flex flex-col items-center gap-3 group">
                  <img 
                    src={`https://cdn.simpleicons.org/${brand.slug}/white`} 
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

      {/* CTA FINAL */}
      <section className="bg-white py-12">
        <div className="max-w-xl mx-auto px-6 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-button">
            <span className="material-symbols-rounded text-white text-[32px]">sim_card</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {t('landing.cta.title')}
          </h2>
          <p className="text-slate-500 text-base font-medium">{t('landing.hero.trial_footer')}</p>
          <button 
            onClick={() => navigate('/onboarding/summary', { 
              state: { 
                planName: 'Starter', 
                price: 19.90, 
                monthlyLimit: 150, 
                stripePriceId: 'price_1SzJRLEADSrtMyiaQaDEp44E' 
              } 
            })} 
            className="bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl shadow-button flex items-center gap-2 text-base transition-all active:scale-[0.98]"
          >
            {t('common.try_free')}
            <span className="material-symbols-rounded">arrow_forward</span>
          </button>
          <p className="text-xs text-slate-400 font-medium">¿Tienes preguntas? <a href="mailto:info@telsim.io" className="text-primary hover:underline">info@telsim.io</a></p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-rounded text-white text-[16px]">sim_card</span>
            </div>
            <span className="font-extrabold text-slate-900">Telsim</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 text-xs font-medium">{t('landing.compatibility.tag')}</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#" className="hover:text-primary transition-colors">{t('landing.nav.benefits')}</a>
            <button 
              onClick={() => {
                const el = document.getElementById('precios');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="hover:text-primary transition-colors"
            >
              Planes
            </button>
            <button onClick={() => navigate('/api-docs')} className="hover:text-primary transition-colors">{t('landing.nav.api_docs')}</button>
            <button onClick={() => navigate('/dashboard/help')} className="hover:text-primary transition-colors">{t('profile.help')}</button>
          </div>
          <p className="text-xs text-slate-400 font-medium">© 2026 Telsim by Telvoice</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
