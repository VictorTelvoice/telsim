CREATE TABLE IF NOT EXISTS public.user_feedback_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('rated', 'dismissed')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own feedback status" ON public.user_feedback_status;
CREATE POLICY "Users can read own feedback status"
  ON public.user_feedback_status
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own feedback status" ON public.user_feedback_status;
CREATE POLICY "Users can insert own feedback status"
  ON public.user_feedback_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own feedback status" ON public.user_feedback_status;
CREATE POLICY "Users can update own feedback status"
  ON public.user_feedback_status
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can read feedback status" ON public.user_feedback_status;
CREATE POLICY "Admin can read feedback status"
  ON public.user_feedback_status
  FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_user_feedback_status_completed_at
  ON public.user_feedback_status(completed_at desc);

CREATE OR REPLACE FUNCTION public.set_user_feedback_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_feedback_status_updated_at ON public.user_feedback_status;
CREATE TRIGGER trg_user_feedback_status_updated_at
BEFORE UPDATE ON public.user_feedback_status
FOR EACH ROW
EXECUTE FUNCTION public.set_user_feedback_status_updated_at();
