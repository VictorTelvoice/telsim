-- release_slot_atomic: ya no solo toca `slots`.
-- Garantiza cancelación local de subscriptions ANTES de liberar el slot (sin depender de triggers).
-- Idempotente: si el slot ya está libre, igual corre cancel_subscriptions_atomic (corrige subs huérfanas en trialing/active)
-- y luego el UPDATE de slots (sin cambio efectivo si ya era libre).

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

-- Wrapper: release_slot_atomic ya cancela; mantenemos perform extra por compatibilidad con hints explícitos.
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
