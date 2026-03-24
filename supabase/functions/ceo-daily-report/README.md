# ceo-daily-report

Edge Function que envía un **Resumen Ejecutivo Telsim** diario al CEO por Telegram.

## Variables de entorno (Supabase Secrets)

Configurar en el proyecto Supabase (Dashboard → Project Settings → Edge Functions → Secrets) o con CLI:

```bash
supabase secrets set TELEGRAM_ADMIN_TOKEN="<token del bot de Telegram del CEO>"
supabase secrets set TELEGRAM_ADMIN_CHAT_ID="<chat_id del CEO>"
supabase secrets set CEO_REPORT_CRON_SECRET="<clave larga y aleatoria para autorizar invocación>"
```

- **TELEGRAM_ADMIN_TOKEN**: Token del bot de Telegram que enviará el mensaje al CEO.
- **TELEGRAM_ADMIN_CHAT_ID**: ID del chat de Telegram del CEO donde se recibe el reporte.
- **CEO_REPORT_CRON_SECRET**: Clave secreta; solo quien la conozca (p. ej. un CRON) podrá ejecutar la función.

## Seguridad

La función **solo se ejecuta** si la petición está autorizada mediante una de estas opciones:

1. **Header** `X-Cron-Secret: <CEO_REPORT_CRON_SECRET>`
2. **Header** `Authorization: Bearer <CEO_REPORT_CRON_SECRET>`
3. **Body JSON** `{ "cron_secret": "<CEO_REPORT_CRON_SECRET>" }`

Cualquier otra petición recibe `401 Unauthorized`.

## Despliegue

```bash
supabase functions deploy ceo-daily-report --project-ref <TU_PROJECT_REF>
```

## Invocación desde CRON (ejemplo)

Con **Vercel Cron** o **GitHub Actions** (o cualquier scheduler), hacer un POST a la URL de la función con el secreto:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ceo-daily-report" \
  -H "Authorization: Bearer <CEO_REPORT_CRON_SECRET>" \
  -H "Content-Type: application/json"
```

O con header dedicado:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ceo-daily-report" \
  -H "X-Cron-Secret: <CEO_REPORT_CRON_SECRET>" \
  -H "Content-Type: application/json"
```

Para ejecución diaria (p. ej. 8:00 UTC), configurar el CRON con una de las dos formas anteriores.

## Contenido del reporte

- **Datos financieros**: Ventas últimas 24h (subscriptions creadas en ese periodo), MRR total (suscripciones active/trialing).
- **Inventario SIMs**: Conteo de slots libres vs ocupadas (tabla `slots`).
- **Usuarios**: Nuevos registros hoy (tabla `users`, `created_at` >= inicio del día).

El mensaje se envía en Markdown con emojis (📈 Resumen Ejecutivo, 💰 Datos financieros, 📱 Inventario, 👤 Usuarios).
