# Reparar `next_billing_date` / `current_period_end` en `subscriptions`

## Causa típica

- Upgrade **instantáneo** (`api/manage` → `stripe.subscriptions.update`) no persistía fechas en BD hasta que llegara el webhook (y el bloque `planChanged` no escribía esos campos).
- Fila insertada por upgrade Checkout sin `subscription_status` o con webhook fallido / datos incoherentes.

## Opción A — Admin API (recomendado)

`POST /api/manage` con `action: 'admin-sync-subscriptions-from-stripe'` y `phone_numbers: ['56934449937']` (y `userId` admin). Véase `docs/api/admin-sync-subscriptions-from-stripe.md`.

## Opción B — SQL puntual

1. En Stripe Dashboard (o API), anota `current_period_end` de la suscripción activa (`sub_...`) en **segundos Unix** o ISO.
2. Convierte a ISO UTC, p. ej. `2027-03-23T...`.

```sql
-- Ajusta: id de fila, fechas ISO desde Stripe, stripe_subscription_id
UPDATE public.subscriptions
SET
  current_period_end = '2027-03-23T00:00:00.000Z'::timestamptz,
  next_billing_date  = '2027-03-23T00:00:00.000Z'::timestamptz,
  trial_end            = NULL,
  status               = 'active',
  subscription_status  = 'active',
  updated_at           = now()
WHERE stripe_subscription_id = 'sub_XXXXXXXXXXXX'
  AND slot_id = '1A';
```

Si `trial_end` sigue vigente en Stripe, copia también ese campo desde el snapshot.

## Verificación UI

Facturación usa `resolveSubscriptionNextBillingIso`: para `active` → `next_billing_date` luego `current_period_end`. Con ambos rellenos, desaparece "No disponible".
