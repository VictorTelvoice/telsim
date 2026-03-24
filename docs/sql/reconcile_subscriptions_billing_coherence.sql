-- =============================================================================
-- Reconciliación segura: subscriptions con billing incoherente (histórico)
--
-- Ejecutar primero el bloque PREVIEW (solo SELECT).
-- Revisar filas; luego ejecutar APPLY en transacción (orden de updates importa).
--
-- Reglas aplicadas:
-- 1. trialing + trial_end → next_billing_date = trial_end
-- 2. active + trial_end futuro → status = trialing, next_billing_date = trial_end
-- 3. active + next_billing_date < created_at + current_period_end → next_billing_date = current_period_end
--
-- No toca filas canceled/cancelled.
-- No inventa current_period_end.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PREVIEW (solo lectura)
-- ---------------------------------------------------------------------------

-- Regla 2 (listar primero en preview: son las filas “active” con trial vigente)
SELECT
  'rule2_active_to_trialing' AS rule,
  id,
  status,
  trial_end,
  next_billing_date,
  created_at
FROM public.subscriptions
WHERE lower(trim(status)) = 'active'
  AND trial_end IS NOT NULL
  AND trial_end > now();

-- Regla 1: trialing con next distinto de trial_end
SELECT
  'rule1_trialing_next_align' AS rule,
  id,
  status,
  trial_end,
  next_billing_date,
  created_at
FROM public.subscriptions
WHERE lower(trim(status)) = 'trialing'
  AND trial_end IS NOT NULL
  AND next_billing_date IS DISTINCT FROM trial_end;

-- Regla 3: active con next anterior a alta y CPE disponible
SELECT
  'rule3_next_before_created_use_cpe' AS rule,
  id,
  status,
  created_at,
  next_billing_date,
  current_period_end
FROM public.subscriptions
WHERE lower(trim(status)) = 'active'
  AND next_billing_date IS NOT NULL
  AND next_billing_date < created_at
  AND current_period_end IS NOT NULL;

-- ---------------------------------------------------------------------------
-- APPLY — orden: 2 → 1 → 3 (primero corregir estado trial, luego alinear fechas)
-- ---------------------------------------------------------------------------
/*
BEGIN;

UPDATE public.subscriptions
SET
  status = 'trialing',
  next_billing_date = trial_end,
  updated_at = now()
WHERE lower(trim(status)) = 'active'
  AND trial_end IS NOT NULL
  AND trial_end > now();

UPDATE public.subscriptions
SET
  next_billing_date = trial_end,
  updated_at = now()
WHERE lower(trim(status)) = 'trialing'
  AND trial_end IS NOT NULL
  AND next_billing_date IS DISTINCT FROM trial_end;

UPDATE public.subscriptions
SET
  next_billing_date = current_period_end,
  updated_at = now()
WHERE lower(trim(status)) = 'active'
  AND next_billing_date IS NOT NULL
  AND next_billing_date < created_at
  AND current_period_end IS NOT NULL;

COMMIT;
*/
