CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IN (
    '8e7bcada-3f7a-482f-93a7-9d0fd4828231'::uuid,
    'd310eaf8-2c82-4c29-9ea8-6d64616774da'::uuid
  );
$$;
