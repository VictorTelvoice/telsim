-- cancel_subscriptions_atomic:
--  - SOLO toca public.subscriptions (NO libera slots)
--  - Regla: NO elimina filas
--  - Live: status in (active, trialing, past_due) => status=canceled, next_billing_date=NULL, updated_at=now
--  - Canceladas: status in (canceled, cancelled) con next_billing_date != NULL => next_billing_date=NULL, updated_at=now
--  - Filtro: slot_id = p_slot_id OR phone_number = old phone_number liberado

create or replace function public.cancel_subscriptions_atomic(p_slot_id text, p_old_phone_number text)
returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_old_phone_number text := nullif(trim(p_old_phone_number), '');
begin
  update public.subscriptions
  set status = 'canceled',
      next_billing_date = null,
      updated_at = v_now
  where status in ('active', 'trialing', 'past_due')
    and (
      slot_id = p_slot_id
      or (v_old_phone_number is not null and phone_number = v_old_phone_number)
    );

  update public.subscriptions
  set next_billing_date = null,
      updated_at = v_now
  where status in ('canceled', 'cancelled')
    and next_billing_date is not null
    and (
      slot_id = p_slot_id
      or (v_old_phone_number is not null and phone_number = v_old_phone_number)
    );

  return jsonb_build_object('slot_id', p_slot_id);
end;
$$;

-- release_slot_atomic:
--  - SOLO toca public.slots
create or replace function public.release_slot_atomic(p_slot_id text)
returns jsonb
language plpgsql
as $$
begin
  update public.slots
  set status = 'libre',
      assigned_to = null,
      plan_type = null,
      label = null,
      forwarding_active = false
  where slot_id = p_slot_id;

  return jsonb_build_object('slot_id', p_slot_id);
end;
$$;

-- cancel_slot_and_subscriptions_atomic:
--  wrapper por compatibilidad (cancela subs y libera slot en el orden correcto)
create or replace function public.cancel_slot_and_subscriptions_atomic(p_slot_id text, p_old_phone_number text)
returns jsonb
language plpgsql
as $$
begin
  perform public.cancel_subscriptions_atomic(p_slot_id, p_old_phone_number);
  perform public.release_slot_atomic(p_slot_id);
  return jsonb_build_object('slot_id', p_slot_id);
end;
$$;

