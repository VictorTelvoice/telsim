-- Atomic cancelación de slot + alineación consistente de subscriptions
-- Regla: NO elimina filas de subscriptions.
-- - Live del slot (active/trialing/past_due) => canceled + next_billing_date = NULL
-- - Canceladas con next_billing_date != NULL => next_billing_date = NULL
-- - Slot => status='libre', assigned_to=NULL, plan_type=NULL, sms_limit=NULL
-- Ejecuta todas las actualizaciones en una sola ejecución del RPC (atómico en BD).

create or replace function public.cancel_slot_and_subscriptions_atomic(p_slot_id text)
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_has_sub_updated_at boolean := false;
begin
  -- updated_at no aparece en todas las migraciones del repo; lo verificamos en tiempo de ejecución.
  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'updated_at'
  ) into v_has_sub_updated_at;

  if v_has_sub_updated_at then
    update public.subscriptions
    set status = 'canceled',
        next_billing_date = null,
        updated_at = v_now
    where slot_id = p_slot_id
      and status in ('active', 'trialing', 'past_due');

    update public.subscriptions
    set next_billing_date = null,
        updated_at = v_now
    where slot_id = p_slot_id
      and status in ('canceled', 'cancelled')
      and next_billing_date is not null;
  else
    update public.subscriptions
    set status = 'canceled',
        next_billing_date = null
    where slot_id = p_slot_id
      and status in ('active', 'trialing', 'past_due');

    update public.subscriptions
    set next_billing_date = null
    where slot_id = p_slot_id
      and status in ('canceled', 'cancelled')
      and next_billing_date is not null;
  end if;

  update public.slots
  set status = 'libre',
      assigned_to = null,
      plan_type = null,
      sms_limit = null,
      label = null,
      forwarding_active = false
  where slot_id = p_slot_id;

  return jsonb_build_object('slot_id', p_slot_id);
end;
$$;

