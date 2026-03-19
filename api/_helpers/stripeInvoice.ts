import Stripe from 'stripe';

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
    const c = ch as Stripe.Charge;
    if (!c.deleted && c.receipt_url) return c.receipt_url;
  }
  const pi = inv.payment_intent;
  if (pi && typeof pi === 'object') {
    const lc = (pi as Stripe.PaymentIntent).latest_charge;
    if (lc && typeof lc === 'object') {
      const c2 = lc as Stripe.Charge;
      if (!c2.deleted && c2.receipt_url) return c2.receipt_url;
    }
  }
  return null;
}
