/**
 * Renderer único para emails transaccionales canónicos (producción, tests, preview).
 * Sin dependencias de Deno/React — importable desde send-email y Vite.
 */

import {
  DEFAULT_ADMIN_EMAIL_TEST_DATA,
  getDefaultAdminEmailTestDataForEvent,
} from './transactionalEmailTestDefaults.ts';

export type CanonicalTransactionalEvent = 'new_purchase' | 'cancellation' | 'upgrade_success' | 'invoice_paid';

/** Logo público absoluto (email-safe). */
export const TELSIM_LOGO_URL = 'https://www.telsim.io/logo-192.png';

/** CTA principal: app web (mismo destino para todos los eventos canónicos). */
export const TELSIM_WEB_APP_URL = 'https://www.telsim.io/#/web';

export function normalizeCanonicalTransactionalEvent(raw: string): CanonicalTransactionalEvent | null {
  const k = String(raw ?? '').trim().toLowerCase();
  const map: Record<string, CanonicalTransactionalEvent> = {
    new_purchase: 'new_purchase',
    purchase_success: 'new_purchase',
    cancellation: 'cancellation',
    subscription_cancelled: 'cancellation',
    upgrade_success: 'upgrade_success',
    subscription_activated: 'upgrade_success',
    invoice_paid: 'invoice_paid',
  };
  return map[k] ?? null;
}

export { DEFAULT_ADMIN_EMAIL_TEST_DATA, getDefaultAdminEmailTestDataForEvent };

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function billingLabel(d: Record<string, unknown>, lang: 'es' | 'en'): string {
  const b = d.billing_type;
  if (b === 'Anual' || b === 'Annual' || b === 'annual') return lang === 'es' ? 'Anual' : 'Annual';
  return lang === 'es' ? 'Mensual' : 'Monthly';
}

function phoneVal(d: Record<string, unknown>): string {
  return String(d.phone_number ?? d.phone ?? '');
}

const TITLES: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: '¡Suscripción activada!', en: 'Subscription activated!' },
  cancellation: { es: 'Cancelación confirmada', en: 'Cancellation confirmed' },
  upgrade_success: { es: '¡Plan actualizado!', en: 'Plan updated!' },
  invoice_paid: { es: 'Pago confirmado', en: 'Payment confirmed' },
};

const CTAS: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: 'Abrir app web', en: 'Open web app' },
  cancellation: { es: 'Abrir app web', en: 'Open web app' },
  upgrade_success: { es: 'Abrir app web', en: 'Open web app' },
  invoice_paid: { es: 'Abrir app web', en: 'Open web app' },
};

const CTA_URLS: Record<CanonicalTransactionalEvent, string> = {
  new_purchase: TELSIM_WEB_APP_URL,
  cancellation: TELSIM_WEB_APP_URL,
  upgrade_success: TELSIM_WEB_APP_URL,
  invoice_paid: TELSIM_WEB_APP_URL,
};

const DEFAULT_SUBJECTS: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: '[Telsim] Tu línea está activa', en: '[Telsim] Your line is active' },
  cancellation: { es: '[Telsim] Cancelación confirmada', en: '[Telsim] Cancellation confirmed' },
  upgrade_success: { es: '[Telsim] Plan actualizado', en: '[Telsim] Plan updated' },
  invoice_paid: { es: '[Telsim] Pago confirmado', en: '[Telsim] Payment confirmed' },
};

function detailRows(
  canonical: CanonicalTransactionalEvent,
  d: Record<string, unknown>,
  lang: 'es' | 'en'
): { label: string; value: string }[] {
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const plan = escapeHtml(d.plan ?? d.plan_name ?? '');
  const status = escapeHtml(d.status ?? '');
  const phone = escapeHtml(phoneVal(d));
  const billing = escapeHtml(billingLabel(d, lang));
  const next = escapeHtml(d.next_date ?? '');
  const end = escapeHtml(d.end_date ?? '');
  const amount = escapeHtml(d.amount ?? d.monto ?? '');
  const currency = escapeHtml(d.currency ?? 'USD');

  switch (canonical) {
    case 'new_purchase':
      return [
        { label: L('Plan', 'Plan'), value: plan },
        { label: L('Estado', 'Status'), value: status },
        { label: L('Número SIM', 'SIM number'), value: phone },
        { label: L('Tipo de plan', 'Plan type'), value: billing },
        { label: L('Próximo cobro', 'Next charge'), value: next },
      ];
    case 'cancellation':
      return [
        { label: L('Plan', 'Plan'), value: plan },
        { label: L('Estado', 'Status'), value: status },
        { label: L('Número SIM', 'SIM number'), value: phone },
        { label: L('Tipo de plan', 'Plan type'), value: billing },
        { label: L('Fecha de cierre', 'End date'), value: end },
      ];
    case 'upgrade_success':
      return [
        { label: L('Nuevo plan', 'New plan'), value: plan },
        { label: L('Estado', 'Status'), value: status },
        { label: L('Número SIM', 'SIM number'), value: phone },
        { label: L('Tipo de plan', 'Plan type'), value: billing },
        { label: L('Próximo cobro', 'Next charge'), value: next },
      ];
    case 'invoice_paid':
      return [
        { label: L('Plan', 'Plan'), value: plan },
        { label: L('Estado', 'Status'), value: status },
        { label: L('Monto pagado', 'Amount paid'), value: amount },
        { label: L('Moneda', 'Currency'), value: currency },
        { label: L('Número SIM', 'SIM number'), value: phone },
        { label: L('Próximo cobro', 'Next charge'), value: next },
      ];
    default:
      return [];
  }
}

const ACCENT_PRIMARY = '#0074d4';

function buildInnerBlock(params: {
  title: string;
  introHtml: string;
  rows: { label: string; value: string }[];
  ctaText: string;
  ctaUrl: string;
}): string {
  const cardBg = '#f1f5f9';
  const cardBorder = '#e2e8f0';

  const tableBody = params.rows
    .map((row, i) => {
      const isLast = i === params.rows.length - 1;
      const borderBottom = isLast ? 'none' : '1px solid #e2e8f0';
      return `
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;padding:14px 12px 0 0;vertical-align:top;border-bottom:${borderBottom};">${row.label}</td>
                  <td style="font-size:15px;color:#0f172a;font-weight:700;padding:14px 0 0 0;text-align:right;vertical-align:top;border-bottom:${borderBottom};">${row.value}</td>
                </tr>`;
    })
    .join('');

  return `
          <h1 style="margin:0 0 12px;font-size:26px;font-weight:600;color:#0f172a;text-align:center;letter-spacing:-0.02em;line-height:1.25;">
            ${params.title}
          </h1>
          <div style="margin:0 0 24px;font-size:16px;color:#64748b;text-align:center;line-height:1.65;">
            ${params.introHtml}
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${cardBg};border-radius:12px;border:1px solid ${cardBorder};margin-bottom:32px;">
            <tr><td style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableBody}
              </table>
            </td></tr>
          </table>

          <div style="text-align:center;margin-bottom:4px;">
            <a href="${params.ctaUrl}" class="button"
               style="display:inline-block;background:${ACCENT_PRIMARY};color:#ffffff !important;font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 4px 14px rgba(0,116,212,0.28);">
              ${params.ctaText}
            </a>
          </div>`;
}

function buildMasterHtml(innerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telsim</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
                    <tr>
                        <td style="padding:28px 32px 20px 32px;background:#ffffff;">
                            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                                <tr>
                                    <td style="vertical-align:middle;width:1px;white-space:nowrap;padding-right:14px;">
                                        <img src="${TELSIM_LOGO_URL}" width="40" height="40" alt="Telsim" style="display:block;height:40px;width:40px;border:0;outline:none;text-decoration:none;" />
                                    </td>
                                    <td style="vertical-align:middle;">
                                        <span style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.03em;line-height:1.2;">Telsim</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="height:2px;background:${ACCENT_PRIMARY};line-height:2px;font-size:0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding:40px 36px 36px 36px;line-height:1.6;color:#334155;font-size:16px;">
                            ${innerHtml}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8fafc;padding:22px 24px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px 0;">© 2026 Telvoice Telecom LLC. Todos los derechos reservados.</p>
                            <p style="margin:0;">Has recibido este correo porque eres cliente de Telsim.io</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export type RenderTransactionalEmailParams = {
  event: string;
  data: Record<string, unknown>;
  /** Asunto editable (admin / webhook). Si vacío, se usa default por evento. */
  subject?: string | null;
  /** HTML del copy central desde admin_settings (ya con variables sustituidas en prod/test). */
  contentHtml?: string | null;
  lang?: 'es' | 'en';
};

/**
 * Renderiza el email transaccional completo (layout fijo + copy central + filas por evento).
 * Devuelve null si `event` no es uno de los cuatro canónicos.
 */
export function renderTransactionalEmail(params: RenderTransactionalEmailParams): { html: string; subject: string } | null {
  const canonical = normalizeCanonicalTransactionalEvent(params.event);
  if (!canonical) return null;

  const lang = params.lang ?? 'es';
  const d = params.data ?? {};
  const title = TITLES[canonical][lang];
  const cta = CTAS[canonical][lang];
  const ctaUrl = CTA_URLS[canonical];

  const intro =
    params.contentHtml != null && String(params.contentHtml).trim() !== ''
      ? String(params.contentHtml)
      : `<p>${lang === 'es' ? 'Actualización de tu cuenta TELSIM.' : 'An update regarding your TELSIM account.'}</p>`;

  const rows = detailRows(canonical, d, lang);
  const inner = buildInnerBlock({
    title: escapeHtml(title),
    introHtml: intro,
    rows,
    ctaText: escapeHtml(cta),
    ctaUrl: String(ctaUrl),
  });

  const html = buildMasterHtml(inner);

  const subj =
    params.subject != null && String(params.subject).trim() !== ''
      ? String(params.subject).trim()
      : DEFAULT_SUBJECTS[canonical][lang];

  return { html, subject: subj };
}
