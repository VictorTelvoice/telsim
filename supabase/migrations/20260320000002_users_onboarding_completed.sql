-- Estado mínimo de onboarding para redirección post-auth
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

