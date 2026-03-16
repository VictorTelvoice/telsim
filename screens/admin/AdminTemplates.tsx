import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Loader2, RotateCcw, Mail, Bot, Smartphone, Send, Bold, Italic, Link, Palette, Underline, Eye, X, History } from 'lucide-react';

const PREFIX_EMAIL = 'template_email_';
const PREFIX_TELEGRAM = 'template_telegram_';
const PREFIX_APP = 'template_app_';

const KNOWN_EMAIL_IDS = [
  'template_email_subscription_activated',
  'template_email_subscription_cancelled',
  'template_email_welcome_email',
  'template_email_upgrade_success',
  'template_email_payment_reminder',
  'template_email_payment_failed',
  'template_email_invoice_failed',   // Pago fallido (webhook Stripe)
  'template_email_scheduled_event', // Recordatorio de renovación
];
const KNOWN_TELEGRAM_IDS = [
  'template_telegram_new_purchase',
  'template_telegram_upgrade_success',
  'template_telegram_subscription_cancelled',
  'template_telegram_cancellation',
  'template_telegram_new_sms_forward',
  'template_telegram_ceo_daily_report',
  'template_telegram_sim_error_alert',
  'template_telegram_payment_reminder',
  'template_telegram_payment_failed',
  'template_telegram_invoice_failed',   // Pago fallido
  'template_telegram_scheduled_event', // Recordatorio
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
  'template_app_upgrade_success',
  'template_app_reminder',
  'template_app_error_alert',
];

const QUICK_EMOJIS = ['📱', '🚀', '⚠️', '✅', '⏰', '💳', '🛰️', '💬'];
// Variables rápidas para insertar en el cursor (orden: nombre, phone, monto, plan + extras)
const QUICK_VARIABLES = ['{{nombre}}', '{{phone}}', '{{monto}}', '{{plan}}', '{{limit}}'];

// Plantilla maestra de correo (misma que send-email): marco TELSIM para previsualización.
const MASTER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f9; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background-color: #0074d4; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: bold; }
        .content { padding: 40px; line-height: 1.6; color: #333333; font-size: 16px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .button { display: inline-block; padding: 12px 25px; background-color: #0074d4; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .highlight { color: #0074d4; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TELSIM</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>© 2026 Telvoice Telecom LLC. Todos los derechos reservados.</p>
            <p>Has recibido este correo porque eres cliente de Telsim.io</p>
        </div>
    </div>
</body>
</html>`;

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
  { var: '{{monto}}', desc: 'Monto (alias)' },
  { var: '{{next_date}}', desc: 'Próxima fecha de cobro' },
  { var: '{{billing_type}}', desc: 'Tipo de facturación' },
  { var: '{{phone_number}}', desc: 'Número de teléfono' },
];

// Inyección de datos de prueba: reemplazo de variables antes de enviar al API (misma lógica que producción).
const TEST_VARS: Record<string, string> = {
  nombre: 'CEO Test',
  email: 'admin@telsim.io',
  phone: '+56900000000',
  plan: 'Plan Pro',
  message: 'Mensaje de prueba',
  slot_id: 'SLOT-TEST',
  amount: '$39.90',
  monto: '$39.90',
  next_date: '01/04/2026',
  billing_type: 'Mensual',
  phone_number: '+56900000000',
};

function replaceVariablesForTest(text: string): string {
  let out = text;
  for (const [key, value] of Object.entries(TEST_VARS)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return out;
}

type TabKey = 'email' | 'telegram' | 'app' | 'history';

const AdminTemplates: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('email');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [successTestId, setSuccessTestId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<Array<{ id: string; created_at: string; recipient: string; channel: string; event: string; status: string; error_message?: string | null; user_email?: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEmailSearch, setHistoryEmailSearch] = useState('');
  const [historyEventSearch, setHistoryEventSearch] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const insertAtCursor = useCallback((id: string, before: string, after?: string) => {
    const ta = textareaRefs.current[id];
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = settings[id] ?? '';
    const newVal = after != null
      ? val.slice(0, start) + before + val.slice(start, end) + after + val.slice(end)
      : val.slice(0, start) + before + val.slice(end);
    handleContentChange(id, newVal);
    setTimeout(() => {
      ta.focus();
      const newStart = start + before.length;
      const newEnd = after != null ? newStart + (end - start) : newStart;
      ta.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [settings]);

  const handleContentChange = (id: string, value: string) => {
    setSettings((s) => ({ ...s, [id]: value }));
  };

  const showLocalToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10 max-w-[90vw]`;
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
    [...KNOWN_EMAIL_IDS, ...KNOWN_TELEGRAM_IDS, ...KNOWN_APP_IDS].forEach((id) => {
      if (!(id in map)) map[id] = '';
    });
    setSettings(map);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list-notification-history',
          userId: user.id,
          emailSearch: historyEmailSearch.trim() || undefined,
          eventSearch: historyEventSearch.trim() || undefined,
          limit: 200,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.list)) setHistoryList(data.list);
      else setHistoryList([]);
    } catch {
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id, historyEmailSearch, historyEventSearch]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  const handleRetryNotification = useCallback(
    async (logId: string) => {
      if (!user?.id) {
        showLocalToast('Sesión expirada. Recarga la página.', 'error');
        return;
      }
      setRetryingLogId(logId);
      try {
        const res = await fetch('/api/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'retry-notification',
            logId,
            userId: user.id,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showLocalToast('✅ Mensaje reintentado con éxito.', 'success');
          fetchHistory();
        } else {
          showLocalToast(data.error || 'Error al reintentar.', 'error');
        }
      } catch {
        showLocalToast('No se pudo conectar con el servidor.', 'error');
      } finally {
        setRetryingLogId(null);
      }
    },
    [user?.id, showLocalToast, fetchHistory]
  );

  const getIdsForTab = (tab: TabKey): string[] => {
    if (tab === 'email') return KNOWN_EMAIL_IDS;
    if (tab === 'telegram') return KNOWN_TELEGRAM_IDS;
    if (tab === 'history') return [];
    return KNOWN_APP_IDS;
  };

  const getPrefixForTab = (tab: TabKey): string => {
    if (tab === 'email') return PREFIX_EMAIL;
    if (tab === 'telegram') return PREFIX_TELEGRAM;
    if (tab === 'history') return '';
    return PREFIX_APP;
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
        showLocalToast('Sesión expirada. Recarga la página.', 'error');
        return;
      }

      setSendingTestId(id);
      setSuccessTestId(null);
      try {
        const body = {
          action: 'send-notification-test',
          channel: activeTab === 'email' ? 'email' : 'telegram',
          content,
          userId: user.id, // user.id real del usuario autenticado
          isTest: true,
        };
        const response = await fetch('/api/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        // LEER JSON UNA SOLA VEZ
        const data = await response.json();

        // Respuesta completa del servidor para diagnosticar 403, 404, 500, etc.
        console.log('[AdminTemplates send-test]', {
          status: response.status,
          ok: response.ok,
          data,
        });

        if (!response.ok) {
          showLocalToast(data.error || 'Error al enviar el test.', 'error');
        } else {
          setSuccessTestId(id);
          showLocalToast(data.message || '✅ Test enviado con éxito.', 'success');
          setTimeout(() => setSuccessTestId(null), 3000);
        }
      } catch (e) {
        showLocalToast('No se pudo conectar con el servidor de Telsim.', 'error');
      } finally {
        setSendingTestId(null);
      }
    },
    [activeTab, settings, user, showLocalToast]
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
          Plantillas
        </h1>
        <p className="text-slate-600 mb-6">
          Gestiona el contenido que ven los clientes: correos, mensajes de Telegram y toasts de la app. Usa las variables dinámicas en el panel de la derecha.
        </p>

        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-sm mb-6 inline-flex">
          {(
            [
              { key: 'email' as TabKey, label: 'Emails', icon: Mail },
              { key: 'telegram' as TabKey, label: 'Telegram', icon: Bot },
              { key: 'app' as TabKey, label: 'App Toasts', icon: Smartphone },
              { key: 'history' as TabKey, label: 'Historial de Envíos', icon: History },
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

        {activeTab !== 'history' && (
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
        )}

        {activeTab === 'history' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Filtrar por email o destinatario..."
                value={historyEmailSearch}
                onChange={(e) => setHistoryEmailSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-48 max-w-full"
              />
              <input
                type="text"
                placeholder="Filtrar por evento..."
                value={historyEventSearch}
                onChange={(e) => setHistoryEventSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-40 max-w-full"
              />
              <button
                type="button"
                onClick={() => fetchHistory()}
                disabled={historyLoading}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                {historyLoading ? <Loader2 size={16} className="animate-spin inline" /> : 'Buscar'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 font-semibold">
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Usuario / Destinatario</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Evento</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500"><Loader2 size={24} className="animate-spin mx-auto" /></td></tr>
                  ) : historyList.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No hay registros.</td></tr>
                  ) : (
                    historyList.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-5 py-3 text-slate-800">
                          {(row as { user_email?: string }).user_email || row.recipient}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{row.channel}</td>
                        <td className="px-5 py-3 text-slate-700">{row.event}</td>
                        <td className="px-5 py-3">
                          <span
                            title={row.status === 'error' && row.error_message ? row.error_message : undefined}
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              row.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.status === 'sent' ? 'Enviado' : 'Error'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {row.status === 'error' && (row.channel === 'telegram' || row.channel === 'email') ? (
                            <button
                              type="button"
                              onClick={() => handleRetryNotification(row.id)}
                              disabled={retryingLogId !== null}
                              title="Reintentar envío"
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                              {retryingLogId === row.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <RotateCcw size={18} />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
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
                    {(activeTab === 'email' || activeTab === 'telegram') && (
                      <button
                        type="button"
                        onClick={() => setPreviewId(id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                        title={activeTab === 'email' ? 'Ver correo con plantilla TELSIM' : 'Ver mensaje con variables reemplazadas'}
                      >
                        <Eye size={14} />
                        Previsualizar
                      </button>
                    )}
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
                    ✅ Mensaje de prueba enviado a {activeTab === 'email' ? 'Email' : 'Telegram'}
                  </div>
                )}
                <div className="p-5">
                  {/* Barra de formato: HTML para email (compatible con plantilla maestra), Markdown para resto */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 self-center">Formato:</span>
                    {activeTab === 'email' ? (
                      <>
                        <button type="button" onClick={() => insertAtCursor(id, '<strong>', '</strong>')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Negrita (HTML)"><Bold size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '<em>', '</em>')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Cursiva (HTML)"><Italic size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '<u>', '</u>')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Subrayado"><Underline size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '<a href="url">', '</a>')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Enlace (reemplaza url por la URL real)"><Link size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '<span style="color:#0074d4">', '</span>')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Color azul TELSIM"><Palette size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '<span style="color:#dc2626">', '</span>')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Color rojo"><Palette size={16} className="opacity-70" /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => insertAtCursor(id, '**', '**')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Negrita"><Bold size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '_', '_')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Cursiva"><Italic size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '<u>', '</u>')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Subrayado"><Underline size={16} /></button>
                        <button type="button" onClick={() => insertAtCursor(id, '[texto](url)')} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700" title="Link"><Link size={16} /></button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 self-center">Emojis:</span>
                    {QUICK_EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => insertAtCursor(id, emoji)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-lg leading-none" title={`Insertar ${emoji}`}>{emoji}</button>
                    ))}
                  </div>
                  {/* Caja de variables rápidas: {{nombre}}, {{phone}}, {{monto}}, {{plan}} + más */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 self-center">Variables:</span>
                    {QUICK_VARIABLES.map((v) => (
                      <button key={v} type="button" onClick={() => insertAtCursor(id, v)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-mono font-medium" title={`Insertar ${v} en el cursor`}>{v}</button>
                    ))}
                  </div>
                  <textarea
                    ref={(el) => { textareaRefs.current[id] = el; }}
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
        )}

        {/* Modal de previsualización: correo (plantilla maestra TELSIM) o Telegram (texto) */}
        {previewId != null && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setPreviewId(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Previsualizar"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">
                  Previsualización: {previewId.startsWith(PREFIX_EMAIL) ? idToLabel(previewId, PREFIX_EMAIL) : idToLabel(previewId, PREFIX_TELEGRAM)}
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewId(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 min-h-0 p-4 bg-slate-100 rounded-b-2xl">
                {previewId.startsWith(PREFIX_EMAIL) ? (
                  <>
                    <p className="text-xs text-slate-500 mb-2">
                      Vista previa con la plantilla maestra TELSIM. Se actualiza al editar.
                    </p>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[60vh] min-h-[400px]">
                      <iframe
                        key={previewId}
                        title="Vista previa del correo"
                        srcDoc={MASTER_TEMPLATE.replace('{{content}}', settings[previewId] ?? '')}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-2">
                      Mensaje con variables reemplazadas (ej. {'{{nombre}}'} → CEO Test). Se actualiza al editar.
                    </p>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-auto p-4 h-[60vh] min-h-[400px]">
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">
                        {replaceVariablesForTest(settings[previewId] ?? '') || '(vacío)'}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTemplates;
