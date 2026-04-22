'use client';

import React, { useState, useTransition, useRef } from 'react';
import {
  Globe,
  Key,
  Zap,
  Code,
  Copy,
  Check,
  RefreshCw,
  Save,
  CheckCircle2,
  Info,
  ExternalLink,
  Eye,
  EyeOff,
  Webhook,
  ShieldCheck,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { updateWebhookConfig, regenerateApiKey } from '@/actions/settingsActions';

interface ApiContentProps {
  initialUser: {
    id: string;
    name: string | null;
    email: string | null;
    webhookUrl: string | null;
    webhookActive: boolean;
    apiSecretKey: string | null;
  } | null;
}

const EXAMPLE_PAYLOAD = {
  event: 'sms.received',
  from: 'REMITENTE',
  content: 'Tu código de verificación es 847291. Válido por 10 minutos.',
  verification_code: '847291',
  service: 'Google',
  slot_id: '1A',
  received_at: new Date().toISOString(),
};

const EXAMPLE_VERIFY = `import { createHmac } from 'crypto';

// En tu endpoint webhook:
const signature = req.headers['x-telsim-signature'];
const body = JSON.stringify(req.body);
const expected = createHmac('sha256', process.env.TELSIM_SECRET)
  .update(body)
  .digest('hex');

if (signature !== expected) {
  return res.status(401).json({ error: 'Invalid signature' });
}`;

export default function ApiContent({ initialUser }: ApiContentProps) {
  const [webhookUrl, setWebhookUrl] = useState(initialUser?.webhookUrl || '');
  const [isActive, setIsActive] = useState(initialUser?.webhookActive || false);
  const [apiKey, setApiKey] = useState(initialUser?.apiSecretKey || null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [activeTab, setActiveTab] = useState<'config' | 'docs'>('config');

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateWebhookConfig({ url: webhookUrl, active: isActive });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('¿Estás seguro? El key actual quedará inválido inmediatamente.')) return;
    setRegenerating(true);
    try {
      const result = await regenerateApiKey();
      if (result.success && result.key) {
        setApiKey(result.key);
        setRevealedKey(result.key);
        setShowKey(true);
        setTimeout(() => {
          setRevealedKey(null);
          setShowKey(false);
        }, 30000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const maskedKey = apiKey
    ? `whsec_${'•'.repeat(32)}${apiKey.slice(-4)}`
    : 'Sin configurar — genera tu primera key';

  const displayKey = showKey && revealedKey ? revealedKey : maskedKey;

  return (
    <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-4 rounded-3xl text-emerald-500">
            <Webhook size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              API & Webhooks
            </h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Integra Telsim con tus aplicaciones
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-all ${
          isActive
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          {isActive ? 'Webhook Activo' : 'Webhook Inactivo'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit">
        <TabBtn active={activeTab === 'config'} onClick={() => setActiveTab('config')} label="Configuración" icon={<Zap size={14} />} />
        <TabBtn active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} label="Documentación" icon={<Code size={14} />} />
      </div>

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Config form */}
          <div className="space-y-6">
            {/* Success Banner */}
            {saveSuccess && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Configuración guardada correctamente.</p>
              </div>
            )}

            {/* Webhook URL */}
            <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)] space-y-5">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-primary" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Endpoint Webhook</h2>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  URL (POST)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://tuapp.com/api/webhook/telsim"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-primary outline-none transition-all"
                />
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium ml-1 mt-2">
                  Telsim enviará un POST con el payload JSON a esta URL cuando llegue un SMS.
                </p>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Estado del webhook</p>
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {isActive ? 'Las notificaciones están habilitadas' : 'Las notificaciones están pausadas'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${isActive ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>

            {/* API Secret Key */}
            <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)] space-y-5">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-amber-500" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">API Secret Key</h2>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <code className="flex-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate min-w-0">
                  {displayKey}
                </code>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {showKey && revealedKey && (
                    <>
                      <button
                        onClick={() => handleCopy(revealedKey, setCopiedKey)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-primary/40 transition-colors"
                        title="Copiar key"
                      >
                        {copiedKey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-600 dark:text-slate-400" />}
                      </button>
                      <button
                        onClick={() => { setShowKey(false); setRevealedKey(null); }}
                        className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors"
                        title="Ocultar"
                      >
                        <EyeOff size={14} className="text-slate-600 dark:text-slate-400" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-amber-400/50 transition-colors disabled:opacity-50 uppercase tracking-wide"
                  >
                    <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                    {regenerating ? 'Generando...' : 'Regenerar'}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
                <ShieldCheck size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                  Usamos esta key para firmar cada request con <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">X-Telsim-Signature</code> (HMAC-SHA256). Guárdala en tus variables de entorno.
                  {revealedKey && <strong className="block mt-1">⚠️ Guarda la key ahora — no se mostrará de nuevo.</strong>}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Payload preview & info */}
          <div className="space-y-6">
            {/* Info box */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-[2rem] p-6">
              <div className="flex items-center gap-2 text-primary mb-3">
                <Info size={18} />
                <h3 className="text-sm font-black uppercase tracking-tight">¿Qué es un Webhook?</h3>
              </div>
              <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-4">
                Cuando Telsim recibe un SMS en cualquiera de tus líneas, enviará automáticamente una petición POST a tu endpoint con el contenido del mensaje en formato JSON. Esto te permite automatizar respuestas, extraer códigos OTP y sincronizar con tus servicios.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InfoPill icon={<Zap size={12} />} text="Tiempo real" />
                <InfoPill icon={<ShieldCheck size={12} />} text="Firmado HMAC" />
                <InfoPill icon={<Globe size={12} />} text="POST JSON" />
                <InfoPill icon={<RefreshCw size={12} />} text="Reintentos auto" />
              </div>
            </div>

            {/* Payload example */}
            <div className="bg-slate-950 rounded-[2rem] border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payload de ejemplo</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <button
                    onClick={() => handleCopy(JSON.stringify(EXAMPLE_PAYLOAD, null, 2), setCopiedPayload)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 transition-colors"
                  >
                    {copiedPayload ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-400" />}
                  </button>
                </div>
              </div>
              <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed no-scrollbar">
                {JSON.stringify(EXAMPLE_PAYLOAD, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Verification code example */}
          <div className="space-y-6">
            <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)]">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={18} className="text-emerald-500" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Verificar Firma</h2>
              </div>
              <p className="text-[12px] text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Verifica que el request proviene de Telsim comprobando la firma <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">X-Telsim-Signature</code>:
              </p>
              <div className="relative">
                <pre className="text-[10px] font-mono text-emerald-400 bg-slate-950 rounded-2xl p-5 overflow-x-auto leading-relaxed no-scrollbar border border-slate-800">
                  {EXAMPLE_VERIFY}
                </pre>
                <button
                  onClick={() => handleCopy(EXAMPLE_VERIFY, setCopiedCode)}
                  className="absolute top-3 right-3 p-2 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Campos del payload */}
            <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)]">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-5">Campos del Payload</h2>
              <div className="space-y-3">
                {[
                  { field: 'event', type: 'string', desc: 'Siempre "sms.received"' },
                  { field: 'from', type: 'string', desc: 'Remitente del SMS (número o nombre)' },
                  { field: 'content', type: 'string', desc: 'Contenido completo del mensaje' },
                  { field: 'verification_code', type: 'string | null', desc: 'Código OTP extraído automáticamente' },
                  { field: 'service', type: 'string', desc: 'Servicio detectado (Google, WhatsApp, etc.)' },
                  { field: 'slot_id', type: 'string', desc: 'ID del slot SIM que recibió el mensaje' },
                  { field: 'received_at', type: 'ISO 8601', desc: 'Timestamp de recepción en UTC' },
                ].map(({ field, type, desc }) => (
                  <div key={field} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <code className="text-[10px] font-mono font-black text-primary flex-shrink-0 mt-0.5">{field}</code>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">{desc}</p>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase">{type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: HTTP Headers & tips */}
          <div className="space-y-6">
            <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)]">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-5">Headers de la Petición</h2>
              <div className="space-y-3">
                {[
                  { header: 'Content-Type', value: 'application/json' },
                  { header: 'X-Telsim-Signature', value: 'hex(hmac-sha256(body, secret))' },
                  { header: 'X-Telsim-Event', value: 'sms.received' },
                  { header: 'User-Agent', value: 'Telsim-Webhook/2.0' },
                ].map(({ header, value }) => (
                  <div key={header} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <code className="text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 flex-shrink-0">{header}</code>
                    <code className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{value}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--card)] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-[var(--shadow)]">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Respuesta Esperada</h2>
              <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Tu endpoint debe responder con <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono text-[11px]">HTTP 200</code> en menos de <strong className="text-slate-800 dark:text-slate-200">5 segundos</strong>. Si falla, Telsim reintentará hasta 3 veces con backoff exponencial.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">200, 201, 204 → Éxito</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl">
                  <ArrowRight size={14} className="text-red-400" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">4xx, 5xx, timeout → Reintento</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-gradient-to-br from-slate-900 to-primary-dark rounded-[2rem] p-6 text-white relative overflow-hidden">
              <div className="absolute -top-8 -right-8 opacity-10">
                <Code size={100} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight mb-3">¿Necesitas ayuda?</h3>
              <p className="text-[11px] text-white/60 leading-relaxed mb-5">
                Revisa la guía completa de integración o contacta soporte si necesitas ayuda configurando tu webhook.
              </p>
              <div className="space-y-2">
                <a href="/app/support" className="flex items-center justify-between w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  Chat con Soporte
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
        active
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800/50 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300">
      <span className="text-primary">{icon}</span>
      {text}
    </div>
  );
}
