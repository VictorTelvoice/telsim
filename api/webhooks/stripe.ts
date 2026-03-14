import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function triggerEmail(
  event: string,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  console.log('[triggerEmail] Llamando send-email:', event, 'userId:', userId);
  try {
    let email = (data?.to_email as string) ?? (data?.email as string) ?? undefined;
    if (!email) {
      const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', userId).maybeSingle();
      email = userData?.email;
    }
    if (!email) {
      const msg = 'No email address resolved';
      console.error('[triggerEmail]', msg);
      throw new Error(msg);
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      const msg = 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
      console.warn('[triggerEmail]', msg);
      throw new Error(msg);
    }
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        event,
        user_id: userId,
        to_email: email,
        data,
      }),
    });
    const result = await res.json().catch(() => ({}));
    console.log('[triggerEmail] resultado:', result);
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.error('[triggerEmail] send-email failed:', res.status, bodyText);
      throw new Error(`send-email failed: ${res.status} ${bodyText}`);
    }
  } catch (err) {
    console.error('[triggerEmail] Failed:', err);
    throw err;
  }
}

async function sendTelegramNotification(message: string, userId: string): Promise<void> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id, notification_preferences')
      .eq('id', userId)
      .maybeSingle();
    const tgToken = userRow?.telegram_token;
    const tgChatId = userRow?.telegram_chat_id;
    const prefs = userRow?.notification_preferences as { sim_expired?: { telegram?: boolean } } | null | undefined;
    const sendTg = prefs?.sim_expired?.telegram === true;
    if (tgToken && tgChatId && sendTg) {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: message, parse_mode: 'Markdown' }),
      });
    }
  } catch (tgErr: any) {
    console.warn('[sendTelegramNotification] skipped:', tgErr?.message);
  }
}

async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'activation' | 'subscription' | 'error' | 'warning' | 'success'
) {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
    });
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
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[WEBHOOK] Evento recibido: ${event.type}`);
  console.log('[WEBHOOK] Received event type:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    let sessionMeta = session.metadata || {};

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
      });

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
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('telegram_token, telegram_chat_id, notification_preferences')
          .eq('id', upgradeMeta.user_id)
          .maybeSingle();
        const tgToken = userRow?.telegram_token;
        const tgChatId = userRow?.telegram_chat_id;
        const prefs = userRow?.notification_preferences as { sim_activated?: { telegram?: boolean } } | null | undefined;
        const sendUpgrade = prefs?.sim_activated?.telegram === true;
        if (tgToken && tgChatId && sendUpgrade) {
          const billingLabel = upgradeMeta.is_annual === 'true' ? 'Anual' : 'Mensual';
          const telegramMessage = `⚡ *UPGRADE EXITOSO*
📱 Número: +${phoneNumber}
📦 Plan: ${upgradeMeta.new_plan_name} · ${billingLabel}
📅 Activación: ${now}
✅ Estado: Activo`;
          await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tgChatId, text: telegramMessage, parse_mode: 'Markdown' }),
          });
        }
      } catch (tgErr: any) {
        console.warn('[WEBHOOK] Telegram upgrade notification skipped:', tgErr?.message);
      }
      console.log('[UPGRADE] Telegram enviado OK');

      return res.status(200).json({ received: true });
    }

    const { userId, slot_id: slotId, planName, limit, transactionType, isAnnual } = sessionMeta;
    const phoneFromMeta = (sessionMeta.phoneNumber ?? sessionMeta.phone_number ?? '') as string;

    console.log('[WEBHOOK] metadata:', JSON.stringify(session.metadata));
    console.log(
      `[WEBHOOK INIT] sessionId: ${session.id}, userId: ${userId}, slotId: ${slotId}, planName: ${planName}, isAnnual(meta): ${isAnnual}, phoneFromMeta: ${phoneFromMeta || '(vacío)'}`
    );

    if (!userId || !slotId) {
      console.log(`[WEBHOOK SKIP] Metadata incomplete - userId: ${userId}, slotId: ${slotId}`);
      return res.status(200).json({ received: true });
    }

    const billingTypeForEmail = sessionMeta.isAnnual === 'true' ? 'Anual' : 'Mensual';
    let nextDateForEmail = '';

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
          }
        } catch (subErr) {
          console.warn('[WEBHOOK] No se pudo recuperar suscripción Stripe:', subErr);
        }
      }
      if (!nextDateForEmail) {
        const now = new Date();
        now.setMonth(now.getMonth() + 1);
        nextDateForEmail = now.toLocaleDateString('es-CL');
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
        .select('phone_number')
        .eq('slot_id', slotId)
        .maybeSingle();

      if (slotError) {
        console.error(`[WEBHOOK SLOT ERROR] Failed to fetch slot ${slotId}:`, slotError);
        throw new Error(`Slot lookup failed: ${slotError.message}`);
      }

      if (!slot) {
        console.warn(`[WEBHOOK SLOT MISSING] Slot ${slotId} not found in database`);
      }

      // phone_number para correo y Telegram: metadata primero, luego tabla slots (vital si metadata no lo trajo)
      const resolvedPhoneForNotifications = (phoneFromMeta && String(phoneFromMeta).trim()) || slot?.phone_number || '';

      const { data: exists } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (!exists) {
        const correctAmount = amount;

        console.log(
          `[WEBHOOK DEBUG] planName: ${planName}, isAnnual(meta): ${isAnnual}, billingType: ${billingType}, amount(unit_amount): ${amount}, correctAmount: ${correctAmount}`
        );

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
          created_at: new Date().toISOString(),
        };

        console.log(`[WEBHOOK INSERT] Attempting to insert subscription:`, JSON.stringify(insertData, null, 2));

        const { data: insertedData, error: insertError } = await supabaseAdmin.from('subscriptions').insert(insertData);

        if (insertError) {
          console.error(`[WEBHOOK INSERT ERROR] Failed to insert subscription:`, insertError);
          throw new Error(`Supabase insert error: ${insertError.message}`);
        }

        console.log(`[WEBHOOK INSERT SUCCESS] Subscription inserted successfully:`, insertedData);
      }

      await supabaseAdmin.from('slots').update({
        status: 'ocupado',
        assigned_to: userId,
        plan_type: planName,
      }).eq('slot_id', slotId);

      const trialMsg = trialEnd
        ? `Tu trial gratuito de 7 días comienza ahora. El primer cobro será el ${new Date(trialEnd).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}.`
        : `Tu línea ${slot?.phone_number || ''} está activa y lista para recibir SMS.`;

      await createNotification(userId, '🚀 ¡Línea activada!', trialMsg, 'activation');

    } catch (err: any) {
      console.error('[WEBHOOK ERROR]:', err.message);
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

    try {
      await triggerEmail('purchase_success', userId, {
        plan: planName ?? '',
        phone_number: phoneForEmail,
        billing_type: billingTypeForEmail,
        next_date: nextDateForEmail,
        to: session.customer_details?.email ?? '',
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

    // ── Telegram: usar phone_number de DB/metadata para mensaje tipo "NUEVA COMPRA: SIM +56 9 5319 4056 activada"
    try {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('telegram_token, telegram_chat_id, notification_preferences')
        .eq('id', userId)
        .maybeSingle();

      const tgToken = userRow?.telegram_token;
      const tgChatId = userRow?.telegram_chat_id;
      const prefs = userRow?.notification_preferences as { sim_activated?: { telegram?: boolean } } | null | undefined;
      const sendSimActivated = prefs?.sim_activated?.telegram === true;

      const telegramPhone = phoneForEmail || phoneFromMeta || '';
      const displayPhone = telegramPhone ? (telegramPhone.startsWith('+') ? telegramPhone : `+${telegramPhone}`) : slotId || '';

      if (tgToken && tgChatId && sendSimActivated) {
        const escapeHtml = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const planNameEscaped = escapeHtml(planName || '');

        const telegramMessage = `<b>🚀 NUEVA COMPRA: SIM ${displayPhone} activada</b>
━━━━━━━━━━━━━━━━━━
📱 <b>Número:</b> <code>${escapeHtml(displayPhone)}</code>
💎 <b>Plan:</b> ${planNameEscaped}
✅ <b>Estado:</b> Operativo`;

        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: telegramMessage,
            parse_mode: 'HTML',
          }),
        });

        if (!tgRes.ok) {
          const errBody = await tgRes.json().catch(() => ({}));
          console.warn('[WEBHOOK] Telegram notification failed:', errBody?.description || tgRes.statusText);
        }
      }
    } catch (tgErr: any) {
      console.warn('[WEBHOOK] Telegram send skipped or failed:', tgErr?.message);
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

      if (!sub) return res.status(200).json({ received: true });

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
          const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('telegram_token, telegram_chat_id, notification_preferences')
            .eq('id', sub.user_id)
            .maybeSingle();

          const tgToken = userRow?.telegram_token;
          const tgChatId = userRow?.telegram_chat_id;
          const prefs = userRow?.notification_preferences as { sim_expired?: { telegram?: boolean } } | null | undefined;
          const sendTg = prefs?.sim_expired?.telegram === true;

          if (tgToken && tgChatId && sendTg) {
            const telegramMessage = `<b>⚠️ SUSCRIPCIÓN CANCELADA</b>\n━━━━━━━━━━━━━━━━━━\n💎 <b>Plan:</b> ${sub.plan_name ?? ''}\n📅 <b>Activo hasta:</b> ${new Date((subscription.current_period_end ?? 0) * 1000).toLocaleDateString('es-CL')}\n\nPuedes reactivar tu plan cuando quieras.`;
            await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: tgChatId, text: telegramMessage, parse_mode: 'HTML' }),
            });
          }
        } catch (tgErr: any) {
          console.warn('[WEBHOOK] Telegram cancelación skipped:', tgErr?.message);
        }
      }
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] customer.subscription.updated:', err.message);
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
      if (sub?.user_id) {
        await triggerEmail('purchase_success', sub.user_id, {
          plan: sub.plan_name ?? (subscription.metadata?.plan_name as string) ?? '',
        });
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

    if (!stripeSubId) return res.status(200).json({ received: true });

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) return res.status(200).json({ received: true });

      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('id', sub.id);

      await createNotification(
        sub.user_id,
        '🔴 Pago fallido — Acción requerida',
        `No pudimos cobrar tu plan ${sub.plan_name}. Actualiza tu método de pago en Billing para no perder el acceso.`,
        'error'
      );

      await triggerEmail('invoice_failed', sub.user_id, {
        plan: sub.plan_name ?? '',
        amount: ((invoice.amount_due ?? 0) / 100).toFixed(2),
        to: invoice.customer_email ?? '',
      });
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] invoice.payment_failed:', err.message);
    }
  }

  else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason !== 'subscription_cycle' &&
      invoice.billing_reason !== 'subscription_update') {
      return res.status(200).json({ received: true });
    }

    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!stripeSubId) return res.status(200).json({ received: true });

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, status, slot_id, phone_number')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) return res.status(200).json({ received: true });

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

      const periodEndMs = (invoice.period_end ?? 0) * 1000;
      const next_date = new Date(periodEndMs).toLocaleDateString('es-CL');

      await triggerEmail('invoice_paid', sub.user_id, {
        plan: sub.plan_name ?? '',
        amount: ((invoice.amount_paid ?? 0) / 100).toFixed(2),
        next_date,
        phone_number: phoneNumber || sub.slot_id || '',
        slot_id: sub.slot_id ?? '',
        to: invoice.customer_email ?? '',
      });
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] invoice.payment_succeeded:', err.message);
    }
  }

  else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const subId = subscription.id;

    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, plan_name, slot_id')
        .eq('stripe_subscription_id', subId)
        .maybeSingle();

      if (!sub) {
        console.log('[WEBHOOK] Sub deleted no encontrada en Supabase, ignorando');
        return res.status(200).json({ received: true });
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
        return res.status(200).json({ received: true });
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
        'error'
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

      const telegramMessage = `❌ *CANCELACIÓN*
📱 Número: +${slotData?.phone_number || slotId}
📦 Plan: ${slotData?.plan_type ?? sub.plan_name ?? ''}
📅 Cancelación: ${now}
🔴 Estado: Cancelado`;
      await sendTelegramNotification(telegramMessage, userId);
      console.log('[CANCEL] Telegram enviado OK');
      // ────────────────────────────────────────────────────────────
    } catch (err: any) {
      console.error('[WEBHOOK ERROR] customer.subscription.deleted:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}
