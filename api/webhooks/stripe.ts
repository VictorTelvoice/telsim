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

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
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

const FINANCE_COST_PER_SLOT_MONTH_CENTS_ID = 'finance_cost_per_slot_month_cents';
const FINANCE_COST_PER_SMS_CENTS_ID = 'finance_cost_per_sms_cents';

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
 * No devuelve filas canceladas: esas no son el vínculo operativo para un pago nuevo (→ fallback/recovery).
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

const RECOVERY_PLAN_LIMITS: Record<string, number> = { Starter: 150, Pro: 400, Power: 1400 };

/** Ventana solo para auditar checkout “stale” vs recovery en subscription_create (no desbloquea ciclos). */
const STALE_CHECKOUT_AUDIT_HOURS = 72;

/**
 * Antes de recovery insert en subscription_create: el slot debe ser del usuario (assigned_to vacío o igual).
 * Falso positivo histórico: hasRecentCheckoutOrReservationEvidence devolvía true en ciclos porque
 * cualquier fila subscriptions reciente (cs_*) para user_id+slot_id dentro de 72h activaba recovery
 * incluso en subscription_cycle (renovaciones de Test con metadata), sin garantizar que fuera “esta” compra.
 */
async function slotOwnershipAllowsRecoveryInsert(
  userId: string,
  slotId: string
): Promise<boolean> {
  const sid = slotId.trim();
  const { data: slotRow, error } = await supabaseAdmin
    .from('slots')
    .select('assigned_to')
    .eq('slot_id', sid)
    .maybeSingle();

  if (error || !slotRow) {
    return true;
  }
  const assigned = slotRow.assigned_to != null ? String(slotRow.assigned_to).trim() : '';
  if (assigned === '' || assigned === String(userId)) {
    return true;
  }
  console.warn('[WEBHOOK] invoice.payment_succeeded', {
    log_event: 'evidence_rejected_wrong_slot',
    user_id: userId,
    slot_id: sid,
    slot_assigned_to: assigned,
  });
  return false;
}

/** Audita si existe checkout (cs_*) antiguo para el par user+slot (solo log; no aplica a subscription_cycle). */
async function logStaleCheckoutAuditIfPresent(userId: string, slotId: string): Promise<void> {
  const sid = slotId.trim();
  const staleBeforeIso = new Date(Date.now() - STALE_CHECKOUT_AUDIT_HOURS * 60 * 60 * 1000).toISOString();
  const { data: staleRow } = await supabaseAdmin
    .from('subscriptions')
    .select('id, stripe_session_id, created_at')
    .eq('user_id', userId)
    .eq('slot_id', sid)
    .not('stripe_session_id', 'is', null)
    .like('stripe_session_id', 'cs_%')
    .lt('created_at', staleBeforeIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (staleRow?.id) {
    console.warn('[WEBHOOK] invoice.payment_succeeded', {
      log_event: 'evidence_rejected_stale_checkout',
      user_id: userId,
      slot_id: sid,
      subscription_id: staleRow.id,
      stripe_session_id: staleRow.stripe_session_id ?? null,
      created_at: staleRow.created_at ?? null,
      stale_before_iso: staleBeforeIso,
    });
  }
}

/** Nueva fila subscriptions cuando solo hay historial cancelado y el pago es de un sub_ nuevo (no tocar filas canceled). */
async function insertSubscriptionRecoveryFromInvoice(params: {
  userId: string;
  slotId: string;
  phoneNumber: string | null | undefined;
  stripeSubId: string;
  invoice: Stripe.Invoice;
  templateRow: Record<string, unknown> | null;
  recovery_insert_reason: string;
  source_event_type: string;
}): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }> {
  const { userId, slotId, phoneNumber, stripeSubId, invoice, templateRow, recovery_insert_reason, source_event_type } =
    params;

  // Política dura: solo subscription_create puede materializar una fila nueva mediante recovery insert.
  if (invoice.billing_reason !== 'subscription_create') {
    console.error('[WEBHOOK] forbidden_recovery_insert_non_create', {
      log_event: 'forbidden_recovery_insert_non_create',
      billing_reason: invoice.billing_reason ?? null,
      source_event_type,
      stripe_subscription_id: stripeSubId,
      slot_id: slotId ?? null,
      user_id: userId ?? null,
      phone_number: phoneNumber ? String(phoneNumber).trim() : null,
      recovery_insert_reason,
    });

    return {
      data: null,
      error: {
        message: `recovery insert forbidden for billing_reason=${invoice.billing_reason ?? 'null'}`,
        code: 'FORBIDDEN_RECOVERY_INSERT_NON_CREATE',
      },
    };
  }

  const periodEndSec = invoice.period_end ?? invoice.lines?.data?.[0]?.period?.end ?? null;
  let nextBillingIso =
    periodEndSec != null && periodEndSec > 0
      ? new Date(Number(periodEndSec) * 1000).toISOString()
      : new Date().toISOString();

  let billingType: 'annual' | 'monthly' =
    String(templateRow?.billing_type ?? '') === 'annual' ? 'annual' : 'monthly';
  let amount =
    typeof templateRow?.amount === 'number' ? templateRow.amount : 0;
  let planName =
    (typeof templateRow?.plan_name === 'string' && templateRow.plan_name.trim() !== ''
      ? templateRow.plan_name
      : null) || 'Starter';
  let monthlyLimit =
    typeof templateRow?.monthly_limit === 'number' ? templateRow.monthly_limit : RECOVERY_PLAN_LIMITS[planName] ?? 150;
  let currency = String(invoice.currency ?? templateRow?.currency ?? 'usd').toLowerCase();

  try {
    const stSub = await stripe.subscriptions.retrieve(stripeSubId, {
      expand: ['items.data.price.product'],
    });
    const price = stSub.items.data[0]?.price as Stripe.Price | undefined;
    const product = price?.product;
    if (price?.recurring?.interval === 'year') billingType = 'annual';
    else if (price?.recurring?.interval === 'month') billingType = 'monthly';
    if (price?.unit_amount != null) amount = price.unit_amount / 100;
    if (product && typeof product === 'object' && 'name' in product) {
      const n = String((product as Stripe.Product).name ?? '');
      if (n.includes('Power')) planName = 'Power';
      else if (n.includes('Pro')) planName = 'Pro';
      else if (n.includes('Starter')) planName = 'Starter';
    }
    monthlyLimit = RECOVERY_PLAN_LIMITS[planName] ?? monthlyLimit;
    if (stSub.current_period_end) {
      nextBillingIso = new Date(stSub.current_period_end * 1000).toISOString();
    }
  } catch (e: any) {
    console.warn('[WEBHOOK] recovery insert: subscription.retrieve failed', stripeSubId, e?.message);
  }

  const phoneResolved =
    (phoneNumber && String(phoneNumber).trim()) ||
    (typeof templateRow?.phone_number === 'string' ? templateRow.phone_number.trim() : '') ||
    null;

  const insertPayload = {
    user_id: userId,
    slot_id: slotId,
    phone_number: phoneResolved || null,
    plan_name: planName,
    monthly_limit: monthlyLimit,
    status: 'active' as const,
    stripe_session_id: null as string | null,
    stripe_subscription_id: stripeSubId,
    trial_end: null as string | null,
    amount,
    billing_type: billingType,
    currency,
    next_billing_date: nextBillingIso,
    activation_state: 'on_air' as const,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('subscriptions')
    .insert(insertPayload)
    .select(SUBSCRIPTION_ROW_FOR_INVOICE_PAYMENT)
    .single();

  if (insertErr) {
    console.error('[WEBHOOK] invoice.payment_succeeded', {
      phase: 'recovery_insert',
      recovery_insert_from_invoice: false,
      recovery_insert_reason,
      source_event_type,
      billing_reason: invoice.billing_reason ?? null,
      stripe_subscription_id: stripeSubId,
      slot_id: slotId,
      user_id: userId,
      phone_number: phoneResolved || null,
      error: insertErr.message,
      code: insertErr.code,
    });
    return {
      data: null,
      error: { message: insertErr.message, code: insertErr.code },
    };
  }

  console.warn('[WEBHOOK] invoice.payment_succeeded', {
    phase: 'recovery_insert',
    recovery_insert_from_invoice: true,
    recovery_insert_reason,
    source_event_type,
    billing_reason: invoice.billing_reason ?? null,
    stripe_subscription_id: stripeSubId,
    slot_id: slotId,
    user_id: userId,
    phone_number: phoneResolved || null,
  });

  return {
    data: (inserted as Record<string, unknown>) ?? null,
    error: null,
  };
}

async function triggerEmail(
  event: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  const templateId = `template_email_${event}`;
  let bodyOverride: string | null = null;
  const templateContent = await getTemplateContent(templateId);
  if (templateContent) bodyOverride = replaceVariables(templateContent, data);
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
      body: JSON.stringify({ event, user_id: userId, to_email: email, data, template_id: templateId, content: bodyOverride ?? undefined }),
    });
    const result = await res.json().catch(() => ({}));
    try {
      await supabaseAdmin.from('notification_history').insert({
        user_id: userId,
        recipient: email,
        channel: 'email',
        event,
        status: res.ok ? 'sent' : 'error',
        error_message: res.ok ? null : (result?.message ?? (typeof result?.error === 'string' ? result.error : null)),
        content_preview: (bodyOverride ?? '').slice(0, 500) || null,
      });
    } catch {
      // no bloquear
    }
  } catch (err) {
    console.error('[triggerEmail]', err);
  }
}

async function sendTelegramNotification(
  messageOrEvent: string,
  userId: string,
  data?: Record<string, unknown>
): Promise<void> {
  let message: string;
  if (data != null) {
    const templateId = `template_telegram_${messageOrEvent}`;
    const templateContent = await getTemplateContent(templateId);
    message = templateContent ? replaceVariables(templateContent, data) : replaceVariables('Evento: {{event}}', { event: messageOrEvent, ...data });
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
          recipient: `Telegram:${tgChatId}`,
          channel: 'telegram',
          event: typeof data !== 'undefined' ? messageOrEvent : 'notification',
          status: tgRes.ok ? 'sent' : 'error',
          error_message: tgRes.ok ? null : (tgData?.description ?? null),
          content_preview: (message || '').slice(0, 500) || null,
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

    if (!sessionMeta.upgrade && session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        sessionMeta = { ...sessionMeta, ...subscription.metadata } as Record<string, string>;
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

      const { data: oldSubs } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('slot_id', upgradeMeta.slot_id)
        .in('status', ['active', 'trialing'])
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

      const PLAN_LIMITS: Record<string, number> = { Starter: 150, Pro: 400, Power: 1400 };
      const SMS_BY_PLAN: Record<string, number> = { Starter: 150, Pro: 400, Power: 1400 };

      // Monto y billing desde el price de Stripe (no session.amount_total que puede ser 0)
      const newSub = await stripe.subscriptions.retrieve(newSubId, { expand: ['items.data.price'] });
      const firstPrice = newSub.items.data[0]?.price;
      const amount = (firstPrice?.unit_amount ?? 0) / 100;
      const billingTypeFromStripe = firstPrice?.recurring?.interval === 'year' ? 'annual' : 'monthly';

      await supabaseAdmin.from('subscriptions').insert({
        user_id: upgradeMeta.user_id,
        slot_id: upgradeMeta.slot_id,
        stripe_subscription_id: newSubId,
        plan_name: upgradeMeta.new_plan_name,
        monthly_limit: PLAN_LIMITS[upgradeMeta.new_plan_name as string] ?? 150,
        billing_type: billingTypeFromStripe,
        amount,
        status: 'active',
        activation_state: 'on_air',
      });

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
            subscription_id: null,
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

      await supabaseAdmin
        .from('slots')
        .update({
          plan_type: upgradeMeta.new_plan_name,
          sms_limit: SMS_BY_PLAN[upgradeMeta.new_plan_name as string] ?? 150,
        })
        .eq('slot_id', upgradeMeta.slot_id);

      console.log('[WEBHOOK] Upgrade complete for slot', upgradeMeta.slot_id);

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email, nombre')
        .eq('id', upgradeMeta.user_id)
        .maybeSingle();

      if (userData?.email) {
        await triggerEmail('subscription_activated', upgradeMeta.user_id as string, {
          plan_name: upgradeMeta.new_plan_name,
          billing_type: upgradeMeta.is_annual === 'true' ? 'Anual' : 'Mensual',
          slot_id: upgradeMeta.slot_id,
          email: userData.email,
        });
        console.log('[UPGRADE] Email enviado a:', userData.email);
      }

      const phoneNumber = upgradeMeta.phone_number || upgradeMeta.slot_id;
      const now = new Date().toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      try {
        const billingLabel = upgradeMeta.is_annual === 'true' ? 'Anual' : 'Mensual';
        await sendTelegramNotification('upgrade_success', upgradeMeta.user_id as string, {
          phone: phoneNumber,
          plan: upgradeMeta.new_plan_name || '',
          billing: billingLabel,
          now,
          status: 'Activo',
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
      let subscriptionStatus: 'active' | 'trialing' = 'active';

      if (session.subscription) {
        stripeSubscriptionId = session.subscription.toString();
        try {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          if (stripeSub.trial_end) {
            trialEnd = new Date(stripeSub.trial_end * 1000).toISOString();
            subscriptionStatus = 'trialing';
          }
          const periodEnd = stripeSub.trial_end ?? stripeSub.current_period_end;
          if (periodEnd) {
            nextDateForEmail = new Date(periodEnd * 1000).toLocaleDateString('es-CL');
            nextBillingDateIso = new Date(periodEnd * 1000).toISOString();
          }
        } catch (subErr) {
          console.warn('[WEBHOOK] No se pudo recuperar suscripción Stripe:', subErr);
        }
      }
      if (!nextDateForEmail) {
        const d = new Date();
        if (isAnnualBilling) {
          d.setFullYear(d.getFullYear() + 1);
        } else {
          d.setDate(d.getDate() + 30);
        }
        nextDateForEmail = d.toLocaleDateString('es-CL');
        nextBillingDateIso = d.toISOString();
      }

      if (session.customer) {
        await supabaseAdmin.from('profiles').update({
          stripe_customer_id: session.customer.toString()
        }).eq('id', userId);
      }

      if (transactionType === 'UPGRADE') {
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'canceled' })
          .eq('slot_id', slotId)
          .eq('status', 'active');
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'canceled' })
          .eq('slot_id', slotId)
          .eq('status', 'trialing');
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

      const { data: exists } = await supabaseAdmin
        .from('subscriptions')
        .select('id, activation_state, stripe_session_id, stripe_subscription_id')
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

        const insertData = {
          user_id: userId,
          slot_id: slotId,
          phone_number: resolvedPhoneForNotifications || slot?.phone_number,
          plan_name: planName,
          monthly_limit: Number(limit),
          status: subscriptionStatus,
          stripe_session_id: session.id,
          stripe_subscription_id: stripeSubscriptionId,
          trial_end: trialEnd,
          amount: correctAmount,
          billing_type: billingType,
          currency: session.currency || 'usd',
          next_billing_date: nextBillingDateIso,
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
      } else if (exists && stripeSubscriptionId) {
        const row = exists as {
          id: string;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
        };
        const patch: Record<string, string> = {};
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
        if (Object.keys(patch).length > 0) {
          console.log('[WEBHOOK] subscriptions: alineación Stripe IDs (idempotencia checkout.session.completed)', {
            subscription_id: row.id,
            patch_keys: Object.keys(patch),
          });
          await supabaseAdmin.from('subscriptions').update(patch).eq('id', row.id);
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

        if (enforceReservationValidation) {
          await supabaseAdmin.from('slots').update(slotUpdatePayload)
            .eq('slot_id', slotId)
            .eq('status', 'reserved')
            .eq('reservation_token', reservationTokenFromMeta);
        } else {
          await supabaseAdmin.from('slots').update(slotUpdatePayload)
            .eq('slot_id', slotId);
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

        const trialMsg = trialEnd
          ? `Tu trial gratuito de 7 días comienza ahora. El primer cobro será el ${new Date(trialEnd).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}.`
          : `Tu línea ${slot?.phone_number || ''} está activa y lista para recibir SMS.`;

        // activation_state = on_air
        if (existingActivationState !== 'on_air') {
          await createNotification(
            userId,
            '🚀 ¡Línea activada!',
            trialMsg,
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
        // Fuente de verdad para quick access post-login: onboarding ya completado.
        await supabaseAdmin
          .from('users')
          .update({
            onboarding_completed: true,
            onboarding_step: 'completed',
            onboarding_checkout_session_id: null,
          })
          .eq('id', userId);
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

    const dNext = new Date();
    if (isAnnualBilling) {
      dNext.setFullYear(dNext.getFullYear() + 1);
    } else {
      dNext.setDate(dNext.getDate() + 30);
    }
    nextDateForEmail = dNext.toLocaleDateString('es-CL');

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
      try {
        void logEvent(
          'EMAIL_DISPATCHED',
          'info',
          'purchase_success',
          null,
          {
            user_id: userId,
            template: 'template_email_purchase_success',
            channel: 'email',
          },
          'stripe'
        );
        await triggerEmail('purchase_success', userId, {
          plan: planName ?? '',
          phone_number: phoneForEmail,
          billing_type: billingTypeForEmail,
          next_date: nextDateForEmail,
          amount: amountFormatted,
          to: customerEmail,
        });
      } catch (emailErr: any) {
        console.error('[WEBHOOK triggerEmail FAIL]', {
          event: 'purchase_success',
          userId,
          slotId,
          phone_number: phoneForEmail,
          error: emailErr?.message,
          stack: emailErr?.stack,
        });
      }

      try {
        const telegramPhone = phoneForEmail || phoneFromMeta || '';
        const displayPhone = telegramPhone ? (telegramPhone.startsWith('+') ? telegramPhone : `+${telegramPhone}`) : slotId || '';
        void logEvent(
          'TELEGRAM_DISPATCHED',
          'info',
          'new_purchase',
          null,
          {
            user_id: userId,
            template: 'template_telegram_new_purchase',
            channel: 'telegram',
          },
          'stripe'
        );
        await sendTelegramNotification('new_purchase', userId, { phone: displayPhone, plan: planName || '' });
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
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) {
        await markWebhookFailed(
          'Stripe webhook: subscription not found in Supabase (allow retry)',
          undefined
        );
        return res.status(500).json({ received: false, error: 'subscription not found' });
      }

      // Detectar cambio de plan (upgrade/downgrade)
      const previousPriceId = (previousAttributes as any)?.items?.data?.[0]?.price?.id;
      const newPriceId = subscription.items.data[0]?.price?.id;
      const planChanged = previousPriceId && newPriceId && previousPriceId !== newPriceId;

      if (planChanged) {
        const subscriptionMeta = subscription.metadata || {};
        const slotId = subscriptionMeta.slot_id;
        const newPlanName = subscriptionMeta.planName;
        const newMonthlyLimit = subscriptionMeta.monthlyLimit ? parseInt(subscriptionMeta.monthlyLimit) : undefined;

        if (slotId && newPlanName) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_name: newPlanName,
              monthly_limit: newMonthlyLimit,
              status: subscription.status,
              billing_type: subscriptionMeta.isAnnual === 'true' ? 'annual' : 'monthly',
            })
            .eq('slot_id', slotId)
            .in('status', ['active', 'trialing']);

          await supabaseAdmin
            .from('slots')
            .update({ plan_type: newPlanName })
            .eq('slot_id', slotId);

          // Notificación de upgrade (opcional)
          console.log(`[UPGRADE] slot ${slotId} → ${newPlanName}`);
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

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: statusMap[newStatus] || 'active' })
        .eq('id', sub.id);

      const periodEndForBilling = subscription.current_period_end ?? 0;
      if (periodEndForBilling && periodEndForBilling > 0) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ next_billing_date: new Date(periodEndForBilling * 1000).toISOString() })
          .eq('id', sub.id);
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
        if (isCanceledNow) {
          const { data: otherActiveSub } = await supabaseAdmin
            .from('subscriptions').select('id')
            .eq('slot_id', sub.slot_id)
            .in('status', ['active', 'trialing'])
            .neq('id', sub.id)
            .maybeSingle();

          if (!otherActiveSub) {
            await supabaseAdmin.from('slots').update({
              status: 'libre', assigned_to: null, plan_type: null,
            }).eq('slot_id', sub.slot_id);
          }
        }

        await createNotification(
          sub.user_id,
          '⚠️ Suscripción cancelada',
          `Tu plan ${sub.plan_name} fue cancelado. Tu número ha sido liberado. Puedes activar un nuevo plan cuando quieras.`,
          'warning'
        );

        await triggerEmail('subscription_cancelled', sub.user_id, {
          plan: sub.plan_name ?? '',
          end_date: new Date((subscription.current_period_end ?? 0) * 1000).toLocaleDateString('es-CL'),
        });

        try {
          const endDate = new Date((subscription.current_period_end ?? 0) * 1000).toLocaleDateString('es-CL');
          await sendTelegramNotification('subscription_cancelled', sub.user_id, { plan: sub.plan_name ?? '', end_date: endDate });
        } catch (tgErr: unknown) {
          console.warn('[WEBHOOK] Telegram cancelación skipped:', (tgErr as Error)?.message);
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
          'subscription.created no envía purchase_success; se espera checkout.session.completed',
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
        .select('id, user_id, plan_name, slot_id, billing_type, currency')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) {
        await markWebhookFailed(
          'Stripe webhook: subscription not found in Supabase (allow retry)',
          undefined
        );
        return res.status(500).json({ received: false, error: 'subscription not found' });
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
        .eq('id', sub.id);

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

  else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;

    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!stripeSubId) {
      await markWebhookProcessed();
      return res.status(200).json({ received: true });
    }

    const subscriptionInvoiceReasons = new Set([
      'subscription_create',
      'subscription_cycle',
      'subscription_update',
    ]);

    if (!invoice.billing_reason || !subscriptionInvoiceReasons.has(invoice.billing_reason)) {
      await markWebhookProcessed();
      return res.status(200).json({ received: true });
    }

    let invoicePaymentPhase:
      | 'subscription_lookup_primary'
      | 'subscription_lookup_fallback_slot'
      | 'subscription_lookup_fallback_phone'
      | 'subscription_lookup_recovery_insert'
      | 'subscription_lookup_repair_existing'
      | 'subscription_lookup_abort_canceled_candidate'
      | 'subscription_lookup_exhausted'
      | 'subscription_lookup_recovery_skipped_policy'
      | 'subscription_patch'
      | 'invoice_persist'
      | 'next_billing_update'
      | 'status_transition'
      | 'notification_email' = 'subscription_lookup_primary';

    try {
      invoicePaymentPhase = 'subscription_lookup_primary';
      console.log('[WEBHOOK] invoice.payment_succeeded', {
        phase: 'subscription_lookup_primary',
        stripeSubId,
        invoice_id: invoice.id,
        billing_reason: invoice.billing_reason ?? null,
      });

      const primaryResult = await findSubscriptionRowByStripeSubscriptionId(stripeSubId);

      if (primaryResult.error) {
        console.error('[WEBHOOK] invoice.payment_succeeded', {
          phase: 'subscription_lookup_primary',
          message: primaryResult.error.message,
          code: primaryResult.error.code,
          stripeSubId,
        });
        await markWebhookFailed(
          `invoice.payment_succeeded: subscription lookup error (${primaryResult.error.code ?? 'n/a'}): ${primaryResult.error.message}`,
          undefined
        );
        return res.status(500).json({
          received: false,
          error: 'subscription lookup failed',
          phase: invoicePaymentPhase,
        });
      }

      let subFound: Record<string, unknown> | null = discardCanceledSubscriptionRowForInvoicePayment(
        primaryResult.data,
        'lookup primario devolvió fila cancelada; se descarta para permitir hints + fallback + recovery',
        stripeSubId
      );
      let subscriptionLookupSource: 'primary' | 'fallback_slot' | 'fallback_phone' | 'recovery_insert' | null =
        subFound ? 'primary' : null;
      let subscriptionLookupRepairNeeded = false;
      /** Fila más reciente (p. ej. cancelada) para plantilla de recovery insert sin mutar historial. */
      let recoveryTemplateRow: Record<string, unknown> | null = null;
      /** true si hubo candidato a recovery pero la política bloqueó el INSERT (p. ej. subscription_cycle sin evidencia). */
      let recoveryInsertSkippedByPolicy = false;

      const hints = !subFound ? await extractInvoiceLinkageHints(invoice, stripeSubId) : null;

      if (!subFound && hints?.userId && hints.slotId) {
        invoicePaymentPhase = 'subscription_lookup_fallback_slot';
        console.log('[WEBHOOK] invoice.payment_succeeded', {
          phase: invoicePaymentPhase,
          user_id: hints.userId,
          slot_id: hints.slotId,
          stripeSubId,
          invoice_id: invoice.id,
        });
        const { data: slotRows, error: slotErr } = await listSubscriptionRowsByUserAndSlot(
          hints.userId,
          hints.slotId
        );
        if (slotErr) {
          console.error('[WEBHOOK] invoice.payment_succeeded', {
            phase: invoicePaymentPhase,
            message: slotErr.message,
            code: slotErr.code,
          });
          await markWebhookFailed(
            `invoice.payment_succeeded: ${invoicePaymentPhase} (${slotErr.code ?? 'n/a'}): ${slotErr.message}`,
            undefined
          );
          return res.status(500).json({
            received: false,
            error: 'subscription lookup failed',
            phase: invoicePaymentPhase,
          });
        }
        if (slotRows.length) {
          recoveryTemplateRow = slotRows[0];
        }
        const pickSlot = pickLiveSubscriptionCandidate(slotRows, stripeSubId);
        if (pickSlot.mode === 'exact_sub_match' || pickSlot.mode === 'repair_missing_sub') {
          subFound = pickSlot.row;
          subscriptionLookupSource = 'fallback_slot';
          subscriptionLookupRepairNeeded = pickSlot.mode === 'repair_missing_sub';
        }
      }

      if (!subFound && hints?.userId && hints.phoneNumber) {
        invoicePaymentPhase = 'subscription_lookup_fallback_phone';
        console.log('[WEBHOOK] invoice.payment_succeeded', {
          phase: invoicePaymentPhase,
          user_id: hints.userId,
          phone_hint: digitsOnly(hints.phoneNumber),
          stripeSubId,
          invoice_id: invoice.id,
        });
        const { data: phoneRows, error: phoneErr } = await listSubscriptionRowsByUserAndPhone(
          hints.userId,
          hints.phoneNumber
        );
        if (phoneErr) {
          console.error('[WEBHOOK] invoice.payment_succeeded', {
            phase: invoicePaymentPhase,
            message: phoneErr.message,
            code: phoneErr.code,
          });
          await markWebhookFailed(
            `invoice.payment_succeeded: ${invoicePaymentPhase} (${phoneErr.code ?? 'n/a'}): ${phoneErr.message}`,
            undefined
          );
          return res.status(500).json({
            received: false,
            error: 'subscription lookup failed',
            phase: invoicePaymentPhase,
          });
        }
        if (phoneRows.length && !recoveryTemplateRow) {
          recoveryTemplateRow = phoneRows[0];
        }
        const pickPhone = pickLiveSubscriptionCandidate(phoneRows, stripeSubId);
        if (pickPhone.mode === 'exact_sub_match' || pickPhone.mode === 'repair_missing_sub') {
          subFound = pickPhone.row;
          subscriptionLookupSource = 'fallback_phone';
          subscriptionLookupRepairNeeded = pickPhone.mode === 'repair_missing_sub';
        }
      }

      if (!subFound && invoice.billing_reason === 'subscription_cycle') {
        console.warn('[WEBHOOK] invoice.payment_succeeded', {
          log_event: 'subscription_cycle_without_live_row',
          stripeSubId,
          invoice_id: invoice.id,
          user_id: hints?.userId ?? null,
          slot_id:
            (hints?.slotId && String(hints.slotId).trim()) ||
            (typeof recoveryTemplateRow?.slot_id === 'string' ? String(recoveryTemplateRow.slot_id).trim() : null),
        });
      }

      if (!subFound && stripeSubId.startsWith('sub_') && hints?.userId) {
        const slotIdFinal =
          (hints.slotId && hints.slotId.trim()) ||
          (typeof recoveryTemplateRow?.slot_id === 'string'
            ? String(recoveryTemplateRow.slot_id).trim()
            : '') ||
          null;
        if (slotIdFinal) {
          invoicePaymentPhase = 'subscription_lookup_recovery_insert';
          const br = invoice.billing_reason ?? '';

          let allowRecovery = false;

          if (br === 'subscription_create') {
            await logStaleCheckoutAuditIfPresent(hints.userId, slotIdFinal);
            const slotOk = await slotOwnershipAllowsRecoveryInsert(hints.userId, slotIdFinal);
            if (slotOk) {
              allowRecovery = true;
              console.warn('[WEBHOOK] invoice.payment_succeeded', {
                log_event: 'recovery_insert_allowed_subscription_create',
                stripeSubId,
                invoice_id: invoice.id,
                user_id: hints.userId,
                slot_id: slotIdFinal,
                billing_reason: br,
              });
            } else {
              recoveryInsertSkippedByPolicy = true;
            }
          } else if (br === 'subscription_cycle') {
            recoveryInsertSkippedByPolicy = true;
            console.warn('[WEBHOOK] invoice.payment_succeeded', {
              log_event: 'recovery_insert_blocked_subscription_cycle',
              stripeSubId,
              invoice_id: invoice.id,
              user_id: hints.userId,
              slot_id: slotIdFinal,
              billing_reason: br,
            });
          } else if (br === 'subscription_update') {
            recoveryInsertSkippedByPolicy = true;
            console.warn('[WEBHOOK] invoice.payment_succeeded', {
              log_event: 'recovery_insert_blocked_subscription_update',
              stripeSubId,
              invoice_id: invoice.id,
              user_id: hints.userId,
              slot_id: slotIdFinal,
              billing_reason: br,
            });
          } else {
            recoveryInsertSkippedByPolicy = true;
          }

          if (allowRecovery) {
            const recoveryInsertReason = [
              'policy:subscription_create',
              'no_live_subscription_row_for_stripe_id',
              'fallbacks_exhausted_no_exact_or_repair_candidate',
              recoveryTemplateRow ? 'template_from_historical_subscription_row' : 'slot_id_from_invoice_or_sub_metadata_only',
            ].join(' | ');
            const ins = await insertSubscriptionRecoveryFromInvoice({
              userId: hints.userId,
              slotId: slotIdFinal,
              phoneNumber: hints.phoneNumber,
              stripeSubId,
              invoice,
              templateRow: recoveryTemplateRow,
              recovery_insert_reason: recoveryInsertReason,
              source_event_type: event.type,
            });
            if (ins.error) {
              console.error('[WEBHOOK] invoice.payment_succeeded', {
                phase: invoicePaymentPhase,
                error: ins.error.message,
                code: ins.error.code,
              });
              if (ins.error.code === 'FORBIDDEN_RECOVERY_INSERT_NON_CREATE') {
                recoveryInsertSkippedByPolicy = true;
                invoicePaymentPhase = 'subscription_lookup_recovery_skipped_policy';
                console.warn('[WEBHOOK] invoice.payment_succeeded', {
                  phase: invoicePaymentPhase,
                  log_event: 'forbidden_recovery_insert_non_create',
                  stripeSubId,
                  invoice_id: invoice.id,
                  billing_reason: invoice.billing_reason ?? null,
                });
                await markWebhookProcessed();
                return res.status(200).json({ received: true, recovery_insert_skipped: true });
              }
              await markWebhookFailed(
                `subscription_lookup_recovery_insert: ${ins.error.message}`,
                undefined
              );
              return res.status(500).json({
                received: false,
                error: ins.error.message,
                phase: invoicePaymentPhase,
              });
            }
            subFound = ins.data;
            subscriptionLookupSource = 'recovery_insert';
            subscriptionLookupRepairNeeded = false;
          }
        }
      }

      const sub = subFound as {
        id: string;
        user_id: string;
        plan_name: string | null;
        status: string;
        slot_id: string | null;
        phone_number: string | null;
        monthly_limit: number | null;
        billing_type: string | null;
        currency: string | null;
        stripe_session_id?: string | null;
        stripe_subscription_id?: string | null;
      } | null;

      if (!sub) {
        if (recoveryInsertSkippedByPolicy) {
          invoicePaymentPhase = 'subscription_lookup_recovery_skipped_policy';
          console.warn('[WEBHOOK] invoice.payment_succeeded', {
            phase: invoicePaymentPhase,
            stripeSubId,
            invoice_id: invoice.id,
            billing_reason: invoice.billing_reason ?? null,
            message:
              'recovery insert omitido: subscription_cycle/subscription_update nunca insertan; o subscription_create rechazado por slot ajeno',
          });
          await markWebhookProcessed();
          return res.status(200).json({ received: true, recovery_insert_skipped: true });
        }

        // Huérfano: ciclo/actualización sin metadata útil.
        // En este caso no hay fila viva local y el retry no puede "aparecer mágicamente" info que ya no viene.
        const br = invoice.billing_reason ?? null;
        const noUsefulHints = !hints?.userId && !hints?.slotId && !hints?.phoneNumber;
        if (
          (br === 'subscription_cycle' || br === 'subscription_update') &&
          noUsefulHints
        ) {
          invoicePaymentPhase = 'subscription_lookup_exhausted';
          console.warn('[WEBHOOK] invoice.payment_succeeded', {
            log_event: 'orphan_subscription_cycle_without_metadata',
            stripe_subscription_id: stripeSubId,
            stripe_invoice_id: invoice.id,
            billing_reason: br,
            phase: invoicePaymentPhase,
          });
          await markWebhookProcessed();
          return res.status(200).json({
            received: true,
            ignored: true,
            reason: 'orphan_subscription_cycle_without_metadata',
            phase: 'subscription_lookup_exhausted',
          });
        }

        invoicePaymentPhase = 'subscription_lookup_exhausted';
        console.warn('[WEBHOOK] invoice.payment_succeeded', {
          phase: invoicePaymentPhase,
          message:
            'sin fila viva ni recovery insert: primary vacío, fallbacks sin match, o sin slot_id para INSERT (ni en hints ni en plantilla histórica)',
          stripeSubId,
          hints_summary: hints
            ? {
                has_user_id: Boolean(hints.userId),
                has_slot_id: Boolean(hints.slotId),
                has_phone: Boolean(hints.phoneNumber),
              }
            : null,
        });
        await markWebhookFailed(
          'Stripe webhook: subscription not found in Supabase (allow retry)',
          undefined
        );
        return res.status(500).json({
          received: false,
          error: 'subscription not found',
          phase: invoicePaymentPhase,
        });
      }

      const subRow = sub;
      if (
        subscriptionLookupRepairNeeded &&
        subscriptionLookupSource !== 'primary' &&
        subscriptionLookupSource !== 'recovery_insert' &&
        stripeSubId.startsWith('sub_') &&
        subRow.id
      ) {
        invoicePaymentPhase = 'subscription_lookup_repair';
        console.warn('[WEBHOOK] invoice.payment_succeeded', {
          phase: invoicePaymentPhase,
          message: 'backfill/repair stripe_subscription_id (fila viva por fallback; faltaba sub_)',
          subscription_id: subRow.id,
          previous_stripe_subscription_id: subRow.stripe_subscription_id ?? null,
          stripe_subscription_id_new: stripeSubId,
          lookup_source: subscriptionLookupSource,
        });
        const { error: repairErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ stripe_subscription_id: stripeSubId })
          .eq('id', subRow.id);
        if (repairErr) {
          console.error('[WEBHOOK] invoice.payment_succeeded', {
            phase: invoicePaymentPhase,
            error: repairErr.message,
            code: repairErr.code,
          });
          await markWebhookFailed(`subscription_lookup_repair: ${repairErr.message}`, undefined);
          return res.status(500).json({
            received: false,
            error: repairErr.message,
            phase: invoicePaymentPhase,
          });
        }
        subRow.stripe_subscription_id = stripeSubId;
      }

      if (
        stripeSubId.startsWith('sub_') &&
        (!subRow.stripe_subscription_id || subRow.stripe_subscription_id !== stripeSubId)
      ) {
        invoicePaymentPhase = 'subscription_patch';
        console.warn('[WEBHOOK] invoice.payment_succeeded', {
          phase: invoicePaymentPhase,
          message: 'alineando stripe_subscription_id en fila existente',
          subscription_id: subRow.id,
          stripeSubId,
        });
        const { error: alignErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ stripe_subscription_id: stripeSubId })
          .eq('id', subRow.id);
        if (alignErr) {
          console.error('[WEBHOOK] invoice.payment_succeeded', {
            phase: invoicePaymentPhase,
            error: alignErr.message,
            code: alignErr.code,
          });
          await markWebhookFailed(`subscription_patch: ${alignErr.message}`, undefined);
          return res.status(500).json({
            received: false,
            error: alignErr.message,
            phase: invoicePaymentPhase,
          });
        }
      }

      invoicePaymentPhase = 'invoice_persist';
      console.log('[WEBHOOK] invoice.payment_succeeded', {
        phase: invoicePaymentPhase,
        invoice_id: invoice.id,
        subscription_id: sub.id,
      });

      const fullInv = await persistSubscriptionInvoiceFromWebhook({
        invoice,
        sub: { id: sub.id, user_id: sub.user_id },
        stripeSubId,
      });

      // Fase 4 (ledger-first): registrar cash_revenue (exclusivo invoice.payment_succeeded.amount_paid).
      try {
        const amountPaidCents = invoice.amount_paid ?? 0;
        const occurredAtIso = invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString();

        await supabaseAdmin.from('finance_events').upsert(
          {
            stripe_event_id: stripeEventId,
            stripe_event_type: event.type,
            finance_event_type: 'cash_revenue',
            occurred_at: occurredAtIso,
            user_id: sub.user_id,
            subscription_id: sub.id,
            slot_id: sub.slot_id ?? null,
            plan_name: sub.plan_name ?? null,
            billing_type: sub.billing_type ?? null,
            currency: (invoice.currency ?? sub.currency ?? 'usd') as string,
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

      // Fase 5 (margen): registrar estimated_cost en función de costo por slot mes + costo por SMS.
      // Para idempotencia, usamos un `stripe_event_id` derivado (no colisiona con el row de cash_revenue).
      try {
        const amountPaidCents = invoice.amount_paid ?? 0;
        const occurredAtIso = invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString();
        const { costPerSlotMonthCents, costPerSmsCents } = await getFinanceCostRatesCents();

        const monthlyLimit = sub.monthly_limit ?? 0;
        const monthsFactor = sub.billing_type === 'annual' ? 12 : 1;

        const costMonthlyCents = costPerSlotMonthCents + (costPerSmsCents * Number(monthlyLimit || 0));
        const estimatedCostCents = costMonthlyCents * monthsFactor;

        if (estimatedCostCents !== 0 || amountPaidCents !== 0) {
          await supabaseAdmin.from('finance_events').upsert(
            {
              stripe_event_id: `${stripeEventId}:estimated_cost`,
              stripe_event_type: event.type,
              finance_event_type: 'estimated_cost',
              occurred_at: occurredAtIso,
              user_id: sub.user_id,
              subscription_id: sub.id,
              slot_id: sub.slot_id ?? null,
              plan_name: sub.plan_name ?? null,
              billing_type: sub.billing_type ?? null,
              currency: (invoice.currency ?? sub.currency ?? 'usd') as string,
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

      let phoneNumber = sub.phone_number ?? '';
      if (!phoneNumber && sub.slot_id) {
        const { data: slotRow } = await supabaseAdmin
          .from('slots')
          .select('phone_number')
          .eq('slot_id', sub.slot_id)
          .maybeSingle();
        phoneNumber = slotRow?.phone_number ?? '';
      }

      const periodEndMs = (fullInv.period_end ?? invoice.period_end ?? 0) * 1000;
      const next_date = new Date(periodEndMs).toLocaleDateString('es-CL');

      if (periodEndMs && periodEndMs > 0) {
        invoicePaymentPhase = 'next_billing_update';
        console.log('[WEBHOOK] invoice.payment_succeeded', {
          phase: invoicePaymentPhase,
          subscription_id: sub.id,
          next_billing_iso: new Date(periodEndMs).toISOString(),
        });
        const { error: nbErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ next_billing_date: new Date(periodEndMs).toISOString() })
          .eq('id', sub.id);
        if (nbErr) {
          console.error('[WEBHOOK] invoice.payment_succeeded', { phase: invoicePaymentPhase, error: nbErr.message, code: nbErr.code });
          await markWebhookFailed(`next_billing_update: ${nbErr.message}`, undefined);
          return res.status(500).json({
            received: false,
            error: nbErr.message,
            phase: invoicePaymentPhase,
          });
        }
      }

      invoicePaymentPhase = 'status_transition';
      console.log('[WEBHOOK] invoice.payment_succeeded', {
        phase: invoicePaymentPhase,
        subscription_id: sub.id,
        prior_status: sub.status,
        billing_reason: invoice.billing_reason ?? null,
      });

      if (sub.status === 'past_due') {
        const { error: pastDueErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', sub.id);
        if (pastDueErr) {
          console.error('[WEBHOOK] invoice.payment_succeeded', {
            phase: invoicePaymentPhase,
            past_due_to_active: pastDueErr.message,
            code: pastDueErr.code,
          });
          await markWebhookFailed(`status_transition past_due→active: ${pastDueErr.message}`, undefined);
          return res.status(500).json({
            received: false,
            error: pastDueErr.message,
            phase: invoicePaymentPhase,
          });
        }

        await createNotification(
          sub.user_id,
          '✅ Pago procesado',
          `El pago de tu plan ${sub.plan_name} fue exitoso. Tu servicio continúa activo.`,
          'success'
        );
      } else if (sub.status === 'trialing') {
        const { error: trialErr } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', sub.id);
        if (trialErr) {
          console.error('[WEBHOOK] invoice.payment_succeeded', {
            phase: invoicePaymentPhase,
            trialing_to_active: trialErr.message,
            code: trialErr.code,
          });
          await markWebhookFailed(`status_transition trialing→active: ${trialErr.message}`, undefined);
          return res.status(500).json({
            received: false,
            error: trialErr.message,
            phase: invoicePaymentPhase,
          });
        }
        console.log('[WEBHOOK] invoice.payment_succeeded', {
          phase: invoicePaymentPhase,
          trialing_to_active: 'ok',
          subscription_id: sub.id,
        });
      }

      invoicePaymentPhase = 'notification_email';
      console.log('[WEBHOOK] invoice.payment_succeeded', { phase: invoicePaymentPhase, user_id: sub.user_id });

      const receiptUrl = extractReceiptUrlFromInvoice(fullInv);
      await triggerEmail('invoice_paid', sub.user_id, {
        plan: sub.plan_name ?? '',
        amount: ((fullInv.amount_paid ?? invoice.amount_paid ?? 0) / 100).toFixed(2),
        subtotal: ((fullInv.subtotal ?? 0) / 100).toFixed(2),
        tax: (invoiceTaxCents(fullInv) / 100).toFixed(2),
        total: ((fullInv.total ?? 0) / 100).toFixed(2),
        invoice_pdf: fullInv.invoice_pdf ?? '',
        hosted_invoice_url: fullInv.hosted_invoice_url ?? '',
        receipt_url: receiptUrl ?? '',
        next_date,
        phone_number: phoneNumber || sub.slot_id || '',
        slot_id: sub.slot_id ?? '',
        to: invoice.customer_email ?? '',
      });
    } catch (err: any) {
      const msg = String(err?.message ?? 'unknown error');
      console.error('[WEBHOOK ERROR] invoice.payment_succeeded:', {
        phase: invoicePaymentPhase,
        message: msg,
      });
      const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      await logEvent('WEBHOOK_ERROR', 'error', err?.message, invoice.customer_email ?? undefined, {
        stack: err?.stack,
        context: 'invoice.payment_succeeded',
        phase: invoicePaymentPhase,
        subscription_id: stripeSubId ?? undefined,
        customer_email: invoice.customer_email ?? undefined,
      }, 'stripe');
      await markWebhookFailed(`invoice.payment_succeeded (${invoicePaymentPhase}): ${msg}`, err?.stack);
      return res.status(500).json({
        received: false,
        error: msg,
        phase: invoicePaymentPhase,
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
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id, billing_type, currency')
        .eq('stripe_subscription_id', subId)
        .maybeSingle();

      if (!sub) {
        console.log('[WEBHOOK] Sub deleted no encontrada en Supabase, ignorando');
        await markWebhookFailed(
          'Stripe webhook: subscription not found in Supabase (allow retry)',
          undefined
        );
        return res.status(500).json({ received: false, error: 'subscription not found' });
      }

      // Si hay una sub activa más reciente para el mismo slot, fue upgrade — no notificar cancelación
      const { data: activeSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, created_at')
        .eq('slot_id', sub.slot_id)
        .eq('status', 'active')
        .neq('stripe_subscription_id', subId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('[CANCEL] Sub deleted recibida:', subId, 'slot:', sub?.slot_id, 'activeSub:', activeSub?.id);

      if (activeSub) {
        console.log('[WEBHOOK] Sub deleted es parte de un upgrade, omitiendo notificación de cancelación');
        await markWebhookProcessed();
        return res.status(200).json({ received: true });
      }

      // Fase 4 (ledger-first): registrar churn_event (solo cuando NO es parte de upgrade).
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

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', sub.id);

      // No liberar el slot si ya tiene otra suscripción activa (p. ej. del upgrade)
      const { data: otherActiveSub } = await supabaseAdmin
        .from('subscriptions').select('id')
        .eq('slot_id', sub.slot_id)
        .in('status', ['active', 'trialing'])
        .neq('id', sub.id)
        .maybeSingle();

      if (!otherActiveSub) {
        await supabaseAdmin.from('slots').update({
          status: 'libre', assigned_to: null, plan_type: null,
        }).eq('slot_id', sub.slot_id);
      }

      await createNotification(
        sub.user_id,
        '🔴 Suscripción terminada',
        `Tu plan ${sub.plan_name} fue cancelado definitivamente. Reactiva tu suscripción cuando quieras.`,
        'error',
        stripeEventId,
        'subscription_cancelled'
      );

      // ── NOTIFICACIONES CANCELACIÓN REAL ─────────────────────────
      const userId = sub.user_id;
      const slotId = sub.slot_id;

      const { data: slotData } = await supabaseAdmin
        .from('slots')
        .select('phone_number, plan_type')
        .eq('slot_id', slotId)
        .maybeSingle();

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      const now = new Date().toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const endDate = new Date((subscription.current_period_end ?? 0) * 1000).toLocaleDateString('es-CL');

      console.log('[CANCEL] userData:', userData?.email, 'userId:', userId);

      const phoneNumberCancelled = slotData?.phone_number ?? slotId ?? '';

      if (userData?.email && userId) {
        void logEvent(
          'EMAIL_DISPATCHED',
          'info',
          'subscription_cancelled',
          null,
          { user_id: userId, template: 'template_email_subscription_cancelled', channel: 'email' },
          'stripe'
        );
        await triggerEmail('subscription_cancelled', userId, {
          plan: sub.plan_name ?? '',
          plan_name: slotData?.plan_type ?? sub.plan_name ?? '',
          end_date: endDate,
          slot_id: slotId,
          phone_number: phoneNumberCancelled,
          email: userData.email,
          to_email: userData.email,
        });
        console.log('[CANCEL] Email enviado a:', userData.email);
      } else {
        console.error('[CANCEL] No se encontró email para userId:', userId);
      }

      void logEvent(
        'TELEGRAM_DISPATCHED',
        'info',
        'cancellation',
        null,
        { user_id: userId, template: 'template_telegram_cancellation', channel: 'telegram' },
        'stripe'
      );
      await sendTelegramNotification('cancellation', userId, {
        phone: String(slotData?.phone_number || slotId),
        plan: String(slotData?.plan_type ?? sub.plan_name ?? ''),
        date: now,
        status: 'Cancelado',
      });
      console.log('[CANCEL] Telegram enviado OK');
      // ────────────────────────────────────────────────────────────
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
    await markWebhookFailed(errMsg, errStack);
    return res.status(500).json({ received: false, error: errMsg });
  }
}
