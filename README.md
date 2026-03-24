# Telsim

Infraestructura de SIM física para bots y automatizaciones.

## ¿Qué es Telsim?

Telsim provee números SIM reales (no VoIP) para bots, automatizaciones y desarrolladores que necesitan recibir SMS y autenticarse en servicios que bloquean números virtuales.

## Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Pagos**: Stripe
- **Email**: Resend
- **Deploy**: Vercel + Cloudflare

## Servicios

- Números SIM físicos reales
- Recepción de SMS en tiempo real
- API REST + Webhooks
- Notificaciones por Telegram
- Dashboard de gestión
- Planes: Starter, Pro, Power

## Desarrollo local

```bash
npm install
npm run dev
```

La app corre con Vite en `http://localhost:3000`.

## Variables de entorno

Usa `.env.local` para desarrollo. La app ahora requiere explícitamente:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Para endpoints serverless y webhooks también necesitas, según el flujo que vayas a probar:

```bash
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VITE_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_ADMIN_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
```

Revisa [`.env.example`](/Users/victor/Documents/GitHub/telsim/telsim2.0/.env.example) como plantilla base.

## Validación

```bash
npm run lint
npm run build
```

## Estructura útil

- `screens/`: vistas de onboarding, dashboard y admin
- `api/`: funciones serverless para checkout, gestión y webhooks
- `supabase/functions/`: Edge Functions
- `lib/` y `contexts/`: clientes, helpers y estado compartido

## Contacto

info@telsim.io · https://telsim.io
