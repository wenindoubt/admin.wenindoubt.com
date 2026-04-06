-- Update talent search vector to include all text fields:
-- A: name (most important), B: email, C: bio, D: phone + linkedin_url
-- linkedin_url and phone at D weight — less useful for text search but included for completeness.
CREATE OR REPLACE FUNCTION public.talent_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.phone, '') || ' ' || coalesce(NEW.linkedin_url, '')), 'D');
  RETURN NEW;
END;
$$;

-- Backfill existing rows
UPDATE public.talent SET updated_at = updated_at;
