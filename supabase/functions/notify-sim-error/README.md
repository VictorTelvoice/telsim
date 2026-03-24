# notify-sim-error

Edge Function que envía una **alerta urgente por Telegram al CEO** cuando un slot pasa a estado `error`. Es invocada por el **trigger de PostgreSQL** sobre la tabla `slots`.

## Variables de entorno (Supabase Secrets)

```bash
supabase secrets set TELEGRAM_ADMIN_TOKEN="<token del bot del CEO>"
supabase secrets set TELEGRAM_ADMIN_CHAT_ID="<chat_id del CEO>"
supabase secrets set SLOT_ERROR_WEBHOOK_SECRET="<clave larga y aleatoria>"
```

- **TELEGRAM_ADMIN_TOKEN** / **TELEGRAM_ADMIN_CHAT_ID**: mismo bot y chat que el reporte diario del CEO.
- **SLOT_ERROR_WEBHOOK_SECRET**: clave que debe coincidir con la guardada en `private.edge_function_config` para que el trigger pueda llamar a esta función.

## Payload

El trigger envía un POST con body JSON:

- **slot_id** (requerido): ID del slot afectado.
- **phone_number** (opcional): número de teléfono del slot.
- **webhook_secret**: el mismo valor que `SLOT_ERROR_WEBHOOK_SECRET` (para autorización).

Autorización alternativa: header `X-Webhook-Secret: <SLOT_ERROR_WEBHOOK_SECRET>`.

## Mensaje enviado al CEO

Texto enviado por Telegram (Markdown):

```
ALERTA DE INFRAESTRUCTURA: El Slot [ID] ha entrado en estado de error. Por favor, revisa el panel de administración.
Teléfono: [número si existe]
```

## Configuración del trigger (después del deploy)

1. Desplegar la función:
   ```bash
   supabase functions deploy notify-sim-error --project-ref <TU_PROJECT_REF>
   ```

2. En la base de datos, insertar la URL y el secret para que el trigger pueda llamar a la función:
   ```sql
   INSERT INTO private.edge_function_config (key, value) VALUES
     ('notify_sim_error_url', 'https://TU_PROJECT_REF.supabase.co/functions/v1/notify-sim-error'),
     ('notify_sim_error_secret', 'EL_MISMO_VALOR_QUE_SLOT_ERROR_WEBHOOK_SECRET')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```

Sustituir `TU_PROJECT_REF` por el Project Reference de tu proyecto Supabase (Dashboard → Project Settings → General).

## Cuándo se dispara

El trigger **solo** se ejecuta cuando:

- Hay un **UPDATE** en la tabla `slots`.
- El valor de **status** **cambia** a `'error'` (se compara en minúsculas y sin espacios).

En ese momento el trigger llama a esta Edge Function con el `slot_id` y `phone_number` del registro actualizado.
