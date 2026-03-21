/**
 * Renderer único para emails transaccionales canónicos (producción, tests, preview).
 * Sin dependencias de Deno/React — importable desde send-email y Vite.
 */

export type CanonicalTransactionalEvent = 'new_purchase' | 'cancellation' | 'upgrade_success' | 'invoice_paid';

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

/** Datos de prueba alineados con AdminTemplates TEST_VARS (manage send-notification-test). */
export const DEFAULT_ADMIN_EMAIL_TEST_DATA: Record<string, unknown> = {
  nombre: 'CEO Test',
  email: 'admin@telsim.io',
  phone: '+56900000000',
  phone_number: '+56900000000',
  plan: 'Plan Pro',
  plan_name: 'Plan Pro',
  status: 'Activo',
  end_date: '31/12/2026',
  next_date: '01/04/2026',
  billing_type: 'Mensual',
  amount: '$39.90',
  monto: '$39.90',
  currency: 'USD',
  slot_id: 'SLOT-TEST',
  message: 'Mensaje de prueba',
};

const TITLES: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: '¡Suscripción activada!', en: 'Subscription activated!' },
  cancellation: { es: 'Cancelación confirmada', en: 'Cancellation confirmed' },
  upgrade_success: { es: '¡Plan actualizado!', en: 'Plan updated!' },
  invoice_paid: { es: 'Pago confirmado', en: 'Payment confirmed' },
};

const CTAS: Record<CanonicalTransactionalEvent, { es: string; en: string }> = {
  new_purchase: { es: 'Ir al Dashboard', en: 'Go to Dashboard' },
  cancellation: { es: 'Ver mis líneas', en: 'View my lines' },
  upgrade_success: { es: 'Revisar mi plan', en: 'Review my plan' },
  invoice_paid: { es: 'Ver facturación', en: 'View billing' },
};

const CTA_URLS: Record<CanonicalTransactionalEvent, string> = {
  new_purchase: 'https://www.telsim.io/dashboard#/dashboard',
  cancellation: 'https://www.telsim.io/dashboard#/dashboard',
  upgrade_success: 'https://www.telsim.io/#/web',
  invoice_paid: 'https://www.telsim.io/dashboard#/login',
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
        { label: L('Monto pagado', 'Amount paid'), value: amount },
        { label: L('Moneda', 'Currency'), value: currency },
        { label: L('Número SIM', 'SIM number'), value: phone },
        { label: L('Próximo cobro', 'Next charge'), value: next },
      ];
    default:
      return [];
  }
}

function buildInnerBlock(params: {
  title: string;
  introHtml: string;
  rows: { label: string; value: string }[];
  ctaText: string;
  ctaUrl: string;
}): string {
  const primaryBlue = '#0074d4';
  const valueColor = '#111827';
  const labelStyle = 'font-size:11px;color:#6b7280;font-weight:700;padding:12px 0 4px 0;vertical-align:top;';
  const valueStyle = `font-size:14px;font-weight:700;color:${valueColor};padding:4px 0 12px 0;text-align:right;vertical-align:top;`;
  const infoBoxBg = '#f0f4ff';

  const tableBody = params.rows
    .map(
      (row) => `
                <tr>
                  <td style="${labelStyle}">${row.label}</td>
                  <td style="${valueStyle}">${row.value}</td>
                </tr>`
    )
    .join('');

  return `
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;text-align:center;">
            ${params.title}
          </h1>
          <div style="margin:0 0 24px;font-size:16px;color:#6b7280;text-align:center;line-height:1.6;">
            ${params.introHtml}
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:${infoBoxBg};border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableBody}
              </table>
            </td></tr>
          </table>

          <div style="text-align:center;margin-bottom:8px;">
            <a href="${params.ctaUrl}" class="button"
               style="display:inline-block;background:${primaryBlue};color:#fff !important;font-size:17px;font-weight:700;padding:16px 42px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(0,116,212,0.35);">
              ${params.ctaText} →
            </a>
          </div>`;
}

const MASTER_HTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f9; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background-color: #0074d4; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: bold; }
        .content { padding: 40px; line-height: 1.6; color: #333333; font-size: 16px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TELSIM</h1>
        </div>
        <div class="content">
            {{INNER}}
        </div>
        <div class="footer">
            <p>© 2026 Telvoice Telecom LLC. Todos los derechos reservados.</p>
            <p>Has recibido este correo porque eres cliente de Telsim.io</p>
        </div>
    </div>
</body>
</html>`;

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

  const html = MASTER_HTML.replace('{{INNER}}', inner);

  const subj =
    params.subject != null && String(params.subject).trim() !== ''
      ? String(params.subject).trim()
      : DEFAULT_SUBJECTS[canonical][lang];

  return { html, subject: subj };
}
