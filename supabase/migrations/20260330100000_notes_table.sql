-- Notes (multi-entity: deal, contact, company)
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'note',
  title text,
  content text NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  embedding vector(768),
  search_vector tsvector,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_at_least_one_entity CHECK (
    COALESCE(deal_id, contact_id, company_id) IS NOT NULL
  )
);

CREATE INDEX idx_notes_deal_id ON notes (deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_notes_contact_id ON notes (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_notes_company_id ON notes (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_notes_created_at ON notes (created_at);
CREATE INDEX idx_notes_embedding ON notes USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_notes_search_vector ON notes USING gin (search_vector);

-- Search vector trigger: title (A weight) + content (B weight)
CREATE OR REPLACE FUNCTION notes_generate_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION notes_generate_search_vector();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION notes_update_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at_trigger
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION notes_update_timestamp();
