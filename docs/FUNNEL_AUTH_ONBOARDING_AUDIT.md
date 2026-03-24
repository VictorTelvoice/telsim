# Auditoría funnel: auth → onboarding → Stripe → billing

Referencia rápida para soporte/engineering. **Archivos** y **riesgos residuales** por etapa.

| # | Etapa | Entrada | Archivo(s) clave | Estado / tablas | Riesgo residual |
|---|--------|---------|-------------------|-----------------|-----------------|
| 1 | Login / OAuth | `/login`, Google redirect | `screens/auth/Login.tsx`, Supabase Auth | `auth.users` | Config OAuth en dashboard Supabase. |
| 2 | Auth callback | `/#/auth/callback` | `screens/auth/AuthCallback.tsx` | `public.users` (upsert/select onboarding) | **400** en `users` si migraciones/RLS/columnas; mitigado: logs + fallback `/onboarding/region` + timeout 14s. |
| 3 | Sesión global | App shell | `contexts/AuthContext.tsx` | `public.users` (perfil, sync) | `getProfile` devuelve `undefined` ante error; backoff 60s. |
| 4 | Onboarding región | `/onboarding/region` | `screens/onboarding/RegionSelect.tsx` (ruta en `App.tsx`) | `users` (país/moneda/step) | Inconsistencia step si falla guardado. |
| 5 | Resumen / pago | `/onboarding/summary`, `payment` | `Summary.tsx`, `Payment.tsx`, `api/checkout.ts` | reservas slot, metadata checkout | Slot inválido → error en API; revisar mensajes UI. |
| 6 | `reserveSlotForCheckout` | POST checkout | `api/checkout.ts` | `slots`, reservas / `activation_state` según schema | Condiciones de carrera entre usuarios. |
| 7 | Stripe Checkout | redirect Stripe | `api/checkout.ts` (create session) | Stripe Session metadata | Metadata incompleta → webhook no enlaza user/slot. |
| 8 | Webhook `checkout.session.completed` | Stripe → `/api/webhooks/stripe` | `api/webhooks/stripe.ts` | `subscriptions`, `slots`, `stripe_webhook_events`, ledger | Evento marcado `failed` + 500 en error no capturado antes de `processed` (ver `markWebhookFailed`). |
| 9 | `activation_state` | Webhook + app | migraciones slots/activation | tabla slots / activación | Depende de orden de eventos Stripe. |
| 10 | `invoice.payment_succeeded` | Stripe | `api/webhooks/stripe.ts` | facturas / suscripciones | Idempotencia vía tablas de eventos. |
| 11 | Billing usuario | `/dashboard/billing`, `/web` tab | `components/billing/UserBillingPanel.tsx` | `subscriptions`, invoices API | Fetch facturas bajo demanda; no bloquea auth. |
| 12 | One-click / quick checkout | rutas onboarding | `QuickCheckout.tsx`, `api/checkout.ts` | igual que checkout | Misma superficie de metadata/slots. |

## Reglas de robustez aplicadas (callback)

- Errores **PostgREST** (`error` en respuesta) se registran; **no** se asume que `throw`.
- Navegación de escape: **`/onboarding/region`** o **`/web`** según datos; **`window.location.hash`** si `navigate` falla.
- Timeout de resolución **14s** en callback.
- Sin sesión Supabase tras **12s**: UI recuperable con vuelta a login.
