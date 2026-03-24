import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Loader2, RotateCcw, Mail, Bot, Smartphone, Send, Bold, Italic, Link, Palette, Underline, Eye, X, History } from 'lucide-react';
import { renderTransactionalEmail } from '../../supabase/functions/_shared/transactionalEmailRenderer';
import { getDefaultAdminEmailTestDataForEvent } from '../../lib/transactionalEmailTestDefaults';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

const PREFIX_EMAIL = 'template_email_';
const PREFIX_TELEGRAM = 'template_telegram_';
const PREFIX_APP = 'template_app_';

/** admin_settings id del bloque inferior: `<templateId>_below_details` (p. ej. template_email_new_purchase_below_details). */
function emailTemplateBelowDetailsId(templateId: string): string {
  return `${templateId}_below_details`;
}

/** admin_settings id del título visible (H1): `<templateId>_title` (p. ej. template_email_new_purchase_title). */
function emailTemplateTitleId(templateId: string): string {
  return `${templateId}_title`;
}

type NotificationHistoryRow = {
  id: string;
  created_at: string;
  recipient: string;
  channel: string;
  event: string;
  status: string;
  error_message?: string | null;
  content_preview?: string | null;
  user_email?: string;
  user_id?: string | null;
};

/** Contrato canónico: cada templateId con su event (webhook / notificaciones). El resto usa sufijo tras el prefijo. */
const CANONICAL_BLOCK_META: Record<string, { channel: 'email' | 'telegram' | 'app'; event: string }> = {
  'template_email_new_purchase': { channel: 'email', event: 'new_purchase' },
  'template_email_cancellation': { channel: 'email', event: 'cancellation' },
  'template_email_upgrade_success': { channel: 'email', event: 'upgrade_success' },
  'template_email_invoice_paid': { channel: 'email', event: 'invoice_paid' },
  'template_email_reactivation_success': { channel: 'email', event: 'reactivation_success' },
  'template_telegram_new_purchase': { channel: 'telegram', event: 'new_purchase' },
  'template_telegram_cancellation': { channel: 'telegram', event: 'cancellation' },
  'template_telegram_upgrade_success': { channel: 'telegram', event: 'upgrade_success' },
  'template_telegram_reactivation_success': { channel: 'telegram', event: 'reactivation_success' },
  'template_app_new_purchase': { channel: 'app', event: 'new_purchase' },
  'template_app_cancellation': { channel: 'app', event: 'cancellation' },
  'template_app_upgrade_success': { channel: 'app', event: 'upgrade_success' },
  'template_app_reactivation_success': { channel: 'app', event: 'reactivation_success' },
};

function getBlockMeta(templateId: string): { channel: 'email' | 'telegram' | 'app'; event: string } {
  const hit = CANONICAL_BLOCK_META[templateId];
  if (hit) return hit;
  if (templateId.startsWith(PREFIX_EMAIL)) {
    return { channel: 'email', event: templateId.slice(PREFIX_EMAIL.length) };
  }
  if (templateId.startsWith(PREFIX_TELEGRAM)) {
    return { channel: 'telegram', event: templateId.slice(PREFIX_TELEGRAM.length) };
  }
  if (templateId.startsWith(PREFIX_APP)) {
    return { channel: 'app', event: templateId.slice(PREFIX_APP.length) };
  }
  return { channel: 'email', event: 'unknown' };
}

const KNOWN_EMAIL_IDS = [
  // Canónicos (webhook Stripe) — mismo sufijo que evento: new_purchase, cancellation, upgrade_success, invoice_paid
  'template_email_new_purchase',
  'template_email_cancellation',
  'template_email_upgrade_success',
  'template_email_invoice_paid',
  'template_email_reactivation_success',
  // Legacy / otros
  'template_email_subscription_activated',
  'template_email_subscription_cancelled',
  'template_email_welcome_email',
  'template_email_payment_reminder',
  'template_email_payment_failed',
  'template_email_invoice_failed',   // Pago fallido (webhook Stripe)
  'template_email_scheduled_event', // Recordatorio de renovación
];
const KNOWN_TELEGRAM_IDS = [
  'template_telegram_new_purchase',
  'template_telegram_cancellation',
  'template_telegram_upgrade_success',
  'template_telegram_reactivation_success',
  'template_telegram_subscription_cancelled',
  'template_telegram_new_sms_forward',
  'template_telegram_ceo_daily_report',
  'template_telegram_sim_error_alert',
  'template_telegram_payment_reminder',
  'template_telegram_payment_failed',
  'template_telegram_invoice_failed',   // Pago fallido
  'template_telegram_scheduled_event', // Recordatorio
];
const KNOWN_APP_IDS = [
  'template_app_new_purchase',
  'template_app_cancellation',
  'template_app_upgrade_success',
  'template_app_reactivation_success',
  'template_app_invoice_paid',
  'template_app_release_success',
  'template_app_release_success_sub',
  'template_app_number_copied',
  'template_app_subscription_cancelled',
  'template_app_common_error',
  'template_app_automation_saved',
  'template_app_telegram_test_success',
  'template_app_telegram_test_error',
  'template_app_reminder',
  'template_app_error_alert',
];

const QUICK_EMOJIS = ['📱', '🚀', '⚠️', '✅', '⏰', '💳', '🛰️', '💬'];
// Variables rápidas para insertar en el cursor (orden: nombre, phone, monto, plan + extras)
const QUICK_VARIABLES = ['{{nombre}}', '{{phone}}', '{{monto}}', '{{plan}}', '{{limit}}'];

// Misma plantilla maestra que api/manage.ts (EMAIL_MASTER_TEMPLATE) + placeholder {{body_content}} — Preview = Send Test.
const EMAIL_TEST_WRAPPER = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7f9; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .header { background-color: #0074d4; padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px; }
    .content { padding: 40px; color: #333333; line-height: 1.6; font-size: 16px; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #0074d4; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .highlight { color: #0074d4; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>TELSIM</h1></div>
    <div class="content">
      {{body_content}}
    </div>
    <div class="footer">
      <p>© 2026 Telsim.io - Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

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
  { var: '{{end_date}}', desc: 'Fecha fin de período / próximo ciclo' },
  { var: '{{status}}', desc: 'Estado (Activo, Cancelado, …)' },
  { var: '{{billing_type}}', desc: 'Tipo de facturación' },
  { var: '{{phone_number}}', desc: 'Número de teléfono' },
];

/** Variables que el webhook envía por evento canónico (Telegram / email alineados). */
const CANONICAL_STRIPE_BLOCKS: {
  event: string;
  title: string;
  telegramId: string;
  emailId: string;
  vars: { var: string; desc: string }[];
}[] = [
  {
    event: 'new_purchase',
    title: 'Compra nueva',
    telegramId: 'template_telegram_new_purchase',
    emailId: 'template_email_new_purchase',
    vars: [
      { var: '{{nombre}}', desc: 'Nombre del usuario' },
      { var: '{{email}}', desc: 'Correo' },
      { var: '{{phone}}', desc: 'Número de línea' },
      { var: '{{plan}}', desc: 'Plan contratado' },
      { var: '{{end_date}}', desc: 'Próxima fecha relevante' },
      { var: '{{status}}', desc: 'Estado' },
      { var: '{{slot_id}}', desc: 'ID del slot' },
      { var: '{{amount}}', desc: 'Monto cobrado (texto)' },
      { var: '{{billing_type}}', desc: 'Mensual / Anual' },
      { var: '{{next_date}}', desc: 'Próximo cobro' },
    ],
  },
  {
    event: 'cancellation',
    title: 'Cancelación',
    telegramId: 'template_telegram_cancellation',
    emailId: 'template_email_cancellation',
    vars: [
      { var: '{{nombre}}', desc: 'Nombre del usuario' },
      { var: '{{email}}', desc: 'Correo' },
      { var: '{{phone}}', desc: 'Número' },
      { var: '{{plan}}', desc: 'Plan' },
      { var: '{{plan_name}}', desc: 'Plan en slot (alias)' },
      { var: '{{end_date}}', desc: 'Fin del período facturado (Stripe); no es la fecha de cierre de la acción' },
      { var: '{{status}}', desc: 'Estado' },
      { var: '{{slot_id}}', desc: 'ID del slot' },
      { var: '{{phone_number}}', desc: 'Teléfono (alias)' },
      { var: '{{date}}', desc: 'Fecha/hora del aviso (legado; mismo instante que canceled_at con otro formato)' },
      { var: '{{canceled_at}}', desc: 'Fecha y hora en que el usuario ejecutó la cancelación (dd-mm-yyyy HH:mm)' },
      { var: '{{reactivation_deadline}}', desc: 'Fin de la reserva 48h / plazo para reactivar (dd-mm-yyyy HH:mm)' },
    ],
  },
  {
    event: 'upgrade_success',
    title: 'Upgrade exitoso',
    telegramId: 'template_telegram_upgrade_success',
    emailId: 'template_email_upgrade_success',
    vars: [
      { var: '{{nombre}}', desc: 'Nombre' },
      { var: '{{email}}', desc: 'Correo' },
      { var: '{{phone}}', desc: 'Número' },
      { var: '{{plan}}', desc: 'Nuevo plan' },
      { var: '{{end_date}}', desc: 'Fecha de referencia' },
      { var: '{{status}}', desc: 'Estado' },
      { var: '{{slot_id}}', desc: 'ID del slot' },
      { var: '{{billing}}', desc: 'Mensual / Anual' },
      { var: '{{now}}', desc: 'Marca de tiempo local' },
    ],
  },
  {
    event: 'reactivation_success',
    title: 'Reactivación exitosa',
    telegramId: 'template_telegram_reactivation_success',
    emailId: 'template_email_reactivation_success',
    vars: [
      { var: '{{nombre}}', desc: 'Nombre' },
      { var: '{{email}}', desc: 'Correo' },
      { var: '{{phone}}', desc: 'Número de línea' },
      { var: '{{phone_number}}', desc: 'Teléfono (alias)' },
      { var: '{{plan}}', desc: 'Plan' },
      { var: '{{status}}', desc: 'Estado' },
      { var: '{{billing_type}}', desc: 'Mensual / Anual' },
    ],
  },
];

// Inyección de datos de prueba: reemplazo de variables antes de enviar al API (claves largas primero para alias).
const TEST_VARS: Record<string, string> = {
  nombre: 'CEO Test',
  email: 'admin@telsim.io',
  phone: '+56900000000',
  phone_number: '+56900000000',
  plan: 'Plan Pro',
  plan_name: 'Plan Pro',
  message: 'Mensaje de prueba',
  slot_id: 'SLOT-TEST',
  status: 'Activo',
  end_date: '31/12/2026',
  next_date: '01/04/2026',
  billing_type: 'Mensual',
  amount: '$39.90',
  monto: '$39.90',
  currency: 'USD',
  ticket_id: 'TKT-TEST-001',
  used: '42',
  limit: '1000',
  remaining: '958',
  date: '20/03/2026 12:00',
  billing: 'Mensual',
  now: '20/03/2026 12:00',
  canceled_at: '20-03-2026 12:00',
  reactivation_deadline: '22-03-2026 12:00',
};

function replaceVariablesForTest(text: string): string {
  let out = text;
  const keys = Object.keys(TEST_VARS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const value = TEST_VARS[key];
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return out;
}

/** Mismo subject/content que usa "Enviar Test" (variables ya sustituidas). */
function getResolvedTestPayload(
  templateId: string,
  settings: Record<string, string>,
  emailSubjects: Record<string, string>
): { content: string; subject: string; contentBelowDetails?: string; contentTitle?: string } {
  const raw = settings[templateId] ?? '';
  const content = replaceVariablesForTest(raw);
  const subject = replaceVariablesForTest(emailSubjects[templateId] ?? '');
  if (templateId.startsWith(PREFIX_EMAIL)) {
    const belowRaw = settings[emailTemplateBelowDetailsId(templateId)] ?? '';
    const titleRaw = settings[emailTemplateTitleId(templateId)] ?? '';
    return {
      content,
      subject,
      contentBelowDetails: replaceVariablesForTest(belowRaw),
      contentTitle: replaceVariablesForTest(titleRaw),
    };
  }
  return { content, subject };
}

type TabKey = 'email' | 'telegram' | 'app' | 'history';

const AdminTemplates: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('email');
  const [settings, setSettings] = useState<Record<string, string>>({});
  /** Solo plantillas email: asunto editable en BD (`admin_settings.subject`). */
  const [emailSubjects, setEmailSubjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [successTestId, setSuccessTestId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<NotificationHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEmailSearch, setHistoryEmailSearch] = useState('');
  const [historyEventSearch, setHistoryEventSearch] = useState('');
  const [historyDetail, setHistoryDetail] = useState<NotificationHistoryRow | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const historyEmailRef = useRef('');
  const historyEventRef = useRef('');
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  historyEmailRef.current = historyEmailSearch;
  historyEventRef.current = historyEventSearch;

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

  const handleEmailSubjectChange = (id: string, value: string) => {
    setEmailSubjects((s) => ({ ...s, [id]: value }));
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
    const { data } = await supabase.from('admin_settings').select('id, content, subject');
    const map: Record<string, string> = {};
    const subjects: Record<string, string> = {};
    (data || []).forEach((r: { id: string; content: string | null; subject?: string | null }) => {
      if (
        r.id.startsWith(PREFIX_EMAIL) ||
        r.id.startsWith(PREFIX_TELEGRAM) ||
        r.id.startsWith(PREFIX_APP)
      ) {
        map[r.id] = r.content ?? '';
        if (r.id.startsWith(PREFIX_EMAIL)) {
          subjects[r.id] = r.subject ?? '';
        }
      }
    });
    [...KNOWN_EMAIL_IDS, ...KNOWN_TELEGRAM_IDS, ...KNOWN_APP_IDS].forEach((id) => {
      if (!(id in map)) map[id] = '';
    });
    KNOWN_EMAIL_IDS.forEach((id) => {
      if (!(id in subjects)) subjects[id] = '';
    });
    KNOWN_EMAIL_IDS.forEach((id) => {
      const bid = emailTemplateBelowDetailsId(id);
      if (!(bid in map)) map[bid] = '';
    });
    KNOWN_EMAIL_IDS.forEach((id) => {
      const tid = emailTemplateTitleId(id);
      if (!(tid in map)) map[tid] = '';
    });

    // Migración suave (solo estado local): si existía copy en scheduled_event y no en reactivation_success, copiar para editar/guardar manualmente.
    const reactivationEmailId = 'template_email_reactivation_success';
    const scheduledEmailId = 'template_email_scheduled_event';
    if ((map[reactivationEmailId] ?? '').trim() === '' && (map[scheduledEmailId] ?? '').trim() !== '') {
      map[reactivationEmailId] = map[scheduledEmailId] ?? '';
      if ((subjects[reactivationEmailId] ?? '').trim() === '' && (subjects[scheduledEmailId] ?? '').trim() !== '') {
        subjects[reactivationEmailId] = subjects[scheduledEmailId] ?? '';
      }
      const belowRe = emailTemplateBelowDetailsId(reactivationEmailId);
      const belowSched = emailTemplateBelowDetailsId(scheduledEmailId);
      if ((map[belowRe] ?? '').trim() === '' && (map[belowSched] ?? '').trim() !== '') {
        map[belowRe] = map[belowSched] ?? '';
      }
      const titleRe = emailTemplateTitleId(reactivationEmailId);
      const titleSched = emailTemplateTitleId(scheduledEmailId);
      if ((map[titleRe] ?? '').trim() === '' && (map[titleSched] ?? '').trim() !== '') {
        map[titleRe] = map[titleSched] ?? '';
      }
    }
    const rtg = 'template_telegram_reactivation_success';
    const stg = 'template_telegram_scheduled_event';
    if ((map[rtg] ?? '').trim() === '' && (map[stg] ?? '').trim() !== '') {
      map[rtg] = map[stg] ?? '';
    }

    setSettings(map);
    setEmailSubjects(subjects);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    if ((user.id || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
      setHistoryList([]);
      showLocalToast('Solo el administrador puede consultar el historial.', 'error');
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list-notification-history',
          userId: ADMIN_UID,
          emailSearch: historyEmailRef.current.trim() || undefined,
          eventSearch: historyEventRef.current.trim() || undefined,
          limit: 200,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.list)) {
        setHistoryList(data.list as NotificationHistoryRow[]);
      } else {
        setHistoryList([]);
        showLocalToast(typeof data.error === 'string' ? data.error : 'No se pudo cargar el historial.', 'error');
      }
    } catch {
      setHistoryList([]);
      showLocalToast('Error de red al cargar el historial.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id, showLocalToast]);

  useEffect(() => {
    if (activeTab === 'history' && user?.id) fetchHistory();
  }, [activeTab, user?.id, fetchHistory]);

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
        .select('content, subject')
        .eq('id', id)
        .maybeSingle();
      const row = data as { content: string | null; subject?: string | null } | null;
      const content = row?.content ?? '';
      setSettings((s) => ({ ...s, [id]: content }));
      if (id.startsWith(PREFIX_EMAIL)) {
        setEmailSubjects((s) => ({ ...s, [id]: row?.subject ?? '' }));
      }
      if (id.startsWith(PREFIX_EMAIL)) {
        const bid = emailTemplateBelowDetailsId(id);
        const { data: belowRow } = await supabase
          .from('admin_settings')
          .select('content')
          .eq('id', bid)
          .maybeSingle();
        const titleId = emailTemplateTitleId(id);
        const { data: titleRow } = await supabase
          .from('admin_settings')
          .select('content')
          .eq('id', titleId)
          .maybeSingle();
        setSettings((s) => ({
          ...s,
          [bid]: (belowRow as { content?: string | null } | null)?.content ?? '',
          [titleId]: (titleRow as { content?: string | null } | null)?.content ?? '',
        }));
      }
    },
    []
  );

  const handleSendTest = useCallback(
    async (templateId: string) => {
      const meta = getBlockMeta(templateId);
      const resolved = getResolvedTestPayload(templateId, settings, emailSubjects);
      const { content, subject } = resolved;

      if (meta.channel === 'app') {
        showLocalToast(content || '— (vacío)');
        setSuccessTestId(templateId);
        setTimeout(() => setSuccessTestId(null), 3000);
        return;
      }

      if (!user?.id) {
        showLocalToast('Sesión expirada. Recarga la página.', 'error');
        return;
      }

      setSendingTestId(templateId);
      setSuccessTestId(null);
      try {
        const body: Record<string, unknown> = {
          action: 'send-notification-test',
          channel: meta.channel,
          templateId,
          event: meta.event,
          content,
          userId: user.id,
        };
        if (meta.channel === 'email') {
          body.subject = subject;
          if (templateId.startsWith(PREFIX_EMAIL)) {
            body.contentBelowDetails = resolved.contentBelowDetails ?? '';
            body.contentTitle = resolved.contentTitle ?? '';
          }
        }
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
          setSuccessTestId(templateId);
          showLocalToast(data.message || '✅ Test enviado con éxito.', 'success');
          setTimeout(() => setSuccessTestId(null), 3000);
        }
      } catch (e) {
        showLocalToast('No se pudo conectar con el servidor de Telsim.', 'error');
      } finally {
        setSendingTestId(null);
      }
    },
    [settings, emailSubjects, user, showLocalToast]
  );

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      for (const id of KNOWN_EMAIL_IDS) {
        const content = settings[id] ?? '';
        const subj = (emailSubjects[id] ?? '').trim();
        await supabase.from('admin_settings').upsert(
          { id, content, subject: subj || null, updated_at: updatedAt },
          { onConflict: 'id' }
        );
        const bid = emailTemplateBelowDetailsId(id);
        await supabase.from('admin_settings').upsert(
          {
            id: bid,
            content: settings[bid] ?? '',
            subject: null,
            updated_at: updatedAt,
          },
          { onConflict: 'id' }
        );
        const titleId = emailTemplateTitleId(id);
        await supabase.from('admin_settings').upsert(
          {
            id: titleId,
            content: settings[titleId] ?? '',
            subject: null,
            updated_at: updatedAt,
          },
          { onConflict: 'id' }
        );
      }
      for (const id of [...KNOWN_TELEGRAM_IDS, ...KNOWN_APP_IDS]) {
        const content = settings[id] ?? '';
        await supabase.from('admin_settings').upsert(
          { id, content, subject: null, updated_at: updatedAt },
          { onConflict: 'id' }
        );
      }
      await fetchSettings();
      showLocalToast('Guardado exitoso.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const variablesForTab = activeTab === 'email'
    ? [...VARIABLES_COMMON, ...VARIABLES_EMAIL_EXTRA]
    : VARIABLES_COMMON;

  /** Antes de cualquier return temprano: mismo orden de hooks en todos los renders. */
  const previewResolved =
    previewId != null ? getResolvedTestPayload(previewId, settings, emailSubjects) : null;

  const emailPreviewSrcDoc = useMemo(() => {
    if (!previewId || !previewId.startsWith(PREFIX_EMAIL)) return '';
    const resolved = getResolvedTestPayload(previewId, settings, emailSubjects);
    const meta = getBlockMeta(previewId);
    const titleTrim = resolved.contentTitle?.trim() ?? '';
    const data: Record<string, unknown> = {
      ...getDefaultAdminEmailTestDataForEvent(meta.event),
      ...TEST_VARS,
      ...(titleTrim !== '' ? { contentTitle: titleTrim } : {}),
    };
    const rendered = renderTransactionalEmail({
      event: meta.event,
      data,
      subject: resolved.subject || undefined,
      contentTitle: titleTrim !== '' ? titleTrim : undefined,
      contentHtml: resolved.content,
      contentBelowDetails: resolved.contentBelowDetails,
      lang: 'es',
    });
    return (
      rendered?.html ?? EMAIL_TEST_WRAPPER.replace('{{body_content}}', resolved.content)
    );
  }, [previewId, settings, emailSubjects]);

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
                    <th className="px-5 py-3 w-36">Acciones</th>
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
                          {row.user_email || row.recipient}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{row.channel ?? '—'}</td>
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
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setHistoryDetail(row)}
                              className="text-xs font-semibold text-blue-600 hover:underline px-1"
                            >
                              Ver
                            </button>
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
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {historyDetail ? (
              <div
                className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50"
                role="dialog"
                aria-modal="true"
                onClick={() => setHistoryDetail(null)}
              >
                <div
                  className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Detalle del envío</h3>
                    <button
                      type="button"
                      onClick={() => setHistoryDetail(null)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                      aria-label="Cerrar"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <dl className="space-y-3 text-sm text-slate-800">
                    <div>
                      <dt className="text-slate-500 font-medium">Asunto</dt>
                      <dd className="mt-0.5">No almacenado en historial</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Destinatario</dt>
                      <dd className="mt-0.5 break-all">{historyDetail.recipient}</dd>
                    </div>
                    {historyDetail.user_email ? (
                      <div>
                        <dt className="text-slate-500 font-medium">Usuario (email)</dt>
                        <dd className="mt-0.5 break-all">{historyDetail.user_email}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-slate-500 font-medium">Evento</dt>
                      <dd className="mt-0.5">{historyDetail.event}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Estado</dt>
                      <dd className="mt-0.5">{historyDetail.status === 'sent' ? 'Enviado' : 'Error'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Vista previa / snippet</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-700">
                        {historyDetail.content_preview?.trim() ? historyDetail.content_preview : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Fecha</dt>
                      <dd className="mt-0.5">
                        {new Date(historyDetail.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' })}
                      </dd>
                    </div>
                    {historyDetail.error_message ? (
                      <div>
                        <dt className="text-slate-500 font-medium">Mensaje de error</dt>
                        <dd className="mt-0.5 text-red-700 whitespace-pre-wrap break-words">{historyDetail.error_message}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            ) : null}
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
                  {activeTab === 'email' && (
                    <div className="mb-4">
                      <label htmlFor={`subject-${id}`} className="block text-sm font-medium text-slate-700 mb-1.5">
                        Asunto
                      </label>
                      <input
                        id={`subject-${id}`}
                        type="text"
                        value={emailSubjects[id] ?? ''}
                        onChange={(e) => handleEmailSubjectChange(id, e.target.value)}
                        placeholder="Asunto del correo (opcional si el evento tiene predeterminado)"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                    </div>
                  )}
                  {activeTab === 'email' && id.startsWith(PREFIX_EMAIL) && (
                    <div className="mb-4">
                      <label htmlFor={`email-visual-title-${id}`} className="block text-sm font-medium text-slate-700 mb-1.5">
                        Título del correo
                      </label>
                      <input
                        id={`email-visual-title-${id}`}
                        type="text"
                        value={settings[emailTemplateTitleId(id)] ?? ''}
                        onChange={(e) => handleContentChange(emailTemplateTitleId(id), e.target.value)}
                        placeholder="Título visible en el cuerpo (opcional — predeterminado del evento si vacío)"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Guardado en{' '}
                        <code className="text-[10px] bg-slate-100 px-1 rounded font-mono">{emailTemplateTitleId(id)}</code>
                      </p>
                    </div>
                  )}
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
                  {activeTab === 'email' && id.startsWith(PREFIX_EMAIL) && (
                    <>
                      <p className="mt-2 text-xs text-slate-500">
                        Opcional: texto debajo del cuadro de detalles en el correo canónico. Guardado en{' '}
                        <code className="text-[10px] bg-slate-100 px-1 rounded font-mono">{emailTemplateBelowDetailsId(id)}</code>
                        . El marcador legacy en el cuerpo superior se limpia al enviar.
                      </p>
                      <div className="mt-4">
                        <label
                          htmlFor={`below-${emailTemplateBelowDetailsId(id)}`}
                          className="block text-sm font-medium text-slate-700 mb-1.5"
                        >
                          Texto debajo del cuadro
                        </label>
                        <textarea
                          ref={(el) => {
                            textareaRefs.current[emailTemplateBelowDetailsId(id)] = el;
                          }}
                          id={`below-${emailTemplateBelowDetailsId(id)}`}
                          value={settings[emailTemplateBelowDetailsId(id)] ?? ''}
                          onChange={(e) =>
                            handleContentChange(emailTemplateBelowDetailsId(id), e.target.value)
                          }
                          placeholder="HTML opcional debajo del cuadro de detalles (mismas variables que arriba)."
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="xl:sticky xl:top-6 h-fit space-y-4">
            {(activeTab === 'telegram' || activeTab === 'email') && (
              <div className="bg-emerald-50/80 rounded-xl border border-emerald-200/80 shadow-sm p-4">
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                  Eventos Stripe (canónicos)
                </h3>
                <p className="text-[11px] text-emerald-800/90 mb-3">
                  Webhook usa <code className="font-mono bg-white/80 px-1 rounded">template_{activeTab === 'email' ? 'email' : 'telegram'}_&lt;evento&gt;</code> con evento = new_purchase, cancellation, upgrade_success. Email de factura paga: template_email_invoice_paid.
                </p>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {CANONICAL_STRIPE_BLOCKS.map((block) => {
                    const tid = activeTab === 'email' ? block.emailId : block.telegramId;
                    return (
                      <div key={block.event} className="border border-emerald-100 rounded-lg p-2.5 bg-white/60">
                        <p className="text-[11px] font-semibold text-slate-800">{block.title}</p>
                        <p className="text-[10px] font-mono text-slate-500 mb-1.5 break-all">{tid}</p>
                        <ul className="space-y-1">
                          {block.vars.map(({ var: v, desc }) => (
                            <li key={`${block.event}-${v}`} className="flex flex-col gap-0.5">
                              <code className="text-[10px] font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{v}</code>
                              <span className="text-[10px] text-slate-500">{desc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {activeTab === 'email' && (
                    <div className="border border-emerald-100 rounded-lg p-2.5 bg-white/60">
                      <p className="text-[11px] font-semibold text-slate-800">Factura pagada</p>
                      <p className="text-[10px] font-mono text-slate-500 mb-1.5">template_email_invoice_paid</p>
                      <ul className="space-y-1">
                        {[
                          ['{{nombre}}', 'Nombre'],
                          ['{{email}}', 'Correo'],
                          ['{{phone}}', 'Número'],
                          ['{{plan}}', 'Plan'],
                          ['{{end_date}}', 'Próximo ciclo / renovación'],
                          ['{{status}}', 'Estado'],
                          ['{{slot_id}}', 'Slot'],
                          ['{{amount}}', 'Importe'],
                          ['{{total}}', 'Total'],
                          ['{{receipt_url}}', 'Recibo'],
                        ].map(([v, desc]) => (
                          <li key={v} className="flex flex-col gap-0.5">
                            <code className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded">{v}</code>
                            <span className="text-[10px] text-slate-500">{desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                {previewId.startsWith(PREFIX_EMAIL) && previewResolved ? (
                  <>
                    <p className="text-sm text-slate-700 mb-2">
                      <span className="font-semibold">Asunto (mismo que Enviar Test):</span>{' '}
                      {previewResolved.subject || (
                        <span className="text-slate-500 italic">(vacío — en producción puede usarse el predeterminado por evento)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mb-2">
                      Mismo renderer que send-email (eventos canónicos). Plantillas legacy: envoltura simple.
                    </p>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[60vh] min-h-[400px]">
                      <iframe
                        key={previewId}
                        title="Vista previa del correo"
                        srcDoc={emailPreviewSrcDoc}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-2">
                      Mismo cuerpo que Enviar Test (variables de prueba aplicadas). Se actualiza al editar.
                    </p>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-auto p-4 h-[60vh] min-h-[400px]">
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">
                        {previewResolved?.content || '(vacío)'}
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
