-- Reemplaza `release_slot_atomic` alineado al esquema actual de `public.slots` (idempotente en proyectos ya migrados).

create or replace function public.release_slot_atomic(p_slot_id text)
returns jsonb
language plpgsql
as $$
declare
  v_phone text;
begin
  select s.phone_number into v_phone
  from public.slots s
  where s.slot_id = p_slot_id
  for update;

  perform public.cancel_subscriptions_atomic(
    p_slot_id,
    nullif(trim(coalesce(v_phone, '')), '')
  );

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
