import Stripe from 'stripe';

/** Charge expandido o objeto eliminado por Stripe (no está en `Stripe.Charge` tipado). */
function receiptUrlFromChargeLike(ch: unknown): string | null {
  if (!ch || typeof ch !== 'object') return null;
  const o = ch as Record<string, unknown>;
  if (o.deleted === true) return null;
  const ru = o.receipt_url;
  return typeof ru === 'string' && ru.length > 0 ? ru : null;
}

export function invoiceTaxCents(inv: Stripe.Invoice): number {
  if (inv.total_tax_amounts && inv.total_tax_amounts.length > 0) {
    return inv.total_tax_amounts.reduce((a, t) => a + (t.amount ?? 0), 0);
  }
  return inv.tax ?? 0;
}

/** Serialización estable para JSONB (trazabilidad fiscal / Stripe Tax). */
export function invoiceTaxBreakdownForDb(inv: Stripe.Invoice): unknown[] {
  return (inv.total_tax_amounts ?? []).map((t) => ({
    amount: t.amount ?? 0,
    inclusive: t.inclusive ?? false,
    tax_rate:
      typeof t.tax_rate === 'string' ? t.tax_rate : t.tax_rate && typeof t.tax_rate === 'object'
        ? (t.tax_rate as Stripe.TaxRate).id
        : null,
    taxability_reason: t.taxability_reason ?? null,
  }));
}

export function invoiceCustomerTaxIdsForDb(inv: Stripe.Invoice): unknown[] {
  const raw = inv.customer_tax_ids;
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') return { tax_id: item };
    const o = item as { id?: string; type?: string; value?: string; country?: string };
    return { id: o.id, type: o.type, value: o.value, country: o.country ?? null };
  });
}

export function extractReceiptUrlFromInvoice(inv: Stripe.Invoice): string | null {
  const ch = inv.charge;
  if (ch && typeof ch === 'object') {
    const url = receiptUrlFromChargeLike(ch);
    if (url) return url;
  }
  const pi = inv.payment_intent;
  if (pi && typeof pi === 'object') {
    const lc = (pi as Stripe.PaymentIntent).latest_charge;
    if (lc && typeof lc === 'object') {
      const url = receiptUrlFromChargeLike(lc);
      if (url) return url;
    }
  }
  return null;
}
