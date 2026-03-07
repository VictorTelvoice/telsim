# Flujo SMS → Telegram

## En este repositorio

1. **Trigger en BD:** `supabase_migration.sql` define `process_sms_forwarding()` que, ante un INSERT en `sms_logs`, inserta en `automation_logs` con `payload`: `token`, `chat_id`, `sender`, `code`, `text`.

2. **Plantilla de mensaje:** La única plantilla de SMS→Telegram en este repo está en **`functions/telegram-forwarder/index.ts`**. Usa el formato HTML Premium:
   - `📩 NUEVO SMS RECIBIDO`
   - `📱 De:`, `🔑 Código OTP:`, `💬 Mensaje:`, `📡 Enviado vía Telsim`
   - `parse_mode: 'HTML'`

3. **Quién llama al forwarder:** Este repo **no** contiene el código que lee `automation_logs` y hace POST al telegram-forwarder. Eso suele configurarse en Supabase (Database Webhook al insert en `automation_logs` o una Edge Function que procese la cola).

## Si sigues viendo el formato antiguo

Si el SMS en Telegram muestra **🏢 Servicio:, 👤 De:, 🔑 Código (toca para copiar):**, ese texto **no está en este repo**. Búsqueda global por esos emojis y frases no devuelve resultados aquí.

Posibles orígenes:

- Otra **Edge Function** en Supabase (creada en el Dashboard o en otro repo) que construye ese mensaje.
- Un **Database Webhook** que apunta a un endpoint distinto del `telegram-forwarder` de este repo.
- Un **cron/job** externo que lee `automation_logs` y envía con otra plantilla.

**Qué hacer:** En el proyecto de Supabase, revisa **Database Webhooks** y **Edge Functions**. Asegúrate de que, cuando se inserta en `automation_logs`, se invoque la URL del `telegram-forwarder` desplegado desde este repo, con body:

```json
{
  "token": "<del payload>",
  "chat_id": "<del payload>",
  "sender": "<payload.sender o payload.sender>",
  "verification_code": "<payload.code>",
  "content": "<payload.text>"
}
```

Nombres de campos en `automation_logs.payload`: `token`, `chat_id`, `sender`, `code`, `text`.
