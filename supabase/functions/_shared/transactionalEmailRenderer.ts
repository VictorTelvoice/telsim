/**
 * Renderer único para emails transaccionales canónicos (producción, tests, preview).
 * Sin dependencias de Deno/React — importable desde send-email y Vite.
 *
 * Mismo HTML para: send-email (producción), preview en AdminTemplates, Enviar Test vía api/manage → Edge.
 */

import {
  DEFAULT_ADMIN_EMAIL_TEST_DATA,
  getDefaultAdminEmailTestDataForEvent,
} from './transactionalEmailTestDefaults';

export type CanonicalTransactionalEvent =
  | 'new_purchase'
  | 'cancellation'
  | 'upgrade_success'
  | 'invoice_paid'
  | 'reactivation_success';

/** Isotipo público absoluto (email-safe) usado en el lockup horizontal del correo. */
export const TELSIM_ISOTIPO_URL = 'https://www.telsim.io/telsim-isotipo.png';

/** CTA principal: app web (mismo destino para todos los eventos canónicos). */
export const TELSIM_WEB_APP_URL = 'https://www.telsim.io/#/web';

/**
 * Si el cliente envía `template_email_<evento>` como `event` (error de integración),
 * normaliza al nombre canónico para no caer en scheduled_event / legacy.
 */
export function coerceTransactionalEventKey(raw: string): string {
  let s = String(raw ?? '').trim();
  if (/^template_email_/i.test(s)) {
    s = s.replace(/^template_email_/i, '');
  }
  return s.trim();
}

export function normalizeCanonicalTransactionalEvent(raw: string): CanonicalTransactionalEvent | null {
  const k = coerceTransactionalEventKey(raw).toLowerCase();
  const map: Record<string, CanonicalTransactionalEvent> = {
    new_purchase: 'new_purchase',
    purchase_success: 'new_purchase',
    cancellation: 'cancellation',
    subscription_cancelled: 'cancellation',
    upgrade_success: 'upgrade_success',
    subscription_activated: 'upgrade_success',
    invoice_paid: 'invoice_paid',
    reactivation_success: 'reactivation_success',
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

/** Opcional en contentHtml de admin: texto debajo del cuadro de detalles (p. ej. cancelación). */
const BELOW_DETAILS_SPLIT_RE = /\[\[\s*BELOW_DETAILS\s*\]\]/i;
const BELOW_DETAILS_STRIP_ALL_RE = /\[\[\s*BELOW_DETAILS\s*\]\]/gi;

function splitEmailBodySections(contentHtml: string): { topHtml: string; bottomHtml: string } {
  const raw = String(contentHtml ?? '');
  const parts = raw.split(BELOW_DETAILS_SPLIT_RE);

  if (parts.length <= 1) {
    return {
      topHtml: raw.replace(BELOW_DETAILS_STRIP_ALL_RE, '').trim(),
      bottomHtml: '',
    };
  }

  return {
    topHtml: String(parts[0] ?? '').replace(BELOW_DETAILS_STRIP_ALL_RE, '').trim(),
    bottomHtml: parts.slice(1).join(' ').replace(BELOW_DETAILS_STRIP_ALL_RE, '').trim(),
  };
}

/** Quita cualquier marcador legacy del HTML (cancelación); no altera el diseño. */
function stripLegacyBelowDetailsMarker(html: string): string {
  return String(html ?? '').replace(BELOW_DETAILS_STRIP_ALL_RE, '').trim();
}

function billingLabel(d: Record<string, unknown>, lang: 'es' | 'en'): string {
  const b = d.billing_type;
  if (b === 'Anual' || b === 'Annual' || b === 'annual') return lang === 'es' ? 'Anual' : 'Annual';
  return lang === 'es' ? 'Mensual' : 'Monthly';
}

function phoneVal(d: Record<string, unknown>): string {
  return String(d.phone_number ?? d.phone ?? '');
}

/** Colores semánticos email-safe para la columna Estado. */
function getStatusColor(status: string): string {
  const s = String(status ?? '').trim().toLowerCase();
  if (s === 'activo' || s === 'active') return '#16a34a';
  if (s === 'cancelado' || s === 'cancelled' || s === 'canceled') return '#dc2626';
  if (s === 'pagado' || s === 'paid') return '#16a34a';
  return '#0f172a';
}

/** Colores semánticos email-safe para la columna Plan (orden: Power antes que Pro). */
function getPlanColor(plan: string): string {
  const p = String(plan ?? '').trim().toLowerCase();
  if (p.includes('power')) return '#d97706';
  if (p.includes('starter')) return '#6b7280';
  if (p.includes('pro')) return '#1b3a8a';
  return '#0f172a';
}

function renderColoredStatusValue(raw: string): string {
  const esc = escapeHtml(raw);
  if (!String(raw).trim()) return esc;
  return `<span style="color:${getStatusColor(raw)};font-weight:700;">${esc}</span>`;
}

function renderColoredPlanValue(raw: string): string {
  const esc = escapeHtml(raw);
  if (!String(raw).trim()) return esc;
  return `<span style="color:${getPlanColor(raw)};font-weight:700;">${esc}</span>`;
}

const TITLES: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: '¡Suscripción activada!', en: 'Subscription activated!' },
  cancellation: { es: 'Cancelación confirmada', en: 'Cancellation confirmed' },
  upgrade_success: { es: '¡Plan actualizado!', en: 'Plan updated!' },
  invoice_paid: { es: 'Pago confirmado', en: 'Payment confirmed' },
  reactivation_success: { es: 'Reactivación exitosa', en: 'Reactivation successful' },
};

/** ES: "Ir al Dashboard"; EN: equivalente. CTA → TELSIM_WEB_APP_URL. */
const CTAS: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: 'Ir al Dashboard', en: 'Go to Dashboard' },
  cancellation: { es: 'Ir al Dashboard', en: 'Go to Dashboard' },
  upgrade_success: { es: 'Ir al Dashboard', en: 'Go to Dashboard' },
  invoice_paid: { es: 'Ir al Dashboard', en: 'Go to Dashboard' },
  reactivation_success: { es: 'Ir a mis números', en: 'Go to my numbers' },
};

const CTA_URLS: Record<CanonicalTransactionalEvent, string> = {
  new_purchase: TELSIM_WEB_APP_URL,
  cancellation: TELSIM_WEB_APP_URL,
  upgrade_success: TELSIM_WEB_APP_URL,
  invoice_paid: TELSIM_WEB_APP_URL,
  reactivation_success: TELSIM_WEB_APP_URL,
};

const DEFAULT_SUBJECTS: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: '[telsim] Tu línea está activa', en: '[telsim] Your line is active' },
  cancellation: { es: '[telsim] Cancelación confirmada', en: '[telsim] Cancellation confirmed' },
  upgrade_success: { es: '[telsim] Plan actualizado', en: '[telsim] Plan updated' },
  invoice_paid: { es: '[telsim] Pago confirmado', en: '[telsim] Payment confirmed' },
  reactivation_success: {
    es: '[telsim] Reactivación exitosa de tu línea {{phone}}',
    en: '[telsim] Successful reactivation of your line {{phone}}',
  },
};

function interpolateDefaultSubject(tpl: string, d: Record<string, unknown>): string {
  let s = tpl;
  s = s.replace(/\{\{phone\}\}/g, phoneVal(d));
  s = s.replace(/\{\{nombre\}\}/g, String(d.nombre ?? ''));
  return s;
}

function detailRows(
  canonical: CanonicalTransactionalEvent,
  d: Record<string, unknown>,
  lang: 'es' | 'en'
): { label: string; valueHtml: string }[] {
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const planRaw = String(d.plan ?? d.plan_name ?? '');
  const statusRaw = String(d.status ?? '');
  const phone = escapeHtml(phoneVal(d));
  const billing = escapeHtml(billingLabel(d, lang));
  const next = escapeHtml(d.next_date ?? '');
  const end = escapeHtml(d.end_date ?? '');
  const amount = escapeHtml(d.amount ?? d.monto ?? '');
  const currency = escapeHtml(d.currency ?? 'USD');

  switch (canonical) {
    case 'new_purchase':
      return [
        { label: L('Plan', 'Plan'), valueHtml: renderColoredPlanValue(planRaw) },
        { label: L('Estado', 'Status'), valueHtml: renderColoredStatusValue(statusRaw) },
        { label: L('Número SIM', 'SIM number'), valueHtml: phone },
        { label: L('Tipo de plan', 'Plan type'), valueHtml: billing },
        { label: L('Próximo cobro', 'Next charge'), valueHtml: next },
      ];
    case 'cancellation':
      return [
        { label: L('Plan', 'Plan'), valueHtml: renderColoredPlanValue(planRaw) },
        { label: L('Estado', 'Status'), valueHtml: renderColoredStatusValue(statusRaw) },
        { label: L('Número SIM', 'SIM number'), valueHtml: phone },
        { label: L('Tipo de plan', 'Plan type'), valueHtml: billing },
        { label: L('Fecha de cierre', 'End date'), valueHtml: end },
      ];
    case 'upgrade_success':
      return [
        { label: L('Nuevo plan', 'New plan'), valueHtml: renderColoredPlanValue(planRaw) },
        { label: L('Estado', 'Status'), valueHtml: renderColoredStatusValue(statusRaw) },
        { label: L('Número SIM', 'SIM number'), valueHtml: phone },
        { label: L('Tipo de plan', 'Plan type'), valueHtml: billing },
        { label: L('Próximo cobro', 'Next charge'), valueHtml: next },
      ];
    case 'invoice_paid':
      return [
        { label: L('Plan', 'Plan'), valueHtml: renderColoredPlanValue(planRaw) },
        { label: L('Estado', 'Status'), valueHtml: renderColoredStatusValue(statusRaw) },
        { label: L('Monto pagado', 'Amount paid'), valueHtml: amount },
        { label: L('Moneda', 'Currency'), valueHtml: currency },
        { label: L('Número SIM', 'SIM number'), valueHtml: phone },
        { label: L('Próximo cobro', 'Next charge'), valueHtml: next },
      ];
    case 'reactivation_success':
      return [
        { label: L('Plan', 'Plan'), valueHtml: renderColoredPlanValue(planRaw) },
        { label: L('Estado', 'Status'), valueHtml: renderColoredStatusValue(statusRaw) },
        { label: L('Número SIM', 'SIM number'), valueHtml: phone },
        { label: L('Tipo de plan', 'Plan type'), valueHtml: billing },
      ];
    default:
      return [];
  }
}

const ACCENT_PRIMARY = '#1b3a8a';

function buildInnerBlock(params: {
  title: string;
  topHtml: string;
  bottomHtml: string;
  rows: { label: string; valueHtml: string }[];
  /** Solo cancelación + data.reactivation_url; va debajo de bottomHtml y encima del CTA principal. */
  secondaryCta?: { href: string; text: string };
  ctaText: string;
  ctaUrl: string;
}): string {
  const cardBg = '#f1f5f9';
  const cardBorder = '#e2e8f0';
  const bodyTextStyle = 'font-size:16px;color:#64748b;text-align:center;line-height:1.65;';

  const tableBody = params.rows
    .map((row, i) => {
      const isLast = i === params.rows.length - 1;
      const borderBottom = isLast ? 'none' : '1px solid #e2e8f0';
      return `
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;padding:14px 12px 0 0;vertical-align:top;border-bottom:${borderBottom};">${row.label}</td>
                  <td style="font-size:15px;color:#0f172a;font-weight:700;padding:14px 0 0 0;text-align:right;vertical-align:top;border-bottom:${borderBottom};">${row.valueHtml}</td>
                </tr>`;
    })
    .join('');

  const topBlock =
    params.topHtml.trim() !== ''
      ? `<div style="margin:0 0 24px;${bodyTextStyle}">${params.topHtml}</div>`
      : '';
  const bottomBlock =
    params.bottomHtml.trim() !== ''
      ? `<div style="margin:24px 0 24px 0;${bodyTextStyle}">${params.bottomHtml}</div>`
      : '';

  const secondaryOutline = '#1b3a8a';
  const secondaryBlock =
    params.secondaryCta != null
      ? `<div style="text-align:center;margin:0 0 24px 0;">
            <a href="${escapeHtml(params.secondaryCta.href)}"
               style="display:inline-block;background:#ffffff;color:${secondaryOutline} !important;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;border:2px solid ${secondaryOutline};letter-spacing:0.02em;">
              ${escapeHtml(params.secondaryCta.text)}
            </a>
          </div>`
      : '';

  return `
          <h1 style="margin:0 0 12px;font-size:26px;font-weight:600;color:#0f172a;text-align:center;letter-spacing:-0.02em;line-height:1.25;">
            ${params.title}
          </h1>
          ${topBlock}

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${cardBg};border-radius:12px;border:1px solid ${cardBorder};margin-bottom:32px;">
            <tr><td style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableBody}
              </table>
            </td></tr>
          </table>
          ${bottomBlock}
          ${secondaryBlock}

          <div style="text-align:center;margin:0 0 4px 0;">
            <a href="${params.ctaUrl}" class="button"
               style="display:inline-block;background:${ACCENT_PRIMARY};color:#ffffff !important;font-size:16px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 4px 14px rgba(27,58,138,0.28);">
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
    <title>telsim</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
                    <tr>
                        <td style="padding:22px 32px 14px 32px;background:#ffffff;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="left" style="width:100%;">
                                <tr>
                                    <td width="36" style="width:36px;vertical-align:middle;padding:0 6px 0 0;line-height:0;font-size:0;">
                                        <img src="${TELSIM_ISOTIPO_URL}" width="36" height="36" alt="telsim" style="display:block;width:36px;height:36px;max-width:36px;max-height:36px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;border-radius:10px;" />
                                    </td>
                                    <td style="vertical-align:middle;padding:0;line-height:36px;mso-line-height-rule:exactly;">
                                        <span style="font-size:21px;font-weight:900;color:#0f172a;letter-spacing:-0.055em;line-height:36px;display:inline-block;vertical-align:middle;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">telsim</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="height:1px;background:${ACCENT_PRIMARY};line-height:1px;font-size:0;mso-line-height-rule:exactly;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding:40px 36px 36px 36px;line-height:1.6;color:#334155;font-size:16px;">
                            ${innerHtml}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8fafc;padding:22px 24px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px 0;">© 2026 Telvoice Telecom LLC. Todos los derechos reservados.</p>
                            <p style="margin:0;">Has recibido este correo porque eres cliente de telsim.io</p>
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
  /** Título visible (H1) en el cuerpo; si vacío o ausente, se usa el predeterminado del evento. */
  contentTitle?: string | null;
  /** HTML del copy central desde admin_settings (ya con variables sustituidas en prod/test). */
  contentHtml?: string | null;
  /**
   * Bloque inferior (todos los eventos canónicos). Si trim() no vacío, va debajo del cuadro y antes del CTA.
   * Origen: admin `template_email_<event>_below_details` / `<templateId>_below_details` o envío de prueba.
   */
  contentBelowDetails?: string | null;
  lang?: 'es' | 'en';
};

/**
 * Renderiza el email transaccional completo (layout fijo + copy central + filas por evento).
 * Devuelve null si `event` no es uno de los eventos canónicos soportados.
 */
export function renderTransactionalEmail(params: RenderTransactionalEmailParams): { html: string; subject: string } | null {
  const canonical = normalizeCanonicalTransactionalEvent(params.event);
  if (!canonical) return null;

  const lang = params.lang ?? 'es';
  const d = params.data ?? {};
  const defaultTitle = TITLES[canonical][lang];
  const fromParam =
    params.contentTitle != null && String(params.contentTitle).trim() !== ''
      ? String(params.contentTitle).trim()
      : '';
  const fromData =
    typeof params.data?.contentTitle === 'string' && params.data.contentTitle.trim() !== ''
      ? params.data.contentTitle.trim()
      : '';
  const visualTitle = fromParam || fromData || defaultTitle;
  const cta = CTAS[canonical][lang];
  const ctaUrl = CTA_URLS[canonical];

  const rawBody =
    params.contentHtml != null && String(params.contentHtml).trim() !== ''
      ? String(params.contentHtml)
      : `<p>${lang === 'es' ? 'Actualización de tu cuenta telsim.' : 'An update regarding your telsim account.'}</p>`;

  const { topHtml: splitTop, bottomHtml: splitBottom } = splitEmailBodySections(rawBody);

  const explicitBelow =
    params.contentBelowDetails != null && String(params.contentBelowDetails).trim() !== '';
  const topHtml = stripLegacyBelowDetailsMarker(splitTop);
  const bottomHtml = explicitBelow
    ? stripLegacyBelowDetailsMarker(String(params.contentBelowDetails))
    : stripLegacyBelowDetailsMarker(splitBottom);

  let secondaryCta: { href: string; text: string } | undefined;
  if (canonical === 'cancellation') {
    const rawUrl = d.reactivation_url;
    const href = rawUrl != null ? String(rawUrl).trim() : '';
    if (href !== '') {
      secondaryCta = {
        href,
        text: lang === 'es' ? 'Reactivar mi línea' : 'Reactivate my line',
      };
    }
  }

  const rows = detailRows(canonical, d, lang);
  const inner = buildInnerBlock({
    title: escapeHtml(visualTitle),
    topHtml,
    bottomHtml,
    rows,
    secondaryCta,
    ctaText: escapeHtml(cta),
    ctaUrl: String(ctaUrl),
  });

  const html = buildMasterHtml(inner);

  const subj =
    params.subject != null && String(params.subject).trim() !== ''
      ? String(params.subject).trim()
      : interpolateDefaultSubject(DEFAULT_SUBJECTS[canonical][lang], d);

  return { html, subject: subj };
}
