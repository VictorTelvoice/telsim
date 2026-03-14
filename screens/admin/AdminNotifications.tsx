import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Loader2, RotateCcw, Mail, Bot, Smartphone, Send } from 'lucide-react';

const PREFIX_EMAIL = 'template_email_';
const PREFIX_TELEGRAM = 'template_telegram_';
const PREFIX_APP = 'template_app_';

/** Plantillas conocidas por canal (si no existen en DB, se muestran vacías y se crean al guardar). */
const KNOWN_EMAIL_IDS = [
  'template_email_subscription_activated',
  'template_email_subscription_cancelled',
  'template_email_welcome_email',
];
const KNOWN_TELEGRAM_IDS = [
  'template_telegram_new_purchase',
  'template_telegram_upgrade_success',
  'template_telegram_subscription_cancelled',
  'template_telegram_cancellation',
  'template_telegram_new_sms_forward',
  'template_telegram_ceo_daily_report',
  'template_telegram_sim_error_alert',
];
const KNOWN_APP_IDS = [
  'template_app_release_success',
  'template_app_release_success_sub',
  'template_app_number_copied',
  'template_app_subscription_cancelled',
  'template_app_common_error',
  'template_app_automation_saved',
  'template_app_telegram_test_success',
  'template_app_telegram_test_error',
];

function idToLabel(id: string, prefix: string): string {
  const withoutPrefix = id.slice(prefix.length);
  return withoutPrefix
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const VARIABLES_COMMON = [
  { var: '{{nombre}}', desc: 'Nombre del usuario' },
  { var: '{{email}}', desc: 'Correo del destinatario' },
  { var: '{{phone}}', desc: 'Número de la SIM' },
  { var: '{{plan}}', desc: 'Plan activo' },
  { var: '{{message}}', desc: 'Contenido del SMS' },
  { var: '{{slot_id}}', desc: 'ID del slot físico' },
];
const VARIABLES_EMAIL_EXTRA = [
  { var: '{{amount}}', desc: 'Monto' },
  { var: '{{next_date}}', desc: 'Próxima fecha de cobro' },
  { var: '{{billing_type}}', desc: 'Tipo de facturación' },
  { var: '{{phone_number}}', desc: 'Número de teléfono' },
];

/** Valores con los que se reemplazan las variables al enviar un test. */
const TEST_VARS: Record<string, string> = {
  nombre: 'Admin Test',
  email: 'admin@telsim.io',
  phone: '+340000000',
  plan: 'Power Plan',
  message: 'Mensaje de prueba',
  slot_id: 'SLOT-TEST',
  amount: '9.99',
  next_date: '01/04/2026',
  billing_type: 'Mensual',
  phone_number: '+340000000',
};

function replaceVariablesForTest(text: string): string {
  let out = text;
  for (const [key, value] of Object.entries(TEST_VARS)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return out;
}

type TabKey = 'email' | 'telegram' | 'app';

const AdminNotifications: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('email');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [successTestId, setSuccessTestId] = useState<string | null>(null);

  const showLocalToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'} backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10 max-w-[90vw]`;
    toast.innerHTML = `<span class="text-[11px] font-bold">${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('admin_settings').select('id, content');
    const map: Record<string, string> = {};
    (data || []).forEach((r: { id: string; content: string | null }) => {
      if (
        r.id.startsWith(PREFIX_EMAIL) ||
        r.id.startsWith(PREFIX_TELEGRAM) ||
        r.id.startsWith(PREFIX_APP)
      ) {
        map[r.id] = r.content ?? '';
      }
    });
    setSettings(map);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  const getIdsForTab = (tab: TabKey): string[] => {
    if (tab === 'email') return KNOWN_EMAIL_IDS;
    if (tab === 'telegram') return KNOWN_TELEGRAM_IDS;
    return KNOWN_APP_IDS;
  };

  const getPrefixForTab = (tab: TabKey): string => {
    if (tab === 'email') return PREFIX_EMAIL;
    if (tab === 'telegram') return PREFIX_TELEGRAM;
    return PREFIX_APP;
  };

  const handleContentChange = (id: string, value: string) => {
    setSettings((s) => ({ ...s, [id]: value }));
  };

  const handleResetOne = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from('admin_settings')
        .select('content')
        .eq('id', id)
        .maybeSingle();
      const content = (data as { content: string | null } | null)?.content ?? '';
      setSettings((s) => ({ ...s, [id]: content }));
    },
    []
  );

  const handleSendTest = useCallback(
    async (id: string) => {
      const raw = settings[id] ?? '';
      const content = replaceVariablesForTest(raw);

      if (activeTab === 'app') {
        showLocalToast(content || '— (vacío)');
        setSuccessTestId(id);
        setTimeout(() => setSuccessTestId(null), 3000);
        return;
      }

      if (!user?.id) {
        showLocalToast('Inicia sesión para enviar el test.', 'error');
        return;
      }

      const channel = activeTab === 'email' ? 'email' : 'telegram';
      setSendingTestId(id);
      setSuccessTestId(null);
      try {
        const res = await fetch('/api/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send-notification-test',
            channel,
            content,
            userId: user.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showLocalToast(data.error || 'Error al enviar el test.', 'error');
          return;
        }
        setSuccessTestId(id);
        showLocalToast('¡Test enviado con éxito!');
        setTimeout(() => setSuccessTestId(null), 3000);
      } catch (e) {
        showLocalToast('Error de conexión al enviar el test.', 'error');
      } finally {
        setSendingTestId(null);
      }
    },
    [activeTab, settings, user?.id, showLocalToast]
  );

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const ids = [...KNOWN_EMAIL_IDS, ...KNOWN_TELEGRAM_IDS, ...KNOWN_APP_IDS];
      for (const id of ids) {
        const content = settings[id] ?? '';
        await supabase.from('admin_settings').upsert(
          { id, content, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
      }
      await fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  const variablesForTab = activeTab === 'email'
    ? [...VARIABLES_COMMON, ...VARIABLES_EMAIL_EXTRA]
    : VARIABLES_COMMON;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 bg-slate-50 min-h-screen">
        <Loader2 size={32} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  const prefix = getPrefixForTab(activeTab);
  const ids = getIdsForTab(activeTab);

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Gestión de Notificaciones
        </h1>
        <p className="text-slate-600 mb-6">
          Edita las plantillas de correo, Telegram y toasts de la app. Usa las variables dinámicas en el panel de la derecha.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-sm mb-6 inline-flex">
          {(
            [
              { key: 'email' as TabKey, label: 'Emails', icon: Mail },
              { key: 'telegram' as TabKey, label: 'Telegram', icon: Bot },
              { key: 'app' as TabKey, label: 'App Toasts', icon: Smartphone },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Guardar Todo
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
          {/* Cards */}
          <div className="space-y-6">
            {ids.map((id) => (
              <div
                key={id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {idToLabel(id, prefix)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendTest(id)}
                      disabled={!!sendingTestId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50"
                      title="Enviar test con variables de prueba"
                    >
                      {sendingTestId === id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Enviar Test
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetOne(id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Recuperar valor actual de la base de datos"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                  </div>
                </div>
                {successTestId === id && (
                  <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-sm font-medium">
                    ¡Test enviado con éxito!
                  </div>
                )}
                <div className="p-5">
                  <textarea
                    value={settings[id] ?? ''}
                    onChange={(e) => handleContentChange(id, e.target.value)}
                    placeholder={`Contenido para ${idToLabel(id, prefix)}. Usa variables como {{phone}}, {{plan}}...`}
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Panel Variables Dinámicas */}
          <div className="xl:sticky xl:top-6 h-fit">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                Variables dinámicas
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Inserta estas claves en el contenido; se reemplazarán por los datos reales al enviar.
              </p>
              <ul className="space-y-2">
                {variablesForTab.map(({ var: v, desc }) => (
                  <li key={v} className="flex flex-col gap-0.5">
                    <code className="text-xs font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded">
                      {v}
                    </code>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
