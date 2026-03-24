import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Zap, Copy, Check, Code2, Globe, Shield } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Logo ────────────────────────────────────────────────────────────────────

const TelsimLogo: React.FC = () => (
  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
    <span className="material-symbols-rounded text-white text-[20px]">sim_card</span>
  </div>
);

// ─── Code block ──────────────────────────────────────────────────────────────

const CodeBlock: React.FC<{ code: string; id: string; onCopy: (id: string, text: string) => void; copiedId: string | null }> = ({ code, id, onCopy, copiedId }) => (
  <div className="relative rounded-xl bg-slate-900 p-4 font-mono text-[12px] text-slate-300 overflow-x-auto">
    <pre className="whitespace-pre-wrap">{code}</pre>
    <button
      onClick={() => onCopy(id, code)}
      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
      {copiedId === id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-400" />}
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ApiGuide: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    function setCopied(v: string) {
      setCopiedId(v);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-[#F0F4F8] text-slate-900'}`}>

      {/* ── Header ── */}
      <div className={`sticky top-0 z-20 border-b px-8 py-4 flex items-center gap-4 ${isDark ? 'border-slate-800 bg-slate-900/95 backdrop-blur' : 'border-slate-200 bg-white/95 backdrop-blur'}`}>
        <button onClick={() => navigate(-1)}
          className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
          <ArrowLeft size={18} />
        </button>
        <TelsimLogo />
        <div className="flex-1">
          <h1 className="text-[15px] font-black">Guía de API & Webhooks</h1>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Documentación técnica · REST API v1</p>
        </div>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>v1.0</span>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-8 py-10 flex flex-col gap-10">

        {/* ── Autenticación ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key size={14} className="text-primary" />
            </div>
            <h2 className="text-[14px] font-black uppercase tracking-wider">Autenticación</h2>
          </div>
          <p className={`text-[13px] mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Todas las solicitudes deben incluir tu <strong>API Key</strong> en el encabezado de autorización. La encuentras en <strong>Ajustes → API & Webhooks</strong>.
          </p>
          <CodeBlock id="auth-header" onCopy={handleCopy} copiedId={copiedId}
            code={`Authorization: Bearer telsim_YOUR_API_KEY`}
          />
          <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Base URL: <code className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">https://api.telsim.app/v1</code>
          </p>
        </section>

        {/* ── SIMs ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Globe size={14} className="text-sky-500" />
            </div>
            <h2 className="text-[14px] font-black uppercase tracking-wider">SIMs</h2>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <div className={`flex items-center gap-2 mb-2`}>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">GET</span>
                <code className={`text-[12px] font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>/sims</code>
                <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>— Lista todas las SIMs asignadas</span>
              </div>
              <CodeBlock id="get-sims" onCopy={handleCopy} copiedId={copiedId}
                code={`curl -X GET https://api.telsim.app/v1/sims \\
  -H "Authorization: Bearer telsim_YOUR_API_KEY"`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-mono">GET</span>
                <code className={`text-[12px] font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>/sims/:slot_id/messages</code>
                <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>— Mensajes de una SIM</span>
              </div>
              <CodeBlock id="get-msgs" onCopy={handleCopy} copiedId={copiedId}
                code={`curl -X GET https://api.telsim.app/v1/sims/{slot_id}/messages \\
  -H "Authorization: Bearer telsim_YOUR_API_KEY"`}
              />
              <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Respuesta incluye: <code className="font-mono">sender</code>, <code className="font-mono">content</code>, <code className="font-mono">received_at</code>, <code className="font-mono">extracted_code</code>.
              </p>
            </div>

            {/* Response example */}
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ejemplo de respuesta</p>
              <CodeBlock id="resp-example" onCopy={handleCopy} copiedId={copiedId}
                code={JSON.stringify({
                  data: [{
                    slot_id: "sim_abc123",
                    sender: "Google",
                    content: "Tu código de verificación es 482910",
                    extracted_code: "482910",
                    received_at: "2025-01-15T14:32:00Z"
                  }],
                  total: 1
                }, null, 2)}
              />
            </div>
          </div>
        </section>

        {/* ── Webhooks ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Zap size={14} className="text-amber-500" />
            </div>
            <h2 className="text-[14px] font-black uppercase tracking-wider">Webhooks</h2>
          </div>

          <p className={`text-[13px] mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Cuando llega un SMS, Telsim hace un <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-mono">POST</code> a tu URL configurada con el siguiente cuerpo JSON:
          </p>

          <CodeBlock id="webhook-body" onCopy={handleCopy} copiedId={copiedId}
            code={JSON.stringify({
              event: "sms_received",
              slot_id: "sim_abc123",
              phone_number: "+56912345678",
              sender: "Google",
              content: "Tu código de verificación es 482910",
              extracted_code: "482910",
              received_at: "2025-01-15T14:32:00Z"
            }, null, 2)}
          />
        </section>

        {/* ── Verificar firma ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Shield size={14} className="text-violet-500" />
            </div>
            <h2 className="text-[14px] font-black uppercase tracking-wider">Verificar firma</h2>
          </div>
          <p className={`text-[13px] mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Cada request incluye el header <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-mono">X-Telsim-Signature</code>. Usa el secreto configurado para validar que el mensaje proviene de Telsim:
          </p>
          <CodeBlock id="verify-sig" onCopy={handleCopy} copiedId={copiedId}
            code={`const crypto = require('crypto');

function verifySignature(payload, secret, signature) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return \`sha256=\${expected}\` === signature;
}

// En tu endpoint:
app.post('/webhooks/telsim', (req, res) => {
  const sig = req.headers['x-telsim-signature'];
  if (!verifySignature(req.body, process.env.TELSIM_SECRET, sig)) {
    return res.status(401).json({ error: 'Firma inválida' });
  }
  // Procesar evento…
  res.json({ ok: true });
});`}
          />
        </section>

        {/* ── Eventos disponibles ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Code2 size={14} className="text-emerald-500" />
            </div>
            <h2 className="text-[14px] font-black uppercase tracking-wider">Eventos disponibles</h2>
          </div>
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            {[
              { event: 'sms_received',  desc: 'Se recibe un SMS en cualquier SIM asignada' },
              { event: 'code_detected', desc: 'Se extrae automáticamente un código OTP/2FA' },
              { event: 'sim_activated', desc: 'Una SIM es activada por primera vez' },
              { event: 'sim_expired',   desc: 'Una SIM llega a su fecha de expiración' },
            ].map((ev, i, arr) => (
              <div key={ev.event}
                className={`flex items-center gap-4 px-4 py-3.5 ${i < arr.length - 1 ? (isDark ? 'border-b border-slate-800' : 'border-b border-slate-100') : ''} ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}>
                <code className={`text-[11px] font-mono font-bold px-2 py-1 rounded flex-shrink-0 ${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  {ev.event}
                </code>
                <span className={`text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ev.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Back button ── */}
        <button onClick={() => navigate(-1)}
          className={`self-start flex items-center gap-2 text-[12px] font-bold px-4 py-2.5 rounded-xl transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'}`}>
          <ArrowLeft size={14} /> Volver a Ajustes
        </button>

      </div>
    </div>
  );
};

export default ApiGuide;
