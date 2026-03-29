-- Companies: full-text search on name, industry, size
ALTER TABLE public.companies ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION companies_generate_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.industry, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.company_size, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_search_vector_update
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION companies_generate_search_vector();

UPDATE companies SET updated_at = updated_at;

CREATE INDEX idx_companies_search_vector ON public.companies USING gin (search_vector);


-- Contacts: full-text search on name, email, job title, phone, company name
ALTER TABLE public.contacts ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION contacts_generate_search_vector()
RETURNS trigger AS $$
DECLARE
  v_company_name text;
BEGIN
  SELECT name INTO v_company_name FROM companies WHERE id = NEW.company_id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.job_title, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(v_company_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.phone, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_search_vector_update
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION contacts_generate_search_vector();

-- Propagate company name changes to contacts search_vector
-- (replaces the old trigger that only propagated to deals)
CREATE OR REPLACE FUNCTION companies_propagate_search_vector()
RETURNS trigger AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE deals SET updated_at = updated_at WHERE company_id = NEW.id;
    UPDATE contacts SET updated_at = updated_at WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE contacts SET updated_at = updated_at;

CREATE INDEX idx_contacts_search_vector ON public.contacts USING gin (search_vector);
