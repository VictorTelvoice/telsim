/**
 * Checkout unificado: dirección de facturación obligatoria; impuestos Stripe Tax / tax IDs solo si el entorno lo habilita tras compliance.
 *
 * Env (opcional, por defecto desactivado):
 * - STRIPE_CHECKOUT_AUTOMATIC_TAX=true  → automatic_tax + customer_update (requiere Stripe Tax configurado en el Dashboard)
 * - STRIPE_CHECKOUT_TAX_ID_COLLECTION=true → tax_id_collection en Checkout
 */
export function applyStripeCheckoutBillingCompliance(sessionConfig: Record<string, unknown>): void {
  sessionConfig.billing_address_collection = 'required';

  if (process.env.STRIPE_CHECKOUT_AUTOMATIC_TAX === 'true') {
    (sessionConfig as any).automatic_tax = { enabled: true };
    (sessionConfig as any).customer_update = { address: 'auto', name: 'auto' };
  }

  if (process.env.STRIPE_CHECKOUT_TAX_ID_COLLECTION === 'true') {
    (sessionConfig as any).tax_id_collection = { enabled: true };
  }
}
