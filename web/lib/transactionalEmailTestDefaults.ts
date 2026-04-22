/**
 * Datos de prueba para preview (AdminTemplates) y Enviar Test (api/manage).
 * Copia espejo en `supabase/functions/_shared/transactionalEmailTestDefaults.ts` para Edge Functions.
 */

export function getDefaultAdminEmailTestDataForEvent(event: string): Record<string, unknown> {
  const k = String(event ?? '').trim().toLowerCase();
  const canonical =
    k === 'cancellation' || k === 'subscription_cancelled'
      ? 'cancellation'
      : k === 'upgrade_success' || k === 'subscription_activated'
        ? 'upgrade_success'
        : k === 'invoice_paid'
          ? 'invoice_paid'
          : k === 'reactivation_success'
            ? 'reactivation_success'
            : 'new_purchase';

  const base: Record<string, unknown> = {
    nombre: 'CEO Test',
    email: 'admin@telsim.io',
    phone: '+56900000000',
    phone_number: '+56900000000',
    plan: 'Plan Pro',
    plan_name: 'Plan Pro',
    billing_type: 'Mensual',
    amount: '$39.90',
    monto: '$39.90',
    currency: 'USD',
    slot_id: 'SLOT-TEST',
    message: 'Mensaje de prueba',
  };

  switch (canonical) {
    case 'new_purchase':
      return { ...base, status: 'Activo', next_date: '01/04/2026', end_date: '—' };
    case 'cancellation':
      return {
        ...base,
        status: 'Cancelado',
        end_date: '31/12/2026',
        next_date: '—',
        canceled_at: '20-03-2026 14:30',
        reactivation_deadline: '22-03-2026 14:30',
        reactivation_url: 'https://www.telsim.io/#/web/reactivate-line?token=preview',
      };
    case 'upgrade_success':
      return { ...base, status: 'Activo', next_date: '01/04/2026', end_date: '—' };
    case 'invoice_paid':
      return { ...base, status: 'Pagado', next_date: '01/04/2026', end_date: '—' };
    case 'reactivation_success':
      return { ...base, status: 'Activo', next_date: '—', end_date: '—' };
    default:
      return { ...base, status: 'Activo', next_date: '01/04/2026' };
  }
}

/** Compatibilidad: vista por defecto alineada a new_purchase. */
export const DEFAULT_ADMIN_EMAIL_TEST_DATA = getDefaultAdminEmailTestDataForEvent('new_purchase');
