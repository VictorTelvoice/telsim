/**
 * TELSIM · POST /api/admin
 *
 * Toda la lógica de administración en una sola ruta.
 * Body: { action: 'portal' | 'payment-method' | 'notify-ticket-reply' | 'upgrade' | 'cancel' | 'send-test' | 'verify-bot', ...params }
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { triggerEmail, sendTelegramNotification } from './_helpers/notifications';
import { logEvent } from './_helpers/logger';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
        const { customerId, userId, returnUrl } = req.body;
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
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'ID de usuario requerido.' });
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
        if (!tgRes.ok) {
          return res.status(200).json({ ok: true, notified: false });
        }
        return res.status(200).json({ ok: true, notified: true });
      }

      case 'cancel': {
        const { subscriptionId } = req.body;
        if (!subscriptionId) return res.status(400).json({ error: 'Missing subscriptionId' });
        await stripe.subscriptions.cancel(subscriptionId);
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, slot_id, plan_name')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle();

        if (sub) {
          await supabaseAdmin.from('subscriptions').update({ status: 'canceled' }).eq('id', sub.id);
          const { data: userData } = await supabaseAdmin.from('users').select('email').eq('id', sub.user_id).maybeSingle();
          const { data: slotData } = await supabaseAdmin.from('slots').select('phone_number, plan_type').eq('slot_id', sub.slot_id).maybeSingle();
          const now = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          if (userData?.email) {
            await triggerEmail('subscription_cancelled', sub.user_id, {
              plan: sub.plan_name ?? '',
              plan_name: slotData?.plan_type ?? sub.plan_name ?? '',
              end_date: new Date().toLocaleDateString('es-CL'),
              slot_id: sub.slot_id,
              phone_number: slotData?.phone_number ?? sub.slot_id ?? '',
              email: userData.email,
              to_email: userData.email,
            });
          }
          await sendTelegramNotification(
            `❌ *CANCELACIÓN*\n📱 Número: +${slotData?.phone_number || sub.slot_id}\n📦 Plan: ${slotData?.plan_type ?? sub.plan_name ?? ''}\n📅 Fecha: ${now}\n🔴 Estado: Cancelado`,
            sub.user_id
          );
        }
        return res.status(200).json({ ok: true });
      }

      case 'upgrade': {
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

        const session = await stripe.checkout.sessions.create({
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
        });

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
        if (!tgRes.ok) {
          return res.status(400).json({
            error: result.description || 'Error al enviar el mensaje a Telegram.',
            code: 'TELEGRAM_ERROR',
          });
        }
        return res.status(200).json({ ok: true });
      }

      case 'send-notification-test': {
        try {
          const { channel, content, userId, isTest } = req.body;

          if (!userId || !channel || typeof content !== 'string') {
            return res.status(400).json({ error: 'Faltan parámetros (channel, content, userId).', code: 'MISSING_PARAMS' });
          }

          // 1. Buscar usuario en la DB (mismos tokens que usa el sistema real)
          const { data: userRow, error: userError } = await supabaseAdmin
            .from('users')
            .select('email, telegram_token, telegram_chat_id')
            .eq('id', userId)
            .maybeSingle();

          console.log('[DEBUG TEST]', {
            channel,
            userId,
            hasToken: !!(userRow as { telegram_token?: string })?.telegram_token,
            hasChatId: !!(userRow as { telegram_chat_id?: string })?.telegram_chat_id,
            hasEmail: !!(userRow as { email?: string })?.email,
          });

          if (userError || !userRow) {
            return res.status(400).json({ error: 'Usuario no encontrado en la base de datos.', code: 'USER_NOT_FOUND' });
          }

          // --- LÓGICA TELEGRAM (usa telegram_token y telegram_chat_id de la fila del usuario, sin env vars) ---
          if (channel === 'telegram') {
            const token = (userRow as { telegram_token?: string }).telegram_token?.trim();
            const chatId = (userRow as { telegram_chat_id?: string }).telegram_chat_id?.trim();

            if (!token || !chatId) {
              return res.status(400).json({
                error: 'Tu usuario no tiene configurado un Bot de Telegram en Ajustes.',
                code: 'TELEGRAM_NOT_CONFIGURED',
              });
            }

            const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: content,
                parse_mode: 'Markdown',
              }),
            });

            const tgResult = await tgRes.json();
            if (!tgRes.ok) {
              const errMsg = (tgResult && tgResult.description) || 'Error de Telegram';
              console.error('[ADMIN TEST ERROR] Telegram:', errMsg, tgResult);
              return res.status(400).json({
                error: errMsg,
                code: 'TELEGRAM_ERROR',
              });
            }

            return res.status(200).json({ success: true, message: '✅ Test de Telegram enviado.' });
          }

          // --- LÓGICA EMAIL (email del usuario + triggerEmail con content en data.message) ---
          if (channel === 'email') {
            const toEmail = (userRow as { email?: string }).email;
            if (!toEmail) {
              return res.status(400).json({ error: 'Tu usuario no tiene email configurado.', code: 'NO_EMAIL' });
            }

            const testData = {
              nombre: 'CEO Test',
              email: toEmail,
              phone: '+56900000000',
              plan: 'Plan Pro (Test)',
              amount: '$39.90',
              monto: '$39.90',
              message: content,
              content: content,
            };

            await triggerEmail('purchase_success', userId, testData);

            return res.status(200).json({ success: true, message: '✅ Test de Email enviado a tu correo.' });
          }

          return res.status(400).json({ error: 'Canal no soportado.' });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Error en el servidor';
          console.error('[ADMIN TEST ERROR]', err);
          return res.status(500).json({
            error: message,
            code: 'SERVER_ERROR',
          });
        }
      }

      case 'list-notification-history': {
        const { userId: reqUserId, emailSearch, eventSearch, filterUserId, limit: limitParam } = req.body || {};
        if (!reqUserId || (reqUserId || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
          return res.status(403).json({ error: 'Solo el administrador puede consultar el historial.', code: 'FORBIDDEN' });
        }
        const limit = Math.min(Math.max(Number(limitParam) || 100, 1), 500);
        let query = supabaseAdmin
          .from('notification_history')
          .select('id, created_at, user_id, recipient, channel, event, status, error_message, content_preview')
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
          query = query.ilike('event', `%${String(eventSearch).trim()}%`);
        }
        const { data: rows, error } = await query;
        if (error) {
          return res.status(500).json({ error: error.message, code: 'DB_ERROR' });
        }
        const withUserEmail = (rows || []).map((r: { user_id?: string; recipient: string }) => ({ ...r }));
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
        // Siempre leer el valor REAL de admin_settings en la base de datos (no confiar en estado del cliente)
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

      default:
        return res.status(400).json({
          error: 'Action no válida. Use: portal, payment-method, notify-ticket-reply, upgrade, cancel, send-test, verify-bot, send-notification-test, simulate-critical-alert.',
        });
    }
  } catch (err: any) {
    console.error('[ADMIN]', action, err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno.' });
  }
}
