-- Enable RLS on deals (published to supabase_realtime)
-- All authenticated users get full access (shared CRM)
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access to deals"
  ON public.deals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
