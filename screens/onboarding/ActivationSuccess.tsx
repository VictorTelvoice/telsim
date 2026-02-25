import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';

interface ActivationData {
  phoneNumber: string;
  planName: string;
  amount: number;
  currency: string;
  monthlyLimit: number;
}

const ActivationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { addNotification } = useNotifications();
  const [data, setData] = useState<ActivationData | null>(null);
  const [copied, setCopied] = useState(false);
  const notifSent = useRef(false);

  const sessionId = new URLSearchParams(location.search).get('session_id');

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  const renewal = new Date();
  renewal.setDate(renewal.getDate() + 37);
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
      // Datos desde location.state (viene de Processing.tsx)
      if (location.state?.phoneNumber) {
        setData(location.state as ActivationData);
        return;
      }
      // Fallback: consultar Supabase
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('phone_number, plan_name, amount, currency, monthly_limit')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();
        if (sub) setData({ phoneNumber: sub.phone_number, planName: sub.plan_name, amount: sub.amount, currency: sub.currency, monthlyLimit: sub.monthly_limit });
      }
    };
    load();
  }, [user, sessionId]);

  // Enviar notificación una sola vez
  useEffect(() => {
    if (!data || notifSent.current) return;
    notifSent.current = true;
    addNotification({
      title: '✅ Nueva Suscripción Activada',
      message: `Tu plan ${data.planName} está activo. Número asignado: ${formatPhone(data.phoneNumber)}. Primer cobro el ${fmt(trialEnd)}.`,
      type: 'subscription'
    });
  }, [data]);

  if (!data) return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
      <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const colors = getPlanColors(data.planName);

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
        <button onClick={() => { navigator.clipboard.writeText(formatPhone(data.phoneNumber)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
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
              <span className="text-slate-900 dark:text-white" style={{ fontSize:'15px', fontWeight:500, letterSpacing:'-0.01em' }}>${data.amount > 0 ? data.amount.toFixed(2) : '—'}</span>
              <span className="text-slate-400" style={{ fontSize:'9px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em' }}>/MES</span>
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
            { dot:colors.accent, label:fmt(trialEnd).toUpperCase(), desc:`Fin del trial · Primer cobro · $${data.amount > 0 ? data.amount.toFixed(2) : '—'} ${(data.currency||'USD').toUpperCase()}`, color:colors.accent, line:true },
            { dot:'rgba(148,163,184,0.3)', label:fmt(renewal).toUpperCase(), desc:'Segunda renovación · y así cada 30 días', color:'#94a3b8', line:false },
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
