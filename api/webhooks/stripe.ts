import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { triggerEmail, sendTelegramNotification } from '../_helpers/notifications';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    // Primero resolver metadata, que en upgrades puede venir desde la suscripción
    let meta = session.metadata || {};

    // Si no hay flag de upgrade en session.metadata, intentar leerla desde la suscripción
    if (!meta.upgrade && session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        meta = subscription.metadata || meta;
      } catch (e: any) {
        console.warn('[WEBHOOK] No se pudo leer metadata desde subscription:', e?.message);
      }
    }

    // Flujo especial de UPGRADE via Checkout
    if (meta.upgrade === 'true' && meta.slot_id && meta.user_id) {
      console.log('[UPGRADE] Iniciando procesamiento upgrade:', JSON.stringify({
        slot_id: meta.slot_id,
        user_id: meta.user_id,
        new_plan: meta.new_plan_name,
        old_sub: meta.old_subscription_id,
      }));
      const newSubId = session.subscription as string;

      // Cancelar TODAS las subs active/trialing del slot, excepto la nueva
      const { data: oldSubs } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('slot_id', meta.slot_id)
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

      // Insertar nueva sub en Supabase (con monthly_limit y amount correctos)
      await supabaseAdmin.from('subscriptions').insert({
        user_id: meta.user_id,
        slot_id: meta.slot_id,
        stripe_subscription_id: newSubId,
        plan_name: meta.new_plan_name,
        monthly_limit: PLAN_LIMITS[meta.new_plan_name as string] ?? 150,
        billing_type: billingTypeFromStripe,
        amount,
        status: 'active',
      });

      // Actualizar el slot (plan_type y sms_limit para que la UI muestre el límite correcto)
      await supabaseAdmin
        .from('slots')
        .update({
          plan_type: meta.new_plan_name,
          sms_limit: SMS_BY_PLAN[meta.new_plan_name as string] ?? 150,
        })
        .eq('slot_id', meta.slot_id);

      console.log('[WEBHOOK] Upgrade complete for slot', meta.slot_id);

      // Email de upgrade
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email, nombre')
        .eq('id', meta.user_id)
        .maybeSingle();

      if (userData?.email) {
        await triggerEmail('subscription_activated', meta.user_id as string, {
          plan_name: meta.new_plan_name,
          billing_type: meta.is_annual === 'true' ? 'Anual' : 'Mensual',
          slot_id: meta.slot_id,
          email: userData.email,
        });
        console.log('[UPGRADE] Email enviado a:', userData.email);
      }

      // Telegram — mismo patrón que compra nueva (inline fetch a api.telegram.org)
      const phoneNumber = meta.phone_number || meta.slot_id;
      const now = new Date().toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      try {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('telegram_token, telegram_chat_id, notification_preferences')
          .eq('id', meta.user_id)
          .maybeSingle();
        const tgToken = userRow?.telegram_token;
        const tgChatId = userRow?.telegram_chat_id;
        const prefs = userRow?.notification_preferences as { sim_activated?: { telegram?: boolean } } | null | undefined;
        const sendUpgrade = prefs?.sim_activated?.telegram === true;
        if (tgToken && tgChatId && sendUpgrade) {
          const billingLabel = meta.is_annual === 'true' ? 'Anual' : 'Mensual';
          const telegramMessage = `⚡ *UPGRADE EXITOSO*
📱 Número: +${phoneNumber}
📦 Plan: ${meta.new_plan_name} · ${billingLabel}
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

    const { userId, slot_id: slotId, planName, limit, transactionType, isAnnual } = session.metadata || {};

    console.log('[WEBHOOK] metadata:', JSON.stringify(session.metadata));
    console.log(
      `[WEBHOOK INIT] sessionId: ${session.id}, userId: ${userId}, slotId: ${slotId}, planName: ${planName}, isAnnual(meta): ${isAnnual}`
    );

    if (!userId || !slotId) {
      console.log(`[WEBHOOK SKIP] Metadata incomplete - userId: ${userId}, slotId: ${slotId}`);
      return res.status(200).json({ received: true });
    }

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
        } catch (subErr) {
          console.warn('[WEBHOOK] No se pudo recuperar suscripción Stripe:', subErr);
        }
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
          phone_number: slot?.phone_number,
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

    // FUERA del try/catch — siempre se ejecuta:
    await triggerEmail('purchase_success', userId, {
      plan: planName ?? '',
      to: session.customer_details?.email ?? '',
    });

    // ── Telegram (independiente) ───────────────────────────────────
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

      if (tgToken && tgChatId && sendSimActivated) {
        const { data: slotForTg } = await supabaseAdmin
          .from('slots')
          .select('phone_number')
          .eq('slot_id', slotId)
          .maybeSingle();
        const escapeHtml = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const phoneNumber = escapeHtml(slotForTg?.phone_number || '');
        const planNameEscaped = escapeHtml(planName || '');

        const telegramMessage = `<b>🚀 ¡NUEVA LÍNEA ACTIVADA!</b>
━━━━━━━━━━━━━━━━━━
📱 <b>Número:</b> <code>${phoneNumber}</code>
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
        const meta = subscription.metadata || {};
        const slotId = meta.slot_id;
        const newPlanName = meta.planName;
        const newMonthlyLimit = meta.monthlyLimit ? parseInt(meta.monthlyLimit) : undefined;

        if (slotId && newPlanName) {
          // Actualizar subscriptions y slots en Supabase
          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan_name: newPlanName,
              monthly_limit: newMonthlyLimit,
              status: subscription.status,
              billing_type: meta.isAnnual === 'true' ? 'annual' : 'monthly',
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
        .select('id, user_id, plan_name, status')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle();

      if (!sub) return res.status(200).json({ received: true });

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

      await triggerEmail('invoice_paid', sub.user_id, {
        plan: sub.plan_name ?? '',
        amount: ((invoice.amount_paid ?? 0) / 100).toFixed(2),
        next_date: new Date((invoice.period_end ?? 0) * 1000).toLocaleDateString('es-CL'),
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

      if (userData?.email && userId) {
        await triggerEmail('subscription_cancelled', userId, {
          plan: sub.plan_name ?? '',
          plan_name: slotData?.plan_type ?? sub.plan_name ?? '',
          end_date: endDate,
          slot_id: slotId,
          email: userData.email,
          to_email: userData.email,
        });
        console.log('[CANCEL] Email enviado a:', userData.email);
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
