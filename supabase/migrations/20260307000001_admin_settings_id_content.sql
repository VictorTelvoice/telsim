-- Renombrar columnas de admin_settings a id y content para consistencia con el admin
ALTER TABLE public.admin_settings RENAME COLUMN key TO id;
ALTER TABLE public.admin_settings RENAME COLUMN value TO content;
