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
// Service role key bypasea RLS para poder leer email desde public.users
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Language = 'es' | 'en';

type EventType =
  | 'purchase_success'
  | 'subscription_activated'
  | 'subscription_cancelled'
  | 'invoice_paid'
  | 'invoice_failed'
  | 'scheduled_event'
  | 'low_credit';

interface EmailPayload {
  event: EventType;
  user_id?: string;
  email?: string;
  to?: string;
  language?: Language;
  data?: Record<string, unknown>;
}

// ─── Iconos y estilo del info box por evento ───────────────────────────────────

const eventIcons: Record<EventType, string> = {
  purchase_success: '',
  subscription_activated: '',
  subscription_cancelled: '',
  invoice_paid: '',
  invoice_failed: '',
  scheduled_event: '',
  low_credit: '',
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
      subject: 'Tu número SIM Telsim está activo',
      title: '¡Suscripción activada!',
      body: (d: Record<string, unknown>) =>
        `Tu plan <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> está activo. Ya puedes acceder a tu número SIM y comenzar a recibir SMS.`,
      cta: 'Ir al Dashboard',
      infoLeftLabel: 'PLAN ACTIVO',
      infoRightLabel: 'ESTADO',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: () => 'Activo',
    },
    subscription_activated: {
      subject: 'Tu plan ha sido actualizado',
      title: '¡Plan actualizado!',
      body: (d: Record<string, unknown>) =>
        `Tu plan se ha actualizado a <strong style="color:#1d4ed8;">${d.plan_name ?? d.plan ?? ''}</strong> · ${d.billing_type ?? 'Mensual'}. Tu línea está activa.`,
      cta: 'Ir al Dashboard',
      infoLeftLabel: 'PLAN ACTIVO',
      infoRightLabel: 'ESTADO',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan_name ?? d.plan ?? ''),
      infoRightValue: () => 'Activo',
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
      subject: 'Pago confirmado - Telsim',
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
      subject: 'Acción requerida: problema con tu pago en Telsim',
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
      subject: 'Tu renovación Telsim se acerca',
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
      subject: 'Saldo bajo en tu cuenta Telsim',
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
      subject: 'Your Telsim SIM number is active',
      title: 'Subscription activated!',
      body: (d: Record<string, unknown>) =>
        `Your <strong style="color:#1d4ed8;">${d.plan ?? ''}</strong> plan is now active. You can access your SIM number and start receiving SMS messages.`,
      cta: 'Go to Dashboard',
      infoLeftLabel: 'ACTIVE PLAN',
      infoRightLabel: 'STATUS',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: () => 'Active',
    },
    subscription_activated: {
      subject: 'Your plan has been updated',
      title: 'Plan updated!',
      body: (d: Record<string, unknown>) =>
        `Your plan has been updated to <strong style="color:#1d4ed8;">${d.plan_name ?? d.plan ?? ''}</strong> · ${d.billing_type ?? 'Monthly'}. Your line is active.`,
      cta: 'Go to Dashboard',
      infoLeftLabel: 'ACTIVE PLAN',
      infoRightLabel: 'STATUS',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan_name ?? d.plan ?? ''),
      infoRightValue: () => 'Active',
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
      subject: 'Payment confirmed - Telsim',
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
      subject: 'Action required: payment issue on Telsim',
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
      subject: 'Your Telsim renewal is coming up',
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
      subject: 'Low balance on your Telsim account',
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
        <tr><td style="background:#ffffff;border-radius:12px 12px 0 0;padding:24px 40px;border-bottom:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="https://www.telsim.io/logo-512.png" alt="Telsim" width="42" style="display:block;height:auto;">
            <span style="font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Telsim</span>
          </div>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#ffffff;padding:40px 40px 32px;">
          ${params.icon ? `<div style="text-align:center;margin-bottom:24px;"><span style="font-size:48px;">${params.icon}</span></div>` : ''}
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
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:32px 40px;border-top:1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:16px;">
                <img src="https://www.telsim.io/logo-512.png" alt="Telsim" width="20" style="display:block;height:auto;opacity:0.6;">
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <a href="https://www.telsim.io" style="color:#6b7280;font-size:13px;text-decoration:none;margin-right:16px;">telsim.io</a>
                <a href="https://www.telsim.io/privacy" style="color:#6b7280;font-size:13px;text-decoration:none;margin-right:16px;">Privacidad</a>
                <a href="https://www.telsim.io/terms" style="color:#6b7280;font-size:13px;text-decoration:none;margin-right:16px;">Términos</a>
                <a href="mailto:unsubscribe@telsim.io?subject=unsubscribe" style="color:#6b7280;font-size:13px;text-decoration:none;">Cancelar suscripción</a>
              </td>
            </tr>
            <tr>
              <td>
                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                  Recibes este email porque tienes una cuenta en Telsim.<br>
                  Telsim · Donde la privacidad y la tecnología se encuentran<br>
                  © 2026 Telsim. Todos los derechos reservados.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── CTA URLs por evento ───────────────────────────────────────────────────────

const ctaUrls: Record<EventType, string> = {
  purchase_success: 'https://www.telsim.io/dashboard#/dashboard',
  subscription_activated: 'https://www.telsim.io/#/web',
  subscription_cancelled: 'https://www.telsim.io/dashboard#/login',
  invoice_paid: 'https://www.telsim.io/dashboard#/login',
  invoice_failed: 'https://www.telsim.io/dashboard#/login',
  scheduled_event: 'https://www.telsim.io/dashboard#/login',
  low_credit: 'https://www.telsim.io/dashboard#/login',
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

    // Resolver email: primero el pasado en el body, sino lookup en public.users
    let toEmail: string | null = (payload.email as string) ?? payload.to ?? null;
    let lang: Language = payload.language ?? 'es';

    if (!toEmail && user_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY); // service_role → bypass RLS
      const { data: user } = await supabase
        .from('users')
        .select('email, language')
        .eq('id', user_id)
        .maybeSingle();

      console.log('[send-email] user lookup result:', JSON.stringify(user));
      if (user) {
        toEmail = user.email ?? null;
        lang = (user.language as Language) ?? lang;
      } else {
        toEmail = (data.to as string) ?? payload.to ?? null;
        if (!toEmail) console.warn('[send-email] User not found for id:', user_id);
      }
    }

    if (!toEmail) {
      console.error('[triggerEmail] {"error":"No email address resolved"}');
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
