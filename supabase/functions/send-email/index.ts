// TELSIM · Edge Function: send-email
// Envía emails transaccionales via Resend según el evento y el idioma del usuario.
//
// Eventos soportados:
//   purchase_success   → Compra exitosa
//   subscription_cancelled → Cancelación de suscripción
//   invoice_paid       → Factura pagada
//   invoice_failed     → Pago fallido
//   scheduled_event    → Evento programado (renovación próxima, etc.)
//   low_credit         → Crédito bajo
//
// Body esperado:
// {
//   event: string,
//   user_id?: string,       // si se provee, se busca email/idioma en Supabase
//   to?: string,            // override de email destino
//   language?: 'es' | 'en', // override de idioma
//   data?: Record<string, any> // datos del evento (plan, amount, date, etc.)
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM = 'TELSIM <noreply@telsim.io>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Language = 'es' | 'en';

type EventType =
  | 'purchase_success'
  | 'subscription_cancelled'
  | 'invoice_paid'
  | 'invoice_failed'
  | 'scheduled_event'
  | 'low_credit';

interface EmailPayload {
  event: EventType;
  user_id?: string;
  to?: string;
  language?: Language;
  data?: Record<string, unknown>;
}

// ─── Traducciones ─────────────────────────────────────────────────────────────

const i18n = {
  es: {
    purchase_success: {
      subject: '¡Bienvenido a Telsim! Tu suscripción está activa 🎉',
      title: '¡Suscripción activada!',
      body: (d: Record<string, unknown>) =>
        `Tu plan <strong>${d.plan ?? ''}</strong> está activo. 
         Ya puedes acceder a tu número SIM y comenzar a recibir SMS.`,
      cta: 'Ir al Dashboard',
    },
    subscription_cancelled: {
      subject: 'Tu suscripción Telsim ha sido cancelada',
      title: 'Suscripción cancelada',
      body: (d: Record<string, unknown>) =>
        `Tu suscripción al plan <strong>${d.plan ?? ''}</strong> ha sido cancelada. 
         Tu número estará activo hasta el <strong>${d.end_date ?? ''}</strong>.`,
      cta: 'Reactivar suscripción',
    },
    invoice_paid: {
      subject: 'Pago recibido — Telsim',
      title: 'Pago procesado exitosamente',
      body: (d: Record<string, unknown>) =>
        `Hemos recibido tu pago de <strong>$${d.amount ?? ''} USD</strong> 
         para el plan <strong>${d.plan ?? ''}</strong>. 
         Tu suscripción se ha renovado hasta el <strong>${d.next_date ?? ''}</strong>.`,
      cta: 'Ver factura',
    },
    invoice_failed: {
      subject: '⚠️ Problema con tu pago — Telsim',
      title: 'No pudimos procesar tu pago',
      body: (d: Record<string, unknown>) =>
        `Hubo un problema al cobrar <strong>$${d.amount ?? ''} USD</strong>. 
         Por favor actualiza tu método de pago para evitar interrupciones en tu servicio.`,
      cta: 'Actualizar método de pago',
    },
    scheduled_event: {
      subject: 'Recordatorio: Tu suscripción Telsim se renueva pronto',
      title: 'Renovación próxima',
      body: (d: Record<string, unknown>) =>
        `Tu plan <strong>${d.plan ?? ''}</strong> se renovará el <strong>${d.renewal_date ?? ''}</strong> 
         por <strong>$${d.amount ?? ''} USD</strong>.`,
      cta: 'Gestionar suscripción',
    },
    low_credit: {
      subject: '⚠️ Crédito bajo en tu cuenta Telsim',
      title: 'Tu crédito está bajo',
      body: (d: Record<string, unknown>) =>
        `Tu saldo actual es de <strong>$${d.balance ?? ''} USD</strong>. 
         Recarga tu cuenta para mantener tu servicio activo sin interrupciones.`,
      cta: 'Recargar crédito',
    },
  },
  en: {
    purchase_success: {
      subject: 'Welcome to Telsim! Your subscription is active 🎉',
      title: 'Subscription activated!',
      body: (d: Record<string, unknown>) =>
        `Your <strong>${d.plan ?? ''}</strong> plan is now active. 
         You can access your SIM number and start receiving SMS messages.`,
      cta: 'Go to Dashboard',
    },
    subscription_cancelled: {
      subject: 'Your Telsim subscription has been cancelled',
      title: 'Subscription cancelled',
      body: (d: Record<string, unknown>) =>
        `Your <strong>${d.plan ?? ''}</strong> plan subscription has been cancelled. 
         Your number will remain active until <strong>${d.end_date ?? ''}</strong>.`,
      cta: 'Reactivate subscription',
    },
    invoice_paid: {
      subject: 'Payment received — Telsim',
      title: 'Payment successfully processed',
      body: (d: Record<string, unknown>) =>
        `We received your payment of <strong>$${d.amount ?? ''} USD</strong> 
         for the <strong>${d.plan ?? ''}</strong> plan. 
         Your subscription has been renewed until <strong>${d.next_date ?? ''}</strong>.`,
      cta: 'View invoice',
    },
    invoice_failed: {
      subject: '⚠️ Payment issue — Telsim',
      title: "We couldn't process your payment",
      body: (d: Record<string, unknown>) =>
        `There was a problem charging <strong>$${d.amount ?? ''} USD</strong>. 
         Please update your payment method to avoid service interruptions.`,
      cta: 'Update payment method',
    },
    scheduled_event: {
      subject: 'Reminder: Your Telsim subscription renews soon',
      title: 'Upcoming renewal',
      body: (d: Record<string, unknown>) =>
        `Your <strong>${d.plan ?? ''}</strong> plan will renew on <strong>${d.renewal_date ?? ''}</strong> 
         for <strong>$${d.amount ?? ''} USD</strong>.`,
      cta: 'Manage subscription',
    },
    low_credit: {
      subject: '⚠️ Low balance on your Telsim account',
      title: 'Your balance is running low',
      body: (d: Record<string, unknown>) =>
        `Your current balance is <strong>$${d.balance ?? ''} USD</strong>. 
         Top up your account to keep your service running without interruptions.`,
      cta: 'Top up balance',
    },
  },
};

// ─── Template HTML ─────────────────────────────────────────────────────────────

function buildHtml(params: {
  title: string;
  body: string;
  cta: string;
  ctaUrl: string;
  lang: Language;
}): string {
  const footer =
    params.lang === 'es'
      ? 'Recibes este email porque tienes una cuenta en Telsim. <a href="https://telsim.io/dashboard" style="color:#6b7280;">Gestionar preferencias</a>'
      : 'You receive this email because you have a Telsim account. <a href="https://telsim.io/dashboard" style="color:#6b7280;">Manage preferences</a>';

  return `<!DOCTYPE html>
<html lang="${params.lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${params.title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:0 0 24px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1d4ed8;border-radius:14px;padding:10px 14px;">
                    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">TELSIM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                ${params.title}
              </h1>
              <p style="margin:0 0 32px 0;font-size:15px;color:#475569;line-height:1.7;">
                ${params.body}
              </p>
              <a href="${params.ctaUrl}"
                 style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;
                        padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
                ${params.cta} →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
              ${footer}<br/>
              © ${new Date().getFullYear()} Telsim · <a href="https://telsim.io" style="color:#94a3b8;">telsim.io</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── CTA URLs por evento ───────────────────────────────────────────────────────

const ctaUrls: Record<EventType, string> = {
  purchase_success: 'https://telsim.io/dashboard',
  subscription_cancelled: 'https://telsim.io/dashboard/planes',
  invoice_paid: 'https://telsim.io/dashboard/facturacion',
  invoice_failed: 'https://telsim.io/dashboard/facturacion',
  scheduled_event: 'https://telsim.io/dashboard/facturacion',
  low_credit: 'https://telsim.io/dashboard/facturacion',
};

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { event, user_id, data = {} } = payload;

    if (!event) {
      return new Response(JSON.stringify({ error: 'event is required' }), { status: 400 });
    }

    // Resolver email e idioma del usuario desde Supabase si viene user_id
    let toEmail = payload.to;
    let lang: Language = payload.language ?? 'es';

    if (user_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: user, error } = await supabase
        .from('users')
        .select('email, language')
        .eq('id', user_id)
        .single();

      if (error || !user) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
      }

      toEmail = toEmail ?? user.email;
      lang = (user.language as Language) ?? lang;
    }

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'No email address resolved' }), { status: 400 });
    }

    // Construir email
    const t = i18n[lang][event as EventType];
    if (!t) {
      return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), { status: 400 });
    }

    const html = buildHtml({
      title: t.title,
      body: t.body(data),
      cta: t.cta,
      ctaUrl: ctaUrls[event as EventType],
      lang,
    });

    // Enviar via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [toEmail],
        subject: t.subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', resendData);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: resendData }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
