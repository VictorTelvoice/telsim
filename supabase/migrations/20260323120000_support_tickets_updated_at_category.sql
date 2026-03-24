-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: support_tickets — agregar updated_at y category
-- Ejecutar en Supabase SQL Editor si las columnas no existen
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) updated_at
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill: tickets existentes sin updated_at toman created_at
UPDATE public.support_tickets
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 2) category
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS category text
    NOT NULL DEFAULT 'technical'
    CHECK (category IN ('technical','billing','sales','account','other'));

-- 3) Trigger para mantener updated_at al día automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Índice de category para filtros rápidos en admin
CREATE INDEX IF NOT EXISTS idx_support_tickets_category
  ON public.support_tickets(category);
