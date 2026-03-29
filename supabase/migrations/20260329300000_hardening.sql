-- 1. Enable RLS on notes (missed in 20260330100000_notes_table.sql)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Defense-in-depth: deny anon access to gmail_tokens
-- (all access is via server actions as postgres role, but block anon just in case)
CREATE POLICY "Deny anon access" ON public.gmail_tokens
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- 3. Composite indexes for common ORDER BY patterns on detail pages
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_created
  ON deal_activities (deal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_insights_deal_generated
  ON deal_insights (deal_id, generated_at DESC);
