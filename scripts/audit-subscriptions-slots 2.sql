-- Auditoría subscriptions ↔ slots (ejecutar en SQL de Supabase / psql)
-- Ajusta nombres de esquema si usas otro que no sea public.

-- 1) Slot libre pero hay suscripción “viva” apuntando a ese slot
SELECT s.slot_id,
       sl.status AS slot_status,
       s.id AS subscription_id,
       s.status AS sub_status,
       s.stripe_subscription_id
FROM public.subscriptions s
JOIN public.slots sl ON sl.slot_id = s.slot_id
WHERE sl.status = 'libre'
  AND s.status IN ('active', 'trialing', 'past_due');

-- 2) Suscripción viva sin monthly_limit operativo
SELECT id, slot_id, plan_name, status, monthly_limit, stripe_subscription_id
FROM public.subscriptions
WHERE status IN ('active', 'trialing', 'past_due')
  AND (monthly_limit IS NULL OR monthly_limit <= 0);

-- 3) Más de una fila viva por slot (mismo slot_id)
SELECT slot_id, COUNT(*) AS live_rows
FROM public.subscriptions
WHERE status IN ('active', 'trialing', 'past_due')
GROUP BY slot_id
HAVING COUNT(*) > 1;

-- 4) Suscripción cancelada pero slot sigue ocupado por la misma asignación “huérfana”
SELECT s.id, s.slot_id, s.status AS sub_status, sl.status AS slot_status, sl.assigned_to, s.user_id
FROM public.subscriptions s
JOIN public.slots sl ON sl.slot_id = s.slot_id
WHERE s.status IN ('canceled', 'cancelled')
  AND sl.status = 'ocupado'
  AND sl.assigned_to IS NOT DISTINCT FROM s.user_id;

-- 5) Slot ocupado sin ninguna suscripción viva coherente (mismo user / slot)
SELECT sl.slot_id, sl.status, sl.assigned_to, sl.plan_type
FROM public.slots sl
WHERE sl.status = 'ocupado'
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.slot_id = sl.slot_id
      AND s.status IN ('active', 'trialing', 'past_due')
      AND (sl.assigned_to IS NULL OR s.user_id = sl.assigned_to)
  );
