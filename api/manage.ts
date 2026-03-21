/**
 * TELSIM · POST /api/manage
 *
 * Único punto de entrada para la API de administración (100% independiente, sin _helpers).
 * Body: { action: 'portal' | 'payment-method' | 'notify-ticket-reply' | 'upgrade' | 'cancel' | 'send-test' | 'verify-bot' | 'send-notification-test' | ... }
 */
import type Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyStripeCheckoutBillingCompliance } from './_helpers/stripeCheckoutCompliance.js';
import { releaseSlotAtomicForCancelPolicy } from './_helpers/releaseSlotAtomicForCancelPolicy.js';
import {
  extractReceiptUrlFromInvoice,
  invoiceCustomerTaxIdsForDb,
  invoiceTaxBreakdownForDb,
  invoiceTaxCents,
} from './_helpers/stripeInvoice.js';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

/** Datos de prueba solo para send-notification-test (email); inline para evitar imports fuera de /api en Vercel. */
function getLocalAdminEmailTestDataForEvent(event: string): Record<string, unknown> {
  const base = {
    nombre: 'CEO Test',
    email: 'noreply@telsim.io',
    to_email: 'noreply@telsim.io',
    phone: '+56900000000',
    phone_number: '+56900000000',
    plan: 'Plan Pro',
    plan_name: 'Plan Pro',
    amount: '$39.90',
    monto: '$39.90',
    currency: 'USD',
    billing_type: 'Mensual',
    next_date: '31/12/2026',
    end_date: '31/12/2026',
    slot_id: 'A1',
    limit: '400',
    monthly_limit: '400',
  };

  switch (event) {
    case 'cancellation':
      return { ...base, status: 'Cancelado' };
    case 'invoice_paid':
      return { ...base, status: 'Pagado' };
    case 'upgrade_success':
      return { ...base, status: 'Activo' };
    case 'new_purchase':
    default:
      return { ...base, status: 'Activo' };
  }
}

type StripeClient = InstanceType<(typeof import('stripe'))['default']>;
let stripeClientPromise: Promise<StripeClient> | null = null;

/** Instancia única del SDK; carga el paquete `stripe` solo en la primera llamada (no al importar este módulo). */
async function getStripeClient(): Promise<StripeClient> {
  if (!stripeClientPromise) {
    stripeClientPromise = import('stripe').then(({ default: Stripe }) => {
      return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-01-28.clover' as any,
      });
    });
  }
  return stripeClientPromise;
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Valida Bearer de Supabase y devuelve el user id autenticado (o null). */
async function getRequestAuthUserId(req: any): Promise<string | null> {
  const authHeader = req.headers?.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL;
  if (!anonKey || !url) return null;
  const supabaseAuth = createClient(url, anonKey, { global: { fetch } });
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);
  if (error || !user?.id) return null;
  return user.id;
}

async function assertSlotCancelAllowed(
  req: any,
  slotId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authUid = await getRequestAuthUserId(req);
  if (!authUid) {
    return { ok: false, status: 401, error: 'Se requiere sesión para liberar por slot_id.' };
  }
  if ((authUid || '').toLowerCase() === ADMIN_UID.toLowerCase()) {
    return { ok: true };
  }
  const { data: slotRow, error } = await supabaseAdmin
    .from('slots')
    .select('assigned_to')
    .eq('slot_id', slotId)
    .maybeSingle();
  if (error) {
    return { ok: false, status: 500, error: error.message };
  }
  if (!slotRow) {
    return { ok: false, status: 404, error: 'Slot no encontrado.' };
  }
  const assigned = slotRow.assigned_to;
  if (assigned != null && String(assigned) === String(authUid)) {
    return { ok: true };
  }
  return { ok: false, status: 403, error: 'No autorizado para liberar este slot.' };
}

/** Fila API para el panel de facturación del cliente (fuentes oficiales Stripe). */
function mapStripeInvoiceToRow(inv: Stripe.Invoice, dbRow?: Record<string, unknown> | null) {
  const receiptUrl = extractReceiptUrlFromInvoice(inv);
  const subRaw = inv.subscription;
  const subscription_id =
    typeof subRaw === 'string' ? subRaw : subRaw && typeof subRaw === 'object' ? subRaw.id : null;
  const taxFromStripe = invoiceTaxCents(inv);
  const subtotalStripe = inv.subtotal ?? 0;
  const totalStripe = inv.total ?? 0;
  const taxDb = typeof dbRow?.tax_cents === 'number' || typeof dbRow?.tax_cents === 'string' ? Number(dbRow.tax_cents) : null;
  const subDb =
    typeof dbRow?.subtotal_cents === 'number' || typeof dbRow?.subtotal_cents === 'string'
      ? Number(dbRow.subtotal_cents)
      : null;
  const totalDb =
    typeof dbRow?.total_cents === 'number' || typeof dbRow?.total_cents === 'string' ? Number(dbRow.total_cents) : null;

  const customerTax =
    Array.isArray(dbRow?.customer_tax_ids) && dbRow.customer_tax_ids.length > 0
      ? dbRow.customer_tax_ids
      : invoiceCustomerTaxIdsForDb(inv);
  const taxBreakdown =
    Array.isArray(dbRow?.tax_breakdown) && (dbRow.tax_breakdown as unknown[]).length > 0
      ? dbRow.tax_breakdown
      : invoiceTaxBreakdownForDb(inv);

  return {
    id: inv.id,
    number: inv.number ?? null,
    status: inv.status ?? null,
    created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
    currency: inv.currency ?? 'usd',
    amount_due: inv.amount_due ?? 0,
    amount_paid: inv.amount_paid ?? 0,
    total: inv.total ?? 0,
    subscription_id,
    hosted_invoice_url: inv.hosted_invoice_url ?? (dbRow?.hosted_invoice_url as string) ?? null,
    invoice_pdf: inv.invoice_pdf ?? (dbRow?.invoice_pdf as string) ?? null,
    receipt_url: receiptUrl || ((dbRow?.receipt_url as string) ?? null),
    subtotal_cents: subtotalStripe || subDb || 0,
    tax_cents: taxFromStripe || taxDb || 0,
    total_cents: totalStripe || totalDb || 0,
    customer_tax_ids: customerTax,
    tax_breakdown: taxBreakdown,
  };
}

/** Fila API cuando solo existe registro en subscription_invoices (p. ej. no listada por Stripe en ese momento). */
function mapSubscriptionInvoiceDbRowToApiRow(r: Record<string, unknown>): ReturnType<typeof mapStripeInvoiceToRow> {
  const stripeInvoiceId = String(r.stripe_invoice_id ?? '');
  const createdAt = r.created_at ? new Date(r.created_at as string).toISOString() : null;
  const amountPaid = Number(r.amount_paid_cents ?? 0);
  const totalCents = Number(r.total_cents ?? amountPaid);
  return {
    id: stripeInvoiceId,
    number: null,
    status: 'paid',
    created: createdAt,
    currency: String(r.currency ?? 'usd'),
    amount_due: 0,
    amount_paid: amountPaid,
    total: totalCents,
    subscription_id: (r.stripe_subscription_id as string) ?? null,
    hosted_invoice_url: (r.hosted_invoice_url as string) ?? null,
    invoice_pdf: (r.invoice_pdf as string) ?? null,
    receipt_url: (r.receipt_url as string) ?? null,
    subtotal_cents: Number(r.subtotal_cents ?? 0),
    tax_cents: Number(r.tax_cents ?? 0),
    total_cents: totalCents,
    customer_tax_ids: Array.isArray(r.customer_tax_ids) ? r.customer_tax_ids : [],
    tax_breakdown: Array.isArray(r.tax_breakdown) ? r.tax_breakdown : [],
  };
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { status: 'online' | 'error'; until: number }>();

function getBaseUrl(req: any): string {
  const host = req?.headers?.host;
  if (host) {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.telsim.io';
}

function escapeHtml(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type NotificationChannel = 'email' | 'telegram' | 'sms_product';
type NotificationCategory = 'product_delivery' | 'operational';

/** Inserta en notification_history sin bloquear el flujo (columnas: type, event_name, content). */
async function insertNotificationLog(params: {
  user_id: string;
  channel: NotificationChannel;
  recipient: string;
  event: string;
  status: 'sent' | 'error';
  category?: NotificationCategory;
  content_preview?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from('notification_history').insert({
      user_id: params.user_id,
      type: params.channel,
      event_name: params.event,
      recipient: params.recipient,
      content: params.content_preview ?? null,
      status: params.status,
      error_message: params.error_message ?? null,
    });
  } catch {
    // no bloquear por fallo de historial
  }
}

/** Envío interno Telegram con logging automático (category + metadata opcional). Devuelve { success, error? } para evitar 500. */
async function internalSendTelegram(options: {
  userId: string;
  content: string;
  category?: NotificationCategory;
  event?: string;
  metadata?: { slot_id?: string; phone_number?: string };
}): Promise<{ success: boolean; error?: string }> {
  const event = options.event ?? 'notification';
  const category = options.category ?? 'operational';
  const preview = (options.content || '').slice(0, 500) || null;
  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id')
      .eq('id', options.userId)
      .maybeSingle();
    const token = userRow?.telegram_token?.trim();
    const chatId = userRow?.telegram_chat_id?.trim();
    if (!token || !chatId) {
      return { success: false, error: 'Telegram no configurado para este usuario.' };
    }
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: options.content, parse_mode: 'Markdown' }),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    await insertNotificationLog({
      user_id: options.userId,
      channel: 'telegram',
      recipient: `Telegram:${chatId}`,
      event,
      status: tgRes.ok ? 'sent' : 'error',
      category,
      content_preview: preview,
      error_message: tgRes.ok ? null : (tgData?.description ?? null),
      metadata: options.metadata ? { slot_id: options.metadata.slot_id, phone_number: options.metadata.phone_number } : undefined,
    });
    if (!tgRes.ok) return { success: false, error: tgData?.description || 'Error de Telegram' };
    return { success: true };
  } catch (err) {
    const msg = (err as Error)?.message || 'Error enviando Telegram';
    await insertNotificationLog({
      user_id: options.userId,
      channel: 'telegram',
      recipient: '',
      event,
      status: 'error',
      category,
      content_preview: preview,
      error_message: msg,
      metadata: options.metadata ? { slot_id: options.metadata.slot_id, phone_number: options.metadata.phone_number } : undefined,
    });
    return { success: false, error: msg };
  }
}

/**
 * Envío interno Email con logging automático (category + metadata opcional). Devuelve { success, error? } para evitar 500.
 * Llama a la Edge Function send-email de Supabase, que usa Resend. Payload compatible con Resend: from, to, subject, html.
 * Remitente por defecto: Telsim noreply@telsim.io. Si Resend devuelve error (dominio no verificado, API key inválida), se devuelve en error para el Toast.
 * Variables en Supabase Secrets: RESEND_API_KEY y RESEND_FROM_EMAIL.
 */
async function internalSendEmail(options: {
  userId: string;
  toEmail?: string;
  event: string;
  content?: string;
  data?: Record<string, unknown>;
  category?: NotificationCategory;
  metadata?: { slot_id?: string; phone_number?: string };
  from?: string;
  subject?: string;
  html?: string;
  is_test?: boolean;
  custom_content?: string;
  /** Passthrough a Edge Function send-email (p. ej. tests desde Admin Templates). */
  template_id?: string;
}): Promise<{ success: boolean; error?: string; httpStatus?: number; rawBodySnippet?: string }> {
  const category = options.category ?? 'operational';
  const preview = (options.content ?? options.html ?? options.custom_content ?? '').slice(0, 500) || null;
  try {
    let email = options.toEmail ?? (options.data?.to_email as string) ?? (options.data?.email as string);
    if (!email) {
      const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', options.userId).maybeSingle();
      email = userData?.email;
    }
    if (!email) return { success: false, error: 'No hay email para este usuario.' };
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return { success: false, error: 'Configuración de email faltante.' };
    let body: string;
    try {
      body = JSON.stringify({
        event: options.event,
        user_id: options.userId,
        to_email: email,
        data: options.data ?? {},
        content: options.content ?? undefined,
        from: options.from ?? undefined,
        subject: options.subject ?? undefined,
        html: options.html ?? undefined,
        is_test: options.is_test ?? undefined,
        custom_content: options.custom_content ?? undefined,
        template_id: options.template_id ?? undefined,
      });
    } catch (serializeErr) {
      const msg = serializeErr instanceof Error ? serializeErr.message : String(serializeErr);
      console.error('[internalSendEmail] JSON.stringify failed', { event: options.event, userId: options.userId, msg });
      return { success: false, error: `Payload inválido (no serializable): ${msg}` };
    }
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body,
    });
    const rawBody = await res.text();
    let result: Record<string, unknown> = {};
    try {
      result = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // respuesta no JSON (ej. HTML de error)
    }
    // Capturar el error de Resend (dominio no verificado, API key inválida, etc.) para mostrarlo en el Toast.
    const errFromDetail = result?.detail && typeof result.detail === 'object' && (result.detail as Record<string, unknown>)?.message != null
      ? String((result.detail as Record<string, unknown>).message)
      : null;
    const errorDetail = !res.ok
      ? (typeof result?.error === 'string' ? result.error : typeof result?.message === 'string' ? result.message : errFromDetail) || rawBody || `HTTP ${res.status}`
      : null;
    await insertNotificationLog({
      user_id: options.userId,
      channel: 'email',
      recipient: email,
      event: options.event,
      status: res.ok ? 'sent' : 'error',
      category,
      content_preview: preview,
      error_message: res.ok ? null : errorDetail,
      metadata: options.metadata ? { slot_id: options.metadata.slot_id, phone_number: options.metadata.phone_number } : undefined,
    });
    const snippet = rawBody.slice(0, 4000);
    if (!res.ok) {
      return {
        success: false,
        error: errorDetail || 'Error enviando email',
        httpStatus: res.status,
        rawBodySnippet: snippet,
      };
    }
    return { success: true };
  } catch (err) {
    const msg = (err as Error)?.message || 'Error enviando email';
    console.error('[internalSendEmail] fetch/network failed', { event: options.event, userId: options.userId, msg });
    await insertNotificationLog({
      user_id: options.userId,
      channel: 'email',
      recipient: '',
      event: options.event,
      status: 'error',
      category,
      content_preview: preview,
      error_message: msg,
      metadata: options.metadata ? { slot_id: options.metadata.slot_id, phone_number: options.metadata.phone_number } : undefined,
    });
    return { success: false, error: msg };
  }
}

/**
 * Función unificada de envío (corazón de Telsim).
 * - telegram | email: envía y registra con category (operational por defecto).
 * - sms_product: solo registra con category 'product_delivery' (auditoría de ventas).
 * Devuelve { success, error?: string } para que el llamador pueda devolver JSON sin 500.
 */
async function sendUnified(options: {
  channel: NotificationChannel;
  userId: string;
  category?: NotificationCategory;
  event: string;
  recipient?: string;
  content: string;
  data?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const { channel, userId, event, content, data = {} } = options;
  const category = options.category ?? (channel === 'sms_product' ? 'product_delivery' : 'operational');
  const preview = (content || '').slice(0, 500) || null;

  if (channel === 'sms_product') {
    await insertNotificationLog({
      user_id: userId,
      channel: 'sms_product',
      recipient: options.recipient ?? '',
      event,
      status: 'sent',
      category: 'product_delivery',
      content_preview: preview,
    });
    return { success: true };
  }

  if (channel === 'telegram') {
    try {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('telegram_token, telegram_chat_id')
        .eq('id', userId)
        .maybeSingle();
      const token = userRow?.telegram_token?.trim();
      const chatId = userRow?.telegram_chat_id?.trim();
      if (!token || !chatId) {
        return { success: false, error: 'Telegram no configurado para este usuario.' };
      }
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: content, parse_mode: 'Markdown' }),
      });
      const tgData = await tgRes.json().catch(() => ({}));
      await insertNotificationLog({
        user_id: userId,
        channel: 'telegram',
        recipient: `Telegram:${chatId}`,
        event,
        status: tgRes.ok ? 'sent' : 'error',
        category,
        content_preview: preview,
        error_message: tgRes.ok ? null : (tgData?.description ?? null),
      });
      if (!tgRes.ok) return { success: false, error: tgData?.description || 'Error de Telegram' };
      return { success: true };
    } catch (err) {
      const msg = (err as Error)?.message || 'Error enviando Telegram';
      await insertNotificationLog({
        user_id: userId,
        channel: 'telegram',
        recipient: '',
        event,
        status: 'error',
        category,
        content_preview: preview,
        error_message: msg,
      });
      return { success: false, error: msg };
    }
  }

  if (channel === 'email') {
    try {
      const email = (data?.to_email as string) ?? (data?.email as string);
      if (!email) {
        const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', userId).maybeSingle();
        const to = userData?.email;
        if (!to) return { success: false, error: 'No hay email para este usuario.' };
        (data as Record<string, unknown>).to_email = to;
        (data as Record<string, unknown>).email = to;
      }
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceKey) return { success: false, error: 'Configuración de email faltante.' };
      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({
          event,
          user_id: userId,
          to_email: (data?.to_email as string) ?? (data?.email as string),
          data,
          content: content || undefined,
        }),
      });
      const result = await res.json().catch(() => ({}));
      const ok = res.ok;
      await insertNotificationLog({
        user_id: userId,
        channel: 'email',
        recipient: (data?.to_email as string) ?? (data?.email as string) ?? '',
        event,
        status: ok ? 'sent' : 'error',
        category,
        content_preview: preview,
        error_message: ok ? null : (result?.message ?? (typeof result?.error === 'string' ? result.error : null)),
      });
      if (!ok) return { success: false, error: result?.message || result?.error || 'Error enviando email' };
      return { success: true };
    } catch (err) {
      const msg = (err as Error)?.message || 'Error enviando email';
      await insertNotificationLog({
        user_id: userId,
        channel: 'email',
        recipient: '',
        event,
        status: 'error',
        category,
        content_preview: preview,
        error_message: msg,
      });
      return { success: false, error: msg };
    }
  }

  return { success: false, error: 'Canal no soportado.' };
}

const CONFIG_ALERT_KEY = 'config_alert_telegram_admin_enabled';
async function isAlertTelegramAdminEnabled(): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin.from('admin_settings').select('content').eq('id', CONFIG_ALERT_KEY).maybeSingle();
    return String((data as { content?: string } | null)?.content ?? '').toLowerCase() === 'true';
  } catch {
    return false;
  }
}
async function sendTelegramAlertInBackground(
  eventType: string,
  severity: string,
  message: string,
  userEmail: string | null,
  payload: Record<string, unknown>,
  source: string
): Promise<void> {
  try {
    const clientEmail = userEmail ?? (payload?.customer_email as string) ?? (payload?.user_email as string) ?? null;
    const subscriptionId = (payload?.subscription_id as string) ?? null;
    const payloadSnippet = Object.keys(payload || {}).length > 0 ? '\n<pre>' + JSON.stringify(payload).slice(0, 500) + (JSON.stringify(payload).length > 500 ? '…' : '') + '</pre>' : '';
    const enabled = await isAlertTelegramAdminEnabled();
    const adminToken = process.env.TELEGRAM_ADMIN_TOKEN?.trim();
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
    if (enabled && adminToken && adminChatId) {
      const text = `<b>🚨 ${severity.toUpperCase()}</b>\n<b>${eventType}</b>\n${message || '—'}` + (clientEmail ? `\n👤 Email: <code>${String(clientEmail).replace(/</g, '&lt;')}</code>` : '') + (subscriptionId ? `\n📋 Suscripción: <code>${String(subscriptionId)}</code>` : '') + (source ? `\n📍 ${source}` : '') + payloadSnippet;
      await fetch(`https://api.telegram.org/bot${adminToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML' }) });
      return;
    }
    const { data } = await supabaseAdmin.from('users').select('telegram_token, telegram_chat_id').eq('id', ADMIN_UID).maybeSingle();
    if (!data?.telegram_token?.trim() || !data?.telegram_chat_id?.trim()) return;
    const token = data.telegram_token.trim();
    const chatId = data.telegram_chat_id.trim();
    const text = `<b>🚨 ${severity.toUpperCase()}</b>\n<b>${eventType}</b>\n${message || '—'}` + (clientEmail ? `\n👤 ${clientEmail}` : '') + (subscriptionId ? `\n📋 sub: ${subscriptionId}` : '') + (source ? `\n📍 ${source}` : '') + payloadSnippet;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }) });
  } catch {
    // no bloquear
  }
}
async function logEvent(
  eventType: string,
  severity?: 'error' | 'warning' | 'info' | 'critical',
  message?: string,
  userEmail?: string | null,
  payload?: Record<string, unknown>,
  source?: string
): Promise<void> {
  try {
    const sev = severity ?? 'info';
    const storeFullPayload = sev === 'error' || sev === 'critical';
    await supabaseAdmin.from('audit_logs').insert({
      event_type: eventType,
      severity: sev,
      message: message ?? '',
      user_email: userEmail ?? null,
      payload: storeFullPayload ? (payload ?? {}) : {},
      source: source ?? 'app',
      created_at: new Date().toISOString(),
    });
    if (sev === 'error' || sev === 'critical') {
      void sendTelegramAlertInBackground(eventType, sev, message ?? '', userEmail ?? null, storeFullPayload ? (payload ?? {}) : {}, source ?? 'app');
    }
  } catch (err) {
    console.error('[logEvent]', err);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action } = req.body || {};
  if (!action) {
    return res.status(400).json({ error: 'Se requiere action en el body.' });
  }

  try {
    switch (action) {
      case 'portal': {
        const stripe = await getStripeClient();
        const { customerId, userId, returnUrl } = req.body;
        if (userId) {
          const authUid = await getRequestAuthUserId(req);
          if (!authUid || authUid !== userId) {
            return res.status(403).json({ error: 'No autorizado.' });
          }
        }
        let stripeCustomerId = customerId;
        if (!stripeCustomerId && userId) {
          const { data: userData, error } = await supabaseAdmin
            .from('users')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();
          if (error || !userData?.stripe_customer_id) {
            return res.status(400).json({ error: 'No se encontró un perfil de facturación activo.' });
          }
          stripeCustomerId = userData.stripe_customer_id;
        }
        if (!stripeCustomerId) {
          return res.status(400).json({ error: 'Se requiere customerId o userId.' });
        }
        const host = req.headers?.host;
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const fallbackReturn = host ? `${protocol}://${host}/#/dashboard` : 'https://www.telsim.io/#/dashboard';
        const session = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: returnUrl || fallbackReturn,
        });
        return res.status(200).json({ url: session.url });
      }

      case 'payment-method': {
        const stripe = await getStripeClient();
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'ID de usuario requerido.' });
        const authUid = await getRequestAuthUserId(req);
        if (!authUid || authUid !== userId) {
          return res.status(403).json({ error: 'No autorizado.' });
        }
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();
        if (userError || !userData?.stripe_customer_id) {
          return res.status(200).json({ paymentMethod: null });
        }
        const paymentMethods = await stripe.paymentMethods.list({
          customer: userData.stripe_customer_id,
          type: 'card',
        });
        if (paymentMethods.data.length === 0) {
          return res.status(200).json({ paymentMethod: null });
        }
        const pm = paymentMethods.data[0];
        return res.status(200).json({
          paymentMethod: {
            id: pm.id,
            brand: pm.card?.brand || 'card',
            last4: pm.card?.last4 || '****',
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
          },
        });
      }

      case 'invoice-history': {
        const stripe = await getStripeClient();
        const { userId, limit } = req.body || {};
        if (!userId) return res.status(400).json({ error: 'ID de usuario requerido.' });
        const authUid = await getRequestAuthUserId(req);
        if (!authUid || authUid !== userId) {
          return res.status(403).json({ error: 'No autorizado.' });
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        const { data: dbInvoices } = await supabaseAdmin
          .from('subscription_invoices')
          .select('*')
          .eq('user_id', userId);
        const dbById = new Map<string, Record<string, unknown>>(
          (dbInvoices ?? []).map((r: any) => [r.stripe_invoice_id as string, r as Record<string, unknown>])
        );

        if (userError || !userData?.stripe_customer_id) {
          const dbOnlyRows = (dbInvoices ?? [])
            .slice()
            .sort(
              (a: any, b: any) =>
                new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
            )
            .slice(0, safeLimit)
            .map((r: any) => mapSubscriptionInvoiceDbRowToApiRow(r as Record<string, unknown>));
          return res.status(200).json({ invoices: dbOnlyRows });
        }

        const customerId = userData.stripe_customer_id as string;
        const list = await stripe.invoices.list({
          customer: customerId,
          limit: safeLimit,
          expand: ['data.charge', 'data.payment_intent.latest_charge'],
        });

        const rows: ReturnType<typeof mapStripeInvoiceToRow>[] = [];
        const stripeIds = new Set<string>();
        for (const inv of list.data) {
          if (inv.id) stripeIds.add(inv.id);
          let full: Stripe.Invoice = inv;
          const status = inv.status;
          const needsRetrieve =
            !!inv.id &&
            status !== 'draft' &&
            status !== 'void' &&
            !inv.invoice_pdf &&
            !inv.hosted_invoice_url;
          if (needsRetrieve) {
            try {
              full = await stripe.invoices.retrieve(inv.id, {
                expand: ['charge', 'payment_intent.latest_charge'],
              });
            } catch (e: any) {
              console.warn('[invoice-history] retrieve', inv.id, e?.message);
            }
          }
          rows.push(mapStripeInvoiceToRow(full, dbById.get(full.id) ?? null));
        }

        for (const r of dbInvoices ?? []) {
          const rid = (r as any).stripe_invoice_id as string;
          if (!rid || stripeIds.has(rid)) continue;
          rows.push(mapSubscriptionInvoiceDbRowToApiRow(r as Record<string, unknown>));
        }

        rows.sort((a, b) => {
          const ta = a.created ? new Date(a.created).getTime() : 0;
          const tb = b.created ? new Date(b.created).getTime() : 0;
          return tb - ta;
        });

        return res.status(200).json({ invoices: rows.slice(0, safeLimit) });
      }

      case 'invoice-resolve': {
        const stripe = await getStripeClient();
        const { userId, invoiceId } = req.body || {};
        if (!userId || !invoiceId || typeof invoiceId !== 'string') {
          return res.status(400).json({ error: 'userId e invoiceId requeridos.' });
        }
        const authUid = await getRequestAuthUserId(req);
        if (!authUid || authUid !== userId) {
          return res.status(403).json({ error: 'No autorizado.' });
        }
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();
        if (userError || !userData?.stripe_customer_id) {
          return res.status(404).json({ error: 'Cliente de facturación no encontrado.' });
        }
        const stripeCustomerId = userData.stripe_customer_id as string;
        const inv = await stripe.invoices.retrieve(invoiceId, {
          expand: ['charge', 'payment_intent.latest_charge'],
        });
        const invCustomer = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        if (!invCustomer || invCustomer !== stripeCustomerId) {
          return res.status(403).json({ error: 'Invoice no pertenece a este usuario.' });
        }
        const { data: dbInvExtra } = await supabaseAdmin
          .from('subscription_invoices')
          .select('*')
          .eq('stripe_invoice_id', invoiceId)
          .eq('user_id', userId)
          .maybeSingle();
        return res.status(200).json({
          invoice: mapStripeInvoiceToRow(inv, (dbInvExtra as Record<string, unknown>) ?? null),
        });
      }

      case 'notify-ticket-reply': {
        const authHeader = req.headers?.authorization;
        const token = authHeader?.replace(/^Bearer\s+/i, '');
        if (!token) return res.status(401).json({ error: 'No autorizado.' });
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        if (!anonKey) return res.status(500).json({ error: 'Configuración de auth faltante.' });
        const supabaseAuth = createClient(process.env.SUPABASE_URL!, anonKey, { global: { fetch } });
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError || !user || (user.id || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
          return res.status(403).json({ error: 'Solo el administrador puede enviar esta notificación.' });
        }
        const { ticket_id: ticketId } = req.body;
        if (!ticketId) return res.status(400).json({ error: 'Se requiere ticket_id.' });
        const { data: ticket, error: ticketError } = await supabaseAdmin
          .from('support_tickets')
          .select('user_id')
          .eq('id', ticketId)
          .single();
        if (ticketError || !ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });
        const userId = (ticket as { user_id: string }).user_id;
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('telegram_token, telegram_chat_id')
          .eq('id', userId)
          .maybeSingle();
        if (!userRow?.telegram_token?.trim() || !userRow?.telegram_chat_id?.trim()) {
          return res.status(200).json({ ok: true, notified: false });
        }
        const message = '🔔 *Tu ticket de soporte ha sido respondido por un agente.*\n\nRevisa tu panel.';
        const tgRes = await fetch(`https://api.telegram.org/bot${userRow.telegram_token.trim()}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userRow.telegram_chat_id.trim(),
            text: message,
            parse_mode: 'Markdown',
          }),
        });
        const tgData = await tgRes.json().catch(() => ({}));
        await insertNotificationLog({
          user_id: userId,
          channel: 'telegram',
          recipient: `Telegram:${userRow.telegram_chat_id.trim()}`,
          event: 'ticket_reply',
          status: tgRes.ok ? 'sent' : 'error',
          category: 'operational',
          content_preview: message.slice(0, 500),
          error_message: tgRes.ok ? null : (tgData?.description ?? null),
        });
        if (!tgRes.ok) {
          return res.status(200).json({ ok: true, notified: false });
        }
        return res.status(200).json({ ok: true, notified: true });
      }

      case 'cancel': {
        const stripe = await getStripeClient();
        const rawSubId = typeof req.body?.subscriptionId === 'string' ? req.body.subscriptionId.trim() : '';
        const rawSlotId = typeof req.body?.slot_id === 'string' ? req.body.slot_id.trim() : '';
        if (!rawSubId && !rawSlotId) {
          return res.status(400).json({ error: 'Se requiere subscriptionId o slot_id.' });
        }

        const LIVE_STATUSES = ['active', 'trialing', 'past_due'] as const;

        const digitsOnly = (s: string): string => s.replace(/\D/g, '');

        type SubscriptionRow = {
          id: string;
          user_id: string;
          slot_id: string | null;
          plan_name: string | null;
          status: string | null;
          phone_number: string | null;
          created_at?: string | null;
        };

        const logCancel = async (eventType: string, severity: 'error' | 'warning' | 'info' | 'critical', payload: Record<string, unknown>, message?: string) => {
          // Usa el logEvent local del manage.ts (audit_logs + Telegram opcional).
          await logEvent(eventType, severity as any, message ?? '', undefined, payload, 'manage');
        };

        let targetSub: SubscriptionRow | null = null;

        if (!rawSubId && rawSlotId) {
          const gate = await assertSlotCancelAllowed(req, rawSlotId);
          if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

          const { data: slotOnlyCandidates, error: slotOnlyErr } = await supabaseAdmin
            .from('subscriptions')
            .select('id, user_id, slot_id, plan_name, status, phone_number, created_at')
            .eq('slot_id', rawSlotId)
            .in('status', [...LIVE_STATUSES])
            .order('created_at', { ascending: false })
            .limit(2);

          if (slotOnlyErr) {
            await logCancel('cancel_failed_no_live_subscription', 'error', {
              slot_id: rawSlotId,
              error_code: slotOnlyErr.code,
              error_message: slotOnlyErr.message,
            }, 'DB error en cancel: lookup por slot_id');
            return res.status(500).json({ error: slotOnlyErr.message, slot_id: rawSlotId });
          }

          if (slotOnlyCandidates && slotOnlyCandidates.length > 1) {
            await logCancel('cancel_failed_multiple_live_candidates', 'error', {
              lookup: 'slot_id_body',
              slot_id: rawSlotId,
              candidate_ids: slotOnlyCandidates.map((r: any) => r.id),
            }, 'cancel: múltiples candidatos vivos (slot_id en body)');
            return res.status(409).json({
              error: 'Cancelación bloqueada: hay múltiples suscripciones vivas para este slot.',
              slot_id: rawSlotId,
            });
          }

          if (slotOnlyCandidates && slotOnlyCandidates.length === 1) {
            targetSub = slotOnlyCandidates[0] as SubscriptionRow;
          } else {
            const { error: orphanReleaseErr } = await releaseSlotAtomicForCancelPolicy(supabaseAdmin, rawSlotId);
            if (orphanReleaseErr) {
              await logCancel('cancel_failed_no_live_subscription', 'error', {
                slot_id: rawSlotId,
                error_code: orphanReleaseErr.code,
                error_message: orphanReleaseErr.message,
              }, 'cancel: fallo RPC release_slot_atomic (huérfano)');
              return res.status(500).json({ error: orphanReleaseErr.message, slot_id: rawSlotId });
            }

            const { data: releasedOrphan, error: orphanSelErr } = await supabaseAdmin
              .from('slots')
              .select('status, assigned_to, plan_type')
              .eq('slot_id', rawSlotId)
              .maybeSingle();
            if (orphanSelErr || !releasedOrphan) {
              await logCancel('cancel_slot_verify_warning', 'warning', {
                slot_id: rawSlotId,
                error_message: orphanSelErr?.message ?? null,
              }, 'cancel: verificación post-RPC huérfano no concluyó (RPC ya OK)');
            } else {
              const releasedOk =
                String((releasedOrphan as any).status ?? '').toLowerCase() === 'libre' &&
                (releasedOrphan as any).assigned_to == null &&
                (releasedOrphan as any).plan_type == null;
              if (!releasedOk) {
                await logCancel('cancel_slot_verify_warning', 'warning', {
                  slot_id: rawSlotId,
                  released_orphan: releasedOrphan,
                }, 'cancel: estado slot inesperado tras RPC huérfano (RPC ya OK)');
              }
            }

            await logCancel('cancel_slot_released', 'info', { slot_id: rawSlotId }, 'cancel: slot huérfano liberado');
            return res.status(200).json({ ok: true, released_number: true });
          }
        }

        const subscriptionId = rawSubId;

        // 1) Lookup primario (stripe_subscription_id) - únicamente filas locales "vivas".
        if (subscriptionId) {
        const { data: primaryCandidates, error: primaryErr } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, slot_id, plan_name, status, phone_number, created_at')
          .eq('stripe_subscription_id', subscriptionId)
          .order('created_at', { ascending: false })
          .limit(2);

        if (primaryErr) {
          await logCancel('cancel_failed_no_live_subscription', 'error', {
            subscriptionId,
            lookup: 'stripe_subscription_id',
            error_code: primaryErr.code,
            error_message: primaryErr.message,
          }, 'DB error en cancel: lookup primario');
          return res.status(500).json({ error: primaryErr.message, subscriptionId });
        }

        await logCancel('cancel_lookup_primary', 'info', {
          subscriptionId,
          found_candidates: (primaryCandidates ?? []).length,
        }, 'cancel: lookup primario por stripe_subscription_id');

        if (primaryCandidates && primaryCandidates.length > 0) {
          if (primaryCandidates.length > 1) {
            await logCancel('cancel_failed_multiple_live_candidates', 'error', {
              subscriptionId,
              lookup: 'stripe_subscription_id',
              candidate_ids: primaryCandidates.map((r: any) => r.id),
              candidate_slot_ids: primaryCandidates.map((r: any) => r.slot_id),
            }, 'cancel: múltiples candidatos vivos (lookup primario)');
            return res.status(409).json({
              error: 'Cancelación bloqueada: hay múltiples suscripciones locales vivas candidatas para el mismo `stripe_subscription_id`.',
              subscriptionId,
            });
          }
          targetSub = primaryCandidates[0] as SubscriptionRow;
        } else {
          // 2) Fallback: obtener hints desde Stripe y buscar por slot_id / phone_number.
          let stripeSub: Stripe.Subscription | null = null;
          try {
            stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          } catch {
            stripeSub = null;
          }

          const meta = (stripeSub?.metadata ?? {}) as Record<string, string>;
          const hintSlotId = (meta.slot_id ?? meta.slotId ?? meta.slotid ?? '').trim() || undefined;
          const hintPhone = (meta.phone_number ?? meta.phoneNumber ?? meta.phonenumber ?? meta.phone ?? '').trim() || undefined;

          if (hintSlotId) {
            const { data: slotCandidates, error: slotErr } = await supabaseAdmin
              .from('subscriptions')
              .select('id, user_id, slot_id, plan_name, status, phone_number, created_at')
              .eq('slot_id', hintSlotId)
              .in('status', [...LIVE_STATUSES])
              .order('created_at', { ascending: false })
              .limit(5);

            if (!slotErr) {
              await logCancel('cancel_lookup_fallback_slot', 'info', {
                subscriptionId,
                hintSlotId,
                found_candidates: (slotCandidates ?? []).length,
              }, 'cancel: fallback por slot_id');

              if (slotCandidates && slotCandidates.length > 0) {
                if (slotCandidates.length > 1) {
                  await logCancel('cancel_failed_multiple_live_candidates', 'error', {
                    subscriptionId,
                    lookup: 'fallback_slot_id',
                    hintSlotId,
                    candidate_ids: slotCandidates.map((r: any) => r.id),
                  }, 'cancel: múltiples candidatos vivos en fallback_slot');
                }
                targetSub = slotCandidates[0] as SubscriptionRow;
              }
            }
          }

          if (!targetSub && hintPhone) {
            const hintDigits = digitsOnly(hintPhone);
            const variants = [...new Set([hintPhone, hintDigits, `+${hintDigits}`].filter(Boolean))];
            const { data: phoneCandidates, error: phoneErr } = await supabaseAdmin
              .from('subscriptions')
              .select('id, user_id, slot_id, plan_name, status, phone_number, created_at')
              .in('phone_number', variants)
              .in('status', [...LIVE_STATUSES])
              .order('created_at', { ascending: false })
              .limit(5);

            if (!phoneErr) {
              await logCancel('cancel_lookup_fallback_phone', 'info', {
                subscriptionId,
                hintPhoneDigits: hintDigits,
                found_candidates: (phoneCandidates ?? []).length,
              }, 'cancel: fallback por phone_number');

              if (phoneCandidates && phoneCandidates.length > 0) {
                if (phoneCandidates.length > 1) {
                  await logCancel('cancel_failed_multiple_live_candidates', 'error', {
                    subscriptionId,
                    lookup: 'fallback_phone',
                    hintPhoneDigits: hintDigits,
                    candidate_ids: phoneCandidates.map((r: any) => r.id),
                  }, 'cancel: múltiples candidatos vivos en fallback_phone');
                }
                targetSub = phoneCandidates[0] as SubscriptionRow;
              }
            }
          }

          if (!targetSub) {
            await logCancel('cancel_failed_no_live_subscription', 'error', {
              subscriptionId,
              lookup: primaryCandidates && primaryCandidates.length === 0 ? 'stripe_subscription_id' : 'unknown',
              hintSlotId: hintSlotId ?? null,
              hintPhone: hintPhone ?? null,
            }, 'cancel: no se encontró suscripción local viva');
            return res.status(404).json({
              error: 'No se encontró suscripción local viva para cancelar (bloqueado para evitar inconsistencia).',
              subscriptionId,
            });
          }
        }
        }

        if (!targetSub?.id) {
          await logCancel('cancel_failed_no_live_subscription', 'error', { subscriptionId, slot_id: rawSlotId || null }, 'cancel: targetSub vacío');
          return res.status(404).json({
            error: 'No hay fila local a cancelar.',
            ...(subscriptionId ? { subscriptionId } : { slot_id: rawSlotId }),
          });
        }

        if (!targetSub.slot_id) {
          await logCancel('cancel_failed_no_live_subscription', 'error', {
            subscriptionId,
            local_subscription_id: targetSub.id,
          }, 'cancel: targetSub sin slot_id');
          return res.status(409).json({
            error: 'Cancelación bloqueada: la suscripción local no tiene `slot_id`.',
            subscriptionId,
          });
        }

        // 3) Cancelación consistente del slot:
        // - cancelar Stripe (si aplica)
        // - actualizar TODAS las subscriptions del slot dentro de una sola transacción DB
        // - liberar el slot
        const slotId = targetSub.slot_id;

        // Construir lista de stripe_subscription_id vivas (best-effort) antes de liberar en BD.
        // `release_slot_atomic` ejecuta dentro cancel_subscriptions_atomic + liberación (orden garantizado en SQL).
        const { data: liveStripeSubs, error: liveStripeSubsErr } = await supabaseAdmin
          .from('subscriptions')
          .select('stripe_subscription_id')
          .eq('slot_id', slotId)
          .in('status', [...LIVE_STATUSES])
          .not('stripe_subscription_id', 'is', null);

        if (liveStripeSubsErr) {
          await logCancel('cancel_failed_no_live_subscription', 'error', {
            subscriptionId,
            slot_id: slotId,
            error_code: liveStripeSubsErr.code,
            error_message: liveStripeSubsErr.message,
          }, 'cancel: fallo lookup stripe_subscription_id en slot (continuar con cancelación local)');
        }

        const stripeSubIdsSet = new Set<string>();
        if (subscriptionId) stripeSubIdsSet.add(subscriptionId);
        for (const r of liveStripeSubs ?? []) {
          const sid = (r as { stripe_subscription_id?: string | null }).stripe_subscription_id;
          if (typeof sid === 'string' && sid.trim()) stripeSubIdsSet.add(sid.trim());
        }

        const stripeSubIds = [...stripeSubIdsSet].filter((s) => s.length > 0);

        // 2) Cancelar subs locales + liberar slot (una sola RPC; cancel va antes que UPDATE slots en SQL)
        const { error: slotRpcErr } = await releaseSlotAtomicForCancelPolicy(supabaseAdmin, slotId);
        if (slotRpcErr) {
          await logCancel('cancel_failed_no_live_subscription', 'error', {
            subscriptionId,
            slot_id: slotId,
            error_code: slotRpcErr.code,
            error_message: slotRpcErr.message,
          }, 'cancel: fallo RPC release_slot_atomic');
          return res.status(500).json({ error: slotRpcErr.message, subscriptionId });
        }

        await logCancel('cancel_local_subscription_updated', 'info', {
          subscriptionId,
          slot_id: slotId,
        }, 'cancel: release_slot_atomic OK (cancel_subscriptions_atomic embebido en SQL)');

        // 4) Intentar cancelación en Stripe (best-effort): si falla, solo loguear
        //    (no revertir local ni volver a poner active, y no depender del webhook).
        for (const sid of stripeSubIds) {
          try {
            await stripe.subscriptions.cancel(sid);
          } catch (err: any) {
            const msg = String(err?.message ?? 'No se pudo cancelar en Stripe');
            await logCancel(
              'cancel_failed_no_live_subscription',
              'error',
              { subscriptionId, stripe_error: msg, stripe_subscription_id: sid },
              'cancel: fallo Stripe (ignorado; cancelación local ya realizada)'
            );
          }
        }

        // Una sola lectura de `slots` (sin columnas inexistentes). Tras RPC OK, la verificación es best-effort.
        const { data: releasedSlot, error: slotSelErr } = await supabaseAdmin
          .from('slots')
          .select('phone_number, plan_type, status, assigned_to')
          .eq('slot_id', targetSub.slot_id)
          .maybeSingle();

        const slotData = releasedSlot;

        if (slotSelErr || !releasedSlot) {
          await logCancel('cancel_slot_verify_warning', 'warning', {
            subscriptionId,
            local_subscription_id: targetSub.id,
            slot_id: targetSub.slot_id,
            error_message: slotSelErr?.message ?? null,
          }, 'cancel: verificación post-RPC no concluyó (release_slot_atomic ya OK)');
        } else {
          const releasedOk =
            String((releasedSlot as any).status ?? '').toLowerCase() === 'libre' &&
            (releasedSlot as any).assigned_to == null &&
            (releasedSlot as any).plan_type == null;
          if (!releasedOk) {
            await logCancel('cancel_slot_verify_warning', 'warning', {
              subscriptionId,
              local_subscription_id: targetSub.id,
              slot_id: targetSub.slot_id,
              released_slot: releasedSlot,
            }, 'cancel: estado slot inesperado tras RPC (release_slot_atomic ya OK)');
          }
        }

        await logCancel('cancel_slot_released', 'info', {
          subscriptionId,
          local_subscription_id: targetSub.id,
          slot_id: targetSub.slot_id,
          phone_number: slotData?.phone_number ?? null,
        }, 'cancel: slot liberado en slots');

        let released_number = true;

        // Email, Telegram e in-app de cancelación: solo en `customer.subscription.deleted` (api/webhooks/stripe.ts).

        return res.status(200).json({ ok: true, released_number });
      }

      case 'upgrade': {
        const stripe = await getStripeClient();
        const { userId, slotId, newPriceId, newPlanName, isAnnual } = req.body;
        if (!userId || !slotId || !newPriceId || !newPlanName) {
          return res.status(400).json({ error: 'Faltan parámetros requeridos' });
        }
        const { data: userRow, error: userError } = await supabaseAdmin
          .from('users')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        if (userError || !userRow?.stripe_customer_id) {
          return res.status(400).json({ error: 'No se encontró customer de Stripe para este usuario' });
        }

        const customerId = (userRow as { stripe_customer_id: string }).stripe_customer_id;
        const { data: currentSub } = await supabaseAdmin
          .from('subscriptions')
          .select('stripe_subscription_id')
          .eq('slot_id', slotId)
          .eq('user_id', userId)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        const { data: slotRow } = await supabaseAdmin.from('slots').select('phone_number').eq('slot_id', slotId).maybeSingle();
        const baseUrl = getBaseUrl(req);

        const upgradeSession: Record<string, unknown> = {
          mode: 'subscription',
          customer: customerId,
          line_items: [{ price: newPriceId, quantity: 1 }],
          subscription_data: {
            billing_cycle_anchor: Math.floor(Date.now() / 1000),
            metadata: {
              upgrade: 'true',
              slot_id: slotId,
              user_id: userId,
              old_subscription_id: (currentSub as { stripe_subscription_id?: string } | null)?.stripe_subscription_id || '',
              new_plan_name: newPlanName,
              is_annual: isAnnual ? 'true' : 'false',
              phone_number: (slotRow as { phone_number?: string } | null)?.phone_number || '',
            },
          },
          payment_method_collection: 'always',
          success_url: `${baseUrl}/#/dashboard/upgrade-success?session_id={CHECKOUT_SESSION_ID}&slotId=${slotId}&planName=${encodeURIComponent(newPlanName)}&isAnnual=${isAnnual}`,
          cancel_url: `${baseUrl}/#/dashboard/upgrade-plan`,
        };
        applyStripeCheckoutBillingCompliance(upgradeSession);
        const session = await stripe.checkout.sessions.create(upgradeSession as Stripe.Checkout.SessionCreateParams);

        return res.status(200).json({ url: session.url });
      }

      case 'verify-bot': {
        const { telegram_token, telegram_chat_id } = req.body || {};
        const token = typeof telegram_token === 'string' ? telegram_token.trim() : '';
        const chatId = typeof telegram_chat_id === 'string' ? telegram_chat_id.trim() : '';
        if (!token || !chatId) {
          return res.status(200).json({ status: 'error' });
        }
        const key = `${token}:${chatId}`;
        const cached = cache.get(key);
        if (cached && Date.now() < cached.until) {
          return res.status(200).json({ status: cached.status });
        }
        try {
          const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const meData = await meRes.json();
          if (!meRes.ok || !meData.ok) {
            cache.set(key, { status: 'error', until: Date.now() + CACHE_TTL_MS });
            return res.status(200).json({ status: 'error' });
          }
          const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`);
          const chatData = await chatRes.json();
          if (!chatRes.ok || !chatData.ok) {
            cache.set(key, { status: 'error', until: Date.now() + CACHE_TTL_MS });
            return res.status(200).json({ status: 'error' });
          }
          cache.set(key, { status: 'online', until: Date.now() + CACHE_TTL_MS });
          return res.status(200).json({ status: 'online' });
        } catch (err: any) {
          console.error('[ADMIN verify-bot]', err?.message);
          return res.status(200).json({ status: 'error' });
        }
      }

      case 'send-test': {
        const { userId } = req.body;
        if (!userId) {
          return res.status(400).json({ error: 'Se requiere userId.', code: 'MISSING_USER' });
        }
        const { data: userRow, error: userError } = await supabaseAdmin
          .from('users')
          .select('telegram_token, telegram_chat_id')
          .eq('id', userId)
          .maybeSingle();

        if (userError || !userRow) {
          return res.status(400).json({ error: 'Usuario no encontrado.', code: 'USER_NOT_FOUND' });
        }

        const token = userRow?.telegram_token;
        const chatId = userRow?.telegram_chat_id;
        if (!token || !chatId) {
          return res.status(400).json({
            error: 'Configura tu Bot de Telegram en Ajustes → Telegram Bot para enviar notificaciones de prueba.',
            code: 'TELEGRAM_NOT_CONFIGURED',
          });
        }

        const safeSender = escapeHtml('Telsim Support');
        const safeCode = escapeHtml('999999');
        const safeContent = escapeHtml('¡Felicidades! Tu sistema de notificaciones de Telsim está configurado correctamente.');
        const message = `<b>📩 NUEVO SMS RECIBIDO</b>\n━━━━━━━━━━━━━━━━━━\n<b>📱 De:</b> <code>${safeSender}</code>\n<b>🔑 Código OTP:</b> <code>${safeCode}</code>\n<b>💬 Mensaje:</b>\n<blockquote>${safeContent}</blockquote>\n<i>📡 Enviado vía Telsim</i>`;

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
        });

        const result = await tgRes.json();
        await insertNotificationLog({
          user_id: userId,
          channel: 'telegram',
          recipient: `Telegram:${chatId}`,
          event: 'admin_test',
          status: tgRes.ok ? 'sent' : 'error',
          category: 'operational',
          content_preview: message.slice(0, 500),
          error_message: tgRes.ok ? null : (result?.description ?? null),
        });
        if (!tgRes.ok) {
          return res.status(400).json({
            error: result.description || 'Error al enviar el mensaje a Telegram.',
            code: 'TELEGRAM_ERROR',
          });
        }
        return res.status(200).json({ ok: true });
      }

      case 'send-notification-test': {
        const {
          channel,
          content,
          userId,
          subject: subjectIn,
          templateId: templateIdIn,
          event: eventIn,
        } = req.body || {};

        console.log('[MANAGE send-notification-test] start', {
          channel,
          event: eventIn,
          templateId: templateIdIn,
          userId,
          hasSubject: typeof subjectIn === 'string' && subjectIn.trim() !== '',
          hasContent: typeof content === 'string' && content.trim() !== '',
        });

        if (channel === 'email') {
          if (!userId || typeof userId !== 'string' || !String(userId).trim()) {
            return res.status(400).json({ error: 'Falta userId para el envío de email de prueba.', code: 'MISSING_USER_ID' });
          }
          if (!eventIn || typeof eventIn !== 'string' || !eventIn.trim()) {
            return res.status(400).json({ error: 'Falta event para email.', code: 'MISSING_EVENT' });
          }
          if (!templateIdIn || typeof templateIdIn !== 'string' || !templateIdIn.trim()) {
            return res.status(400).json({ error: 'Falta templateId para email.', code: 'MISSING_TEMPLATE_ID' });
          }
          if (typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: 'Falta content (HTML) para la plantilla de email.', code: 'MISSING_CONTENT' });
          }
        } else if (channel === 'telegram' || channel === 'sms_product') {
          if (
            !userId ||
            typeof channel !== 'string' ||
            typeof content !== 'string' ||
            typeof templateIdIn !== 'string' ||
            !templateIdIn.trim() ||
            typeof eventIn !== 'string' ||
            !eventIn.trim()
          ) {
            return res.status(400).json({
              error: 'Faltan parámetros (channel, content, userId, templateId, event).',
              code: 'MISSING_PARAMS',
            });
          }
        } else {
          return res.status(400).json({
            error: 'Canal no soportado. Use telegram, email o sms_product.',
            code: 'INVALID_CHANNEL',
          });
        }

        const templateId = templateIdIn.trim();
        const event = eventIn.trim();
        if (!/^template_(email|telegram|app)_[a-z0-9_]+$/i.test(templateId)) {
          return res.status(400).json({
            error:
              'templateId inválido. Debe ser p. ej. template_email_cancellation, template_telegram_new_purchase.',
            code: 'INVALID_TEMPLATE_ID',
          });
        }

        try {
          const { data: userRow, error: userError } = await supabaseAdmin
            .from('users')
            .select('email, telegram_token, telegram_chat_id')
            .eq('id', userId)
            .maybeSingle();

          if (userError || !userRow) {
            return res.status(400).json({ error: 'Usuario no encontrado en la base de datos.', code: 'USER_NOT_FOUND' });
          }

          const ch = channel === 'sms_product' ? 'sms_product' : channel;
          if (ch !== 'telegram' && ch !== 'email' && ch !== 'sms_product') {
            return res.status(400).json({ error: 'Canal no soportado. Use telegram o email.', code: 'INVALID_CHANNEL' });
          }

          if (ch === 'sms_product') {
            const out = await sendUnified({
              channel: 'sms_product',
              userId,
              category: 'product_delivery',
              event: event || 'admin_test',
              content,
              recipient: (userRow as { email?: string }).email ?? '',
            });
            if (!out.success) {
              return res.status(400).json({ error: out.error, code: 'SEND_ERROR' });
            }
            return res.status(200).json({ success: true, message: '✅ Log de producto registrado.' });
          }

          if (ch === 'telegram') {
            const out = await internalSendTelegram({
              userId,
              content,
              category: 'operational',
              event,
            });
            if (!out.success) {
              return res.status(400).json({
                error: out.error || 'Error al enviar a Telegram',
                code: 'TELEGRAM_ERROR',
              });
            }
            return res.status(200).json({ success: true, message: '✅ Test de Telegram enviado.' });
          }

          if (ch === 'email') {
            const toEmail = (userRow as { email?: string }).email;
            if (!toEmail) {
              return res.status(400).json({ error: 'Tu usuario no tiene email configurado.', code: 'NO_EMAIL' });
            }
            const subjectLine =
              typeof subjectIn === 'string' && subjectIn.trim() !== ''
                ? subjectIn.trim()
                : 'Prueba de plantilla TELSIM';
            console.log('[MANAGE send-notification-test] email payload', {
              event,
              templateId,
              toEmail,
              subjectPreview: subjectLine.slice(0, 120),
              contentLength: content.length,
            });
            const testData = getLocalAdminEmailTestDataForEvent(event);
            const out = await internalSendEmail({
              userId,
              toEmail,
              event,
              content,
              category: 'operational',
              from: 'Telsim <noreply@telsim.io>',
              subject: subjectLine,
              is_test: true,
              template_id: templateId,
              data: {
                ...testData,
                to_email: toEmail,
                email: toEmail,
                template_id: templateId,
                admin_template_test: true,
              },
            });
            if (!out.success) {
              const st = out.httpStatus;
              const bodySnippet = out.rawBodySnippet;
              if (st != null) {
                console.error('[MANAGE send-notification-test] edge error', { status: st, body: bodySnippet });
              } else {
                console.error('[MANAGE send-notification-test] email send failed (no HTTP status)', {
                  error: out.error,
                });
              }
              if (st != null && st >= 500) {
                return res.status(502).json({
                  error: out.error || 'El servicio de email devolvió un error.',
                  code: 'EMAIL_EDGE_UPSTREAM',
                  upstreamStatus: st,
                  details: bodySnippet,
                });
              }
              return res.status(400).json({
                error: out.error || 'Error al enviar email',
                code: 'EMAIL_ERROR',
                upstreamStatus: st,
                details: bodySnippet,
              });
            }
            return res.status(200).json({ success: true, message: '✅ Test enviado con tu texto personalizado.' });
          }

          return res.status(400).json({ error: 'Canal no soportado.' });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error en el servidor';
          console.error('[MANAGE send-notification-test] unhandled', err);
          return res.status(500).json({ error: msg, code: 'SERVER_ERROR' });
        }
      }

      case 'retry-notification': {
        const { logId, userId: reqUserId } = req.body || {};
        if (!reqUserId || (reqUserId || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
          return res.status(403).json({ error: 'Solo el administrador puede reintentar.', code: 'FORBIDDEN' });
        }
        if (!logId || typeof logId !== 'string') {
          return res.status(400).json({ error: 'Se requiere logId.', code: 'MISSING_LOG_ID' });
        }
        const { data: logRow, error: logError } = await supabaseAdmin
          .from('notification_history')
          .select('id, user_id, type, event_name, recipient, content')
          .eq('id', logId.trim())
          .maybeSingle();
        if (logError || !logRow) {
          return res.status(404).json({ error: 'Registro no encontrado.', code: 'NOT_FOUND' });
        }
        const userId = (logRow as { user_id?: string }).user_id;
        const channel = (logRow as { type: string }).type;
        const event = (logRow as { event_name: string }).event_name;
        const content = (logRow as { content?: string | null }).content ?? '';
        const recipient = (logRow as { recipient: string }).recipient;
        if (!userId) {
          return res.status(400).json({ error: 'El registro no tiene user_id.', code: 'INVALID_LOG' });
        }
        if (channel !== 'telegram' && channel !== 'email') {
          return res.status(400).json({ error: 'Solo se puede reintentar Telegram o Email.', code: 'INVALID_CHANNEL' });
        }
        let success = false;
        let errorMessage: string | null = null;
        if (channel === 'telegram') {
          const out = await internalSendTelegram({
            userId,
            content: content || '(contenido no disponible)',
            category: 'operational',
            event: event || 'retry',
          });
          success = out.success;
          errorMessage = out.error ?? null;
        } else {
          const out = await internalSendEmail({
            userId,
            toEmail: recipient?.startsWith('Telegram:') ? undefined : recipient,
            event: event || 'retry',
            content: content || undefined,
            category: 'operational',
            data: { to_email: recipient?.startsWith('Telegram:') ? undefined : recipient, email: recipient },
          });
          success = out.success;
          errorMessage = out.error ?? null;
        }
        if (success) {
          await supabaseAdmin
            .from('notification_history')
            .update({ status: 'sent', error_message: null })
            .eq('id', logId.trim());
          return res.status(200).json({ success: true, message: 'Mensaje reintentado con éxito.' });
        }
        await supabaseAdmin
          .from('notification_history')
          .update({ error_message: errorMessage })
          .eq('id', logId.trim());
        return res.status(400).json({
          success: false,
          error: errorMessage || 'El reintento falló.',
          code: 'RETRY_FAILED',
        });
      }

      case 'list-notification-history': {
        const { userId: reqUserId, emailSearch, eventSearch, filterUserId, limit: limitParam } = req.body || {};
        if (!reqUserId || (reqUserId || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
          return res.status(403).json({ error: 'Solo el administrador puede consultar el historial.', code: 'FORBIDDEN' });
        }
        const limit = Math.min(Math.max(Number(limitParam) || 100, 1), 500);
        let query = supabaseAdmin
          .from('notification_history')
          .select('id, created_at, user_id, recipient, type, event_name, status, error_message, content')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (filterUserId && String(filterUserId).trim()) {
          query = query.eq('user_id', String(filterUserId).trim());
        }
        if (emailSearch && String(emailSearch).trim()) {
          const term = String(emailSearch).trim();
          query = query.ilike('recipient', `%${term}%`);
        }
        if (eventSearch && String(eventSearch).trim()) {
          query = query.ilike('event_name', `%${String(eventSearch).trim()}%`);
        }
        const { data: rows, error } = await query;
        if (error) {
          return res.status(500).json({ error: error.message, code: 'DB_ERROR' });
        }
        const withUserEmail = (rows || []).map((r: Record<string, unknown>) => ({
          id: r.id,
          created_at: r.created_at,
          user_id: r.user_id,
          recipient: r.recipient,
          channel: r.type,
          event: r.event_name,
          status: r.status,
          error_message: r.error_message,
          content_preview: r.content,
        }));
        if (withUserEmail.length > 0) {
          const userIds = [...new Set((withUserEmail as { user_id?: string }[]).map((r) => r.user_id).filter(Boolean))] as string[];
          const { data: users } = await supabaseAdmin.from('users').select('id, email').in('id', userIds);
          const emailBy = (users || []).reduce((acc: Record<string, string>, u: { id: string; email?: string }) => {
            if (u.email) acc[u.id] = u.email;
            return acc;
          }, {});
          withUserEmail.forEach((r: { user_id?: string; user_email?: string }) => {
            r.user_email = r.user_id ? emailBy[r.user_id] : undefined;
          });
        }
        return res.status(200).json({ list: withUserEmail });
      }

      case 'get-notification-stats': {
        const { userId: reqUserId } = req.body || {};
        if (!reqUserId || (reqUserId || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
          return res.status(403).json({ error: 'Solo el administrador.', code: 'FORBIDDEN' });
        }
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setUTCHours(0, 0, 0, 0);
        const { data: rows, error } = await supabaseAdmin
          .from('notification_history')
          .select('created_at')
          .gte('created_at', start.toISOString());
        if (error) return res.status(500).json({ error: error.message });
        const dayCount: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          const key = d.toISOString().slice(0, 10);
          dayCount[key] = 0;
        }
        (rows || []).forEach((r: { created_at: string }) => {
          const key = r.created_at.slice(0, 10);
          if (dayCount[key] != null) dayCount[key]++;
        });
        const last7Days = Object.entries(dayCount)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }));
        return res.status(200).json({ last7Days });
      }

      case 'simulate-critical-alert': {
        const { data: row } = await supabaseAdmin
          .from('admin_settings')
          .select('content')
          .eq('id', 'config_alert_telegram_admin_enabled')
          .maybeSingle();
        const enabled = String((row as { content?: string } | null)?.content ?? '').toLowerCase() === 'true';
        if (!enabled) {
          await logEvent('TEST_CRITICAL_ALERT', 'info', 'Simulación de error crítico (interruptor apagado, no enviado a Telegram).', null, { source: 'admin-panel' }, 'stripe');
          return res.status(200).json({ sent: false, message: 'Alerta bloqueada: El interruptor está apagado.' });
        }
        await logEvent(
          'TEST_CRITICAL_ALERT',
          'critical',
          '🧪 TEST: Esto es una simulación de error crítico. Si ves esto, el sistema de alertas funciona.',
          null,
          { source: 'admin-panel' },
          'stripe'
        );
        return res.status(200).json({ sent: true, message: 'Alerta de prueba enviada a tu Telegram.' });
      }

      /** Solo admin: cancelar suscripciones en Stripe por ID (best-effort; no toca DB; no revierte cancelación local). */
      case 'admin-stripe-cancel-subscriptions': {
        const stripe = await getStripeClient();
        const { userId: reqUserId, stripeSubscriptionIds } = req.body || {};
        if (!reqUserId || (reqUserId || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
          return res.status(403).json({ error: 'Solo el administrador.' });
        }
        const ids = Array.isArray(stripeSubscriptionIds) ? stripeSubscriptionIds : [];
        const seen = new Set<string>();
        for (const raw of ids) {
          const sid = typeof raw === 'string' ? raw.trim() : '';
          if (!sid || seen.has(sid)) continue;
          seen.add(sid);
          try {
            await stripe.subscriptions.cancel(sid);
          } catch (err: any) {
            await logEvent(
              'admin_stripe_cancel_failed',
              'warning',
              String(err?.message ?? err),
              null,
              { stripe_subscription_id: sid },
              'manage'
            );
          }
        }
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({
          error: 'Action no válida. Use: portal, payment-method, invoice-history, invoice-resolve, notify-ticket-reply, upgrade, cancel, send-test, verify-bot, send-notification-test, retry-notification, list-notification-history, simulate-critical-alert, admin-stripe-cancel-subscriptions.',
        });
    }
  } catch (err: any) {
    console.error('[MANAGE]', action, err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno.' });
  }
}
