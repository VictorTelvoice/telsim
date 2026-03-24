# `admin-sync-subscriptions-from-stripe`

Acción **solo administrador** en `POST /api/manage` para alinear filas de `public.subscriptions` con el objeto `Subscription` de Stripe (`stripe.subscriptions.retrieve`).

## Seguridad

- Requiere `userId` = `ADMIN_UID` (mismo criterio que otras acciones admin).
- **No** actualiza filas `canceled` / `cancelled` ni `pending_reactivation_cancel`.
- **No** toca `slots`.
- Si Stripe devuelve suscripción terminal (`canceled`, `incomplete_expired`), **no** escribe en BD (evita cancelaciones silenciosas desde esta herramienta).

## Body

```json
{
  "action": "admin-sync-subscriptions-from-stripe",
  "userId": "<ADMIN_UID>",
  "phone_numbers": ["56934449937"],
  "stripe_subscription_ids": ["sub_xxx"],
  "subscription_ids": ["uuid-de-fila"]
```

Al menos uno de: `phone_numbers`, `stripe_subscription_ids`, `subscription_ids`.

## Campos escritos

- `status`, `subscription_status` (estado crudo Stripe), `trial_end`, `current_period_end`, `next_billing_date` (vía `subscriptionBillingSnapshotFromStripe`), `updated_at`.

## Ejemplo (curl)

```bash
curl -sS -X POST "$VERCEL_URL/api/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "admin-sync-subscriptions-from-stripe",
    "userId": "8e7bcada-3f7a-482f-93a7-9d0fd4828231",
    "phone_numbers": ["56934449937"]
  }'
```

Respuesta: `{ ok, count, results }` con una entrada por fila: `applied` (snapshot) o `skipped` / `error`.

## Migración

Asegurar columna `subscription_status` en `subscriptions` (ver `supabase/migrations/20260329120000_subscriptions_subscription_status.sql`).
