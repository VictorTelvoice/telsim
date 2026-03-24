# Stripe Invoice Branding Playbook (Telsim / Telvoice)

Este playbook documenta cómo utilizamos las **invoices oficiales de Stripe** dentro de Telsim/Telvoice: qué campos se guardan, cómo se exponen al cliente y qué conviene configurar en el Dashboard para mantener un look consistente sin salir del layout oficial.

## Qué partes del diseño de invoice oficial se personalizan en Stripe Dashboard

En Stripe, la factura que ve el cliente debe venir con el **layout oficial** (Stripe-hosted) y con el “look & feel” controlado por la configuración de marca, plantillas y página alojada. En nuestro proyecto, consumimos exclusivamente:

- URLs oficiales generadas por Stripe (`invoice_pdf`, `hosted_invoice_url`, `receipt_url`)
- Montos e impuestos calculados por Stripe (como snapshot en BD para trazabilidad)

## Branding settings

Configurar en el Dashboard para que el cliente reconozca TELSIM/Telvoice en las invoices oficiales.

- `logo`: logotipo principal visible en cabeceras/correos y páginas de factura alojada.
- `icon`: favicon / icono pequeño para pestañas o vistas compactas.
- `brand color`: color principal de marca (encabezados, botones principales).
- `accent color`: color secundario/acentos (links, elementos resaltados).

## Invoice settings

Configurar en el Dashboard para consistencia operativa y compliance.

- `numbering`: prefijo/estilo de numeración (cómo se ve el “Invoice #”).
- `defaults`: moneda, pie de página por defecto, país/formatos cuando aplique y cualquier default que afecte el render final oficial.
- `tax info`: configuración de tax que Stripe inyecta en la factura (incluye impuestos aplicados y breakdown cuando corresponda).

## Invoice templates

El objetivo es personalizar texto y campos sin alterar el layout oficial.

- `memo`: mensaje corto principal (por ejemplo, agradecimiento + referencia de servicio).
- `footer`: texto legal/operativo final (soporte, plazos, avisos).
- `custom fields`: campos adicionales que Stripe muestra dentro del template oficial (por ejemplo: Telvoice/slot, soporte, datos internos que necesitas que el cliente vea).

## Hosted Invoice Page

La “Hosted Invoice Page” es la experiencia alojada por Stripe para que el cliente consulte/descargue/pague desde una URL oficial.

En nuestro proyecto, el cliente puede recibir:

- `hosted_invoice_url`: URL oficial de la factura alojada por Stripe
- y/o `invoice_pdf`: URL oficial del PDF de Stripe (cuando está disponible)
- y/o `receipt_url`: link al recibo del cobro (cuando el PDF alojado no está disponible)

## Qué sí se puede personalizar

- Identidad visual del “wrapper” oficial (logo/icon y colores).
- Texto del template (memo, footer).
- Campos adicionales (custom fields) que Stripe renderiza en su invoice template.
- Numeración y defaults que afectan cómo Stripe arma la factura.

## Qué no se puede personalizar (sin salir del layout oficial de Stripe)

- No construir “PDFs propios” ni reemplazar el render oficial por un PDF generado desde la app.
- No alterar la estructura del documento (tabla de ítems, secciones, estilos base) fuera de lo soportado por las opciones de Stripe para templates/branding.
- No cambiar el mecanismo de pago/hosted page por HTML propio: el cliente debe seguir usando URLs oficiales (`hosted_invoice_url`, `invoice_pdf`, `receipt_url`).

## Recomendación concreta para Telvoice / Telsim

Para Telsim/Telvoice, busca un estilo consistente con:

- Marca: `brand color` y `accent color` acordes al dashboard (misma identidad visual).
- Claridad: memo corto y footer con soporte.
- Utilidad: custom fields para que el cliente identifique “qué servicio es” y tenga un punto de contacto estable.

### Propuesta de plantilla (contenido)

**Nombre de plantilla sugerido:** `TELSIM - Hosted Invoice (v1)`

**Memo sugerido (1-2 líneas):**

> Gracias por tu confianza. Este documento corresponde al pago de tu suscripción con TELSIM/Telvoice.

**Footer sugerido (texto final):**

> Soporte: soporte@telsim.io · WhatsApp: +56 9 0000 0000 · Términos y privacidad en telsim.io

**Custom fields sugeridos para Telsim:**

- `Plan`: nombre del plan (mensual/anual o Starter/Pro/Power, según aplique).
- `Servicio/Slot`: identificador del slot o “Línea” (útil para que el cliente reconozca su contratación).
- `Cliente (alias)`: un alias corto (si lo manejan internamente) o “Telvoice/Telsim account”.
- `Soporte - ticket/ID`: un campo estable que puedas mapear internamente a un ticket (si tienes ese linkage; si no, omitir).

> Nota: Estos campos deben ser alimentados por metadata/soporte del sistema que ya usa Stripe para poblar el invoice template. Si hoy no hay metadata suficiente para un campo, conviene empezar con `Plan` + `Servicio/Slot` (los más accionables).

## Auditoría del código (invoices oficiales Stripe)

### 1) Persistencia (dónde se guardan `invoice_pdf`, `hosted_invoice_url`, `receipt_url`)

- `api/webhooks/stripe.ts`
  - Función `persistSubscriptionInvoiceFromWebhook(...)`.
  - Persistimos un snapshot de factura oficial en `public.subscription_invoices` con:
    - `invoice_pdf: fullInv.invoice_pdf`
    - `hosted_invoice_url: fullInv.hosted_invoice_url`
    - `receipt_url: extractReceiptUrlFromInvoice(fullInv)`

- `supabase/migrations/20260322000000_subscription_invoices.sql`
  - Tabla `public.subscription_invoices`.
  - Columns relevantes:
    - `invoice_pdf text`
    - `hosted_invoice_url text`
    - `receipt_url text`

### 2) Exposición al cliente (dónde se muestran)

- `components/billing/UserBillingPanel.tsx`
  - Componente `InvoicePrimaryAccess`.
  - Lógica de prioridad de CTA:
    1. `invoice_pdf` (botón “Descargar PDF”)
    2. `hosted_invoice_url` (botón “Ver factura”)
    3. `receipt_url` (botón “Ver recibo”)
  - Los botones abren URLs oficiales con `window.open(...)` (no renderizan contenido PDF dentro de la app).

- `api/manage.ts`
  - `mapStripeInvoiceToRow(...)` mapea:
    - `hosted_invoice_url` desde `inv.hosted_invoice_url` (o fallback de BD)
    - `invoice_pdf` desde `inv.invoice_pdf` (o fallback de BD)
    - `receipt_url` derivado por `extractReceiptUrlFromInvoice(inv)` (o fallback de BD)
  - Acción `invoice-resolve`:
    - recupera la invoice en vivo desde Stripe si el cliente solicita sincronizar
    - devuelve URLs oficiales mapeadas para que el UI las use.

### 3) Cómo obtenemos `receipt_url` (confirmación de “fuente oficial”)

- `api/_helpers/stripeInvoice.ts`
  - `extractReceiptUrlFromInvoice(inv)`
  - Lee el `receipt_url` desde el objeto **charge** o desde el **payment_intent.latest_charge** de la invoice de Stripe.

### 4) Confirmación de que NO generamos PDFs propios

- No hay lógica en el repo que genere PDFs (por ejemplo, con `jsPDF`, `pdfmake` o conversión HTML->PDF).
- El UI solo consume y abre URLs oficiales que provienen del objeto `Stripe.Invoice` (o de la persistencia del snapshot en `public.subscription_invoices`).

### 5) Gap entre Stripe y nuestra UI (puntos a vigilar)

- Si Stripe no entrega `invoice_pdf` o `hosted_invoice_url` (por estado `draft/void/uncollectible` o por disponibilidad del objeto), el UI cae a `receipt_url`.
- Si tampoco existe `receipt_url`, el UI mostrará “No disponible” y ofrece “Sincronizar” cuando aplica (vía `invoice-resolve`), para reconsultar la invoice a Stripe.
- La app no “reconstruye” invoice; solo sincroniza enlaces oficiales.

---

Este documento busca que el equipo de Telsim/Telvoice configure Stripe para que las invoices oficiales sean claras, consistentes y alineadas a branding, mientras el código mantiene la integración como “consumo de URLs oficiales” (sin PDFs propios).

