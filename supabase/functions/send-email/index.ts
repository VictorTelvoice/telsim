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

// ─── Iconos y estilo del info box por evento ───────────────────────────────────

const eventIcons: Record<EventType, string> = {
  purchase_success: '🎉',
  subscription_cancelled: '😔',
  invoice_paid: '✅',
  invoice_failed: '⚠️',
  scheduled_event: '🔔',
  low_credit: '📉',
};

const eventInfoBoxBg: Partial<Record<EventType, string>> = {
  invoice_failed: '#fff5f5',
  low_credit: '#fffbeb',
};
const DEFAULT_INFO_BG = '#f0f4ff';

// ─── Traducciones ─────────────────────────────────────────────────────────────

const i18n = {
  es: {
    purchase_success: {
      subject: '¡Bienvenido a Telsim! Tu suscripción está activa 🎉',
      title: '¡Suscripción activada!',
      body: (d: Record<string, unknown>) =>
        `Tu plan <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> está activo. Ya puedes acceder a tu número SIM y comenzar a recibir SMS.`,
      cta: 'Ir al Dashboard',
      infoLeftLabel: 'PLAN ACTIVO',
      infoRightLabel: 'ESTADO',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: () => '✓ Activo',
    },
    subscription_cancelled: {
      subject: 'Tu suscripción Telsim ha sido cancelada',
      title: 'Suscripción cancelada',
      body: (d: Record<string, unknown>) =>
        `Tu suscripción al plan <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> ha sido cancelada. Tu número estará activo hasta el <strong>${d.end_date ?? ''}</strong>.`,
      cta: 'Ver planes',
      infoLeftLabel: 'PLAN',
      infoRightLabel: 'FECHA VENCIMIENTO',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: (d: Record<string, unknown>) => String(d.end_date ?? ''),
    },
    invoice_paid: {
      subject: 'Pago recibido — Telsim',
      title: 'Pago recibido',
      body: (d: Record<string, unknown>) =>
        `Hemos recibido tu pago de <strong style="color:#1d4ed8;">$${d.amount ?? ''} USD</strong> para el plan <strong>${d.plan ?? ''}</strong>. Tu suscripción se ha renovado hasta el <strong>${d.next_date ?? ''}</strong>.`,
      cta: 'Ver facturación',
      infoLeftLabel: 'MONTO',
      infoRightLabel: 'PRÓXIMO COBRO',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
      infoRightValue: (d: Record<string, unknown>) => String(d.next_date ?? ''),
    },
    invoice_failed: {
      subject: '⚠️ Problema con tu pago — Telsim',
      title: 'Pago fallido',
      body: (d: Record<string, unknown>) =>
        `Hubo un problema al cobrar <strong style="color:#dc2626;">$${d.amount ?? ''} USD</strong>. Por favor actualiza tu método de pago para evitar interrupciones.`,
      cta: 'Actualizar método de pago',
      infoLeftLabel: 'MONTO',
      infoRightLabel: 'ACCIÓN',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
      infoRightValue: () => 'Actualizar pago',
    },
    scheduled_event: {
      subject: 'Recordatorio: Tu suscripción Telsim se renueva pronto',
      title: 'Recordatorio de renovación',
      body: (d: Record<string, unknown>) =>
        `Tu plan <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> se renovará el <strong>${d.renewal_date ?? ''}</strong> por <strong>$${d.amount ?? ''} USD</strong>.`,
      cta: 'Ver suscripción',
      infoLeftLabel: 'FECHA',
      infoRightLabel: 'MONTO',
      infoLeftValue: (d: Record<string, unknown>) => String(d.renewal_date ?? ''),
      infoRightValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
    },
    low_credit: {
      subject: '⚠️ Crédito bajo en tu cuenta Telsim',
      title: 'Saldo bajo',
      body: (d: Record<string, unknown>) =>
        `Tu saldo actual es de <strong style="color:#1d4ed8;">$${d.balance ?? ''} USD</strong>. Recarga tu cuenta para mantener tu servicio activo.`,
      cta: 'Recargar saldo',
      infoLeftLabel: 'SALDO ACTUAL',
      infoRightLabel: 'ACCIÓN',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.balance ?? ''} USD`,
      infoRightValue: () => 'Recargar',
    },
  },
  en: {
    purchase_success: {
      subject: 'Welcome to Telsim! Your subscription is active 🎉',
      title: 'Subscription activated!',
      body: (d: Record<string, unknown>) =>
        `Your <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> plan is now active. You can access your SIM number and start receiving SMS messages.`,
      cta: 'Go to Dashboard',
      infoLeftLabel: 'ACTIVE PLAN',
      infoRightLabel: 'STATUS',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: () => '✓ Active',
    },
    subscription_cancelled: {
      subject: 'Your Telsim subscription has been cancelled',
      title: 'Subscription cancelled',
      body: (d: Record<string, unknown>) =>
        `Your <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> plan subscription has been cancelled. Your number will remain active until <strong>${d.end_date ?? ''}</strong>.`,
      cta: 'View plans',
      infoLeftLabel: 'PLAN',
      infoRightLabel: 'END DATE',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: (d: Record<string, unknown>) => String(d.end_date ?? ''),
    },
    invoice_paid: {
      subject: 'Payment received — Telsim',
      title: 'Payment received',
      body: (d: Record<string, unknown>) =>
        `We received your payment of <strong style="color:#1d4ed8;">$${d.amount ?? ''} USD</strong> for the <strong>${d.plan ?? ''}</strong> plan. Your subscription has been renewed until <strong>${d.next_date ?? ''}</strong>.`,
      cta: 'View billing',
      infoLeftLabel: 'AMOUNT',
      infoRightLabel: 'NEXT CHARGE',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
      infoRightValue: (d: Record<string, unknown>) => String(d.next_date ?? ''),
    },
    invoice_failed: {
      subject: '⚠️ Payment issue — Telsim',
      title: 'Payment failed',
      body: (d: Record<string, unknown>) =>
        `There was a problem charging <strong style="color:#dc2626;">$${d.amount ?? ''} USD</strong>. Please update your payment method to avoid service interruptions.`,
      cta: 'Update payment method',
      infoLeftLabel: 'AMOUNT',
      infoRightLabel: 'ACTION',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
      infoRightValue: () => 'Update payment',
    },
    scheduled_event: {
      subject: 'Reminder: Your Telsim subscription renews soon',
      title: 'Renewal reminder',
      body: (d: Record<string, unknown>) =>
        `Your <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> plan will renew on <strong>${d.renewal_date ?? ''}</strong> for <strong>$${d.amount ?? ''} USD</strong>.`,
      cta: 'View subscription',
      infoLeftLabel: 'DATE',
      infoRightLabel: 'AMOUNT',
      infoLeftValue: (d: Record<string, unknown>) => String(d.renewal_date ?? ''),
      infoRightValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
    },
    low_credit: {
      subject: '⚠️ Low balance on your Telsim account',
      title: 'Low balance',
      body: (d: Record<string, unknown>) =>
        `Your current balance is <strong style="color:#1d4ed8;">$${d.balance ?? ''} USD</strong>. Top up your account to keep your service running.`,
      cta: 'Top up balance',
      infoLeftLabel: 'CURRENT BALANCE',
      infoRightLabel: 'ACTION',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.balance ?? ''} USD`,
      infoRightValue: () => 'Top up',
    },
  },
};

// ─── Template HTML (diseño profesional unificado) ──────────────────────────────

function buildHtml(params: {
  icon: string;
  title: string;
  body: string;
  infoBoxBg: string;
  infoLeftLabel: string;
  infoLeftValue: string;
  infoRightLabel: string;
  infoRightValue: string;
  ctaText: string;
  ctaUrl: string;
  footerText: string;
  year: number;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:#1d4ed8;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 20px;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">TELSIM</span>
          </div>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#ffffff;padding:40px 40px 32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:48px;">${params.icon}</span>
          </div>
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;text-align:center;">
            ${params.title}
          </h1>
          <p style="margin:0 0 24px;font-size:16px;color:#6b7280;text-align:center;line-height:1.6;">
            ${params.body}
          </p>

          <!-- INFO BOX -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${params.infoBoxBg};border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">${params.infoLeftLabel}</td>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;text-align:right;">${params.infoRightLabel}</td>
                </tr>
                <tr>
                  <td style="font-size:18px;font-weight:700;color:#1d4ed8;">${params.infoLeftValue}</td>
                  <td style="font-size:14px;font-weight:600;color:#16a34a;text-align:right;">${params.infoRightValue}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA BUTTON -->
          <div style="text-align:center;">
            <a href="${params.ctaUrl}"
               style="display:inline-block;background:#1d4ed8;color:#fff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
              ${params.ctaText} →
            </a>
          </div>
        </td></tr>

        <!-- DIVIDER -->
        <tr><td style="background:#ffffff;padding:0 40px;">
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;">
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
            ${params.footerText}
          </p>
          <p style="margin:0;font-size:13px;color:#9ca3af;">
            © ${params.year} Telsim · <a href="https://telsim.io" style="color:#1d4ed8;text-decoration:none;">telsim.io</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
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
      const { data: user } = await supabase
        .from('users')
        .select('email, language')
        .eq('id', user_id)
        .single();

      if (user) {
        toEmail = toEmail ?? user.email;
        lang = (user.language as Language) ?? lang;
      } else {
        console.warn('[send-email] User not found for id:', user_id, '- using fallback email');
        toEmail = toEmail ?? (data.to as string) ?? null;
      }
    }

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'No email address resolved' }), { status: 400 });
    }

    // Construir email
    const ev = event as EventType;
    const t = i18n[lang][ev];
    if (!t) {
      return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), { status: 400 });
    }

    const footerText =
      lang === 'es'
        ? 'Recibes este email porque tienes una cuenta en Telsim.'
        : 'You receive this email because you have a Telsim account.';

    const html = buildHtml({
      icon: eventIcons[ev],
      title: t.title,
      body: t.body(data),
      infoBoxBg: eventInfoBoxBg[ev] ?? DEFAULT_INFO_BG,
      infoLeftLabel: t.infoLeftLabel,
      infoLeftValue: t.infoLeftValue(data),
      infoRightLabel: t.infoRightLabel,
      infoRightValue: t.infoRightValue(data),
      ctaText: t.cta,
      ctaUrl: ctaUrls[ev],
      footerText,
      year: new Date().getFullYear(),
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
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@telsim.io?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
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
