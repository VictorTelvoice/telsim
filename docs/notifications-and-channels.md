# 🛰️ Infraestructura de Notificaciones y Canales - Telsim

Este documento detalla cómo Telsim se comunica con los usuarios y administradores, y define la hoja de ruta para la Dinamización de Plantillas vía el Panel Admin.

## 1. Canales de Comunicación

| Canal | Tecnología | Proveedor | Uso Principal |
|-------|------------|-----------|---------------|
| **Email** | Edge Functions | Resend | Bienvenida, Facturación, Seguridad. |
| **Telegram** | Bot API | Telegram | Notificaciones de SMS, Alertas CEO, Logs. |
| **App Toasts** | DOM Injections | Nativo (JS/CSS) | Feedback de interfaz (copiar, login). |

## 2. Inventario de Disparadores (Triggers)

### 📧 Correos Electrónicos (`triggerEmail`)

**Ubicación lógica:** `api/_helpers/notifications.ts` y Edge Function `send-email`.

- **subscription_activated:** Se dispara tras el webhook exitoso de Stripe.
- **subscription_cancelled:** Se dispara al terminar un ciclo o cancelar manualmente.
- **welcome_email:** Se envía al completar el registro del usuario.

### 🤖 Telegram (`sendTelegramNotification`)

**Ubicación lógica:** `api/webhooks/stripe.ts` y `supabase/functions/telegram-forwarder`.

- **new_sms_forward:** Reenvío de SMS entrante al bot del usuario.
- **ceo_daily_report:** Reporte de ventas y salud del sistema para el CEO.
- **sim_error_alert:** Notificación inmediata de falla en un slot físico.

## 3. Hoja de Ruta: Dinamización (Dynamic Templates)

Para eliminar el texto "hardcoded" (fijo en el código), migraremos a un sistema basado en la tabla **admin_settings**.

### Estructura de la Tabla `admin_settings`

| Campo | Descripción |
|-------|-------------|
| **id** | Identificador único (ej: `template_tg_new_sms`). |
| **content** | El texto con variables (ej: *Recibiste un SMS en {{phone}}*). |
| **label** | Nombre legible para el Panel Admin. |

### Variables del Sistema Disponibles

| Variable | Descripción |
|----------|-------------|
| `{{nombre}}` | Nombre del usuario. |
| `{{email}}` | Correo del destinatario. |
| `{{phone}}` | Número de la SIM involucrada. |
| `{{plan}}` | Nombre del plan activo. |
| `{{message}}` | Contenido del SMS recibido. |
| `{{slot_id}}` | Identificador físico del hardware. |

## 4. Estándares de UI (Toasts)

Actualmente gestionados mediante `document.createElement` en **WebDashboard.tsx** y **MyNumbers.tsx**.

**Meta:** Migrar a una librería de estados (**sonner**) vinculada a las plantillas dinámicas `template_app_*`.
