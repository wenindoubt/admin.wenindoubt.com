-- Enums
CREATE TYPE talent_tier AS ENUM ('S', 'A', 'B', 'C', 'D');
CREATE TYPE talent_status AS ENUM ('active', 'inactive', 'archived');

-- tags: add scope
ALTER TABLE tags ADD COLUMN scope text NOT NULL DEFAULT 'general';

-- talent table
CREATE TABLE talent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  email         text,
  phone         text,
  linkedin_url  text,
  tier          talent_tier NOT NULL,
  status        talent_status NOT NULL DEFAULT 'active',
  bio           text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector
);

CREATE INDEX idx_talent_tier ON talent (tier);
CREATE INDEX idx_talent_status ON talent (status);
CREATE INDEX idx_talent_tier_status ON talent (tier, status) WHERE status != 'archived';
CREATE INDEX idx_talent_search_vector ON talent USING gin (search_vector);
ALTER TABLE talent ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent FORCE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read access" ON talent FOR SELECT TO authenticated USING (true);

-- talent searchVector trigger
CREATE OR REPLACE FUNCTION public.talent_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'english',
    coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER talent_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.talent
  FOR EACH ROW EXECUTE FUNCTION public.talent_search_vector_update();

-- talent_tags junction
CREATE TABLE talent_tags (
  talent_id uuid NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (talent_id, tag_id)
);
CREATE INDEX idx_talent_tags_tag_id ON talent_tags (tag_id);
ALTER TABLE talent_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_tags FORCE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read access" ON talent_tags FOR SELECT TO authenticated USING (true);

-- talent_deals junction
CREATE TABLE talent_deals (
  talent_id   uuid NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  deal_id     uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (talent_id, deal_id)
);
CREATE INDEX idx_talent_deals_deal_id ON talent_deals (deal_id);
CREATE INDEX idx_talent_deals_talent_id ON talent_deals (talent_id);
ALTER TABLE talent_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_deals FORCE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read access" ON talent_deals FOR SELECT TO authenticated USING (true);

-- notes: add talent_id FK
ALTER TABLE notes ADD COLUMN talent_id uuid REFERENCES talent(id) ON DELETE CASCADE;
CREATE INDEX idx_notes_talent_id ON notes (talent_id);

-- notes: update check constraint
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_at_least_one_entity;
ALTER TABLE notes ADD CONSTRAINT notes_at_least_one_entity
  CHECK (COALESCE(deal_id, contact_id, company_id, talent_id) IS NOT NULL);
