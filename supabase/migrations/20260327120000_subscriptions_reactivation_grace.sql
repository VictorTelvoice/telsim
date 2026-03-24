-- Ventana de 48h para reactivar sin nuevo checkout (cancelación programada en Stripe vía cancel_at).
alter table public.subscriptions
  add column if not exists reactivation_grace_until timestamptz;

comment on column public.subscriptions.reactivation_grace_until is
  'Fin de la ventana de reactivación (soft cancel). Null si no aplica.';
