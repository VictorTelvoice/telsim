import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

interface ActivationData {
  phoneNumber: string;
  planName: string;
  amount: number;
  currency: string;
  monthlyLimit: number;
  isAnnual?: boolean;
  activationState?: string | null;
}

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

// ─── Plan pricing catalogue ───────────────────────────────────────────────────
const PLAN_CATALOGUE: Record<string, { monthly: number; annual: number; limit: number }> = {
  Starter: { monthly: 19.90, annual: 199, limit: 150 },
  Pro:     { monthly: 39.90, annual: 399, limit: 400 },
  Power:   { monthly: 99.00, annual: 990, limit: 1400 }
};

// ─── Logo ────────────────────────────────────────────────────────────────────
const TelsimLogo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
      <span className="material-symbols-rounded text-white text-[20px]">sim_card</span>
    </div>
    <span className="font-extrabold text-xl tracking-tight text-slate-900">Telsim</span>
  </div>
);

const ActivationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<ActivationData | null>(null);
  const [copied, setCopied] = useState(false);
  const [desktop, setDesktop] = useState(isDesktop());

  useEffect(() => {
    const handler = () => setDesktop(isDesktop());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const sessionId = new URLSearchParams(location.search).get('session_id');

  // Ciclo de facturación: 7 días de prueba, luego el ciclo se repite (mensual o anual)
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);

  // Próximo cobro: después de trial, se renueva en el ciclo (30 días para mensual, 365 para anual)
  const renewal = new Date();
  const isAnnualCycle = data?.isAnnual === true;
  renewal.setDate(renewal.getDate() + (isAnnualCycle ? 372 : 37)); // 7 días prueba + 365 anual O 7 + 30 mensual

  const fmt = (d: Date) => d.toLocaleDateString(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });

  const formatPhone = (num: string) => {
    if (!num) return '— — — — — —';
    const c = num.replace(/\D/g, '');
    if (c.startsWith('569') && c.length === 11) return `+56 9 ${c.substring(3,7)} ${c.substring(7)}`;
    return num.startsWith('+') ? num : `+${num}`;
  };

  const getPlanColors = (plan: string) => {
    const p = (plan || '').toUpperCase();
    if (p.includes('POWER')) return { accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.08)', accentBorder: 'rgba(245,158,11,0.2)', accentClass: 'text-amber-500' };
    if (p.includes('PRO'))   return { accent: '#1d4ed8', accentBg: 'rgba(29,78,216,0.1)',   accentBorder: 'rgba(29,78,216,0.25)',  accentClass: 'text-blue-600' };
    return                          { accent: '#10b981', accentBg: 'rgba(16,185,129,0.08)', accentBorder: 'rgba(16,185,129,0.2)',  accentClass: 'text-emerald-500' };
  };

  useEffect(() => {
    const load = async () => {
      if (location.state?.phoneNumber) {
        setData(location.state as ActivationData);
        return;
      }
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('phone_number, plan_name, amount, currency, monthly_limit, billing_type, activation_state')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();
        if (sub) {
          setData({
            phoneNumber: sub.phone_number,
            planName: sub.plan_name,
            amount: sub.amount,
            currency: sub.currency,
            monthlyLimit: sub.monthly_limit,
            isAnnual: sub.billing_type === 'annual',
            activationState: sub.activation_state,
          });
        }
      }
    };
    load();
  }, [user, sessionId]);

  if (!data) return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (data.activationState && data.activationState !== 'on_air') {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-8 text-center">
        <div>
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Sincronizando...</h3>
          <p className="text-sm font-medium text-slate-500 max-w-[36ch] mx-auto">
            Estamos esperando confirmación operativa real del servicio.
          </p>
        </div>
      </div>
    );
  }

  const colors = getPlanColors(data.planName);

  // Get correct price based on isAnnual
  const planCfg = PLAN_CATALOGUE[data.planName] || PLAN_CATALOGUE.Pro;
  const displayPrice = data.isAnnual ? planCfg.annual : (data.amount || planCfg.monthly);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(formatPhone(data.phoneNumber));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  if (desktop) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] font-display flex flex-col">
        {/* Glow */}
        <div style={{ position:'fixed', top:'-100px', left:'50%', transform:'translateX(-50%)', width:'700px', height:'500px', borderRadius:'50%', background:`radial-gradient(circle, ${colors.accent}, transparent)`, filter:'blur(100px)', opacity:0.1, pointerEvents:'none', zIndex:0 }} />

        {/* Top nav */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between relative z-10">
          <TelsimLogo />
          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400">
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Plan seleccionado
            <span className="mx-1 text-slate-200">·</span>
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Región elegida
            <span className="mx-1 text-slate-200">·</span>
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            Resumen
            <span className="mx-1 text-slate-200">·</span>
            <span className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </span>
            <span className="text-emerald-600 font-bold">¡Activado!</span>
          </div>
          <div className="w-20" />
        </header>

        {/* Body */}
        <div className="flex-1 flex items-start justify-center px-8 py-12 relative z-10">
          <div className="w-full max-w-3xl">

            {/* Hero success */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-5">
                <div style={{ position:'absolute', inset:0, borderRadius:'22px', border:`2px solid ${colors.accentBorder}`, animation:'ping 2s ease-out infinite', pointerEvents:'none' }} />
                <div className="bg-white relative z-10" style={{ width:'76px', height:'76px', borderRadius:'22px', border:`1.5px solid ${colors.accentBorder}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: colors.accent, animation:'pulse 1.8s ease-in-out infinite' }} />
                <span style={{ fontSize:'10px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em', color: colors.accent }}>Línea Activada</span>
              </div>

              <h1 className="text-[38px] font-black text-slate-900 tracking-tight mb-2">¡Activación Completa!</h1>
              <p className="text-slate-500 text-[15px] font-medium">Tu SIM física está operativa y lista para su uso.</p>
            </div>

            {/* 2-col grid */}
            <div className="grid grid-cols-5 gap-6">

              {/* Left: número + detalles */}
              <div className="col-span-3 flex flex-col gap-4">

                {/* Número SIM */}
                <button
                  onClick={handleCopyPhone}
                  className="bg-white rounded-3xl border-2 p-6 flex flex-col items-center cursor-pointer hover:shadow-md transition-all w-full"
                  style={{ borderColor: colors.accentBorder }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tu Número SIM</span>
                  </div>
                  <span className="text-[32px] font-black text-slate-900 tracking-wider font-mono mb-2">{formatPhone(data.phoneNumber)}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: copied ? colors.accent : '#94a3b8' }}>
                    {copied ? '✓ Copiado al portapapeles' : 'Click para copiar'}
                  </span>
                </button>

                {/* Plan + Precio grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</span>
                    </div>
                    <p className="text-[20px] font-black uppercase tracking-tight mb-1" style={{ color: colors.accent }}>{data.planName}</p>
                    <p className="text-[11px] font-medium text-slate-400">{data.monthlyLimit} Créditos SMS / mes</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Precio</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-[20px] font-black text-slate-900">${displayPrice > 0 ? displayPrice.toFixed(2) : '—'}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isAnnualCycle ? '/año' : '/mes'}</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400">Servicio prepago</p>
                  </div>
                </div>

                {/* Shield note */}
                <div className="rounded-2xl p-4 flex gap-3" style={{ background: colors.accentBg, border: `1px solid ${colors.accentBorder}` }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:'2px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <p className="text-[12px] font-medium text-slate-600 leading-relaxed">
                    Servicio prepago. Cancela antes del <strong className="text-slate-900 font-bold">{fmt(trialEnd)}</strong> y no se realiza ningún cobro. Sin permanencia mínima.
                  </p>
                </div>
              </div>

              {/* Right: billing timeline + CTA */}
              <div className="col-span-2 flex flex-col gap-4">

                {/* Timeline */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">Ciclo de Facturación</span>
                  </div>
                  {[
                    { dot:'#10b981', label:'HOY — ACTIVACIÓN', desc:'$0.00 cobrado · Período de prueba inicia', color:'#10b981', line:true },
                    { dot:colors.accent, label:fmt(trialEnd).toUpperCase(), desc:`Fin del trial · Primer cobro · $${displayPrice > 0 ? displayPrice.toFixed(2) : '—'} ${(data.currency||'USD').toUpperCase()}`, color:colors.accent, line:true },
                    { dot:'rgba(148,163,184,0.4)', label:fmt(renewal).toUpperCase(), desc:`Segunda renovación · y así cada ${isAnnualCycle ? '365 días' : '30 días'}`, color:'#94a3b8', line:false },
                  ].map((row, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center w-3 shrink-0 pt-1">
                        <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:row.dot, flexShrink:0 }} />
                        {row.line && <div className="w-px flex-1 bg-slate-200 my-1.5 min-h-[20px]" />}
                      </div>
                      <div className={row.line ? 'pb-4' : ''}>
                        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color:row.color }}>{row.label}</p>
                        <p className="text-[11px] text-slate-500 leading-snug">{row.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <button
                  onClick={() => navigate('/web')}
                  className="w-full h-14 bg-primary hover:bg-blue-700 text-white font-black text-[14px] uppercase tracking-wide rounded-2xl flex items-center justify-between px-5 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                >
                  <span />
                  <span>Ir al Dashboard</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/web')}
                  className="w-full h-11 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-bold text-[12px] uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  Ver Facturación
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes ping { 0%{transform:scale(1);opacity:0.5;} 80%,100%{transform:scale(1.9);opacity:0;} }
          @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT (original)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display antialiased flex flex-col items-center" style={{ padding: '52px 20px 40px' }}>
      <div className="w-full max-w-sm flex flex-col" style={{ minHeight: '100vh' }}>

        {/* Glow */}
        <div style={{ position:'fixed', top:'-60px', left:'50%', transform:'translateX(-50%)', width:'500px', height:'380px', borderRadius:'50%', background:`radial-gradient(circle, ${colors.accent}, transparent)`, filter:'blur(80px)', opacity:0.15, pointerEvents:'none', zIndex:0 }} />

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div style={{ position:'relative', marginBottom:'18px' }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'22px', border:`2px solid ${colors.accentBorder}`, animation:'ping 2s ease-out infinite', pointerEvents:'none' }} />
            <div className="dark:bg-[#1A2230] bg-white" style={{ width:'76px', height:'76px', borderRadius:'22px', border:`1.5px solid ${colors.accentBorder}`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1 }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
          </div>

          <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'5px 12px', background:colors.accentBg, border:`1px solid ${colors.accentBorder}`, borderRadius:'999px', marginBottom:'14px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:colors.accent, animation:'pulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em', color:colors.accent }}>Línea Activada</span>
          </div>

          <h1 className="text-slate-900 dark:text-white" style={{ fontSize:'26px', fontWeight:600, textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:1.15, marginBottom:'8px' }}>
            ¡Activación<br/>Completa!
          </h1>
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize:'13px', fontWeight:400, lineHeight:1.5 }}>
            Tu SIM física está operativa y lista para su uso.
          </p>
        </div>

        {/* Número SIM */}
        <button onClick={handleCopyPhone}
          className="dark:bg-[#1A2230] bg-white relative z-10"
          style={{ borderRadius:'20px', border:`2px solid ${colors.accentBorder}`, padding:'20px 16px', display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer', marginBottom:'10px', width:'100%', transition:'transform 0.12s' }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <span className="text-slate-400" style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em' }}>Tu Número SIM</span>
          </div>
          <div className="text-slate-900 dark:text-white" style={{ fontSize:'22px', fontWeight:500, letterSpacing:'0.04em', fontVariantNumeric:'tabular-nums', marginBottom:'6px' }}>
            {formatPhone(data.phoneNumber)}
          </div>
          <span style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color: copied ? colors.accent : undefined }} className={copied ? '' : 'text-slate-400'}>
            {copied ? '✓ Copiado' : 'Toca para copiar'}
          </span>
        </button>

        {/* Grid plan + precio */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }} className="relative z-10">
          <div className="dark:bg-[#1A2230] bg-white" style={{ borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', padding:'14px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'8px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span className="text-slate-400" style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em' }}>Plan</span>
            </div>
            <p style={{ fontSize:'15px', fontWeight:800, letterSpacing:'-0.01em', color:colors.accent, marginBottom:'2px', textTransform:'uppercase' }}>{data.planName}</p>
            <p className="text-slate-400 dark:text-slate-500" style={{ fontSize:'10px', fontWeight:500 }}>{data.monthlyLimit} Créditos SMS</p>
          </div>
          <div className="dark:bg-[#1A2230] bg-white" style={{ borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', padding:'14px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'8px' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <span className="text-slate-400" style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em' }}>Precio</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'3px', marginBottom:'2px' }}>
              <span className="text-slate-900 dark:text-white" style={{ fontSize:'15px', fontWeight:500, letterSpacing:'-0.01em' }}>${displayPrice > 0 ? displayPrice.toFixed(2) : '—'}</span>
              <span className="text-slate-400" style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em' }}>{isAnnualCycle ? '/AÑO' : '/MES'}</span>
            </div>
            <p className="text-slate-400 dark:text-slate-500" style={{ fontSize:'10px', fontWeight:500 }}>Servicio prepago</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="dark:bg-[#1A2230] bg-white relative z-10" style={{ borderRadius:'16px', border:'1px solid rgba(255,255,255,0.06)', padding:'16px 14px', marginBottom:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span className="text-slate-900 dark:text-white" style={{ fontSize:'10px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em' }}>Ciclo de Facturación</span>
          </div>
          {[
            { dot:'#10b981', label:'HOY — ACTIVACIÓN', desc:'$0.00 cobrado · Período de prueba inicia', color:'#10b981', line:true },
            { dot:colors.accent, label:fmt(trialEnd).toUpperCase(), desc:`Fin del trial · Primer cobro · $${displayPrice > 0 ? displayPrice.toFixed(2) : '—'} ${(data.currency||'USD').toUpperCase()}`, color:colors.accent, line:true },
            { dot:'rgba(148,163,184,0.3)', label:fmt(renewal).toUpperCase(), desc:`Segunda renovación · y así cada ${isAnnualCycle ? '365 días' : '30 días'}`, color:'#94a3b8', line:false },
          ].map((row, i) => (
            <div key={i} style={{ display:'flex', gap:'10px' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'10px', flexShrink:0, paddingTop:'2px' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:row.dot, flexShrink:0 }} />
                {row.line && <div className="dark:bg-white/8 bg-slate-200" style={{ width:'1.5px', minHeight:'22px', margin:'3px 0' }} />}
              </div>
              <div style={{ paddingBottom: row.line ? '12px' : 0 }}>
                <p style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color:row.color, marginBottom:'2px' }}>{row.label}</p>
                <p className="text-slate-500 dark:text-slate-400" style={{ fontSize:'11px', fontWeight:400 }}>{row.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Shield */}
        <div className="relative z-10" style={{ borderRadius:'14px', border:`1px solid ${colors.accentBorder}`, background:colors.accentBg, padding:'14px', display:'flex', gap:'10px', marginBottom:'24px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:'1px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize:'11px', fontWeight:400, lineHeight:1.6 }}>
            Servicio prepago. Cancela antes del <strong className="text-slate-900 dark:text-white" style={{ fontWeight:700 }}>{fmt(trialEnd)}</strong> y no se realiza ningún cobro. Sin permanencia mínima.
          </p>
        </div>

        <div style={{ flex:1 }} />

        {/* Botones */}
        <div className="relative z-10" style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <button onClick={() => navigate('/dashboard/numbers')}
            style={{ width:'100%', height:'60px', background:'#1d4ed8', border:'none', borderRadius:'18px', color:'white', fontSize:'13px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px', boxShadow:'0 8px 24px rgba(29,78,216,0.35)' }}
          >
            <div style={{ width:'44px' }} />
            <span>Ver Mi Número</span>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </button>
          <button onClick={() => navigate('/dashboard/billing')}
            className="text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
            style={{ width:'100%', height:'46px', background:'transparent', borderRadius:'14px', border:'1px solid', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Ver Facturación
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:0.5;} 80%,100%{transform:scale(1.9);opacity:0;} }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
      `}</style>
    </div>
  );
};

export default ActivationSuccess;
