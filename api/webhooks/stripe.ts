import crypto from 'crypto';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logEvent } from '../_helpers/logger.js';
import {
  extractReceiptUrlFromInvoice,
  invoiceCustomerTaxIdsForDb,
  invoiceTaxBreakdownForDb,
  invoiceTaxCents,
} from '../_helpers/stripeInvoice.js';
import {
  isSupportedOnboardingCountryCode,
  slotCountryMatchesOnboardingIso,
} from '../_helpers/slotCountryMapping.js';
import { monthlySmsLimitForPlan } from '../_helpers/subscriptionPlanLimits.js';
import { releaseSlotAtomicForCancelPolicy, type SupabaseAdminForRpc } from '../_helpers/releaseSlotAtomicForCancelPolicy.js';
import {
  hasRecentAppNotificationDuplicate,
  hasRecentNotificationDuplicate,
} from '../_helpers/notificationDedupe.js';
import {
  formatCancellationDateTimeForUser,
  formatCancellationDateTimeFromIso,
} from '../_helpers/cancellationSoftCancel.js';
import { subscriptionBillingSnapshotFromStripe } from '../_helpers/stripeSubscriptionBilling.js';
import { findOtherLiveSubscriptionExcludingStripeId } from '../_helpers/slotLiveSubscriptionGuard.js';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin: SupabaseAdminForRpc = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function replaceVariables(text: string, data: Record<string, unknown>): string {
  let out = text;
  for (const [key, value] of Object.entries(data)) {
    const val = value != null ? String(value) : '';
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

async function getTemplateContent(templateId: string): Promise<string | null> {
  try {
    const { data: row } = await supabaseAdmin
      .from('admin_settings')
      .select('content')
      .eq('id', templateId)
      .maybeSingle();
    const content = (row as { content?: string | null } | null)?.content;
    return content != null && content.trim() !== '' ? content.trim() : null;
  } catch {
    return null;
  }
}

/** Solo plantillas email: cuerpo + asunto opcional en `admin_settings`. */
async function getEmailTemplateParts(templateId: string): Promise<{ content: string | null; subject: string | null }> {
  try {
    const { data: row } = await supabaseAdmin
      .from('admin_settings')
      .select('content, subject')
      .eq('id', templateId)
      .maybeSingle();
    const r = row as { content?: string | null; subject?: string | null } | null;
    const content = r?.content != null && String(r.content).trim() !== '' ? String(r.content).trim() : null;
    const subject = r?.subject != null && String(r.subject).trim() !== '' ? String(r.subject).trim() : null;
    return { content, subject };
  } catch {
    return { content: null, subject: null };
  }
}

/** Eventos canónicos compartidos: `template_email_*`, `template_telegram_*`, `template_app_*`. */
const CANONICAL_TEMPLATE_EVENTS = {
  NEW_PURCHASE: 'new_purchase',
  CANCELLATION: 'cancellation',
  UPGRADE_SUCCESS: 'upgrade_success',
  INVOICE_PAID: 'invoice_paid',
  /** Enviado desde api/manage reactivate-line (no webhook de compra). */
  REACTIVATION_SUCCESS: 'reactivation_success',
} as const;

/** Fallbacks legibles si no hay plantilla en admin_settings (nunca mostrar "Evento: …" al usuario). */
const DEFAULT_TELEGRAM_BY_EVENT: Record<string, string> = {
  new_purchase:
    '✅ *Compra TELSIM*\n\nPlan: *{{plan}}*\nNúmero: {{phone}}\nSlot: {{slot_id}}\nEstado: {{status}}',
  cancellation:
    '🔴 *Cancelación*\n\nPlan: {{plan}}\nNúmero: {{phone}}\nÚltimo período: {{end_date}}\nEstado: {{status}}',
  upgrade_success:
    '🚀 *Plan actualizado*\n\nPlan: *{{plan}}*\nNúmero: {{phone}}\n{{status}}',
  invoice_paid:
    '💳 *Factura pagada*\n\nPlan: {{plan}}\nPróxima renovación: {{end_date}}\nEstado: {{status}}',
};

const DEFAULT_EMAIL_BY_EVENT: Record<string, string> = {
  new_purchase:
    '<p>Hola <strong>{{nombre}}</strong>,</p><p>Tu plan <strong>{{plan}}</strong> quedó activo. Número: {{phone}} · slot {{slot_id}}.</p>',
  cancellation:
    '<p>Hola <strong>{{nombre}}</strong>,</p><p>Tu suscripción <strong>{{plan}}</strong> fue cancelada. Último período facturado hasta {{end_date}}.</p>',
  upgrade_success:
    '<p>Hola <strong>{{nombre}}</strong>,</p><p>Tu plan pasó a <strong>{{plan}}</strong>.</p>',
  invoice_paid:
    '<p>Hola <strong>{{nombre}}</strong>,</p><p>Registramos el pago de tu factura. Plan: {{plan}}. Próximo ciclo: {{end_date}}.</p>',
};

/** Asuntos por defecto si `admin_settings.subject` está vacío (eventos canónicos). */
const DEFAULT_EMAIL_SUBJECT_BY_EVENT: Record<string, string> = {
  new_purchase: '[Telsim] Tu línea {{phone}} ya está activa',
  cancellation: '[Telsim] Confirmación de cancelación de tu línea {{phone}}',
  upgrade_success: '[Telsim] Tu plan fue actualizado a {{plan}}',
  invoice_paid: '[Telsim] Pago confirmado de tu plan {{plan}}',
};

const DEFAULT_APP_BY_EVENT: Record<string, string> = {
  new_purchase: 'Tu plan {{plan}} está activo. Número {{phone}}.',
  cancellation: 'Tu plan {{plan}} quedó cancelado. Podrás reactivar cuando quieras.',
  upgrade_success: 'Tu plan pasó a {{plan}}.',
  invoice_paid: 'Pago de factura registrado para {{plan}}.',
};

const IN_APP_TITLE_BY_EVENT: Record<string, string> = {
  new_purchase: '✅ Compra confirmada',
  cancellation: '🔴 Suscripción terminada',
  upgrade_success: '🚀 Plan actualizado',
  invoice_paid: '💳 Pago registrado',
};

async function renderTemplateOrDefault(
  kind: 'email' | 'telegram' | 'app',
  event: string,
  data: Record<string, unknown>
): Promise<{ text: string; usedFallback: boolean }> {
  const prefix =
    kind === 'email' ? 'template_email_' : kind === 'telegram' ? 'template_telegram_' : 'template_app_';
  const templateId = `${prefix}${event}`;
  const raw =
    kind === 'email'
      ? (await getEmailTemplateParts(templateId)).content
      : await getTemplateContent(templateId);
  if (raw && raw.trim()) {
    return { text: replaceVariables(raw, data), usedFallback: false };
  }
  void logEvent(
    'TEMPLATE_MISSING',
    'warning',
    `Plantilla vacía o inexistente: ${templateId}`,
    undefined,
    { template_id: templateId, event, channel: kind },
    'stripe'
  );
  const defaults =
    kind === 'email' ? DEFAULT_EMAIL_BY_EVENT : kind === 'telegram' ? DEFAULT_TELEGRAM_BY_EVENT : DEFAULT_APP_BY_EVENT;
  const def = defaults[event];
  const fallback =
    def ??
    (kind === 'telegram'
      ? 'TELSIM · {{plan}} · {{phone}} · {{status}}'
      : '<p>Actualización de tu cuenta TELSIM ({{plan}}).</p>');
  return { text: replaceVariables(fallback, data), usedFallback: true };
}

const GENERIC_EMAIL_SUBJECT_FALLBACK = '[Telsim] Actualización de tu cuenta • {{plan}}';

async function resolveEmailSubject(event: string, data: Record<string, unknown>): Promise<string> {
  const templateId = `template_email_${event}`;
  const { subject: dbSubject } = await getEmailTemplateParts(templateId);
  if (dbSubject && dbSubject.trim()) {
    return replaceVariables(dbSubject.trim(), data);
  }
  const def = DEFAULT_EMAIL_SUBJECT_BY_EVENT[event];
  if (def) {
    return replaceVariables(def, data);
  }
  return replaceVariables(GENERIC_EMAIL_SUBJECT_FALLBACK, data);
}

const FINANCE_COST_PER_SLOT_MONTH_CENTS_ID = 'finance_cost_per_slot_month_cents';
const FINANCE_COST_PER_SMS_CENTS_ID = 'finance_cost_per_sms_cents';

/** Tras reactivación, Stripe puede emitir invoice.payment_succeeded; no debe verse como compra nueva. */
const REACTIVATION_PURCHASE_SKIP_MS = 5 * 60 * 1000;

/** Tras reactivación exitosa, el invoice asociado no debe disparar invoice_paid (email/app) durante esta ventana. */
const REACTIVATION_INVOICE_SKIP_MS = 24 * 60 * 60 * 1000;

function skipPurchaseNotifsDueToRecentReactivation(meta: Stripe.Metadata | null | undefined): boolean {
  const m = meta as Record<string, string> | null | undefined;
  if (!m || m.reactivation_flow !== 'true') return false;
  const at = m.reactivation_at;
  if (!at) return false;
  const secs = Number(at);
  if (!Number.isFinite(secs)) return false;
  return Date.now() - secs * 1000 <= REACTIVATION_PURCHASE_SKIP_MS;
}

/** Omite notificaciones tipo invoice_paid mientras la suscripción sigue marcada con flujo de reactivación reciente. */
function skipInvoiceNotifsDueToReactivationFlow(meta: Stripe.Metadata | null | undefined): boolean {
  const m = meta as Record<string, string> | null | undefined;
  if (!m || m.reactivation_flow !== 'true') return false;
  const at = m.reactivation_at;
  if (!at) return false;
  const secs = Number(at);
  if (!Number.isFinite(secs)) return false;
  return Date.now() - secs * 1000 <= REACTIVATION_INVOICE_SKIP_MS;
}

function parseCentsSetting(content: unknown): number {
  const n = typeof content === 'string' ? parseInt(content, 10) : Number(content);
  return Number.isFinite(n) ? n : 0;
}

async function getFinanceCostRatesCents(): Promise<{
  costPerSlotMonthCents: number;
  costPerSmsCents: number;
}> {
  try {
    const [slotRow, smsRow] = await Promise.all([
      supabaseAdmin
        .from('admin_settings')
        .select('content')
        .eq('id', FINANCE_COST_PER_SLOT_MONTH_CENTS_ID)
        .maybeSingle(),
      supabaseAdmin
        .from('admin_settings')
        .select('content')
        .eq('id', FINANCE_COST_PER_SMS_CENTS_ID)
        .maybeSingle(),
    ]);

    const costPerSlotMonthCents = parseCentsSetting((slotRow as any)?.data?.content);
    const costPerSmsCents = parseCentsSetting((smsRow as any)?.data?.content);

    return { costPerSlotMonthCents, costPerSmsCents };
  } catch {
    return { costPerSlotMonthCents: 0, costPerSmsCents: 0 };
  }
}

/** Persiste invoice / recibo oficial Stripe (PDF + URLs + impuestos) para el panel del cliente. Devuelve la invoice enriquecida. */
async function persistSubscriptionInvoiceFromWebhook(params: {
  invoice: Stripe.Invoice;
  sub: { id: string; user_id: string };
  stripeSubId: string;
}): Promise<Stripe.Invoice> {
  const { invoice, sub, stripeSubId } = params;
  let fullInv: Stripe.Invoice = invoice;
  try {
    if (invoice.id) {
      fullInv = await stripe.invoices.retrieve(invoice.id, {
        expand: ['customer_tax_ids', 'charge', 'payment_intent.latest_charge'],
      });
    }
  } catch (e: any) {
    console.warn('[subscription_invoices] retrieve', invoice.id, e?.message);
    fullInv = invoice;
  }

  const periodEndSec = fullInv.period_end ?? fullInv.lines?.data?.[0]?.period?.end;
  const periodEndIso = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null;

  let nextBillingIso: string | null = periodEndIso;
  try {
    const stSub = await stripe.subscriptions.retrieve(stripeSubId);
    if (stSub.current_period_end) {
      nextBillingIso = new Date(stSub.current_period_end * 1000).toISOString();
    }
  } catch {
    /* mantener periodEndIso */
  }

  const receiptUrl = extractReceiptUrlFromInvoice(fullInv);

  const { error: invUpsertErr } = await supabaseAdmin.from('subscription_invoices').upsert(
    {
      stripe_invoice_id: fullInv.id,
      user_id: sub.user_id,
      subscription_id: sub.id,
      stripe_subscription_id: stripeSubId,
      billing_reason: fullInv.billing_reason ?? null,
      invoice_pdf: fullInv.invoice_pdf ?? null,
      hosted_invoice_url: fullInv.hosted_invoice_url ?? null,
      receipt_url: receiptUrl,
      amount_paid_cents: fullInv.amount_paid ?? 0,
      subtotal_cents: fullInv.subtotal ?? null,
      tax_cents: invoiceTaxCents(fullInv),
      total_cents: fullInv.total ?? null,
      currency: fullInv.currency ?? 'usd',
      customer_tax_ids: invoiceCustomerTaxIdsForDb(fullInv),
      tax_breakdown: invoiceTaxBreakdownForDb(fullInv),
      next_billing_at: nextBillingIso,
      period_end_at: periodEndIso,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_invoice_id' }
  );

  if (invUpsertErr) {
    console.error('[subscription_invoices] upsert failed (Supabase)', {
      stripe_invoice_id: fullInv.id,
      subscription_id: sub.id,
      user_id: sub.user_id,
      code: invUpsertErr.code,
      message: invUpsertErr.message,
      details: invUpsertErr.details,
      hint: (invUpsertErr as { hint?: string }).hint,
    });
    throw new Error(
      `[subscription_invoices] persist failed: ${invUpsertErr.message} (code=${invUpsertErr.code ?? 'n/a'})`
    );
  }

  return fullInv;
}

/** Columnas necesarias para invoice.payment_succeeded + ledger + email. */
const SUBSCRIPTION_ROW_FOR_INVOICE_PAYMENT =
  'id, user_id, plan_name, status, slot_id, phone_number, monthly_limit, billing_type, currency, stripe_session_id, stripe_subscription_id, created_at';

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** UUID en metadata (userId / user_id). */
function parseUserIdFromMetadata(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return undefined;
  return t;
}

/** Unifica metadata Stripe (invoice, líneas, subscription_details) en userId / slotId / phoneNumber. */
function mergeMetadataRecord(
  target: { userId?: string; slotId?: string; phoneNumber?: string },
  meta: Stripe.Metadata | null | undefined
): void {
  if (!meta || typeof meta !== 'object') return;
  const o = meta as Record<string, string>;
  for (const [k, raw] of Object.entries(o)) {
    if (raw == null || String(raw).trim() === '') continue;
    const key = k.toLowerCase().replace(/-/g, '_');
    const v = String(raw).trim();
    if (key === 'user_id' || key === 'userid') {
      const u = parseUserIdFromMetadata(v);
      if (u) target.userId = u;
    } else if (key === 'slot_id' || key === 'slotid') {
      target.slotId = v;
    } else if (key === 'phone_number' || key === 'phonenumber' || key === 'phone') {
      target.phoneNumber = v;
    }
  }
}

async function extractInvoiceLinkageHints(
  invoice: Stripe.Invoice,
  stripeSubId: string
): Promise<{ userId?: string; slotId?: string; phoneNumber?: string }> {
  const hints: { userId?: string; slotId?: string; phoneNumber?: string } = {};
  mergeMetadataRecord(hints, invoice.metadata);

  for (const line of invoice.lines?.data ?? []) {
    mergeMetadataRecord(hints, line.metadata);
    const parent = (line as { parent?: { subscription_details?: { metadata?: Stripe.Metadata } } }).parent;
    if (parent?.subscription_details?.metadata) {
      mergeMetadataRecord(hints, parent.subscription_details.metadata);
    }
  }

  if (stripeSubId.startsWith('sub_') && (!hints.userId || !hints.slotId)) {
    try {
      const stSub = await stripe.subscriptions.retrieve(stripeSubId);
      mergeMetadataRecord(hints, stSub.metadata);
    } catch (e: any) {
      console.warn('[WEBHOOK] extractInvoiceLinkageHints: subscription.retrieve failed', stripeSubId, e?.message);
    }
  }

  return hints;
}

/**
 * Lookup principal: stripe_subscription_id estable; checkout legacy cs_* por stripe_session_id.
 * No devuelve filas canceladas: esas no son el vínculo operativo para un pago nuevo (→ fallback sin INSERT).
 */
async function findSubscriptionRowByStripeSubscriptionId(stripeSubId: string): Promise<{
  data: Record<string, unknown> | null;
  error: { message: string; code?: string } | null;
}> {
  const nonCanceled = () =>
    supabaseAdmin
      .from('subscriptions')
      .select(SUBSCRIPTION_ROW_FOR_INVOICE_PAYMENT)
      .not('status', 'eq', 'canceled')
      .not('status', 'eq', 'cancelled');

  const { data: byStripeSub, error: errStripeSub } = await nonCanceled()
    .eq('stripe_subscription_id', stripeSubId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errStripeSub) {
    return {
      data: null,
      error: { message: errStripeSub.message, code: errStripeSub.code },
    };
  }
  if (byStripeSub) {
    return { data: byStripeSub as Record<string, unknown>, error: null };
  }

  if (stripeSubId.startsWith('cs_')) {
    const { data: bySession, error: errSession } = await nonCanceled()
      .eq('stripe_session_id', stripeSubId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (errSession) {
      return {
        data: null,
        error: { message: errSession.message, code: errSession.code },
      };
    }
    return { data: (bySession as Record<string, unknown>) ?? null, error: null };
  }

  return { data: null, error: null };
}

/** Defensa en profundidad: si el SELECT devolviera una fila cancelada, no usarla para billing. */
function discardCanceledSubscriptionRowForInvoicePayment(
  row: Record<string, unknown> | null,
  reason: string,
  stripeSubId: string
): Record<string, unknown> | null {
  if (!row) return null;
  if (!isCanceledSubscriptionStatus(String(row.status ?? ''))) return row;
  console.warn('[WEBHOOK] invoice.payment_succeeded', {
    phase: 'subscription_lookup_abort_canceled_candidate',
    message: reason,
    subscription_id: row.id ?? null,
    row_status: row.status ?? null,
    row_stripe_subscription_id: row.stripe_subscription_id ?? null,
    stripeSubId,
  });
  return null;
}

const FALLBACK_CANDIDATE_LIMIT = 25;
const PHONE_FALLBACK_ROW_CAP = 40;

function isCanceledSubscriptionStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'canceled' || s === 'cancelled';
}

type PickLiveCandidateMode = 'exact_sub_match' | 'repair_missing_sub' | 'none';

/**
 * Entre filas ordenadas por created_at desc, elige una fila “viva” para vincular al sub_ actual,
 * o indica que hay que reparar stripe_subscription_id (null). No usa filas canceladas como patch target.
 */
function pickLiveSubscriptionCandidate(
  rows: Record<string, unknown>[],
  stripeSubId: string
): { mode: PickLiveCandidateMode; row: Record<string, unknown> | null } {
  const live = rows.filter((r) => !isCanceledSubscriptionStatus(String(r.status ?? '')));
  const exact = live.find((r) => String(r.stripe_subscription_id ?? '') === stripeSubId);
  if (exact) {
    return { mode: 'exact_sub_match', row: exact };
  }
  const repair = live.find(
    (r) =>
      r.stripe_subscription_id == null ||
      String(r.stripe_subscription_id).trim() === ''
  );
  if (repair) {
    return { mode: 'repair_missing_sub', row: repair };
  }
  return { mode: 'none', row: null };
}

async function listSubscriptionRowsByUserAndSlot(
  userId: string,
  slotId: string,
  limit = FALLBACK_CANDIDATE_LIMIT
): Promise<{ data: Record<string, unknown>[]; error: { message: string; code?: string } | null }> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select(SUBSCRIPTION_ROW_FOR_INVOICE_PAYMENT)
    .eq('user_id', userId)
    .eq('slot_id', slotId.trim())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: { message: error.message, code: error.code } };
  }
  return { data: (data as Record<string, unknown>[]) ?? [], error: null };
}

async function listSubscriptionRowsByUserAndPhone(
  userId: string,
  phoneHint: string,
  limit = PHONE_FALLBACK_ROW_CAP
): Promise<{ data: Record<string, unknown>[]; error: { message: string; code?: string } | null }> {
  const hintDigits = digitsOnly(phoneHint);
  if (!hintDigits) {
    return { data: [], error: null };
  }

  const variants = [...new Set([phoneHint.trim(), hintDigits, `+${hintDigits}`].filter(Boolean))];
  const { data: byVariants, error: errVariants } = await supabaseAdmin
    .from('subscriptions')
    .select(SUBSCRIPTION_ROW_FOR_INVOICE_PAYMENT)
    .eq('user_id', userId)
    .in('phone_number', variants)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (errVariants) {
    return { data: [], error: { message: errVariants.message, code: errVariants.code } };
  }
  if (byVariants?.length) {
    return { data: byVariants as Record<string, unknown>[], error: null };
  }

  const { data: rows, error: errRows } = await supabaseAdmin
    .from('subscriptions')
    .select(SUBSCRIPTION_ROW_FOR_INVOICE_PAYMENT)
    .eq('user_id', userId)
    .not('phone_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (errRows) {
    return { data: [], error: { message: errRows.message, code: errRows.code } };
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  const matches = list.filter((r) => digitsOnly(String(r.phone_number ?? '')) === hintDigits);
  return { data: matches, error: null };
}

async function triggerEmail(
  event: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const templateId = `template_email_${event}`;
  const { text: bodyOverride } = await renderTemplateOrDefault('email', event, data);
  const subjectResolved = await resolveEmailSubject(event, data);
  try {
    let email = (data?.to_email as string) ?? (data?.email as string) ?? (data?.to as string) ?? undefined;
    if (!email) {
      const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', userId).maybeSingle();
      email = userData?.email;
    }
    if (!email) return;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return;
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({
        event,
        user_id: userId,
        to_email: email,
        data,
        template_id: templateId,
        content: bodyOverride,
        subject: subjectResolved,
      }),
    });
    await res.json().catch(() => ({}));
    /** Historial: un solo insert en send-email (Edge); evitar duplicar filas. */
  } catch (err) {
    console.error('[triggerEmail]', err);
  }
}

/**
 * Tras liberar el slot (libre), reserva 48h en `public.slots` — fuente de verdad del token de reactivación.
 * `reservation_stripe_session_id` queda null hasta que el usuario abre checkout (api/manage reactivate-line).
 */
async function reserveSlotAfterCancellationForEmail(params: {
  slotId: string;
  userId: string;
  /** Si hay otra suscripción viva con otro `stripe_subscription_id`, no reservar (p. ej. upgrade). */
  canceledStripeSubscriptionId?: string;
  phoneNumber?: string | null;
}): Promise<{ token: string | null; expiresAt: string | null }> {
  if (params.canceledStripeSubscriptionId) {
    const other = await findOtherLiveSubscriptionExcludingStripeId(supabaseAdmin, {
      slotId: params.slotId,
      phoneNumber: params.phoneNumber ?? null,
      excludeStripeSubscriptionId: params.canceledStripeSubscriptionId,
    });
    if (other) {
      console.log('[SLOT_GUARD] reserveSlotAfterCancellationForEmail omitido (otra sub viva)', {
        slot_id: params.slotId,
        canceled_stripe_subscription_id: params.canceledStripeSubscriptionId,
        other_subscription_id: other.id,
      });
      return { token: null, expiresAt: null };
    }
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('slots')
    .update({
      status: 'reserved',
      reservation_token: token,
      reservation_expires_at: expiresAt,
      reservation_user_id: params.userId,
      reservation_stripe_session_id: null,
    })
    .eq('slot_id', params.slotId)
    .eq('status', 'libre')
    .select('reservation_token, reservation_expires_at')
    .maybeSingle();

  if (error) {
    console.error('[CANCEL] slot reservation update failed', error);
    return { token: null, expiresAt: null };
  }
  if (!data) {
    console.error('[CANCEL] slot reservation: ninguna fila actualizada (¿slot no libre?)', {
      slot_id: params.slotId,
    });
    return { token: null, expiresAt: null };
  }
  return { token, expiresAt };
}

async function sendTelegramNotification(
  messageOrEvent: string,
  userId: string,
  data?: Record<string, unknown>
): Promise<void> {
  let message: string;
  if (data != null) {
    const { text } = await renderTemplateOrDefault('telegram', messageOrEvent, data);
    message = text;
  } else {
    message = messageOrEvent;
  }
  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id, notification_preferences')
      .eq('id', userId)
      .maybeSingle();
    const tgToken = userRow?.telegram_token;
    const tgChatId = userRow?.telegram_chat_id;
    const prefs = userRow?.notification_preferences as { sim_expired?: { telegram?: boolean }; sim_activated?: { telegram?: boolean } } | null | undefined;
    const sendTg = prefs?.sim_expired?.telegram === true || prefs?.sim_activated?.telegram === true;
    if (tgToken && tgChatId && sendTg) {
      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: message, parse_mode: 'Markdown' }),
      });
      const tgData = await tgRes.json().catch(() => ({}));
      try {
        await supabaseAdmin.from('notification_history').insert({
          user_id: userId,
          type: 'telegram',
          event_name: typeof data !== 'undefined' ? messageOrEvent : 'notification',
          recipient: `Telegram:${tgChatId}`,
          content: (message || '').slice(0, 500) || null,
          status: tgRes.ok ? 'sent' : 'error',
          error_message: tgRes.ok ? null : (tgData?.description ?? null),
        });
      } catch {
        // no bloquear
      }
    }
  } catch (err) {
    console.warn('[sendTelegramNotification]', (err as Error)?.message);
  }
}

async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'activation' | 'subscription' | 'error' | 'warning' | 'success',
  sourceStripeEventId?: string,
  sourceNotificationKey?: string
): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
      ...(sourceStripeEventId ? { source_stripe_event_id: sourceStripeEventId } : {}),
      ...(sourceNotificationKey ? { source_notification_key: sourceNotificationKey } : {}),
    });

    // Trazabilidad en audit_logs para entender qué se envió y por qué camino.
    void logEvent(
      'IN_APP_NOTIFICATION_DISPATCHED',
      'info',
      `${title}`,
      null,
      {
        user_id: userId,
        type,
        source_notification_key: sourceNotificationKey ?? null,
        source_stripe_event_id: sourceStripeEventId ?? null,
      },
      'stripe'
    );
  } catch (e) {
    console.warn('[NOTIFICATION WARN]', e);
  }
}

/** In-app desde `template_app_<event>` (mismo evento canónico que email/Telegram). */
async function createNotificationFromTemplate(
  event: string,
  userId: string,
  data: Record<string, unknown>,
  type: 'activation' | 'subscription' | 'error' | 'warning' | 'success',
  sourceStripeEventId?: string
): Promise<void> {
  const { text: message } = await renderTemplateOrDefault('app', event, data);
  const title = IN_APP_TITLE_BY_EVENT[event] ?? 'Telsim';
  await createNotification(userId, title, message, type, sourceStripeEventId, event);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  let event: Stripe.Event;
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const rawBody = Buffer.concat(chunks);

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = JSON.parse(rawBody.toString());
    }
  } catch (err: any) {
    console.error('[WEBHOOK SIGNATURE ERROR]', err.message);
    await logEvent('WEBHOOK_ERROR', 'error', err?.message, undefined, { stack: err?.stack, context: 'signature' }, 'stripe');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
  console.log(`[WEBHOOK] Evento recibido: ${event.type}`);
  console.log('[WEBHOOK] Received event type:', event.type);

  const stripeEventId = (event as Stripe.Event).id;

  const markWebhookProcessed = async () => {
    if (!stripeEventId) return;
    try {
      await supabaseAdmin
        .from('stripe_webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('event_id', stripeEventId);
    } catch {
      // no bloquear el webhook por problemas del registro de dedupe
    }
  };

  const markWebhookFailed = async (message?: string, stack?: string) => {
    if (!stripeEventId) return;
    try {
      await supabaseAdmin
        .from('stripe_webhook_events')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: message ?? stack ?? null,
        })
        .eq('event_id', stripeEventId);
    } catch {
      // no bloquear el webhook por problemas del registro de dedupe
    }
  };

  // Dedupe por event.id: evita duplicar side effects cuando Stripe reintenta el webhook.
  if (stripeEventId) {
    const { data: existing } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('status')
      .eq('event_id', stripeEventId)
      .maybeSingle();

    if (existing?.status === 'processed') {
      return res.status(200).json({ received: true, deduped: true });
    }

    if (!existing) {
      try {
        await supabaseAdmin.from('stripe_webhook_events').insert({
          event_id: stripeEventId,
          event_type: event.type,
          status: 'processing',
        });
      } catch {
        // si hay race, el registro existirá/ya existió
      }
    } else if (existing?.status === 'failed') {
      // Reintento seguro: volvemos a marcar como processing antes de ejecutar side effects.
      await supabaseAdmin
        .from('stripe_webhook_events')
        .update({ status: 'processing', processed_at: null, failed_at: null, error_message: null })
        .eq('event_id', stripeEventId);
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    // Stripe envía metadata en el JSON; para que la compra finalice con éxito usamos metadata.slot_id (ej. '43A') y metadata.userId
    const rawMeta = session.metadata as Record<string, string> | null | undefined;
    let sessionMeta: Record<string, string> = rawMeta && typeof rawMeta === 'object' ? { ...rawMeta } : {};

    if (session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        sessionMeta = { ...(subscription.metadata as Record<string, string>), ...sessionMeta } as Record<string, string>;
      } catch (e: any) {
        console.warn('[WEBHOOK] No se pudo leer metadata desde subscription:', e?.message);
      }
    }

    if (sessionMeta.upgrade === 'true' && sessionMeta.slot_id && sessionMeta.user_id) {
      const upgradeMeta = sessionMeta;
      console.log('[UPGRADE] Iniciando procesamiento upgrade:', JSON.stringify({
        slot_id: upgradeMeta.slot_id,
        user_id: upgradeMeta.user_id,
        new_plan: upgradeMeta.new_plan_name,
        old_sub: upgradeMeta.old_subscription_id,
      }));
      const newSubId = session.subscription as string;

      const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'pending_reactivation_cancel'];

      // Monto y billing desde el price de Stripe (no session.amount_total que puede ser 0)
      const newSub = await stripe.subscriptions.retrieve(newSubId, { expand: ['items.data.price'] });
      const firstPrice = newSub.items.data[0]?.price;
      const amount = (firstPrice?.unit_amount ?? 0) / 100;
      const billingTypeFromStripe = firstPrice?.recurring?.interval === 'year' ? 'annual' : 'monthly';
      const upgradeMonthlyLimit = monthlySmsLimitForPlan(upgradeMeta.new_plan_name, null);
      const billingSnap = subscriptionBillingSnapshotFromStripe(newSub);

      // 1) Persistir la nueva fila ANTES de cancelar la suscripción antigua en Stripe, para que
      //    customer.subscription.deleted pueda ver otra sub vía findOtherLiveSubscriptionExcludingStripeId
      //    y NO ejecute release_slot_atomic → cancel_subscriptions_atomic sobre el slot.
      const { data: existingNewRow } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', newSubId)
        .maybeSingle();

      let upgradeSubscriptionId: string | null = (existingNewRow as { id?: string } | null)?.id ?? null;

      if (!existingNewRow) {
        const activationTs = new Date().toISOString();
        const { data: phoneRow } = await supabaseAdmin
          .from('subscriptions')
          .select('phone_number')
          .eq('slot_id', upgradeMeta.slot_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const upgradeInsertPayload = {
          user_id: upgradeMeta.user_id,
          slot_id: upgradeMeta.slot_id,
          phone_number: (phoneRow as { phone_number?: string } | null)?.phone_number ?? null,
          stripe_subscription_id: newSubId,
          stripe_session_id: session.id,
          plan_name: upgradeMeta.new_plan_name,
          monthly_limit: upgradeMonthlyLimit,
          credits_used: 0,
          billing_type: billingTypeFromStripe,
          amount,
          currency: (newSub.currency ?? 'usd') as string,
          status: billingSnap.status,
          subscription_status: newSub.status,
          trial_end: billingSnap.trial_end,
          current_period_end: billingSnap.current_period_end,
          next_billing_date: billingSnap.next_billing_date,
          activation_state: 'on_air',
          activation_state_updated_at: activationTs,
          created_at: activationTs,
          updated_at: activationTs,
        };

        let upInsRow: { id?: string } | null = null;
        let upInsErr: { code?: string; message?: string; details?: string | null } | null = null;

        const firstInsert = await supabaseAdmin
          .from('subscriptions')
          .insert(upgradeInsertPayload)
          .select('id')
          .maybeSingle();
        upInsRow = firstInsert.data as { id?: string } | null;
        upInsErr = firstInsert.error;

        if (upInsErr?.code === '23505' && /slot_id/i.test(String(upInsErr.details ?? upInsErr.message ?? ''))) {
          console.warn('[UPGRADE] live slot conflict on insert; marking previous live rows canceled before retry', {
            slot_id: upgradeMeta.slot_id,
            old_subscription_id: upgradeMeta.old_subscription_id,
            new_subscription_id: newSubId,
          });

          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: activationTs,
            })
            .eq('slot_id', upgradeMeta.slot_id)
            .in('status', LIVE_STATUSES)
            .neq('stripe_subscription_id', newSubId);

          const retryInsert = await supabaseAdmin
            .from('subscriptions')
            .insert(upgradeInsertPayload)
            .select('id')
            .maybeSingle();
          upInsRow = retryInsert.data as { id?: string } | null;
          upInsErr = retryInsert.error;
        }

        if (upInsErr) {
          console.error('[PURCHASE] subscription upsert error (upgrade)', upInsErr);
          throw new Error(`[UPGRADE_INSERT_FAILED] ${upInsErr.message}`);
        } else {
          upgradeSubscriptionId = (upInsRow as { id?: string } | null)?.id ?? null;
          console.log('[PURCHASE] subscription upsert OK', {
            subscriptionId: upgradeSubscriptionId,
            stage: 'upgrade_insert',
            slotId: upgradeMeta.slot_id,
            stripeSubscriptionId: newSubId,
          });
        }
      } else {
        console.log('[UPGRADE] idempotente: fila ya existe para nueva Stripe subscription', { newSubId });
      }

      if (upgradeSubscriptionId) {
        const billingUpdatePayload = {
          status: billingSnap.status,
          subscription_status: newSub.status,
          trial_end: billingSnap.trial_end,
          current_period_end: billingSnap.current_period_end,
          next_billing_date: billingSnap.next_billing_date ?? billingSnap.current_period_end ?? null,
          updated_at: new Date().toISOString(),
        };
        const { error: billingPersistErr } = await supabaseAdmin
          .from('subscriptions')
          .update(billingUpdatePayload)
          .eq('id', upgradeSubscriptionId);
        if (billingPersistErr) {
          console.error('[UPGRADE] billing snapshot persist failed after insert/update', billingPersistErr);
          throw new Error(`[UPGRADE_BILLING_PERSIST_FAILED] ${billingPersistErr.message}`);
        }
      }

      // 2) Slot siempre ocupado y alineado al plan (upgrade no debe dejar reserved/libre).
      const { error: upgradeSlotErr } = await supabaseAdmin
        .from('slots')
        .update({
          status: 'ocupado',
          assigned_to: upgradeMeta.user_id,
          plan_type: upgradeMeta.new_plan_name,
          reservation_token: null,
          reservation_expires_at: null,
          reservation_user_id: null,
          reservation_stripe_session_id: null,
        })
        .eq('slot_id', upgradeMeta.slot_id);
      if (upgradeSlotErr) {
        console.error('[PURCHASE] slot upgrade ocupado error', upgradeSlotErr);
      } else {
        console.log('[PURCHASE] slot ocupado OK (upgrade)', { slotId: upgradeMeta.slot_id });
      }

      // 3) Cancelar suscripciones antiguas en Stripe y marcar filas viejas en BD.
      const { data: oldSubs } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('slot_id', upgradeMeta.slot_id)
        .in('status', LIVE_STATUSES)
        .neq('stripe_subscription_id', newSubId);

      for (const oldSub of oldSubs ?? []) {
        if (!oldSub.stripe_subscription_id) continue;
        try {
          await stripe.subscriptions.cancel(oldSub.stripe_subscription_id);
          console.log('[UPGRADE] Cancelled old sub:', oldSub.stripe_subscription_id);
        } catch (e: any) {
          console.log('[UPGRADE] Sub ya cancelada en Stripe:', oldSub.stripe_subscription_id);
        }
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', oldSub.stripe_subscription_id);
      }

      // Fase 4 (ledger-first): registrar booked_revenue por checkout.session.completed (idempotente por stripe_event_id).
      try {
        const bookedAmountCents = Math.round(amount * 100);
        const monthlyEquivalentCents = billingTypeFromStripe === 'annual'
          ? Math.round(bookedAmountCents / 12)
          : bookedAmountCents;

        await supabaseAdmin.from('finance_events').upsert(
          {
            stripe_event_id: stripeEventId,
            stripe_event_type: event.type,
            finance_event_type: 'booked_revenue',
            occurred_at: new Date(event.created * 1000).toISOString(),
            user_id: upgradeMeta.user_id,
            subscription_id: upgradeSubscriptionId,
            slot_id: upgradeMeta.slot_id,
            plan_name: upgradeMeta.new_plan_name ?? null,
            billing_type: billingTypeFromStripe,
            currency: (newSub.currency ?? 'usd') as string,
            amount_cents: bookedAmountCents,
            risk_amount_cents: null,
            metadata: { monthly_equivalent_cents: monthlyEquivalentCents },
          },
          { onConflict: 'stripe_event_id', ignoreDuplicates: true }
        );
      } catch (finErr: any) {
        console.error('[FINANCE_EVENTS] booked_revenue (upgrade) insert failed:', finErr?.message ?? finErr);
      }

      console.log('[WEBHOOK] Upgrade complete for slot', upgradeMeta.slot_id);

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email, nombre')
        .eq('id', upgradeMeta.user_id)
        .maybeSingle();

      const phoneNumber = String(upgradeMeta.phone_number || upgradeMeta.slot_id || '');
      const endDateUpgrade = new Date().toLocaleDateString('es-CL');
      const upgradePayload = {
        nombre: String((userData as { nombre?: string } | null)?.nombre ?? '').trim() || 'Cliente',
        email: String(userData?.email ?? ''),
        phone: phoneNumber.startsWith('+') ? phoneNumber : phoneNumber ? `+${phoneNumber}` : '',
        plan: String(upgradeMeta.new_plan_name ?? ''),
        end_date: endDateUpgrade,
        status: 'Activo',
        slot_id: String(upgradeMeta.slot_id ?? ''),
      };

      const upgradeDupWindowMs = 48 * 60 * 60 * 1000;
      const skipUpgradeAppDup =
        Boolean(upgradeMeta.user_id) &&
        (await hasRecentAppNotificationDuplicate(supabaseAdmin, {
          userId: String(upgradeMeta.user_id),
          sourceNotificationKey: CANONICAL_TEMPLATE_EVENTS.UPGRADE_SUCCESS,
          windowMs: upgradeDupWindowMs,
        }));

      if (!skipUpgradeAppDup) {
        await createNotificationFromTemplate(
          CANONICAL_TEMPLATE_EVENTS.UPGRADE_SUCCESS,
          String(upgradeMeta.user_id),
          upgradePayload,
          'subscription',
          stripeEventId
        );
      }

      if (userData?.email) {
        await triggerEmail(CANONICAL_TEMPLATE_EVENTS.UPGRADE_SUCCESS, upgradeMeta.user_id as string, upgradePayload);
        console.log('[UPGRADE] Email enviado a:', userData.email);
      }

      const now = new Date().toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      try {
        const billingLabel = upgradeMeta.is_annual === 'true' ? 'Anual' : 'Mensual';
        await sendTelegramNotification(CANONICAL_TEMPLATE_EVENTS.UPGRADE_SUCCESS, upgradeMeta.user_id as string, {
          ...upgradePayload,
          billing: billingLabel,
          now,
        });
      } catch (tgErr: unknown) {
        console.warn('[WEBHOOK] Telegram upgrade notification skipped:', (tgErr as Error)?.message);
      }
      console.log('[UPGRADE] Telegram enviado OK');

      await markWebhookProcessed();
      return res.status(200).json({ received: true });
    }

    // Activar número en BD con metadata.slot_id (ej. 43A) y metadata.userId recibidos en el JSON de Stripe (status: complete)
    const slotId = (sessionMeta.slot_id ?? sessionMeta.slotId ?? '').trim();
    const userId = (sessionMeta.userId ?? sessionMeta.user_id ?? '').trim();
    const planName = sessionMeta.planName ?? sessionMeta.plan_name ?? '';
    const limit = sessionMeta.limit;
    const transactionType = sessionMeta.transactionType;
    const isAnnual = sessionMeta.isAnnual;
    const phoneFromMeta = (sessionMeta.phoneNumber ?? sessionMeta.phone_number ?? '') as string;
    /** Código ISO país onboarding (metadata.region); mismo criterio que checkout + slots.country */
    const onboardingCountryIso = String(
      sessionMeta.region ?? sessionMeta.regionCode ?? ''
    )
      .trim()
      .toUpperCase();

    console.log('[WEBHOOK] metadata:', JSON.stringify(session.metadata));
    console.log(
      `[WEBHOOK INIT] sessionId: ${session.id}, userId: ${userId}, slotId: ${slotId}, planName: ${planName}, isAnnual(meta): ${isAnnual}, phoneFromMeta: ${phoneFromMeta || '(vacío)'}`
    );

    if (!userId || !slotId) {
      console.log(`[WEBHOOK SKIP] Metadata incomplete - userId: ${userId}, slotId: ${slotId}`);
      await markWebhookProcessed();
      return res.status(200).json({ received: true });
    }

    const billingTypeForEmail = sessionMeta.isAnnual === 'true' ? 'Anual' : 'Mensual';
    const isAnnualBilling = sessionMeta.isAnnual === 'true';
    let nextDateForEmail = '';
    let nextBillingDateIso: string | null = null;

    // Fase 2: validación fuerte de reserva (para evitar carreras de slots)
    const reservationTokenFromMeta = (sessionMeta.reservation_token ?? sessionMeta.reservationToken ?? '').trim();
    const enforceReservationValidation = reservationTokenFromMeta.length > 0;

    // Para cerrar el hueco entre "pago confirmado" y "servicio operativo real"
    // solo enviamos side effects de "activación" si llegamos a `on_air`.
    let activationSucceeded = false;

    try {
      // Siempre tomamos el precio contratado desde Stripe (unit_amount del Price),
      // no el monto cobrado hoy. Esto asegura que `amount` refleje el valor total
      // del plan (p.ej. $199, $399, $990) incluso en trials con cobro inicial $0.
      const lines = await stripe.checkout.sessions.listLineItems(session.id);
      const firstLine = lines.data[0];
      const price = firstLine?.price as Stripe.Price | undefined;

      // Determinar billing_type en base al intervalo real del precio en Stripe.
      // Si el intervalo del Price es "year" → 'annual', si es "month" → 'monthly'.
      // Como respaldo, usamos metadata.isAnnual si existe.
      let billingType: 'annual' | 'monthly' = 'monthly';
      const interval = price?.recurring?.interval;
      if (interval === 'year') {
        billingType = 'annual';
      } else if (interval === 'month') {
        billingType = 'monthly';
      } else if (isAnnual === 'true') {
        billingType = 'annual';
      }

      const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
        'Starter': { monthly: 19.90, annual: 199 },
        'Pro':     { monthly: 39.90, annual: 399 },
        'Power':   { monthly: 99.00, annual: 990 },
      };

      // billingType ya fue calculado arriba — usarlo para determinar amount correcto
      const planPrices = PLAN_PRICES[planName];
      let amount = 0;
      if (planPrices) {
        amount = billingType === 'annual' ? planPrices.annual : planPrices.monthly;
      } else {
        amount = (price?.unit_amount || session.amount_total || 0) / 100;
      }

      let trialEnd: string | null = null;
      let stripeSubscriptionId: string | null = null;
      let subscriptionStatus = 'active';
      let currentPeriodEndIso: string | null = null;

      if (session.subscription) {
        stripeSubscriptionId = session.subscription.toString();
        try {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const snap = subscriptionBillingSnapshotFromStripe(stripeSub);
          trialEnd = snap.trial_end;
          currentPeriodEndIso = snap.current_period_end;
          subscriptionStatus = snap.status;
          nextBillingDateIso = snap.next_billing_date;
        } catch (subErr) {
          console.warn('[WEBHOOK] No se pudo recuperar suscripción Stripe:', subErr);
        }
      }
      if (nextBillingDateIso) {
        nextDateForEmail = new Date(nextBillingDateIso).toLocaleDateString('es-CL');
      }

      if (session.customer) {
        const stripeCustomerIdToSync = session.customer.toString();
        await supabaseAdmin.from('profiles').update({
          stripe_customer_id: stripeCustomerIdToSync
        }).eq('id', userId);
        // Also sync to users table (upgrade & billing API reads from users.stripe_customer_id)
        await supabaseAdmin.from('users').update({
          stripe_customer_id: stripeCustomerIdToSync
        }).eq('id', userId);
      }

      // Checkout genérico con transactionType=UPGRADE: cancelar solo filas *viejas* del mismo slot.
      // NUNCA marcar como canceled la fila de `session.subscription` (nueva suscripción Stripe).
      if (transactionType === 'UPGRADE') {
        if (stripeSubscriptionId) {
          const { error: upgCancelErr } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('slot_id', slotId)
            .in('status', ['active', 'trialing', 'past_due', 'pending_reactivation_cancel'])
            .neq('stripe_subscription_id', stripeSubscriptionId);
          if (upgCancelErr) {
            console.error('[WEBHOOK] transactionType UPGRADE: error cancelando filas antiguas', upgCancelErr);
          }
        } else {
          console.warn(
            '[WEBHOOK] transactionType UPGRADE sin session.subscription: no se cancelan suscripciones por slot_id (evita cancelar la nueva fila a ciegas)'
          );
        }
      }

      const { data: slot, error: slotError } = await supabaseAdmin
        .from('slots')
        .select(
          'phone_number, country, status, reservation_token, reservation_expires_at, reservation_user_id, reservation_stripe_session_id'
        )
        .eq('slot_id', slotId)
        .maybeSingle();

      if (slotError) {
        console.error(`[WEBHOOK SLOT ERROR] Failed to fetch slot ${slotId}:`, slotError);
        throw new Error(`Slot lookup failed: ${slotError.message}`);
      }

      if (!slot) {
        console.warn(`[WEBHOOK SLOT MISSING] Slot ${slotId} not found in database`);
      }

      const nowForReservationMs = Date.now();

      // Si `reservation_token` no viene en metadata, aceptamos compatibilidad con checkouts antiguos
      // (Fase 2 solo endurece cuando hay token).
      let reservationValid = !enforceReservationValidation;

      if (enforceReservationValidation) {
        const countryOk =
          !onboardingCountryIso || slotCountryMatchesOnboardingIso(slot?.country, onboardingCountryIso);

        if (onboardingCountryIso && !isSupportedOnboardingCountryCode(onboardingCountryIso)) {
          console.warn('[WEBHOOK] reservation: código país en metadata no está en slotCountryMapping', {
            slotId,
            onboardingCountryIso,
          });
        }

        if (!countryOk && slot && onboardingCountryIso) {
          console.warn('[WEBHOOK] reservation country mismatch (slots.country vs metadata.region)', {
            slotId,
            onboardingCountryIso,
            slot_country: slot.country,
          });
        }

        reservationValid = !!slot &&
          slot.status === 'reserved' &&
          slot.reservation_token === reservationTokenFromMeta &&
          !!slot.reservation_expires_at &&
          new Date(slot.reservation_expires_at as any).getTime() > nowForReservationMs &&
          String(slot.reservation_user_id || '') === String(userId) &&
          countryOk &&
          (!slot.reservation_stripe_session_id || slot.reservation_stripe_session_id === session.id);

        // Si la reserva caducó, liberamos el slot solo si el token coincide (evita tocar reservas ajenas).
        if (slot?.status === 'reserved' && slot?.reservation_token === reservationTokenFromMeta) {
          const expiresAtMs = slot.reservation_expires_at
            ? new Date(slot.reservation_expires_at as any).getTime()
            : 0;
          if (expiresAtMs <= nowForReservationMs) {
            await supabaseAdmin.from('slots').update({
              status: 'libre',
              assigned_to: null,
              plan_type: null,
              reservation_token: null,
              reservation_expires_at: null,
              reservation_user_id: null,
              reservation_stripe_session_id: null,
            }).eq('slot_id', slotId).eq('reservation_token', reservationTokenFromMeta);
          }
        }
      }

      // phone_number para correo y Telegram: metadata primero, luego tabla slots (vital si metadata no lo trajo)
      const resolvedPhoneForNotifications = (phoneFromMeta && String(phoneFromMeta).trim()) || slot?.phone_number || '';
      const resolvedMonthlyLimit = monthlySmsLimitForPlan(planName, limit);

      const { data: exists } = await supabaseAdmin
        .from('subscriptions')
        .select('id, activation_state, stripe_session_id, stripe_subscription_id, monthly_limit, plan_name')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      let subscriptionId = exists?.id ?? null;
      const existingActivationState = (exists?.activation_state as string | null | undefined) ?? null;

      if (!exists) {
        const correctAmount = amount;

        console.log(
          `[WEBHOOK DEBUG] planName: ${planName}, isAnnual(meta): ${isAnnual}, billingType: ${billingType}, amount(unit_amount): ${amount}, correctAmount: ${correctAmount}`
        );

        if (!stripeSubscriptionId) {
          console.warn('[WEBHOOK] checkout.session.completed: falta subscription de Stripe en la sesión', {
            sessionId: session.id,
            slotId,
          });
        }

        if (stripeSubscriptionId) {
          const { data: slotConflict } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('slot_id', slotId)
            .in('status', ['active', 'trialing', 'past_due'])
            .neq('stripe_subscription_id', stripeSubscriptionId)
            .maybeSingle();
          if (slotConflict?.id) {
            console.warn('[WEBHOOK] checkout.session.completed', {
              log_event: 'checkout_insert_blocked_slot_has_other_live_sub',
              slot_id: slotId,
              conflicting_subscription_id: slotConflict.id,
              stripe_subscription_id: stripeSubscriptionId,
            });
            await markWebhookProcessed();
            return res.status(200).json({
              received: true,
              ignored: true,
              reason: 'slot_has_other_live_subscription',
            });
          }
        }

        const insertData = {
          user_id: userId,
          slot_id: slotId,
          phone_number: resolvedPhoneForNotifications || slot?.phone_number,
          plan_name: planName,
          monthly_limit: resolvedMonthlyLimit,
          status: subscriptionStatus,
          stripe_session_id: session.id,
          stripe_subscription_id: stripeSubscriptionId,
          trial_end: trialEnd,
          amount: correctAmount,
          billing_type: billingType,
          currency: session.currency || 'usd',
          next_billing_date: nextBillingDateIso,
          current_period_end: currentPeriodEndIso,
          activation_state: reservationValid ? 'paid' : 'failed',
          created_at: new Date().toISOString(),
        };

        console.log(`[WEBHOOK INSERT] Attempting to insert subscription:`, JSON.stringify(insertData, null, 2));

        const { data: insertedData, error: insertError } = await supabaseAdmin.from('subscriptions')
          .insert(insertData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`[WEBHOOK INSERT ERROR] Failed to insert subscription:`, insertError);
          throw new Error(`Supabase insert error: ${insertError.message}`);
        }

        console.log(`[WEBHOOK INSERT SUCCESS] Subscription inserted successfully:`, insertedData);
        subscriptionId = (insertedData as { id?: string } | null)?.id ?? subscriptionId;
        console.log('[PURCHASE] subscription upsert OK', {
          subscriptionId,
          stage: 'checkout_insert',
          stripeSessionId: session.id,
        });
      } else if (exists && stripeSubscriptionId) {
        const row = exists as {
          id: string;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          monthly_limit?: number | null;
          plan_name?: string | null;
        };
        const patch: Record<string, string | number> = {};
        if (row.stripe_session_id !== session.id) {
          patch.stripe_session_id = session.id;
        }
        if (!row.stripe_subscription_id || row.stripe_subscription_id !== stripeSubscriptionId) {
          patch.stripe_subscription_id = stripeSubscriptionId;
        }
        const sid = row.stripe_session_id;
        if ((!row.stripe_subscription_id || !String(row.stripe_subscription_id).startsWith('sub_')) &&
          typeof sid === 'string' &&
          sid.startsWith('sub_')) {
          patch.stripe_subscription_id = sid;
          patch.stripe_session_id = session.id;
          console.warn('[WEBHOOK] subscriptions: corrigiendo IDs mezclados (sub_ estaba en stripe_session_id)', {
            subscription_id: row.id,
          });
        }
        const priorMl = row.monthly_limit;
        if (
          priorMl == null ||
          (typeof priorMl === 'number' && (Number.isNaN(priorMl) || priorMl <= 0))
        ) {
          patch.monthly_limit = resolvedMonthlyLimit;
        }
        if (Object.keys(patch).length > 0) {
          console.log('[WEBHOOK] subscriptions: alineación Stripe IDs (idempotencia checkout.session.completed)', {
            subscription_id: row.id,
            patch_keys: Object.keys(patch),
          });
          await supabaseAdmin.from('subscriptions').update(patch).eq('id', row.id);
          console.log('[PURCHASE] subscription upsert OK', {
            subscriptionId: row.id,
            stage: 'checkout_stripe_ids_patch',
            stripeSessionId: session.id,
          });
        }
      }

      // Fase 4 (ledger-first): registrar booked_revenue por checkout.session.completed (idempotente por stripe_event_id).
      // Nominal vendido = `amount` (mensualidad o anualidad, según billingType).
      try {
        const bookedAmountCents = Math.round(amount * 100);
        const monthlyEquivalentCents = billingType === 'annual'
          ? Math.round(bookedAmountCents / 12)
          : bookedAmountCents;

        await supabaseAdmin.from('finance_events').upsert(
          {
            stripe_event_id: stripeEventId,
            stripe_event_type: event.type,
            finance_event_type: 'booked_revenue',
            occurred_at: new Date(event.created * 1000).toISOString(),
            user_id: userId,
            subscription_id: subscriptionId,
            slot_id: slotId,
            plan_name: planName ?? null,
            billing_type: billingType,
            currency: (session.currency ?? 'usd') as string,
            amount_cents: bookedAmountCents,
            risk_amount_cents: null,
            metadata: { monthly_equivalent_cents: monthlyEquivalentCents },
          },
          { onConflict: 'stripe_event_id', ignoreDuplicates: true }
        );
      } catch (finErr: any) {
        console.error('[FINANCE_EVENTS] booked_revenue insert failed:', finErr?.message ?? finErr);
      }

      // activation_state = paid (fuente de verdad para iniciar notificaciones)
      if (reservationValid && (!exists || existingActivationState === 'paid')) {
        await createNotification(
          userId,
          '✅ Pago confirmado',
          'Tu pago fue confirmado. Estamos activando tu SIM.',
          'success',
          session.id,
          'activation_paid'
        );
      }

      // checkout.session.completed: solo ocupamos el slot si la reserva es válida.
      if (reservationValid) {
        // checkout.session.completed: ocupar slot solo si la reserva es válida (o si viene checkout antiguo).
        const slotUpdatePayload = {
          status: 'ocupado',
          assigned_to: userId,
          plan_type: planName,
          reservation_token: null,
          reservation_expires_at: null,
          reservation_user_id: null,
          reservation_stripe_session_id: null,
        };

        let slotOccErr: { message: string } | null = null;
        if (enforceReservationValidation) {
          const r = await supabaseAdmin.from('slots').update(slotUpdatePayload)
            .eq('slot_id', slotId)
            .eq('status', 'reserved')
            .eq('reservation_token', reservationTokenFromMeta);
          slotOccErr = r.error;
        } else {
          const r = await supabaseAdmin.from('slots').update(slotUpdatePayload)
            .eq('slot_id', slotId);
          slotOccErr = r.error;
        }
        if (slotOccErr) {
          console.error('[PURCHASE] slot occupied error', { slotId, userId, error: slotOccErr.message });
        } else {
          console.log('[PURCHASE] slot occupied OK', { slotId, userId });
        }

        // Activación operativa explícita:
        // - `provisioned`: slot asignado/ocupado en BD
        // - `on_air`: listo operativamente (cerramos onboarding)
        const activeSubId = subscriptionId ?? null;
        if (activeSubId) {
          const payload: any = {
            activation_state: 'provisioned',
            activation_state_updated_at: new Date().toISOString(),
          };
          if (nextBillingDateIso) payload.next_billing_date = nextBillingDateIso;
          await supabaseAdmin.from('subscriptions').update(payload).eq('id', activeSubId);
        } else {
          // Caso raro: la fila ya existía/insertData se ejecutó sin devolución
          const payload: any = {
            activation_state: 'provisioned',
            activation_state_updated_at: new Date().toISOString(),
          };
          if (nextBillingDateIso) payload.next_billing_date = nextBillingDateIso;
          await supabaseAdmin.from('subscriptions').update(payload).eq('stripe_session_id', session.id);
        }

        console.log('[PURCHASE] subscription upsert OK', {
          subscriptionId: activeSubId ?? subscriptionId,
          stage: 'provisioned',
          stripeSessionId: session.id,
        });

        // activation_state = provisioned
        if (existingActivationState !== 'provisioned' && existingActivationState !== 'on_air') {
          await createNotification(
            userId,
            '📦 SIM aprovisionada',
            'Tu número fue asignado en infraestructura. Cerrando activación operativa...',
            'activation',
            session.id,
            'activation_provisioned'
          );
        }

        await logEvent('SIM_ACTIVATED', 'info', 'SIM activada', undefined, {
          phone_number: resolvedPhoneForNotifications || slot?.phone_number || '',
          slot_id: slotId,
        }, 'stripe');

        const activationMsg = nextBillingDateIso
          ? `Tu línea ${slot?.phone_number || ''} está activa y lista para recibir SMS. Próxima renovación: ${new Date(nextBillingDateIso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}.`
          : `Tu línea ${slot?.phone_number || ''} está activa y lista para recibir SMS.`;

        // activation_state = on_air
        if (existingActivationState !== 'on_air') {
          await createNotification(
            userId,
            '🚀 ¡Línea activada!',
            activationMsg,
            'activation',
            session.id,
            'activation_on_air'
          );
        }

        if (activeSubId) {
          const payload: any = {
            activation_state: 'on_air',
            activation_state_updated_at: new Date().toISOString(),
          };
          if (nextBillingDateIso) payload.next_billing_date = nextBillingDateIso;
          await supabaseAdmin.from('subscriptions').update(payload).eq('id', activeSubId);
        } else {
          const payload: any = {
            activation_state: 'on_air',
            activation_state_updated_at: new Date().toISOString(),
          };
          if (nextBillingDateIso) payload.next_billing_date = nextBillingDateIso;
          await supabaseAdmin.from('subscriptions').update(payload).eq('stripe_session_id', session.id);
        }
        console.log('[PURCHASE] subscription upsert OK', {
          subscriptionId: activeSubId ?? subscriptionId,
          stage: 'on_air',
          stripeSessionId: session.id,
        });
        // Fuente de verdad para quick access post-login: onboarding ya completado.
        await supabaseAdmin
          .from('users')
          .update({
            onboarding_completed: true,
            onboarding_step: 'completed',
            onboarding_checkout_session_id: null,
          })
          .eq('id', userId);
        console.log('[PURCHASE] onboarding ready', {
          userId,
          subscriptionId: activeSubId ?? subscriptionId,
          stripeSessionId: session.id,
        });
        activationSucceeded = true;
      } else {
        // Reserva inválida: marcamos como fallida (no ocupamos el slot).
        await supabaseAdmin.from('subscriptions').update({
          activation_state: 'failed',
          activation_state_updated_at: new Date().toISOString(),
        }).eq('stripe_session_id', session.id);

        if (existingActivationState !== 'failed' && enforceReservationValidation) {
          await createNotification(
            userId,
            '⚠️ Activación fallida',
            'No pudimos activar tu SIM porque la reserva del slot no fue válida. Intenta nuevamente o revisa tu panel.',
            'error',
            session.id,
            'activation_failed'
          );
        }
      }

    } catch (err: any) {
      console.error('[WEBHOOK ERROR]:', err.message);
      // Resiliencia: si algo falla a mitad del proceso, marcamos activación como "failed"
      // para que el frontend no asuma falsos positivos.
      try {
        await supabaseAdmin.from('subscriptions').update({
          activation_state: 'failed',
          activation_state_updated_at: new Date().toISOString(),
        }).eq('stripe_session_id', session.id);
      } catch {
        // no bloquear
      }
      const subIdStripe = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      await logEvent('WEBHOOK_ERROR', 'error', err?.message, session.customer_email ?? undefined, {
        stack: err?.stack,
        context: 'checkout.session.completed',
        subscription_id: subIdStripe ?? undefined,
        customer_email: session.customer_email ?? undefined,
      }, 'stripe');
    }

    if (!nextDateForEmail) {
      const dNext = new Date();
      if (isAnnualBilling) {
        dNext.setFullYear(dNext.getFullYear() + 1);
      } else {
        dNext.setDate(dNext.getDate() + 30);
      }
      nextDateForEmail = dNext.toLocaleDateString('es-CL');
    }

    // FUERA del try/catch — siempre correo y Telegram (incluso con amount_total 0 / trials / promos)
    let phoneForEmail = phoneFromMeta || '';
    if (!phoneForEmail && slotId) {
      try {
        const { data: slotRow } = await supabaseAdmin.from('slots').select('phone_number').eq('slot_id', slotId).maybeSingle();
        phoneForEmail = (slotRow as { phone_number?: string } | null)?.phone_number ?? '';
      } catch (e: any) {
        console.warn('[WEBHOOK] Fallback slot lookup for email failed:', e?.message);
      }
    }

    const amountTotalCents = session.amount_total ?? 0;
    const amountFormatted = `$${(amountTotalCents / 100).toFixed(2)} USD`;

    const customerEmail = session.customer_details?.email ?? '';
    await logEvent('PAYMENT_RECEIVED', 'info', `Pago recibido: ${amountFormatted}`, customerEmail, { amount: amountFormatted, user_id: userId, slot_id: slotId }, 'stripe');

    if (activationSucceeded) {
      let profileNombre = '';
      let profileEmail = '';
      try {
        const { data: prof } = await supabaseAdmin.from('users').select('nombre, email').eq('id', userId).maybeSingle();
        profileNombre = String((prof as { nombre?: string } | null)?.nombre ?? '').trim();
        if ((prof as { email?: string } | null)?.email) {
          profileEmail = String((prof as { email?: string }).email).trim();
        }
      } catch {
        /* ignore */
      }
      if (!profileEmail) {
        profileEmail = String(customerEmail ?? '').trim();
      }
      const displayPhoneRaw = phoneForEmail || phoneFromMeta || '';
      const displayPhone = displayPhoneRaw
        ? displayPhoneRaw.startsWith('+')
          ? displayPhoneRaw
          : `+${displayPhoneRaw}`
        : slotId || '';
      const newPurchasePayload = {
        nombre: profileNombre || 'Cliente',
        email: profileEmail,
        phone: displayPhone,
        plan: planName ?? '',
        end_date: nextDateForEmail,
        status: 'Activo',
        slot_id: slotId,
        billing_type: billingTypeForEmail,
        next_date: nextDateForEmail,
        amount: amountFormatted,
        to: profileEmail,
        to_email: profileEmail,
      };

      try {
        void logEvent(
          'EMAIL_DISPATCHED',
          'info',
          CANONICAL_TEMPLATE_EVENTS.NEW_PURCHASE,
          null,
          {
            user_id: userId,
            template: `template_email_${CANONICAL_TEMPLATE_EVENTS.NEW_PURCHASE}`,
            channel: 'email',
          },
          'stripe'
        );
        await triggerEmail(CANONICAL_TEMPLATE_EVENTS.NEW_PURCHASE, userId, newPurchasePayload);
      } catch (emailErr: any) {
        console.error('[WEBHOOK triggerEmail FAIL]', {
          event: CANONICAL_TEMPLATE_EVENTS.NEW_PURCHASE,
          userId,
          slotId,
          phone_number: phoneForEmail,
          error: emailErr?.message,
          stack: emailErr?.stack,
        });
      }

      try {
        void logEvent(
          'TELEGRAM_DISPATCHED',
          'info',
          CANONICAL_TEMPLATE_EVENTS.NEW_PURCHASE,
          null,
          {
            user_id: userId,
            template: `template_telegram_${CANONICAL_TEMPLATE_EVENTS.NEW_PURCHASE}`,
            channel: 'telegram',
          },
          'stripe'
        );
        await sendTelegramNotification(CANONICAL_TEMPLATE_EVENTS.NEW_PURCHASE, userId, newPurchasePayload);
      } catch (tgErr: unknown) {
        console.warn('[WEBHOOK] Telegram send skipped or failed:', (tgErr as Error)?.message);
      }
    }
  }

  else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const previousAttributes = (event.data as any).previous_attributes || {};

    const cancelAtPeriodEndChanged =
      previousAttributes.cancel_at_period_end === false &&
      subscription.cancel_at_period_end === true;

    const statusChanged = !!previousAttributes.status;

    // Ignorar si no hay cambio relevante
    if (!statusChanged && !cancelAtPeriodEndChanged) {
      await markWebhookProcessed();
      return res.status(200).json({ received: true });
    }

    const stripeSubId = subscription.id;
    const newStatus = subscription.status;
    const prevStatus = previousAttributes.status;

    try {
      const { data: primaryCandidates, error: primaryErr } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id, phone_number, status, created_at')
        .eq('stripe_subscription_id', stripeSubId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (primaryErr) {
        await logEvent(
          'cancel_failed_no_live_subscription',
          'error',
          primaryErr.message,
          undefined,
          { phase: 'customer.subscription.updated', stripeSubId, error_code: primaryErr.code },
          'stripe'
        );
        await markWebhookFailed(primaryErr.message);
        return res.status(500).json({ received: false, error: primaryErr.message, phase: 'customer.subscription.updated' });
      }

      await logEvent(
        'cancel_lookup_primary',
        'info',
        'cancel: lookup primario customer.subscription.updated',
        undefined,
        { phase: 'customer.subscription.updated', stripeSubId, found_candidates: (primaryCandidates ?? []).length },
        'stripe'
      );

      let sub: any = null;
      if (!primaryCandidates || primaryCandidates.length === 0) {
        console.log('[WEBHOOK] customer.subscription.updated: sin fila local, ignorando', stripeSubId);
        await logEvent(
          'cancel_failed_no_live_subscription',
          'error',
          'cancel: no se encontró fila local para customer.subscription.updated (solo stripe_subscription_id)',
          undefined,
          { phase: 'customer.subscription.updated', stripeSubId },
          'stripe'
        );
        await markWebhookProcessed();
        return res.status(200).json({
          received: true,
          ignored: true,
          reason: 'subscription_updated_no_local_row',
        });
      }

      if (primaryCandidates.length > 1) {
        await logEvent(
          'cancel_failed_multiple_live_candidates',
          'error',
          'cancel: múltiples suscripciones locales candidatas por stripe_subscription_id',
          undefined,
          { phase: 'customer.subscription.updated', stripeSubId, candidate_ids: primaryCandidates.map((r: any) => r.id) },
          'stripe'
        );
        await markWebhookFailed('multiple_local_candidates_by_stripe_subscription_id');
        return res.status(409).json({
          received: false,
          error: 'Cancelación bloqueada: múltiples suscripciones locales candidatas para el mismo `stripe_subscription_id`.',
          phase: 'customer.subscription.updated',
        });
      }

      sub = primaryCandidates[0] as Record<string, unknown>;

      // Regla estricta: si ya está cancelada, ignorar el evento (no reactivar, no tocar next_billing_date)
      const existingLocalStatus = String((sub as { status?: string }).status ?? '').toLowerCase();
      if (existingLocalStatus === 'canceled' || existingLocalStatus === 'cancelled') {
        await logEvent(
          'cancel_local_subscription_updated',
          'info',
          'cancel: customer.subscription.updated ignorado (fila local ya cancelada)',
          undefined,
          { phase: 'customer.subscription.updated', stripeSubId, local_subscription_id: sub.id },
          'stripe'
        );
        await markWebhookProcessed();
        return res.status(200).json({ received: true, ignored: true, reason: 'subscription_updated_local_row_already_canceled' });
      }

      // Detectar cambio de plan (upgrade/downgrade)
      const previousPriceId = (previousAttributes as any)?.items?.data?.[0]?.price?.id;
      const newPriceId = subscription.items.data[0]?.price?.id;
      const planChanged = previousPriceId && newPriceId && previousPriceId !== newPriceId;

      if (planChanged) {
        const subscriptionMeta = subscription.metadata || {};
        const slotId = subscriptionMeta.slot_id;
        const newPlanName = subscriptionMeta.planName;
        const newMonthlyLimit = monthlySmsLimitForPlan(newPlanName, subscriptionMeta.monthlyLimit ?? null);
        const planChangeSnap = subscriptionBillingSnapshotFromStripe(subscription);

        if (slotId && newPlanName) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_name: newPlanName,
              monthly_limit: newMonthlyLimit,
              status: planChangeSnap.status,
              billing_type: subscriptionMeta.isAnnual === 'true' ? 'annual' : 'monthly',
              trial_end: planChangeSnap.trial_end,
              current_period_end: planChangeSnap.current_period_end,
              next_billing_date: planChangeSnap.next_billing_date,
              subscription_status: subscription.status,
            })
            .eq('id', (sub as any).id)
            .in('status', ['active', 'trialing']);

          await supabaseAdmin
            .from('slots')
            .update({ plan_type: newPlanName })
            .eq('slot_id', slotId);

          const { data: upgradeUserData } = await supabaseAdmin
            .from('users')
            .select('email, nombre')
            .eq('id', String(sub.user_id))
            .maybeSingle();

          const upgradePayload = {
            nombre: String((upgradeUserData as { nombre?: string } | null)?.nombre ?? '').trim() || 'Cliente',
            email: String(upgradeUserData?.email ?? ''),
            phone: String((sub as { phone_number?: string | null }).phone_number ?? ''),
            plan: String(newPlanName),
            end_date: planChangeSnap.next_billing_date
              ? new Date(String(planChangeSnap.next_billing_date)).toLocaleDateString('es-CL')
              : '',
            status: 'Activo',
            slot_id: String(slotId),
          };

          const skipUpgradeAppDup = await hasRecentAppNotificationDuplicate(supabaseAdmin, {
            userId: String(sub.user_id),
            sourceNotificationKey: CANONICAL_TEMPLATE_EVENTS.UPGRADE_SUCCESS,
            windowMs: 48 * 60 * 60 * 1000,
          });

          if (!skipUpgradeAppDup) {
            await createNotificationFromTemplate(
              CANONICAL_TEMPLATE_EVENTS.UPGRADE_SUCCESS,
              String(sub.user_id),
              upgradePayload,
              'subscription',
              stripeEventId
            );
          }

          console.log(`[UPGRADE] slot ${slotId} → ${newPlanName}`, {
            next_billing_date: planChangeSnap.next_billing_date,
            current_period_end: planChangeSnap.current_period_end,
          });
        }
      }

      const statusMap: Record<string, string> = {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due',
        paused: 'canceled',
      };

      const shouldMarkCanceled = newStatus === 'canceled' || subscription.cancel_at_period_end === true;
      let nextLocalStatus = statusMap[newStatus] || 'active';
      if (shouldMarkCanceled) nextLocalStatus = 'canceled';
      // No permitir "re-abrir" suscripciones canceladas vía webhooks posteriores.
      if (existingLocalStatus === 'canceled' || existingLocalStatus === 'cancelled') nextLocalStatus = 'canceled';

      const statusUpdatePayload: Record<string, unknown> = { status: nextLocalStatus };
      if (nextLocalStatus === 'canceled' || nextLocalStatus === 'cancelled') {
        // Alineación: si marcamos cancelada en updated, limpiamos next_billing_date
        statusUpdatePayload.next_billing_date = null;
      }

      const localIsCanceled =
        nextLocalStatus === 'canceled' ||
        nextLocalStatus === 'cancelled' ||
        existingLocalStatus === 'canceled' ||
        existingLocalStatus === 'cancelled';

      const isCanceledNowEarly = newStatus === 'canceled' && prevStatus !== 'canceled';
      const isCanceledAtPeriodEndEarly = cancelAtPeriodEndChanged;

      let slotReleasedViaRpc = false;

      // Antes de persistir status local: release_slot_atomic (embebe cancel_subscriptions_atomic en SQL; misma política que manage).
      if (
        sub.slot_id &&
        (nextLocalStatus === 'canceled' || nextLocalStatus === 'cancelled') &&
        (isCanceledNowEarly || isCanceledAtPeriodEndEarly)
      ) {
        const { data: slotRowPre, error: slotPreErr } = await supabaseAdmin
          .from('slots')
          .select('status, assigned_to')
          .eq('slot_id', sub.slot_id)
          .maybeSingle();

        if (slotPreErr) {
          await logEvent(
            'cancel_failed_no_live_subscription',
            'error',
            'cancel: fallo consultando slots (pre-RPC updated)',
            undefined,
            {
              phase: 'customer.subscription.updated',
              stripeSubId,
              slot_id: sub.slot_id,
              error_code: slotPreErr.code,
              error_message: slotPreErr.message,
            },
            'stripe'
          );
        } else if (slotRowPre) {
          const slotStatusPre = String(slotRowPre.status ?? '').toLowerCase();
          const slotAssignedToPre = slotRowPre.assigned_to ?? null;
          const shouldReleasePre =
            slotStatusPre !== 'libre' &&
            (slotAssignedToPre == null || String(slotAssignedToPre) === String(sub.user_id));

          if (shouldReleasePre) {
            const otherLiveUpdated = await findOtherLiveSubscriptionExcludingStripeId(supabaseAdmin, {
              slotId: sub.slot_id as string,
              phoneNumber: (sub as { phone_number?: string | null }).phone_number,
              excludeStripeSubscriptionId: stripeSubId,
            });
            if (otherLiveUpdated) {
              console.log('[SLOT_GUARD] customer.subscription.updated: otra suscripción viva; no release_slot_atomic', {
                stripe_subscription_id: stripeSubId,
                other_subscription_id: otherLiveUpdated.id,
                other_stripe_subscription_id: otherLiveUpdated.stripe_subscription_id,
              });
            } else {
            const { error: rpcReleaseErr } = await releaseSlotAtomicForCancelPolicy(supabaseAdmin, sub.slot_id);
            if (rpcReleaseErr) {
              await logEvent(
                'cancel_failed_no_live_subscription',
                'error',
                rpcReleaseErr.message,
                undefined,
                {
                  phase: 'customer.subscription.updated',
                  stripeSubId,
                  slot_id: sub.slot_id,
                  error_code: rpcReleaseErr.code,
                },
                'stripe'
              );
              await markWebhookFailed(rpcReleaseErr.message);
              return res.status(500).json({
                received: false,
                error: rpcReleaseErr.message,
                phase: 'customer.subscription.updated',
              });
            }

            slotReleasedViaRpc = true;
            await logEvent(
              'cancel_slot_released',
              'info',
              'cancel: slot liberado tras customer.subscription.updated (release_slot_atomic)',
              undefined,
              { phase: 'customer.subscription.updated', stripeSubId, local_subscription_id: sub.id, slot_id: sub.slot_id },
              'stripe'
            );
            }
          }
        }
      }

      await supabaseAdmin.from('subscriptions').update(statusUpdatePayload).eq('id', sub.id);

      const localPendingReactivation = existingLocalStatus === 'pending_reactivation_cancel';
      if (!localPendingReactivation && !localIsCanceled && nextLocalStatus !== 'canceled' && nextLocalStatus !== 'cancelled') {
        const snap = subscriptionBillingSnapshotFromStripe(subscription);
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: snap.status,
            trial_end: snap.trial_end,
            current_period_end: snap.current_period_end,
            next_billing_date: snap.next_billing_date,
          })
          .eq('id', sub.id);
      }

      if (nextLocalStatus === 'canceled' && existingLocalStatus !== 'canceled' && existingLocalStatus !== 'cancelled') {
        await logEvent(
          'cancel_local_subscription_updated',
          'info',
          'cancel: subscriptions local status actualizado a canceled',
          undefined,
          { phase: 'customer.subscription.updated', stripeSubId, local_subscription_id: sub.id, slot_id: sub.slot_id },
          'stripe'
        );
      }

      if (prevStatus === 'trialing' && newStatus === 'active') {
        await createNotification(
          sub.user_id,
          '✅ Trial completado — Plan activo',
          `Tu plan ${sub.plan_name} está ahora activo. Gracias por continuar con Telsim.`,
          'subscription'
        );
      }

      const isCanceledNow = newStatus === 'canceled' && prevStatus !== 'canceled';
      const isCanceledAtPeriodEnd = cancelAtPeriodEndChanged;

      if (isCanceledNow || isCanceledAtPeriodEnd) {
        const slotReleased = slotReleasedViaRpc;

        if (!slotReleased && sub.slot_id) {
          const { data: slotRowAfter, error: slotErrAfter } = await supabaseAdmin
            .from('slots')
            .select('status, assigned_to')
            .eq('slot_id', sub.slot_id)
            .maybeSingle();

          if (!slotErrAfter && slotRowAfter) {
            const slotStatus = String(slotRowAfter.status ?? '').toLowerCase();
            const slotAssignedTo = slotRowAfter.assigned_to ?? null;
            await logEvent(
              'cancel_slot_release_skipped',
              'info',
              'cancel: liberación vía RPC no aplicada; estado slot tras updated',
              undefined,
              {
                phase: 'customer.subscription.updated',
                stripeSubId,
                slot_id: sub.slot_id,
                slot_status: slotStatus,
                slot_assigned_to: slotAssignedTo,
              },
              'stripe'
            );
          }
        }

        const { data: cancellationUserData } = await supabaseAdmin
          .from('users')
          .select('email, nombre')
          .eq('id', String(sub.user_id))
          .maybeSingle();
        const { data: cancellationSlotData } = await supabaseAdmin
          .from('slots')
          .select('phone_number, plan_type')
          .eq('slot_id', String(sub.slot_id))
          .maybeSingle();

        const phoneRaw = String(
          cancellationSlotData?.phone_number ??
          (sub as { phone_number?: string | null }).phone_number ??
          sub.slot_id ??
          ''
        );
        const phoneFormatted = phoneRaw ? (phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`) : '';
        const cancellationPayload = {
          nombre: String((cancellationUserData as { nombre?: string } | null)?.nombre ?? '').trim() || 'Cliente',
          email: String(cancellationUserData?.email ?? ''),
          phone: phoneFormatted,
          plan: String((sub as { plan_name?: string | null }).plan_name ?? cancellationSlotData?.plan_type ?? ''),
          end_date: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toLocaleDateString('es-CL')
            : '',
          status: 'Cancelado',
          slot_id: String(sub.slot_id ?? ''),
          plan_name: String(cancellationSlotData?.plan_type ?? (sub as { plan_name?: string | null }).plan_name ?? ''),
          phone_number: phoneRaw,
        };

        const skipCancelAppDup = await hasRecentAppNotificationDuplicate(supabaseAdmin, {
          userId: String(sub.user_id),
          sourceNotificationKey: CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
          windowMs: 48 * 60 * 60 * 1000,
        });

        if (!skipCancelAppDup) {
          await createNotificationFromTemplate(
            CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
            String(sub.user_id),
            cancellationPayload,
            'error',
            stripeEventId
          );
        }
      }
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] customer.subscription.updated:', err.message);
      await logEvent('WEBHOOK_ERROR', 'error', err?.message, undefined, {
        stack: err?.stack,
        context: 'customer.subscription.updated',
        subscription_id: subscription?.id ?? undefined,
      }, 'stripe');
    }
  }

  else if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    console.log('[PURCHASE] subscription created', {
      stripe_subscription_id: subscription.id,
      customer:
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null,
    });
    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan_name')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();

      // Fase 3: centralizamos el disparo de emails/notificaciones del flujo de compra
      // en `checkout.session.completed` usando `activation_state` como fuente de verdad.
      // Este webhook se mantiene solo para trazabilidad.
      if (sub?.user_id) {
        void logEvent(
          'SUBSCRIPTION_CREATED_WEBHOOK_IGNORED',
          'info',
          'subscription.created no envía new_purchase; se espera checkout.session.completed',
          null,
          {
            user_id: sub.user_id,
            subscription_id: subscription.id,
            plan_name: sub.plan_name ?? null,
          },
          'stripe'
        );
      }
    } catch (err: any) {
      console.warn('[WEBHOOK] customer.subscription.created email skip:', err?.message);
    }
  }

  else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!stripeSubId) {
      await markWebhookProcessed();
      return res.status(200).json({ received: true });
    }

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id, billing_type, currency, status')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) {
        console.log('[WEBHOOK] invoice.payment_failed: sin fila local, ignorando', stripeSubId);
        await markWebhookProcessed();
        return res.status(200).json({
          received: true,
          ignored: true,
          reason: 'invoice_payment_failed_no_local_row',
        });
      }

      const localStatus = String(sub.status ?? '').toLowerCase();
      if (localStatus === 'canceled' || localStatus === 'cancelled') {
        console.log('[WEBHOOK] invoice.payment_failed: fila local cancelada, no se actualiza', {
          stripeSubId,
          local_subscription_id: sub.id,
          status: sub.status,
        });
        await markWebhookProcessed();
        return res.status(200).json({
          received: true,
          ignored: true,
          reason: 'invoice_payment_failed_local_row_already_canceled',
        });
      }

      // Solo permitir update si la suscripción local está "viva".
      const LIVE_STATUSES = ['active', 'trialing', 'past_due'];
      if (!LIVE_STATUSES.includes(localStatus)) {
        console.log('[WEBHOOK] invoice.payment_failed: status local no permitida para past_due, ignorando', {
          stripeSubId,
          local_subscription_id: sub.id,
          status: sub.status,
        });
        await markWebhookProcessed();
        return res.status(200).json({
          received: true,
          ignored: true,
          reason: 'invoice_payment_failed_local_row_not_live',
        });
      }

      // Fase 4 (ledger-first): registrar payment_failed_attempt (riesgo, no revenue negativo).
      try {
        const riskAmountCents = invoice.amount_due ?? 0;
        const occurredAtIso = invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString();

        await supabaseAdmin.from('finance_events').upsert(
          {
            stripe_event_id: stripeEventId,
            stripe_event_type: event.type,
            finance_event_type: 'payment_failed_attempt',
            occurred_at: occurredAtIso,
            user_id: sub.user_id,
            subscription_id: sub.id,
            slot_id: sub.slot_id ?? null,
            plan_name: sub.plan_name ?? null,
            billing_type: sub.billing_type ?? null,
            currency: (invoice.currency ?? sub.currency ?? 'usd') as string,
            amount_cents: null,
            risk_amount_cents: riskAmountCents,
            metadata: {
              invoice_id: invoice.id ?? null,
              billing_reason: invoice.billing_reason ?? null,
            },
          },
          { onConflict: 'stripe_event_id', ignoreDuplicates: true }
        );
      } catch (finErr: any) {
        console.error('[FINANCE_EVENTS] payment_failed_attempt insert failed:', finErr?.message ?? finErr);
      }

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('id', sub.id)
        .in('status', LIVE_STATUSES);

      await createNotification(
        sub.user_id,
        '🔴 Pago fallido — Acción requerida',
        `No pudimos cobrar tu plan ${sub.plan_name}. Actualiza tu método de pago en Billing para no perder el acceso.`,
        'error',
        stripeEventId,
        'payment_failed'
      );

      void logEvent(
        'EMAIL_DISPATCHED',
        'info',
        'invoice_failed',
        null,
        {
          user_id: sub.user_id,
          template: 'template_email_invoice_failed',
          channel: 'email',
        },
        'stripe'
      );
      await triggerEmail('invoice_failed', sub.user_id, {
        plan: sub.plan_name ?? '',
        amount: ((invoice.amount_due ?? 0) / 100).toFixed(2),
        to: invoice.customer_email ?? '',
      });

      // Telegram: misma fuente de verdad que email (plantilla admin)
      void logEvent(
        'TELEGRAM_DISPATCHED',
        'info',
        'invoice_failed',
        null,
        {
          user_id: sub.user_id,
          template: 'template_telegram_invoice_failed',
          channel: 'telegram',
        },
        'stripe'
      );
      await sendTelegramNotification('invoice_failed', sub.user_id, {
        plan: sub.plan_name ?? '',
        amount: ((invoice.amount_due ?? 0) / 100).toFixed(2),
        to: invoice.customer_email ?? '',
      });
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] invoice.payment_failed:', err.message);
      const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      await logEvent('WEBHOOK_ERROR', 'error', err?.message, invoice.customer_email ?? undefined, {
        stack: err?.stack,
        context: 'invoice.payment_failed',
        subscription_id: stripeSubId ?? undefined,
        customer_email: invoice.customer_email ?? undefined,
      }, 'stripe');
    }
  }

  else if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;

    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (event.type === 'invoice.payment_succeeded') {
      const subscriptionInvoiceReasons = new Set([
        'subscription_create',
        'subscription_cycle',
        'subscription_update',
      ]);
      if (!stripeSubId || !invoice.billing_reason || !subscriptionInvoiceReasons.has(invoice.billing_reason)) {
        await markWebhookProcessed();
        return res.status(200).json({ received: true });
      }
    } else {
      if (!stripeSubId) {
        await markWebhookProcessed();
        return res.status(200).json({ received: true });
      }
    }

    // Regla estricta: lookup SOLO por stripe_subscription_id (sin fallback slot/phone)
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select(SUBSCRIPTION_ROW_FOR_INVOICE_PAYMENT)
      .eq('stripe_subscription_id', stripeSubId)
      .not('status', 'eq', 'canceled')
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      await logEvent(
        'WEBHOOK_ERROR',
        'error',
        subErr.message,
        invoice.customer_email ?? undefined,
        { context: event.type, stripe_subscription_id: stripeSubId, error_code: subErr.code },
        'stripe'
      );
      await markWebhookFailed(`invoice ${event.type}: subscription lookup failed`, undefined);
      return res.status(500).json({ received: false, error: subErr.message, phase: 'subscription_lookup_primary' });
    }

    if (!sub) {
      // No hay fila viva: ignorar para no reactivar filas canceladas.
      void logEvent(
        'invoice_ignored_no_live_subscription',
        'info',
        `invoice webhook ignorado: no existe fila local viva por stripe_subscription_id`,
        undefined,
        { context: event.type, stripe_subscription_id: stripeSubId, invoice_id: invoice.id },
        'stripe'
      );
      await markWebhookProcessed();
      return res.status(200).json({ received: true });
    }

    const subTyped = sub as any as {
      id: string;
      user_id: string;
      plan_name: string | null;
      status: string;
      slot_id: string | null;
      phone_number: string | null;
      monthly_limit: number | null;
      billing_type: string | null;
      currency: string | null;
    };

    console.log('[PURCHASE] invoice paid', {
      eventType: event.type,
      invoiceId: invoice.id,
      stripeSubscriptionId: stripeSubId,
      billingReason: invoice.billing_reason ?? null,
      amountPaid: invoice.amount_paid ?? null,
    });

    // Si el slot ya está libre, saltar (misma política que antes).
    if (subTyped.slot_id) {
      const { data: slotPolicy } = await supabaseAdmin
        .from('slots')
        .select('status')
        .eq('slot_id', subTyped.slot_id)
        .maybeSingle();
      if (String(slotPolicy?.status ?? '').toLowerCase() === 'libre') {
        await markWebhookProcessed();
        return res.status(200).json({ received: true });
      }
    }

    // Backfill monthly_limit si está vacío
    const priorMlInv = subTyped.monthly_limit;
    if (
      priorMlInv == null ||
      (typeof priorMlInv === 'number' && (Number.isNaN(priorMlInv) || priorMlInv <= 0))
    ) {
      const fillMl = monthlySmsLimitForPlan(subTyped.plan_name, null);
      await supabaseAdmin.from('subscriptions').update({ monthly_limit: fillMl }).eq('id', subTyped.id);
    }

    // Persistir invoice oficial + ledger
    const fullInv = await persistSubscriptionInvoiceFromWebhook({
      invoice,
      sub: { id: subTyped.id, user_id: subTyped.user_id },
      stripeSubId,
    });

    try {
      const amountPaidCents = invoice.amount_paid ?? 0;
      const occurredAtIso = invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString();

      await supabaseAdmin.from('finance_events').upsert(
        {
          stripe_event_id: stripeEventId,
          stripe_event_type: event.type,
          finance_event_type: 'cash_revenue',
          occurred_at: occurredAtIso,
          user_id: subTyped.user_id,
          subscription_id: subTyped.id,
          slot_id: subTyped.slot_id ?? null,
          plan_name: subTyped.plan_name ?? null,
          billing_type: subTyped.billing_type ?? null,
          currency: (invoice.currency ?? subTyped.currency ?? 'usd') as string,
          amount_cents: amountPaidCents,
          risk_amount_cents: null,
          metadata: {
            invoice_id: invoice.id ?? null,
            billing_reason: invoice.billing_reason ?? null,
          },
        },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true }
      );
    } catch (finErr: any) {
      console.error('[FINANCE_EVENTS] cash_revenue insert failed:', finErr?.message ?? finErr);
    }

    try {
      const { costPerSlotMonthCents, costPerSmsCents } = await getFinanceCostRatesCents();
      const monthlyLimit = subTyped.monthly_limit ?? 0;
      const monthsFactor = subTyped.billing_type === 'annual' ? 12 : 1;
      const costMonthlyCents = costPerSlotMonthCents + (costPerSmsCents * Number(monthlyLimit || 0));
      const estimatedCostCents = costMonthlyCents * monthsFactor;

      const occurredAtIso = invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString();
      const amountPaidCents = invoice.amount_paid ?? 0;
      if (estimatedCostCents !== 0 || amountPaidCents !== 0) {
        await supabaseAdmin.from('finance_events').upsert(
          {
            stripe_event_id: `${stripeEventId}:estimated_cost`,
            stripe_event_type: event.type,
            finance_event_type: 'estimated_cost',
            occurred_at: occurredAtIso,
            user_id: subTyped.user_id,
            subscription_id: subTyped.id,
            slot_id: subTyped.slot_id ?? null,
            plan_name: subTyped.plan_name ?? null,
            billing_type: subTyped.billing_type ?? null,
            currency: (invoice.currency ?? subTyped.currency ?? 'usd') as string,
            amount_cents: estimatedCostCents,
            risk_amount_cents: null,
            metadata: {
              cost_per_slot_month_cents: costPerSlotMonthCents,
              cost_per_sms_cents: costPerSmsCents,
              monthly_limit: monthlyLimit,
              months_factor: monthsFactor,
              cost_monthly_cents: costMonthlyCents,
            },
          },
          { onConflict: 'stripe_event_id', ignoreDuplicates: true }
        );
      }
    } catch (finErr: any) {
      console.error('[FINANCE_EVENTS] estimated_cost insert failed:', finErr?.message ?? finErr);
    }

    // Alineación billing desde Stripe (no usar period_end de la factura como next_billing_date en trial)
    let phoneNumber = subTyped.phone_number ?? '';
    if (!phoneNumber && subTyped.slot_id) {
      const { data: slotRow } = await supabaseAdmin.from('slots').select('phone_number').eq('slot_id', subTyped.slot_id).maybeSingle();
      phoneNumber = slotRow?.phone_number ?? '';
    }

    let stripeSubForBilling: Stripe.Subscription | null = null;
    try {
      stripeSubForBilling = await stripe.subscriptions.retrieve(stripeSubId);
    } catch {
      stripeSubForBilling = null;
    }
    const billingSnap = stripeSubForBilling != null ? subscriptionBillingSnapshotFromStripe(stripeSubForBilling) : null;
    if (billingSnap) {
      const { error: nbErr } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: billingSnap.status,
          trial_end: billingSnap.trial_end,
          current_period_end: billingSnap.current_period_end,
          next_billing_date: billingSnap.next_billing_date,
        })
        .eq('id', subTyped.id);
      if (nbErr) throw nbErr;
    }

    const canonicalNextBillingIso =
      billingSnap?.next_billing_date ??
      billingSnap?.current_period_end ??
      billingSnap?.trial_end ??
      null;
    const canonicalNextBillingMs = canonicalNextBillingIso ? new Date(canonicalNextBillingIso).getTime() : Number.NaN;
    const periodEndMs = (fullInv.period_end ?? invoice.period_end ?? 0) * 1000;
    const next_date =
      !Number.isNaN(canonicalNextBillingMs) && canonicalNextBillingMs > 0
        ? new Date(canonicalNextBillingMs).toLocaleDateString('es-CL')
        : periodEndMs > 0
          ? new Date(periodEndMs).toLocaleDateString('es-CL')
          : '';

    let skipPurchaseNotifs = false;
    let skipInvoicePaidNotifs = false;
    try {
      const stForReac = stripeSubForBilling ?? (await stripe.subscriptions.retrieve(stripeSubId));
      skipPurchaseNotifs = skipPurchaseNotifsDueToRecentReactivation(stForReac.metadata);
      skipInvoicePaidNotifs = skipInvoiceNotifsDueToReactivationFlow(stForReac.metadata);
    } catch {
      skipPurchaseNotifs = false;
      skipInvoicePaidNotifs = false;
    }
    if (skipPurchaseNotifs) {
      console.log('[invoice.payment_succeeded] skip compra/pago: reactivation_flow reciente', { stripeSubId });
    }
    if (skipInvoicePaidNotifs) {
      void logEvent(
        'INVOICE_PAID_SKIPPED_REACTIVATION_FLOW',
        'info',
        'invoice_paid omitido: metadata reactivation_flow reciente en la suscripción',
        undefined,
        {
          stripe_subscription_id: stripeSubId,
          invoice_id: invoice.id ?? null,
          billing_reason: invoice.billing_reason ?? null,
        },
        'stripe'
      );
    }

    /** Notificaciones invoice_paid solo desde invoice.payment_succeeded (invoice.paid duplica el mismo cobro). */
    const sendInvoicePaidNotifications =
      event.type === 'invoice.payment_succeeded' && !skipInvoicePaidNotifs;

    if (subTyped.status === 'past_due' && billingSnap?.status === 'active' && sendInvoicePaidNotifications) {
      await createNotification(
        subTyped.user_id,
        '✅ Pago procesado',
        `El pago de tu plan ${subTyped.plan_name} fue exitoso. Tu servicio continúa activo.`,
        'success'
      );
    }

    if (invoice.billing_reason === 'subscription_create') {
      console.log('[PURCHASE] subscription upsert OK', {
        subscriptionId: subTyped.id,
        stage: 'invoice_subscription_create',
        invoiceId: invoice.id,
      });
    }

    const { data: invUser } = await supabaseAdmin
      .from('users')
      .select('email, nombre')
      .eq('id', subTyped.user_id)
      .maybeSingle();
    const receiptUrl = extractReceiptUrlFromInvoice(fullInv);
    const phoneRawInv = phoneNumber || subTyped.slot_id || '';
    const phoneFmtInv = phoneRawInv
      ? String(phoneRawInv).startsWith('+')
        ? String(phoneRawInv)
        : `+${String(phoneRawInv).replace(/^\+/, '')}`
      : '';
    const emailInv = String((invUser as { email?: string } | null)?.email ?? invoice.customer_email ?? '');
    if (sendInvoicePaidNotifications) {
      await triggerEmail(CANONICAL_TEMPLATE_EVENTS.INVOICE_PAID, subTyped.user_id, {
        nombre: String((invUser as { nombre?: string } | null)?.nombre ?? '').trim() || 'Cliente',
        email: emailInv,
        phone: phoneFmtInv,
        plan: subTyped.plan_name ?? '',
        end_date: next_date,
        status: 'Activo',
        slot_id: subTyped.slot_id ?? '',
        amount: ((fullInv.amount_paid ?? invoice.amount_paid ?? 0) / 100).toFixed(2),
        subtotal: ((fullInv.subtotal ?? 0) / 100).toFixed(2),
        tax: (invoiceTaxCents(fullInv) / 100).toFixed(2),
        total: ((fullInv.total ?? 0) / 100).toFixed(2),
        invoice_pdf: fullInv.invoice_pdf ?? '',
        hosted_invoice_url: fullInv.hosted_invoice_url ?? '',
        receipt_url: receiptUrl ?? '',
        next_date,
        phone_number: phoneRawInv,
        to: emailInv,
        to_email: emailInv,
      });
    }
  }

  // Fase 5: refunds / chargebacks (modelo preparado, sin notificaciones)
  else if (event.type === 'refund.created') {
    const refund = event.data.object as Stripe.Refund;
    try {
      const meta = (refund.metadata || {}) as Record<string, unknown>;
      const stripeSubscriptionId = (meta.stripe_subscription_id ?? meta.stripeSubscriptionId ?? meta.subscription_id ?? meta.subscriptionId ?? '') as string;
      const stripeSessionId = (meta.stripe_session_id ?? meta.stripeSessionId ?? '') as string;
      const userIdFromMeta = (meta.user_id ?? meta.userId ?? '') as string;

      let subRow: { id: string; user_id: string; plan_name: string | null; slot_id: string | null; billing_type: string | null; currency: string | null } | null = null;

      if (stripeSubscriptionId) {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, plan_name, slot_id, billing_type, currency')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .maybeSingle();
        subRow = (data as any) ?? null;
      } else if (stripeSessionId) {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, plan_name, slot_id, billing_type, currency')
          .eq('stripe_session_id', stripeSessionId)
          .maybeSingle();
        subRow = (data as any) ?? null;
      }

      const occurredAtIso = refund.created ? new Date(refund.created * 1000).toISOString() : new Date().toISOString();
      const amountCents = refund.amount ?? 0;
      const currency = (refund.currency ?? subRow?.currency ?? 'usd') as string;

      await supabaseAdmin.from('finance_events').upsert(
        {
          stripe_event_id: stripeEventId,
          stripe_event_type: event.type,
          finance_event_type: 'refund',
          occurred_at: occurredAtIso,
          user_id: subRow?.user_id ?? (userIdFromMeta || null),
          subscription_id: subRow?.id ?? null,
          slot_id: subRow?.slot_id ?? null,
          plan_name: subRow?.plan_name ?? null,
          billing_type: subRow?.billing_type ?? null,
          currency,
          amount_cents: amountCents,
          risk_amount_cents: null,
          metadata: {
            refund_id: refund.id ?? null,
            charge_id: typeof refund.charge === 'string' ? refund.charge : (refund.charge as any)?.id ?? null,
            stripe_subscription_id: stripeSubscriptionId || null,
            stripe_session_id: stripeSessionId || null,
          },
        },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true }
      );
    } catch (err: any) {
      console.error('[FINANCE_EVENTS] refund_event insert failed:', err?.message ?? err);
    }
  }

  else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    try {
      const meta = (charge.metadata || {}) as Record<string, unknown>;
      const stripeSubscriptionId = (meta.stripe_subscription_id ?? meta.stripeSubscriptionId ?? meta.subscription_id ?? meta.subscriptionId ?? '') as string;
      const stripeSessionId = (meta.stripe_session_id ?? meta.stripeSessionId ?? '') as string;
      const userIdFromMeta = (meta.user_id ?? meta.userId ?? '') as string;

      let subRow: { id: string; user_id: string; plan_name: string | null; slot_id: string | null; billing_type: string | null; currency: string | null } | null = null;

      if (stripeSubscriptionId) {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, plan_name, slot_id, billing_type, currency')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .maybeSingle();
        subRow = (data as any) ?? null;
      } else if (stripeSessionId) {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, plan_name, slot_id, billing_type, currency')
          .eq('stripe_session_id', stripeSessionId)
          .maybeSingle();
        subRow = (data as any) ?? null;
      }

      const occurredAtIso = charge.created ? new Date(charge.created * 1000).toISOString() : new Date().toISOString();
      const amountCents = charge.amount_refunded ?? 0;
      const currency = (charge.currency ?? subRow?.currency ?? 'usd') as string;

      await supabaseAdmin.from('finance_events').upsert(
        {
          stripe_event_id: stripeEventId,
          stripe_event_type: event.type,
          finance_event_type: 'refund',
          occurred_at: occurredAtIso,
          user_id: subRow?.user_id ?? (userIdFromMeta || null),
          subscription_id: subRow?.id ?? null,
          slot_id: subRow?.slot_id ?? null,
          plan_name: subRow?.plan_name ?? null,
          billing_type: subRow?.billing_type ?? null,
          currency,
          amount_cents: amountCents,
          risk_amount_cents: null,
          metadata: {
            charge_id: charge.id ?? null,
            stripe_subscription_id: stripeSubscriptionId || null,
            stripe_session_id: stripeSessionId || null,
          },
        },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true }
      );
    } catch (err: any) {
      console.error('[FINANCE_EVENTS] refund_event (charge.refunded) insert failed:', err?.message ?? err);
    }
  }

  else if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute;
    try {
      const meta = (dispute.metadata || {}) as Record<string, unknown>;
      const stripeSubscriptionId = (meta.stripe_subscription_id ?? meta.stripeSubscriptionId ?? meta.subscription_id ?? meta.subscriptionId ?? '') as string;
      const stripeSessionId = (meta.stripe_session_id ?? meta.stripeSessionId ?? '') as string;
      const userIdFromMeta = (meta.user_id ?? meta.userId ?? '') as string;

      let subRow: { id: string; user_id: string; plan_name: string | null; slot_id: string | null; billing_type: string | null; currency: string | null } | null = null;

      if (stripeSubscriptionId) {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, plan_name, slot_id, billing_type, currency')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .maybeSingle();
        subRow = (data as any) ?? null;
      } else if (stripeSessionId) {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, plan_name, slot_id, billing_type, currency')
          .eq('stripe_session_id', stripeSessionId)
          .maybeSingle();
        subRow = (data as any) ?? null;
      }

      const occurredAtIso = dispute.created ? new Date(dispute.created * 1000).toISOString() : new Date().toISOString();
      const amountCents = (dispute.amount ?? 0);
      const currency = (dispute.currency ?? subRow?.currency ?? 'usd') as string;

      await supabaseAdmin.from('finance_events').upsert(
        {
          stripe_event_id: stripeEventId,
          stripe_event_type: event.type,
          finance_event_type: 'chargeback',
          occurred_at: occurredAtIso,
          user_id: subRow?.user_id ?? (userIdFromMeta || null),
          subscription_id: subRow?.id ?? null,
          slot_id: subRow?.slot_id ?? null,
          plan_name: subRow?.plan_name ?? null,
          billing_type: subRow?.billing_type ?? null,
          currency,
          amount_cents: amountCents,
          risk_amount_cents: null,
          metadata: {
            dispute_id: dispute.id ?? null,
            stripe_subscription_id: stripeSubscriptionId || null,
            stripe_session_id: stripeSessionId || null,
          },
        },
        { onConflict: 'stripe_event_id', ignoreDuplicates: true }
      );
    } catch (err: any) {
      console.error('[FINANCE_EVENTS] chargeback_event insert failed:', err?.message ?? err);
    }
  }

  else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const subId = subscription.id;

    try {
      const { data: primaryCandidates, error: primaryErr } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id, billing_type, currency, status, phone_number, created_at')
        .eq('stripe_subscription_id', subId)
        .order('created_at', { ascending: false })
        .limit(5);

      await logEvent(
        'cancel_lookup_primary',
        'info',
        'cancel: lookup primario customer.subscription.deleted',
        undefined,
        { phase: 'customer.subscription.deleted', stripeSubId: subId, found_candidates: (primaryCandidates ?? []).length },
        'stripe'
      );

      if (primaryErr) {
        await logEvent(
          'cancel_failed_no_live_subscription',
          'error',
          primaryErr.message,
          undefined,
          { phase: 'customer.subscription.deleted', stripeSubId: subId, error_code: primaryErr.code },
          'stripe'
        );
        await markWebhookFailed(primaryErr.message);
        return res.status(500).json({ received: false, error: primaryErr.message, phase: 'customer.subscription.deleted' });
      }

      if (!primaryCandidates || primaryCandidates.length === 0) {
        console.log('[WEBHOOK] customer.subscription.deleted: sin fila local; idempotente, no reintento', subId);
        await logEvent(
          'cancel_failed_no_live_subscription',
          'error',
          'cancel: customer.subscription.deleted sin fila local',
          undefined,
          { phase: 'customer.subscription.deleted', stripeSubId: subId },
          'stripe'
        );
        await markWebhookProcessed();
        return res.status(200).json({
          received: true,
          ignored: true,
          reason: 'subscription_deleted_no_local_row',
        });
      }

      if (primaryCandidates.length > 1) {
        await logEvent(
          'cancel_failed_multiple_live_candidates',
          'error',
          'cancel: múltiples suscripciones locales candidatas por stripe_subscription_id (deleted)',
          undefined,
          { phase: 'customer.subscription.deleted', stripeSubId: subId, candidate_ids: primaryCandidates.map((r: any) => r.id) },
          'stripe'
        );
        // Regla: en deleted NO rechazamos; actualizamos todas las filas del mismo stripe_subscription_id.
      }

      const sub = primaryCandidates[0] as any;
      /** Soft cancel desde manage: correo ya enviado; aquí solo finalizamos al vencer cancel_at en Stripe (48h). */
      const wasGracePending = String(sub.status ?? '').toLowerCase() === 'pending_reactivation_cancel';

      const otherLiveReplacement = await findOtherLiveSubscriptionExcludingStripeId(supabaseAdmin, {
        slotId: sub.slot_id,
        phoneNumber: sub.phone_number,
        excludeStripeSubscriptionId: subId,
      });
      if (otherLiveReplacement) {
        console.log('[SLOT_GUARD] customer.subscription.deleted: otra suscripción viva; no release/churn/cancel-notifications', {
          deleted_stripe_subscription_id: subId,
          other_subscription_id: otherLiveReplacement.id,
          other_stripe_subscription_id: otherLiveReplacement.stripe_subscription_id,
        });
      }

      // Fase 4 (ledger-first): churn solo si no queda otra sub viva (evita churn falso en upgrade).
      if (!otherLiveReplacement) {
        try {
          const occurredAtIso = event.created ? new Date(event.created * 1000).toISOString() : new Date().toISOString();

          await supabaseAdmin.from('finance_events').upsert(
            {
              stripe_event_id: stripeEventId,
              stripe_event_type: event.type,
              finance_event_type: 'churn_event',
              occurred_at: occurredAtIso,
              user_id: sub.user_id,
              subscription_id: sub.id,
              slot_id: sub.slot_id ?? null,
              plan_name: sub.plan_name ?? null,
              billing_type: sub.billing_type ?? null,
              currency: (sub.currency ?? 'usd') as string,
              amount_cents: null,
              risk_amount_cents: null,
              metadata: { subscription_id: subId ?? null },
            },
            { onConflict: 'stripe_event_id', ignoreDuplicates: true }
          );
        } catch (finErr: any) {
          console.error('[FINANCE_EVENTS] churn_event insert failed:', finErr?.message ?? finErr);
        }
      }

      const primarySlotIds = Array.from(
        new Set((primaryCandidates ?? [])
          .map((c: any) => c.slot_id)
          .filter((v: any) => v != null && String(v).trim().length > 0))
      ) as string[];

      // release_slot_atomic embebe cancel_subscriptions_atomic (orden garantizado en SQL).
      if (!otherLiveReplacement) {
        for (const slotIdToRelease of primarySlotIds) {
          const { error: rpcReleaseErr } = await releaseSlotAtomicForCancelPolicy(supabaseAdmin, slotIdToRelease);

          if (rpcReleaseErr) {
            await logEvent(
              'cancel_failed_no_live_subscription',
              'error',
              rpcReleaseErr.message,
              undefined,
              { phase: 'customer.subscription.deleted', stripeSubId: subId, slot_id: slotIdToRelease, error_code: rpcReleaseErr.code },
              'stripe'
            );
            await markWebhookFailed(rpcReleaseErr.message);
            return res.status(500).json({ received: false, error: rpcReleaseErr.message, phase: 'customer.subscription.deleted' });
          }

          await logEvent(
            'cancel_slot_released',
            'info',
            'cancel: slot liberado tras customer.subscription.deleted (RPC)',
            undefined,
            { phase: 'customer.subscription.deleted', stripeSubId: subId, local_subscription_id: sub.id, slot_id: slotIdToRelease },
            'stripe'
          );
        }
      }

      const nowIso = new Date().toISOString();
      const { error: updateErr } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'canceled',
          next_billing_date: null,
          reactivation_grace_until: null,
          updated_at: nowIso,
        })
        .eq('stripe_subscription_id', subId);

      if (updateErr) {
        await logEvent(
          'cancel_failed_no_live_subscription',
          'error',
          updateErr.message,
          undefined,
          { phase: 'customer.subscription.deleted', stripeSubId: subId, local_subscription_id: sub.id, error_code: updateErr.code },
          'stripe'
        );
        await markWebhookFailed(updateErr.message);
        return res.status(500).json({ received: false, error: updateErr.message, phase: 'customer.subscription.deleted' });
      }

      await logEvent(
        'cancel_local_subscription_updated',
        'info',
        'cancel: subscriptions local status actualizado a canceled (deleted)',
        undefined,
        {
          phase: 'customer.subscription.deleted',
          stripeSubId: subId,
          local_subscription_id: sub.id,
          slot_id: sub.slot_id,
          updated_at: nowIso,
        },
        'stripe'
      );

      if (wasGracePending) {
        for (const slotIdCleanup of primarySlotIds) {
          await supabaseAdmin
            .from('slots')
            .update({
              reservation_token: null,
              reservation_expires_at: null,
              reservation_user_id: null,
              reservation_stripe_session_id: null,
            })
            .eq('slot_id', slotIdCleanup);
        }
        await logEvent(
          'cancel_grace_expired_finalized',
          'info',
          'cancel: suscripción eliminada en Stripe tras ventana de reactivación (sin reactivar)',
          undefined,
          { phase: 'customer.subscription.deleted', stripeSubId: subId, slot_ids: primarySlotIds },
          'stripe'
        );
      }

      // ── Reserva 48h + correo solo si la baja NO vino del flujo soft-cancel (manage ya envió el email)
      //    y NO hay otra suscripción viva para el mismo slot (upgrade reemplazo).
      if (!wasGracePending && !otherLiveReplacement) {
      // ── Reserva 48h en public.slots (tras release → libre) + URL de reactivación para el correo real
      const userId = sub.user_id;
      const slotId = sub.slot_id;
      let reactivation_url = '';
      let reservationExpiresAt: string | null = null;
      try {
        const { token: resToken, expiresAt: resExpires } = await reserveSlotAfterCancellationForEmail({
          slotId: String(slotId ?? ''),
          userId: String(userId ?? ''),
          canceledStripeSubscriptionId: subId,
          phoneNumber: sub.phone_number,
        });
        reservationExpiresAt = resExpires;
        if (resToken) {
          reactivation_url = `https://www.telsim.io/#/web/reactivate-line?token=${encodeURIComponent(resToken)}`;
          console.log('[CANCEL] slot reserved 48h', { slot_id: slotId, expires_at: resExpires });
          console.log('[CANCEL] reservation_token prefix', resToken.slice(0, 8));
        }
      } catch (reacErr) {
        console.warn('[CANCEL] slot reservation skipped', reacErr);
      }

      // ── Notificaciones canónicas (única fuente): template_email_cancellation, template_telegram_cancellation, template_app_cancellation
      const { data: slotData } = await supabaseAdmin
        .from('slots')
        .select('phone_number, plan_type')
        .eq('slot_id', slotId)
        .maybeSingle();

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email, nombre, telegram_chat_id')
        .eq('id', userId)
        .maybeSingle();

      const cancelAtMoment = new Date();
      const now = cancelAtMoment.toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const endDate = new Date((subscription.current_period_end ?? 0) * 1000).toLocaleDateString('es-CL');

      const phoneRaw = String(slotData?.phone_number ?? slotId ?? '');
      const phoneFormatted = phoneRaw ? (phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`) : '';

      const cancellationPayload = {
        nombre: String((userData as { nombre?: string } | null)?.nombre ?? '').trim() || 'Cliente',
        email: String(userData?.email ?? ''),
        phone: phoneFormatted,
        plan: String(sub.plan_name ?? ''),
        end_date: endDate,
        status: 'Cancelado',
        slot_id: String(slotId ?? ''),
        plan_name: String(slotData?.plan_type ?? sub.plan_name ?? ''),
        phone_number: phoneRaw,
        to_email: String(userData?.email ?? ''),
        date: now,
        canceled_at: formatCancellationDateTimeForUser(cancelAtMoment),
        reactivation_deadline: formatCancellationDateTimeFromIso(reservationExpiresAt),
        reactivation_url,
      };

      const recipientEmail = String(userData?.email ?? '').trim();
      const tgChatRaw = String((userData as { telegram_chat_id?: string | null })?.telegram_chat_id ?? '').trim();
      const telegramRecipient = tgChatRaw ? `Telegram:${tgChatRaw}` : '';

      const dupWindowMs = 48 * 60 * 60 * 1000;
      const skipEmailDup =
        recipientEmail !== '' &&
        Boolean(userId) &&
        (await hasRecentNotificationDuplicate(supabaseAdmin, {
          userId: String(userId),
          eventName: CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
          recipient: recipientEmail,
          windowMs: dupWindowMs,
          channel: 'email',
        }));

      const skipTelegramDup =
        telegramRecipient !== '' &&
        Boolean(userId) &&
        (await hasRecentNotificationDuplicate(supabaseAdmin, {
          userId: String(userId),
          eventName: CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
          recipient: telegramRecipient,
          windowMs: dupWindowMs,
          channel: 'telegram',
        }));

      const skipAppDup =
        Boolean(userId) &&
        (await hasRecentAppNotificationDuplicate(supabaseAdmin, {
          userId: String(userId),
          sourceNotificationKey: CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
          windowMs: dupWindowMs,
        }));

      if (skipEmailDup) {
        void logEvent(
          'CANCELLATION_EMAIL_SKIPPED_DUPLICATE',
          'info',
          'Email de cancelación ya enviado en ventana 48h (p. ej. soft-cancel); no reenviar email',
          recipientEmail || undefined,
          { user_id: userId, stripe_subscription_id: subId, stripe_event_id: stripeEventId },
          'stripe'
        );
      }
      if (skipTelegramDup) {
        void logEvent(
          'CANCELLATION_TELEGRAM_SKIPPED_DUPLICATE',
          'info',
          'Telegram de cancelación ya enviado en ventana 48h; no reenviar Telegram',
          undefined,
          {
            user_id: userId,
            stripe_subscription_id: subId,
            stripe_event_id: stripeEventId,
          },
          'stripe'
        );
      }
      if (skipAppDup) {
        void logEvent(
          'CANCELLATION_APP_SKIPPED_DUPLICATE',
          'info',
          'Toast in-app de cancelación ya registrado en ventana 48h; no duplicar',
          undefined,
          { user_id: userId, stripe_subscription_id: subId, stripe_event_id: stripeEventId },
          'stripe'
        );
      }

      if (!skipAppDup) {
        await createNotificationFromTemplate(
          CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
          userId,
          cancellationPayload,
          'error',
          stripeEventId
        );
      }

      if (!skipEmailDup && userData?.email && userId) {
        void logEvent(
          'EMAIL_DISPATCHED',
          'info',
          CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
          null,
          { user_id: userId, template: `template_email_${CANONICAL_TEMPLATE_EVENTS.CANCELLATION}`, channel: 'email' },
          'stripe'
        );
        console.log(
          '[CANCEL] reactivation_url_in_payload',
          Boolean(cancellationPayload.reactivation_url && String(cancellationPayload.reactivation_url).trim() !== '')
        );
        await triggerEmail(CANONICAL_TEMPLATE_EVENTS.CANCELLATION, userId, cancellationPayload);
        console.log('[CANCEL] Email enviado a:', userData.email);
      } else if (!userData?.email && userId) {
        console.error('[CANCEL] No se encontró email para userId:', userId);
      }

      if (!skipTelegramDup) {
        void logEvent(
          'TELEGRAM_DISPATCHED',
          'info',
          CANONICAL_TEMPLATE_EVENTS.CANCELLATION,
          null,
          { user_id: userId, template: `template_telegram_${CANONICAL_TEMPLATE_EVENTS.CANCELLATION}`, channel: 'telegram' },
          'stripe'
        );
        await sendTelegramNotification(CANONICAL_TEMPLATE_EVENTS.CANCELLATION, userId, cancellationPayload);
        console.log('[CANCEL] Telegram enviado OK');
      }
      }
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] customer.subscription.deleted:', err.message);
      await logEvent('WEBHOOK_ERROR', 'error', err?.message, undefined, {
        stack: err?.stack,
        context: 'customer.subscription.deleted',
        subscription_id: subId ?? undefined,
      }, 'stripe');
    }
  }

  await markWebhookProcessed();
  return res.status(200).json({ received: true });
  } catch (err: any) {
    const errMsg = err?.message ?? String(err);
    const errStack = err?.stack ?? '';
    console.error('[WEBHOOK UNCAUGHT]', errMsg, errStack);
    try {
      await logEvent('WEBHOOK_ERROR', 'critical', errMsg, undefined, { stack: errStack }, 'stripe');
    } catch (logErr) {
      console.error('[WEBHOOK] logEvent falló (DB/logger):', (logErr as Error)?.message);
      try {
        await supabaseAdmin.from('audit_logs').insert({
          event_type: 'WEBHOOK_ERROR',
          severity: 'critical',
          message: errMsg,
          user_email: null,
          payload: { stack: errStack, source: 'stripe', fallback: true },
          source: 'stripe',
          created_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.error('[WEBHOOK] audit_logs insert falló:', (dbErr as Error)?.message);
      }
    }
    // No ocultar fallos: marcamos el evento como failed para permitir retries seguros.
    const failedEventId = (event as Stripe.Event).id;
    if (failedEventId) {
      try {
        await supabaseAdmin
          .from('stripe_webhook_events')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: errMsg ?? errStack ?? null,
          })
          .eq('event_id', failedEventId);
      } catch {
        // no bloquear respuesta 500 por fallo del registro de dedupe
      }
    }
    return res.status(500).json({ received: false, error: errMsg });
  }
}
