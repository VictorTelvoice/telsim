-- Asunto editable por plantilla de email (Telegram/App siguen usando solo `content`).
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS subject text;

COMMENT ON COLUMN public.admin_settings.subject IS 'Asunto del correo (solo filas template_email_*); null en plantillas no-email.';
