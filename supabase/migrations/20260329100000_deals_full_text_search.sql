ALTER TABLE public.deals ADD COLUMN search_vector tsvector;

-- Trigger function: builds weighted tsvector from deal + related company/contact
-- A = title (highest), B = company, C = contact name, D = source detail
CREATE OR REPLACE FUNCTION deals_generate_search_vector()
RETURNS trigger AS $$
DECLARE
  v_company_name text;
  v_contact_first text;
  v_contact_last text;
BEGIN
  SELECT name INTO v_company_name FROM companies WHERE id = NEW.company_id;
  SELECT first_name, last_name INTO v_contact_first, v_contact_last
    FROM contacts WHERE id = NEW.primary_contact_id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(v_company_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(v_contact_first, '') || ' ' || coalesce(v_contact_last, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.source_detail, '')), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION deals_generate_search_vector();

-- Propagate company name changes to deals search_vector
CREATE OR REPLACE FUNCTION companies_propagate_search_vector()
RETURNS trigger AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE deals SET updated_at = updated_at WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_search_vector_trigger
  AFTER UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION companies_propagate_search_vector();

-- Propagate contact name changes to deals search_vector
CREATE OR REPLACE FUNCTION contacts_propagate_search_vector()
RETURNS trigger AS $$
BEGIN
  IF NEW.first_name IS DISTINCT FROM OLD.first_name
     OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    UPDATE deals SET updated_at = updated_at WHERE primary_contact_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_search_vector_trigger
  AFTER UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION contacts_propagate_search_vector();

-- Backfill existing rows (triggers fire on update)
UPDATE deals SET updated_at = updated_at;

-- GIN index for fast @@ queries
CREATE INDEX idx_deals_search_vector ON public.deals USING gin (search_vector);
