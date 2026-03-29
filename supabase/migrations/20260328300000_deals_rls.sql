ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.deals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
