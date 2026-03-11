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

## Variables de entorno

Ver `.env.example` para la lista completa de variables requeridas.

## Contacto

info@telsim.io · https://telsim.io
