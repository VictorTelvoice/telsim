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
// service_role — bypasea RLS, puede leer public.users
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
      useTableRows: true,
      tableRows: [
        { label: 'PLAN', value: (d: Record<string, unknown>) => String(d.plan ?? '') },
        { label: 'MONTO PAGADO', value: (d: Record<string, unknown>) => String(d.amount ?? '') },
        { label: 'NÚMERO SIM', value: (d: Record<string, unknown>) => String(d.phone_number ?? '') },
        { label: 'TIPO DE PLAN', value: (d: Record<string, unknown>) => (d.billing_type === 'Anual' || d.billing_type === 'Annual' ? 'Anual' : 'Mensual') },
        { label: 'PRÓXIMO COBRO', value: (d: Record<string, unknown>) => String(d.next_date ?? '') },
      ],
      infoLeftLabel: 'PLAN',
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
      infoRow2Label: 'NÚMERO DE TELÉFONO',
      infoRow2Value: (d: Record<string, unknown>) => String(d.phone_number ?? ''),
      infoRow3Label: 'TIPO DE PLAN',
      infoRow3Value: (d: Record<string, unknown>) => (d.billing_type === 'Anual' || d.billing_type === 'Annual' ? 'Anual' : 'Mensual'),
      infoRow4Label: 'PRÓXIMO PAGO',
      infoRow4Value: (d: Record<string, unknown>) => String(d.next_date ?? ''),
    },
    subscription_cancelled: {
      subject: (d: Record<string, unknown>) => `[Telsim] Aviso de baja: SIM ${d.phone_number ?? ''}.`,
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
      subject: (d: Record<string, unknown>) => `[Telsim] Pago confirmado`,
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
      useTableRows: true,
      tableRows: [
        { label: 'PLAN', value: (d: Record<string, unknown>) => String(d.plan ?? '') },
        { label: 'AMOUNT PAID', value: (d: Record<string, unknown>) => String(d.amount ?? '') },
        { label: 'SIM NUMBER', value: (d: Record<string, unknown>) => String(d.phone_number ?? '') },
        { label: 'PLAN TYPE', value: (d: Record<string, unknown>) => (d.billing_type === 'Anual' || d.billing_type === 'Annual' ? 'Annual' : 'Monthly') },
        { label: 'NEXT CHARGE', value: (d: Record<string, unknown>) => String(d.next_date ?? '') },
      ],
      infoRow2Label: 'PHONE NUMBER',
      infoRow2Value: (d: Record<string, unknown>) => String(d.phone_number ?? ''),
      infoRow3Label: 'PLAN TYPE',
      infoRow3Value: (d: Record<string, unknown>) => (d.billing_type === 'Anual' || d.billing_type === 'Annual' ? 'Annual' : 'Monthly'),
      infoRow4Label: 'NEXT PAYMENT',
      infoRow4Value: (d: Record<string, unknown>) => String(d.next_date ?? ''),
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
      infoRow2Label: 'PHONE NUMBER',
      infoRow2Value: (d: Record<string, unknown>) => String(d.phone_number ?? ''),
      infoRow3Label: 'PLAN TYPE',
      infoRow3Value: (d: Record<string, unknown>) => (d.billing_type === 'Anual' || d.billing_type === 'Annual' ? 'Annual' : 'Monthly'),
      infoRow4Label: 'NEXT PAYMENT',
      infoRow4Value: (d: Record<string, unknown>) => String(d.next_date ?? ''),
    },
    subscription_cancelled: {
      subject: (d: Record<string, unknown>) => `[Telsim] Cancellation notice: SIM ${d.phone_number ?? ''}.`,
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
      subject: '[Telsim] Payment confirmed',
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
  infoRow2Label?: string;
  infoRow2Value?: string;
  infoRow3Label?: string;
  infoRow3Value?: string;
  infoRow4Label?: string;
  infoRow4Value?: string;
  tableRows?: { label: string; value: string }[];
  ctaText: string;
  ctaUrl: string;
  footerText: string;
  year: number;
}): string {
  const primaryBlue = '#1152d4';
  const valueColor = '#111827';
  const labelStyle = 'font-size:11px;color:#6b7280;font-weight:700;padding:12px 0 4px 0;vertical-align:top;';
  const valueStyle = `font-size:14px;font-weight:700;color:${valueColor};padding:4px 0 12px 0;text-align:right;vertical-align:top;`;

  const tableBody =
    params.tableRows && params.tableRows.length > 0
      ? params.tableRows
          .map(
            (row) => `
                <tr>
                  <td style="${labelStyle}">${row.label}</td>
                  <td style="${valueStyle}">${row.value}</td>
                </tr>`
          )
          .join('')
      : (() => {
          const extraRow = (label: string, value: string) =>
            label ? `
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">${label}</td>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;text-align:right;"></td>
                </tr>
                <tr>
                  <td style="font-size:18px;font-weight:700;color:${primaryBlue};">${value}</td>
                  <td style="font-size:14px;font-weight:600;color:#16a34a;text-align:right;"></td>
                </tr>` : '';
          return `
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">${params.infoLeftLabel}</td>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;text-align:right;">${params.infoRightLabel}</td>
                </tr>
                <tr>
                  <td style="font-size:18px;font-weight:700;color:${primaryBlue};">${params.infoLeftValue}</td>
                  <td style="font-size:14px;font-weight:600;color:#16a34a;text-align:right;">${params.infoRightValue}</td>
                </tr>
                ${extraRow(params.infoRow2Label ?? '', params.infoRow2Value ?? '') +
    extraRow(params.infoRow3Label ?? '', params.infoRow3Value ?? '') +
    extraRow(params.infoRow4Label ?? '', params.infoRow4Value ?? '')}`;
        })();

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

          <!-- INFO BOX (2 columnas: labels gris 11px negrita | valores azul/negro 14px negrita) -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${params.infoBoxBg};border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableBody}
              </table>
            </td></tr>
          </table>

          <!-- CTA BUTTON (prominente) -->
          <div style="text-align:center;margin-bottom:8px;">
            <a href="${params.ctaUrl}"
               style="display:inline-block;background:${primaryBlue};color:#fff !important;font-size:17px;font-weight:700;padding:16px 42px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(17,82,212,0.35);">
              ${params.ctaText} →
            </a>
          </div>
        </td></tr>

        <!-- DIVIDER -->
        <tr><td style="background:#ffffff;padding:0 40px;">
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;">
        </td></tr>

        <!-- FOOTER (centrado) -->
        <tr><td style="background:#f9fafb;border-radius:0 0 12px 12px;padding:32px 40px;border-top:1px solid #e5e7eb;text-align:center !important;">
          <table width="100%" cellpadding="0" cellspacing="0" style="text-align:center !important;">
            <tr>
              <td style="padding-bottom:16px;text-align:center !important;">
                <img src="https://www.telsim.io/logo-512.png" alt="Telsim" width="20" style="display:inline-block;height:auto;opacity:0.6;">
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;text-align:center !important;">
                <a href="https://www.telsim.io" style="color:#6b7280;font-size:13px;text-decoration:none;margin-right:16px;">telsim.io</a>
                <a href="https://www.telsim.io/privacy" style="color:#6b7280;font-size:13px;text-decoration:none;margin-right:16px;">Privacidad</a>
                <a href="https://www.telsim.io/terms" style="color:#6b7280;font-size:13px;text-decoration:none;margin-right:16px;">Términos</a>
                <a href="mailto:unsubscribe@telsim.io?subject=unsubscribe" style="color:#6b7280;font-size:13px;text-decoration:none;">Cancelar suscripción</a>
              </td>
            </tr>
            <tr>
              <td style="text-align:center !important;">
                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;text-align:center !important;">
                  ${params.footerText}
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
    const payload = await req.json();
    const { event, user_id, to_email, data = {} } = payload;

    if (!event) {
      return new Response(JSON.stringify({ error: 'event is required' }), { status: 400 });
    }

    // Usar to_email si viene directo del webhook, sino intentar lookup
    let email: string | null = to_email ?? (payload.email as string) ?? payload.to ?? null;
    let lang: Language = payload.language ?? 'es';

    if (!email && user_id) {
      console.log('[send-email] user_id buscado:', user_id);
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: user, error } = await supabase
        .from('users')
        .select('email, language')
        .eq('id', user_id)
        .maybeSingle();
      console.log('[send-email] user lookup result:', user, 'error:', error);
      if (user) {
        email = user.email ?? null;
        lang = (user.language as Language) ?? lang;
      } else {
        email = (data.to as string) ?? payload.to ?? null;
        if (!email) console.warn('[send-email] User not found for id:', user_id);
      }
    }

    if (!email) {
      console.error('[send-email] No email resolved');
      return new Response(JSON.stringify({ error: 'No email address resolved' }), { status: 400 });
    }

    // Construir email
    const ev = event as EventType;
    const t = i18n[lang][ev];
    if (!t) {
      return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), { status: 400 });
    }

    const subject = typeof t.subject === 'function' ? (t.subject as (d: Record<string, unknown>) => string)(data) : (t.subject as string);
    const footerText = 'Telsim: Donde la privacidad y la autonomía de tus agentes se encuentran. © 2026 Telsim.';

    const tAny = t as Record<string, unknown>;
    const rowVal = (key: string) => {
      const fn = tAny[key];
      return typeof fn === 'function' ? String((fn as (d: Record<string, unknown>) => string)(data)) : String(fn ?? '');
    };

    let tableRowsResolved: { label: string; value: string }[] | undefined;
    if (tAny.useTableRows && Array.isArray(tAny.tableRows)) {
      tableRowsResolved = (tAny.tableRows as Array<{ label: string; value: (d: Record<string, unknown>) => string }>).map(
        (r) => ({ label: r.label, value: typeof r.value === 'function' ? r.value(data) : String(r.value ?? '') })
      );
    }

    const html = buildHtml({
      icon: eventIcons[ev],
      title: t.title,
      body: t.body(data),
      infoBoxBg: eventInfoBoxBg[ev] ?? DEFAULT_INFO_BG,
      infoLeftLabel: t.infoLeftLabel,
      infoLeftValue: t.infoLeftValue(data),
      infoRightLabel: t.infoRightLabel,
      infoRightValue: t.infoRightValue(data),
      infoRow2Label: (tAny.infoRow2Label as string) ?? undefined,
      infoRow2Value: tAny.infoRow2Value != null ? rowVal('infoRow2Value') : undefined,
      infoRow3Label: (tAny.infoRow3Label as string) ?? undefined,
      infoRow3Value: tAny.infoRow3Value != null ? rowVal('infoRow3Value') : undefined,
      infoRow4Label: (tAny.infoRow4Label as string) ?? undefined,
      infoRow4Value: tAny.infoRow4Value != null ? rowVal('infoRow4Value') : undefined,
      tableRows: tableRowsResolved,
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
        to: [email],
        subject,
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
