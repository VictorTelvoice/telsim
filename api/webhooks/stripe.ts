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

    try {
      const { data: sub, error: subLookupErr } = await supabaseAdmin
        .from('subscriptions')
        .select(
          'id, user_id, plan_name, status, slot_id, phone_number, monthly_limit, billing_type, currency, stripe_session_id, stripe_subscription_id'
        )
        .or(`stripe_subscription_id.eq.${stripeSubId},stripe_session_id.eq.${stripeSubId}`)
        .maybeSingle();

      if (subLookupErr) {
        console.error('[WEBHOOK] invoice.payment_succeeded: error lookup subscription', {
          message: subLookupErr.message,
          code: subLookupErr.code,
          stripeSubId,
        });
      }

      if (!sub) {
        console.warn('[WEBHOOK] invoice.payment_succeeded: sin fila en subscriptions (stripe_subscription_id ni stripe_session_id)', {
          stripeSubId,
        });
        await markWebhookFailed(
          'Stripe webhook: subscription not found in Supabase (allow retry)',
          undefined
        );
        return res.status(500).json({ received: false, error: 'subscription not found' });
      }

      const subRow = sub as {
        id: string;
        stripe_session_id?: string | null;
        stripe_subscription_id?: string | null;
      };
      if (
        stripeSubId.startsWith('sub_') &&
        (!subRow.stripe_subscription_id || subRow.stripe_subscription_id !== stripeSubId)
      ) {
        console.warn('[WEBHOOK] invoice.payment_succeeded: alineando stripe_subscription_id en fila existente', {
          subscription_id: subRow.id,
          stripeSubId,
        });
        await supabaseAdmin
          .from('subscriptions')
          .update({ stripe_subscription_id: stripeSubId })
          .eq('id', subRow.id);
      }

      const fullInv = await persistSubscriptionInvoiceFromWebhook({
        invoice,
        sub: sub as { id: string; user_id: string },
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

      if (sub.status === 'past_due') {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', sub.id);

        await createNotification(
          sub.user_id,
          '✅ Pago procesado',
          `El pago de tu plan ${sub.plan_name} fue exitoso. Tu servicio continúa activo.`,
          'success'
        );
      }

      const periodEndMs = (fullInv.period_end ?? invoice.period_end ?? 0) * 1000;
      const next_date = new Date(periodEndMs).toLocaleDateString('es-CL');

      if (periodEndMs && periodEndMs > 0) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ next_billing_date: new Date(periodEndMs).toISOString() })
          .eq('id', sub.id);
      }

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
      console.error('[WEBHOOK ERROR] invoice.payment_succeeded:', err.message);
      const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      await logEvent('WEBHOOK_ERROR', 'error', err?.message, invoice.customer_email ?? undefined, {
        stack: err?.stack,
        context: 'invoice.payment_succeeded',
        subscription_id: stripeSubId ?? undefined,
        customer_email: invoice.customer_email ?? undefined,
      }, 'stripe');
      const msg = String(err?.message ?? '');
      if (msg.includes('[subscription_invoices]')) {
        await markWebhookFailed(msg, err?.stack);
        return res.status(500).json({
          received: false,
          error: msg,
          phase: 'subscription_invoices',
        });
      }
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
