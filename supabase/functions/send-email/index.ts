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
import {
  coerceTransactionalEventKey,
  normalizeCanonicalTransactionalEvent,
  renderTransactionalEmail,
} from '../_shared/transactionalEmailRenderer.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM = 'telsim <noreply@telsim.io>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// service_role — bypasea RLS, puede leer public.users
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Plantilla maestra: marco corporativo para todos los correos. El contenido de cada
// plantilla (bienvenida, pago exitoso, etc.) se inyecta en {{content}}.
const MASTER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f9; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background-color: #ffffff; padding: 22px 30px 16px; }
        .content { padding: 40px; line-height: 1.6; color: #333333; font-size: 16px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .button { display: inline-block; padding: 12px 25px; background-color: #1b3a8a; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .highlight { color: #1b3a8a; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:auto;">
                <tr>
                    <td style="width:36px;padding:0 6px 0 0;line-height:0;font-size:0;vertical-align:middle;">
                        <img src="https://www.telsim.io/telsim-isotipo.png" width="36" height="36" alt="telsim" style="display:block;width:36px;height:36px;border:0;outline:none;text-decoration:none;border-radius:10px;" />
                    </td>
                    <td style="vertical-align:middle;">
                        <span style="font-size:21px;font-weight:900;color:#0f172a;letter-spacing:-0.055em;line-height:36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">telsim</span>
                    </td>
                </tr>
            </table>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>© 2026 Telvoice Telecom LLC. Todos los derechos reservados.</p>
            <p>Has recibido este correo porque eres cliente de telsim.io</p>
        </div>
    </div>
</body>
</html>`;

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Language = 'es' | 'en';

type EventType =
  | 'purchase_success'
  | 'subscription_activated'
  | 'subscription_cancelled'
  | 'invoice_paid'
  | 'invoice_failed'
  | 'scheduled_event'
  | 'reactivation_success'
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
  reactivation_success: '',
  low_credit: '',
};

const eventInfoBoxBg: Partial<Record<EventType, string>> = {
  invoice_failed: '#fff5f5',
  low_credit: '#fffbeb',
};
const DEFAULT_INFO_BG = '#edf2ff';

// ─── Traducciones ─────────────────────────────────────────────────────────────

const i18n = {
  es: {
    purchase_success: {
      subject: 'Tu número SIM telsim está activo',
      title: '¡Suscripción activada!',
      body: (d: Record<string, unknown>) =>
        `Tu plan <strong style="color:#1b3a8a;">${d.plan ?? ''}</strong> está activo. Ya puedes acceder a tu número SIM y comenzar a recibir SMS.`,
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
        `Tu plan se ha actualizado a <strong style="color:#1b3a8a;">${d.plan_name ?? d.plan ?? ''}</strong> · ${d.billing_type ?? 'Mensual'}. Tu línea está activa.`,
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
      subject: (d: Record<string, unknown>) => `[telsim] Aviso de baja: SIM ${d.phone_number ?? ''}.`,
      title: 'Suscripción cancelada',
      body: (d: Record<string, unknown>) =>
        `Tu suscripción al plan <strong style="color:#1b3a8a;">${d.plan ?? ''}</strong> ha sido cancelada. Tu número estará activo hasta el <strong>${d.end_date ?? ''}</strong>.`,
      cta: 'Ver planes',
      infoLeftLabel: 'PLAN',
      infoRightLabel: 'FECHA VENCIMIENTO',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: (d: Record<string, unknown>) => String(d.end_date ?? ''),
    },
    invoice_paid: {
      subject: (d: Record<string, unknown>) => `[telsim] Pago confirmado`,
      title: 'Pago recibido',
      body: (d: Record<string, unknown>) =>
        `Hemos recibido tu pago de <strong style="color:#1b3a8a;">$${d.amount ?? ''} USD</strong> para el plan <strong>${d.plan ?? ''}</strong>. Tu suscripción se ha renovado hasta el <strong>${d.next_date ?? ''}</strong>.`,
      cta: 'Ver facturación',
      infoLeftLabel: 'MONTO',
      infoRightLabel: 'PRÓXIMO COBRO',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
      infoRightValue: (d: Record<string, unknown>) => String(d.next_date ?? ''),
    },
    invoice_failed: {
      subject: 'Acción requerida: problema con tu pago en telsim',
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
      subject: 'Tu renovación telsim se acerca',
      title: 'Recordatorio de renovación',
      body: (d: Record<string, unknown>) =>
        `Tu plan <strong style="color:#1b3a8a;">${d.plan ?? ''}</strong> se renovará el <strong>${d.renewal_date ?? ''}</strong> por <strong>$${d.amount ?? ''} USD</strong>.`,
      cta: 'Ver suscripción',
      infoLeftLabel: 'FECHA',
      infoRightLabel: 'MONTO',
      infoLeftValue: (d: Record<string, unknown>) => String(d.renewal_date ?? ''),
      infoRightValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
    },
    reactivation_success: {
      subject: (d: Record<string, unknown>) =>
        `[telsim] Reactivación exitosa de tu línea ${d.phone ?? d.phone_number ?? ''}`,
      title: 'Reactivación exitosa',
      body: (d: Record<string, unknown>) =>
        `Hola <strong>${d.nombre ?? ''}</strong>, tu línea fue reactivada correctamente en telsim.`,
      cta: 'Ir a mis números',
      useTableRows: true,
      tableRows: [
        { label: 'PLAN', value: (d: Record<string, unknown>) => String(d.plan ?? '') },
        { label: 'ESTADO', value: (d: Record<string, unknown>) => String(d.status ?? '') },
        { label: 'NÚMERO SIM', value: (d: Record<string, unknown>) => String(d.phone_number ?? d.phone ?? '') },
        {
          label: 'TIPO DE PLAN',
          value: (d: Record<string, unknown>) =>
            d.billing_type === 'Anual' || d.billing_type === 'Annual' ? 'Anual' : 'Mensual',
        },
      ],
      infoLeftLabel: '',
      infoRightLabel: '',
      infoLeftValue: () => '',
      infoRightValue: () => '',
    },
    low_credit: {
      subject: 'Saldo bajo en tu cuenta telsim',
      title: 'Saldo bajo',
      body: (d: Record<string, unknown>) =>
        `Tu saldo actual es de <strong style="color:#1b3a8a;">$${d.balance ?? ''} USD</strong>. Recarga tu cuenta para mantener tu servicio activo.`,
      cta: 'Recargar saldo',
      infoLeftLabel: 'SALDO ACTUAL',
      infoRightLabel: 'ACCIÓN',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.balance ?? ''} USD`,
      infoRightValue: () => 'Recargar',
    },
  },
  en: {
    purchase_success: {
      subject: 'Your telsim SIM number is active',
      title: 'Subscription activated!',
      body: (d: Record<string, unknown>) =>
        `Your <strong style="color:#1b3a8a;">${d.plan ?? ''}</strong> plan is now active. You can access your SIM number and start receiving SMS messages.`,
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
        `Your plan has been updated to <strong style="color:#1b3a8a;">${d.plan_name ?? d.plan ?? ''}</strong> · ${d.billing_type ?? 'Monthly'}. Your line is active.`,
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
      subject: (d: Record<string, unknown>) => `[telsim] Cancellation notice: SIM ${d.phone_number ?? ''}.`,
      title: 'Subscription cancelled',
      body: (d: Record<string, unknown>) =>
        `Your <strong style="color:#1b3a8a;">${d.plan ?? ''}</strong> plan subscription has been cancelled. Your number will remain active until <strong>${d.end_date ?? ''}</strong>.`,
      cta: 'View plans',
      infoLeftLabel: 'PLAN',
      infoRightLabel: 'END DATE',
      infoLeftValue: (d: Record<string, unknown>) => String(d.plan ?? ''),
      infoRightValue: (d: Record<string, unknown>) => String(d.end_date ?? ''),
    },
    invoice_paid: {
      subject: '[telsim] Payment confirmed',
      title: 'Payment received',
      body: (d: Record<string, unknown>) =>
        `We received your payment of <strong style="color:#1b3a8a;">$${d.amount ?? ''} USD</strong> for the <strong>${d.plan ?? ''}</strong> plan. Your subscription has been renewed until <strong>${d.next_date ?? ''}</strong>.`,
      cta: 'View billing',
      infoLeftLabel: 'AMOUNT',
      infoRightLabel: 'NEXT CHARGE',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
      infoRightValue: (d: Record<string, unknown>) => String(d.next_date ?? ''),
    },
    invoice_failed: {
      subject: 'Action required: payment issue on telsim',
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
      subject: 'Your telsim renewal is coming up',
      title: 'Renewal reminder',
      body: (d: Record<string, unknown>) =>
        `Your <strong style="color:#1b3a8a;">${d.plan ?? ''}</strong> plan will renew on <strong>${d.renewal_date ?? ''}</strong> for <strong>$${d.amount ?? ''} USD</strong>.`,
      cta: 'View subscription',
      infoLeftLabel: 'DATE',
      infoRightLabel: 'AMOUNT',
      infoLeftValue: (d: Record<string, unknown>) => String(d.renewal_date ?? ''),
      infoRightValue: (d: Record<string, unknown>) => `$${d.amount ?? ''} USD`,
    },
    reactivation_success: {
      subject: (d: Record<string, unknown>) =>
        `[telsim] Successful reactivation of your line ${d.phone ?? d.phone_number ?? ''}`,
      title: 'Reactivation successful',
      body: (d: Record<string, unknown>) =>
        `Hello <strong>${d.nombre ?? ''}</strong>, your line was successfully reactivated on telsim.`,
      cta: 'Go to my numbers',
      useTableRows: true,
      tableRows: [
        { label: 'PLAN', value: (d: Record<string, unknown>) => String(d.plan ?? '') },
        { label: 'STATUS', value: (d: Record<string, unknown>) => String(d.status ?? '') },
        { label: 'SIM NUMBER', value: (d: Record<string, unknown>) => String(d.phone_number ?? d.phone ?? '') },
        {
          label: 'PLAN TYPE',
          value: (d: Record<string, unknown>) =>
            d.billing_type === 'Anual' || d.billing_type === 'Annual' ? 'Annual' : 'Monthly',
        },
      ],
      infoLeftLabel: '',
      infoRightLabel: '',
      infoLeftValue: () => '',
      infoRightValue: () => '',
    },
    low_credit: {
      subject: 'Low balance on your telsim account',
      title: 'Low balance',
      body: (d: Record<string, unknown>) =>
        `Your current balance is <strong style="color:#1b3a8a;">$${d.balance ?? ''} USD</strong>. Top up your account to keep your service running.`,
      cta: 'Top up balance',
      infoLeftLabel: 'CURRENT BALANCE',
      infoRightLabel: 'ACTION',
      infoLeftValue: (d: Record<string, unknown>) => `$${d.balance ?? ''} USD`,
      infoRightValue: () => 'Top up',
    },
  },
};

// ─── Contenido interno (se inyecta en MASTER_TEMPLATE {{content}}) ─────────────
// Azul corporativo #1b3a8a para botones y destacados; compatible con HTML del editor.
function buildInnerContent(params: {
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
  const primaryBlue = '#1b3a8a';
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

  return `
          ${params.icon ? `<div style="text-align:center;margin-bottom:24px;"><span style="font-size:48px;">${params.icon}</span></div>` : ''}
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;text-align:center;">
            ${params.title}
          </h1>
          <p style="margin:0 0 24px;font-size:16px;color:#6b7280;text-align:center;line-height:1.6;">
            ${params.body}
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${params.infoBoxBg};border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableBody}
              </table>
            </td></tr>
          </table>

          <div style="text-align:center;margin-bottom:8px;">
            <a href="${params.ctaUrl}" class="button"
               style="display:inline-block;background:${primaryBlue};color:#fff !important;font-size:17px;font-weight:700;padding:16px 42px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(27,58,138,0.35);">
              ${params.ctaText} →
            </a>
          </div>`;
}

// ─── CTA URLs por evento ───────────────────────────────────────────────────────

const ctaUrls: Record<EventType, string> = {
  purchase_success: 'https://www.telsim.io/dashboard#/dashboard',
  subscription_activated: 'https://www.telsim.io/#/web',
  subscription_cancelled: 'https://www.telsim.io/dashboard#/login',
  invoice_paid: 'https://www.telsim.io/dashboard#/login',
  invoice_failed: 'https://www.telsim.io/dashboard#/login',
  scheduled_event: 'https://www.telsim.io/dashboard#/login',
  reactivation_success: 'https://www.telsim.io/#/web',
  low_credit: 'https://www.telsim.io/dashboard#/login',
};

/**
 * Eventos canónicos (webhook, admin templates) → claves internas de i18n.
 * Legacy: se mantienen como identidad. Desconocidos → scheduled_event (evita 400).
 */
function normalizeEmailEvent(raw: string): EventType {
  const k = coerceTransactionalEventKey(raw).toLowerCase();
  const map: Record<string, EventType> = {
    // canónicos
    new_purchase: 'purchase_success',
    cancellation: 'subscription_cancelled',
    upgrade_success: 'subscription_activated',
    invoice_paid: 'invoice_paid',
    reactivation_success: 'reactivation_success',
    payment_failed: 'invoice_failed',
    trial_ending: 'scheduled_event',
    upcoming_invoice: 'scheduled_event',
    support_reply: 'scheduled_event',
    // legacy (identidad)
    purchase_success: 'purchase_success',
    subscription_cancelled: 'subscription_cancelled',
    subscription_activated: 'subscription_activated',
    invoice_failed: 'invoice_failed',
    scheduled_event: 'scheduled_event',
    low_credit: 'low_credit',
  };
  if (map[k]) return map[k];
  return 'scheduled_event';
}

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
    const {
      event,
      user_id,
      to_email,
      data = {},
      template_id: payloadTemplateId,
      content: payloadContent,
      from: payloadFrom,
      subject: payloadSubject,
      is_test: payloadIsTest,
      custom_content: payloadCustomContent,
      html_body: payloadHtmlBody,
      reply_to: payloadReplyTo,
      contentBelowDetails,
      contentTitle,
    } = payload as Record<string, unknown>;

    const tplIdRaw =
      payloadTemplateId != null && String(payloadTemplateId).trim() !== ''
        ? String(payloadTemplateId).trim()
        : '';
    let resolvedEventStr =
      event != null && String(event).trim() !== '' ? String(event).trim() : '';
    if (!resolvedEventStr && tplIdRaw.startsWith('template_email_')) {
      const inferred = coerceTransactionalEventKey(tplIdRaw);
      if (normalizeCanonicalTransactionalEvent(inferred)) {
        resolvedEventStr = inferred;
      }
    }
    if (!resolvedEventStr) {
      return new Response(JSON.stringify({ error: 'event is required' }), { status: 400 });
    }

    // Remitente: payload (test) o constante. Formato Resend: "telsim noreply@telsim.io" o "telsim <noreply@telsim.io>"
    const fromAddress = payloadFrom != null && String(payloadFrom).trim() !== '' ? String(payloadFrom).trim() : RESEND_FROM;
    const replyToAddress =
      payloadReplyTo != null && String(payloadReplyTo).trim() !== ''
        ? String(payloadReplyTo).trim()
        : null;

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

    const i18nLang = i18n[lang] ?? i18n.es;

    /** Copia mutable: enriquecemos título y reactivation_url para el renderer canónico. */
    let dataForRender: Record<string, unknown> = { ...(data as Record<string, unknown>) };

    // Contenido editable desde admin_settings (CMS)
    let settingsOverrides: Record<string, string> = {};
    let templateContentFromDb: string | null = null;
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: rows } = await supabase.from('admin_settings').select('id, content');
      if (rows) {
        rows.forEach((r: { id: string; content: string | null }) => {
          if (r.id) settingsOverrides[r.id] = r.content ?? '';
        });
      }
      if (payloadTemplateId && (!payloadContent || String(payloadContent).trim() === '')) {
        const { data: templateRow } = await supabase.from('admin_settings').select('content').eq('id', payloadTemplateId).maybeSingle();
        templateContentFromDb = (templateRow as { content?: string | null } | null)?.content ?? null;
      }
    } catch (e) {
      console.warn('[send-email] admin_settings lookup failed:', e);
    }

    const renderBodyTemplate = (template: string, d: Record<string, unknown>): string => {
      let s = template;
      for (const [k, v] of Object.entries(d)) {
        s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
      }
      s = s.replace(/\{\{plan\}\}/g, String(d.plan ?? ''));
      s = s.replace(/\{\{amount\}\}/g, String(d.amount ?? ''));
      s = s.replace(/\{\{phone_number\}\}/g, String(d.phone_number ?? ''));
      s = s.replace(/\{\{next_date\}\}/g, String(d.next_date ?? ''));
      s = s.replace(/\{\{billing_type\}\}/g, String(d.billing_type ?? ''));
      return s;
    };

    let rawEvent = coerceTransactionalEventKey(resolvedEventStr);
    /** Si `event` no resuelve a canónico o cae en scheduled_event, preferir clave desde template_id (p. ej. template_email_reactivation_success). */
    if (tplIdRaw.startsWith('template_email_')) {
      const fromTpl = coerceTransactionalEventKey(tplIdRaw);
      const canonTpl = normalizeCanonicalTransactionalEvent(fromTpl);
      if (canonTpl) {
        const canonFromEv = normalizeCanonicalTransactionalEvent(rawEvent);
        const evProbe = normalizeEmailEvent(rawEvent);
        if (!canonFromEv || evProbe === 'scheduled_event') {
          rawEvent = fromTpl;
        }
      }
    }
    const ev = normalizeEmailEvent(rawEvent);

    let bodyStr: string;
    const isTest = payloadIsTest === true;
    const customBody = payloadCustomContent ?? payloadHtmlBody ?? (isTest ? (data?.message as string) ?? payloadContent : null);
    if (isTest && customBody != null && String(customBody).trim() !== '') {
      bodyStr = renderBodyTemplate(String(customBody), data);
    } else if (payloadContent != null && String(payloadContent).trim() !== '') {
      bodyStr = renderBodyTemplate(String(payloadContent), data);
    } else if (templateContentFromDb && templateContentFromDb.trim() !== '') {
      bodyStr = renderBodyTemplate(templateContentFromDb, data);
    } else {
      const tBody = i18nLang[ev];
      if (!tBody) {
        return new Response(JSON.stringify({ error: `Unknown event: ${resolvedEventStr}` }), { status: 400 });
      }
      const bodyKey = `email_${ev}_body_${lang}`;
      const bodyOverrideRaw = settingsOverrides[bodyKey];
      bodyStr = bodyOverrideRaw != null && bodyOverrideRaw !== ''
        ? renderBodyTemplate(bodyOverrideRaw, data)
        : tBody.body(data);
    }

    const canonEv = normalizeCanonicalTransactionalEvent(rawEvent);
    if (canonEv && !isTest) {
      const topFromDb = settingsOverrides[`template_email_${canonEv}`] ?? '';
      if (topFromDb.trim() !== '') {
        bodyStr = renderBodyTemplate(topFromDb, data);
      }
    }

    const langForRenderer: 'es' | 'en' = lang === 'en' ? 'en' : 'es';

    let resolvedBelowDetails: string | null = null;
    let resolvedContentTitle: string | null = null;
    if (canonEv) {
      const payloadTid =
        payloadTemplateId != null && String(payloadTemplateId).trim() !== ''
          ? String(payloadTemplateId).trim()
          : null;
      const canonicalTplId = `template_email_${canonEv}`;
      const belowSettingsKey = payloadTid
        ? `${payloadTid}_below_details`
        : `template_email_${canonEv}_below_details`;

      /** Primero: URL de reactivación en data (payload real o backfill) — mismo merge que below/título. */
      if (canonEv === 'cancellation') {
        const existingUrl =
          dataForRender.reactivation_url != null ? String(dataForRender.reactivation_url).trim() : '';
        if (!existingUrl) {
          const uid = (user_id as string | undefined) ?? (dataForRender.user_id as string | undefined);
          const slotId = dataForRender.slot_id != null ? String(dataForRender.slot_id) : '';
          if (uid && slotId) {
            try {
              const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
              const { data: slotTok } = await sb
                .from('slots')
                .select('reservation_token')
                .eq('slot_id', slotId)
                .eq('reservation_user_id', uid)
                .eq('status', 'reserved')
                .gt('reservation_expires_at', new Date().toISOString())
                .maybeSingle();
              const tok = (slotTok as { reservation_token?: string } | null)?.reservation_token;
              if (tok != null && String(tok).trim() !== '') {
                dataForRender = {
                  ...dataForRender,
                  reactivation_url: `https://www.telsim.io/#/web/reactivate-line?token=${encodeURIComponent(String(tok))}`,
                };
              }
            } catch (reacErr) {
              console.warn('[send-email] reactivation_url backfill skipped:', reacErr);
            }
          }
        }
      }

      const mergeForVars: Record<string, unknown> = { ...data, ...dataForRender };

      const hasExplicitBelow =
        payload != null && typeof payload === 'object' && 'contentBelowDetails' in payload;
      if (hasExplicitBelow) {
        const raw = contentBelowDetails != null ? String(contentBelowDetails) : '';
        resolvedBelowDetails = raw.trim() !== '' ? renderBodyTemplate(raw, mergeForVars) : null;
      } else {
        const belowRaw = settingsOverrides[belowSettingsKey] ?? '';
        resolvedBelowDetails = belowRaw.trim() !== '' ? renderBodyTemplate(belowRaw, mergeForVars) : null;
      }
      if (
        canonEv === 'reactivation_success' &&
        (resolvedBelowDetails == null || String(resolvedBelowDetails).trim() === '')
      ) {
        resolvedBelowDetails =
          lang === 'en'
            ? '<p>You can use your line again and receive SMS as usual.</p><p>telsim team</p>'
            : '<p>Ya puedes volver a usar tu línea y recibir SMS normalmente.</p><p>equipo telsim</p>';
      }
      const titleKeyPrimary = payloadTid ? `${payloadTid}_title` : `${canonicalTplId}_title`;
      const titleKeyFallback = `${canonicalTplId}_title`;

      const hasExplicitNonEmptyPayloadTitle =
        payload != null &&
        typeof payload === 'object' &&
        'contentTitle' in payload &&
        String(contentTitle ?? '').trim() !== '';
      if (hasExplicitNonEmptyPayloadTitle) {
        resolvedContentTitle = renderBodyTemplate(String(contentTitle).trim(), mergeForVars);
      }
      if (resolvedContentTitle == null || String(resolvedContentTitle).trim() === '') {
        const rawDb = (settingsOverrides[titleKeyPrimary] ?? settingsOverrides[titleKeyFallback] ?? '').trim();
        if (rawDb !== '') {
          resolvedContentTitle = renderBodyTemplate(rawDb, mergeForVars);
        }
      }
      if (resolvedContentTitle != null && String(resolvedContentTitle).trim() === '') {
        resolvedContentTitle = null;
      }

      if (resolvedContentTitle != null && String(resolvedContentTitle).trim() !== '') {
        dataForRender = { ...dataForRender, contentTitle: resolvedContentTitle };
      }

      if (canonEv === 'cancellation' && Deno.env.get('LOG_EMAIL_CANCEL_AUDIT') === '1') {
        console.log('[send-email] cancellation', {
          templateId: payloadTid ?? canonicalTplId,
          titleLen: resolvedContentTitle != null ? String(resolvedContentTitle).length : 0,
          hasReactivationUrl: !!(
            dataForRender.reactivation_url != null && String(dataForRender.reactivation_url).trim() !== ''
          ),
        });
      }
    }

    const canonicalRendered = renderTransactionalEmail({
      event: rawEvent,
      data: dataForRender,
      subject: payloadSubject,
      contentTitle: resolvedContentTitle,
      contentHtml: bodyStr,
      contentBelowDetails: resolvedBelowDetails,
      lang: langForRenderer,
    });

    console.log(
      `[send-email] rawEvent=${String(event ?? '')} resolvedEvent=${resolvedEventStr} coerced=${rawEvent} normalizedEvent=${ev} canonEv=${canonEv ?? 'null'} template_id=${tplIdRaw} canonicalRendered=${canonicalRendered != null}`,
    );

    let html: string;
    let subject: string;

    if (canonicalRendered) {
      html = canonicalRendered.html;
      subject = canonicalRendered.subject;
    } else {
      const t = i18nLang[ev];
      const titleKey = t ? `email_${ev}_title_${lang}` : undefined;
      const titleOverride = titleKey ? settingsOverrides[titleKey] : undefined;
      const subjectKey = t ? `email_${ev}_subject_${lang}` : undefined;
      const subjectOverride = subjectKey ? settingsOverrides[subjectKey] : undefined;
      subject =
        payloadSubject != null && String(payloadSubject).trim() !== ''
          ? String(payloadSubject).trim()
          : subjectOverride != null && subjectOverride !== ''
          ? subjectOverride
          : t && (typeof t.subject === 'function' ? (t.subject as (d: Record<string, unknown>) => string)(data) : (t.subject as string)) || rawEvent;
      const footerText = 'telsim: Donde la privacidad y la autonomía de tus agentes se encuentran. © 2026 telsim.';

      const tAny = (t || {}) as Record<string, unknown>;
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

      html = MASTER_TEMPLATE.replace(
        '{{content}}',
        buildInnerContent({
          icon: eventIcons[ev] ?? '📧',
          title: (titleOverride != null && titleOverride !== '' ? titleOverride : t?.title) ?? rawEvent,
          body: bodyStr,
          infoBoxBg: eventInfoBoxBg[ev] ?? DEFAULT_INFO_BG,
          infoLeftLabel: (t as { infoLeftLabel?: string })?.infoLeftLabel ?? '',
          infoLeftValue: typeof t?.infoLeftValue === 'function' ? t.infoLeftValue(data) : String((t as { infoLeftValue?: string })?.infoLeftValue ?? ''),
          infoRightLabel: (t as { infoRightLabel?: string })?.infoRightLabel ?? '',
          infoRightValue: typeof t?.infoRightValue === 'function' ? t.infoRightValue(data) : String((t as { infoRightValue?: string })?.infoRightValue ?? ''),
          infoRow2Label: (tAny.infoRow2Label as string) ?? undefined,
          infoRow2Value: tAny.infoRow2Value != null ? rowVal('infoRow2Value') : undefined,
          infoRow3Label: (tAny.infoRow3Label as string) ?? undefined,
          infoRow3Value: tAny.infoRow3Value != null ? rowVal('infoRow3Value') : undefined,
          infoRow4Label: (tAny.infoRow4Label as string) ?? undefined,
          infoRow4Value: tAny.infoRow4Value != null ? rowVal('infoRow4Value') : undefined,
          tableRows: tableRowsResolved,
          ctaText: (t as { cta?: string })?.cta ?? 'Ir al Dashboard',
          ctaUrl: ctaUrls[ev] ?? 'https://www.telsim.io',
          footerText,
          year: new Date().getFullYear(),
        })
      );
    }

    // Enviar via Resend (from/subject/html pueden venir del payload para tests)
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject,
        html,
        ...(replyToAddress ? { reply_to: replyToAddress } : {}),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@telsim.io?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    const resendData = await resendRes.json();
    const ok = resendRes.ok;

    // Historial: registrar envío (éxito o error)
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const contentPreview = (bodyStr?.slice(0, 500) ?? subject ?? '') || null;
      await supabase.from('notification_history').insert({
        user_id: user_id ?? null,
        type: 'email',
        event_name: payloadIsTest === true ? 'test' : rawEvent,
        recipient: email,
        content: contentPreview,
        status: ok ? 'sent' : 'error',
        error_message: ok ? null : (resendData?.message ?? JSON.stringify(resendData)),
      });
    } catch (histErr) {
      console.warn('[send-email] notification_history insert failed:', histErr);
    }

    if (!ok) {
      console.error('Resend error:', resendData);
      const errMsg = typeof resendData?.message === 'string' ? resendData.message : typeof resendData?.name === 'string' ? `${resendData.name}: ${resendData?.message ?? ''}` : JSON.stringify(resendData);
      return new Response(JSON.stringify({ error: errMsg || 'Failed to send email', detail: resendData }), {
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
