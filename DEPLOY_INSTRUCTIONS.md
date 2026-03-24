# Guía de despliegue — Telsim (Supabase)

Para que los cambios locales (sobre todo el **formato de mensaje SMS → Telegram**) suban a la nube y reemplacen el mensaje antiguo (“fantasma”), sigue estos pasos.

## Requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado.
- Proyecto de Supabase vinculado (o credenciales listas para vincular).

## 1. Vincular el proyecto (si aún no está vinculado)

Desde la raíz del repo:

```bash
cd /Users/victorgarces/telsim-app/telsim-app
supabase login
supabase link --project-ref TU_PROJECT_REF
```

`TU_PROJECT_REF` lo encuentras en el dashboard de Supabase: **Project Settings → General → Reference ID**.

## 2. Estructura de la Edge Function

La plantilla de mensaje SMS→Telegram de este repo está en:

- **`functions/telegram-forwarder/index.ts`**

Supabase CLI espera las funciones en **`supabase/functions/`**. Si en tu repo la función está solo en `functions/telegram-forwarder/`, tienes dos opciones:

**Opción A — Copiar para desplegar**

```bash
mkdir -p supabase/functions
cp -R functions/telegram-forwarder supabase/functions/
```

**Opción B** — Si ya tienes `supabase/functions/telegram-forwarder/` con el mismo código, no hace falta copiar.

## 3. Desplegar la Edge Function

Desde la raíz del repo (donde tengas `supabase/` o desde la raíz del proyecto):

```bash
supabase functions deploy telegram-forwarder
```

Si la función está en `functions/` y no en `supabase/functions/`, despliega indicando la ruta del código (según la versión de la CLI). En versiones recientes:

```bash
supabase functions deploy telegram-forwarder --project-ref TU_PROJECT_REF
```

(La CLI suele leer el código desde `supabase/functions/telegram-forwarder/`; asegúrate de que ese directorio exista y contenga el `index.ts` actualizado.)

## 4. Configurar quién llama al forwarder (evitar el mensaje fantasma)

El mensaje con formato antiguo suele venir de **otro** servicio que se ejecuta al insertar en `automation_logs`. Para que solo se use el formato de este repo:

1. En el **Dashboard de Supabase**: **Database → Webhooks** (o **Edge Functions**).
2. Revisa qué se ejecuta cuando hay un **INSERT** en la tabla **`automation_logs`**.
3. Asegúrate de que ese flujo invoque **solo** la URL de la Edge Function **`telegram-forwarder`** que acabas de desplegar.
4. El body del POST debe ser:

```json
{
  "token": "<del payload>",
  "chat_id": "<del payload>",
  "sender": "<payload.sender>",
  "verification_code": "<payload.code>",
  "content": "<payload.text>"
}
```

Nombres en `automation_logs.payload`: `token`, `chat_id`, `sender`, `code`, `text`.

Si hay otro webhook o función que envía a Telegram con otra plantilla, desactívalo o redirígelo a esta función para que el mensaje “fantasma” desaparezca.

## 5. Resumen de comandos (copiar/pegar)

```bash
# Desde la raíz del repo
cd /Users/victorgarces/telsim-app/telsim-app

# Login y link (solo una vez)
supabase login
supabase link --project-ref TU_PROJECT_REF

# Si usas estructura supabase/functions: copiar el forwarder
mkdir -p supabase/functions
cp -R functions/telegram-forwarder supabase/functions/

# Desplegar
supabase functions deploy telegram-forwarder
```

Después, comprueba en el dashboard que la función está desplegada y que el flujo que reacciona a `automation_logs` apunta a esta función.
