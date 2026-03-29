ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.deal_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.deal_insights
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.deal_activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.deal_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.deal_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.company_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.company_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.gmail_tokens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
