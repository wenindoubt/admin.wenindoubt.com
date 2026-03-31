-- =============================================================================
-- Consolidated init migration: schema + functions + triggers + RLS + policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS hypopg WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS index_advisor WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE deal_stage AS ENUM (
  'new', 'contacted', 'qualifying', 'proposal_sent',
  'negotiating', 'nurture', 'won', 'lost'
);

CREATE TYPE deal_source AS ENUM (
  'website', 'referral', 'linkedin', 'conference',
  'cold_outreach', 'other'
);

-- ---------------------------------------------------------------------------
-- Tables (constraint names match Drizzle-Kit conventions for push compat)
-- ---------------------------------------------------------------------------

-- Tags (shared across entities)
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  CONSTRAINT tags_name_unique UNIQUE (name)
);

-- Companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  industry text,
  company_size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector
);
CREATE INDEX idx_companies_name ON companies (name);
CREATE INDEX idx_companies_search_vector ON companies USING gin (search_vector);

-- Contacts
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  linkedin_url text,
  job_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector
);
ALTER TABLE contacts ADD CONSTRAINT contacts_company_id_companies_id_fk
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX idx_contacts_company_id ON contacts (company_id);
CREATE UNIQUE INDEX idx_contacts_company_email ON contacts (company_id, email);
CREATE INDEX idx_contacts_search_vector ON contacts USING gin (search_vector);

-- Deals
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  primary_contact_id uuid NOT NULL,
  title text NOT NULL,
  stage deal_stage NOT NULL DEFAULT 'new',
  source deal_source NOT NULL DEFAULT 'other',
  source_detail text,
  estimated_value numeric(12,2),
  assigned_to text,
  follow_up_at timestamptz,
  converted_at timestamptz,
  closed_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector
);
ALTER TABLE deals ADD CONSTRAINT deals_company_id_companies_id_fk
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE deals ADD CONSTRAINT deals_primary_contact_id_contacts_id_fk
  FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE RESTRICT;
CREATE INDEX idx_deals_stage ON deals (stage);
CREATE INDEX idx_deals_company_id ON deals (company_id);
CREATE INDEX idx_deals_assigned_to ON deals (assigned_to);
CREATE INDEX idx_deals_created_at ON deals (created_at);
CREATE INDEX idx_deals_primary_contact_id ON deals (primary_contact_id);
CREATE INDEX idx_deals_source ON deals (source);
CREATE INDEX idx_deals_search_vector ON deals USING gin (search_vector);

-- Deal insights (AI analysis)
CREATE TABLE deal_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  prompt text,
  raw_input text,
  analysis_text text NOT NULL,
  summary text,
  embedding extensions.vector(768),
  analysis_model text NOT NULL,
  embedding_model text NOT NULL DEFAULT 'gemini-embedding-2-preview',
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE deal_insights ADD CONSTRAINT deal_insights_deal_id_deals_id_fk
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
CREATE INDEX idx_deal_insights_deal_id ON deal_insights (deal_id);
CREATE INDEX idx_deal_insights_embedding ON deal_insights USING hnsw (embedding extensions.vector_cosine_ops);

-- Deal activities (audit log)
CREATE TABLE deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE deal_activities ADD CONSTRAINT deal_activities_deal_id_deals_id_fk
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
CREATE INDEX idx_deal_activities_deal_id ON deal_activities (deal_id);
CREATE INDEX idx_deal_activities_created_at ON deal_activities (created_at);

-- Deal tags (junction)
CREATE TABLE deal_tags (
  deal_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT deal_tags_deal_id_tag_id_pk PRIMARY KEY (deal_id, tag_id)
);
ALTER TABLE deal_tags ADD CONSTRAINT deal_tags_deal_id_deals_id_fk
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE deal_tags ADD CONSTRAINT deal_tags_tag_id_tags_id_fk
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
CREATE INDEX idx_deal_tags_tag_id ON deal_tags (tag_id);

-- Company tags (junction)
CREATE TABLE company_tags (
  company_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT company_tags_company_id_tag_id_pk PRIMARY KEY (company_id, tag_id)
);
ALTER TABLE company_tags ADD CONSTRAINT company_tags_company_id_companies_id_fk
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE company_tags ADD CONSTRAINT company_tags_tag_id_tags_id_fk
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
CREATE INDEX idx_company_tags_tag_id ON company_tags (tag_id);

-- Deal contacts (junction — multi-contact deals)
CREATE TABLE deal_contacts (
  deal_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  CONSTRAINT deal_contacts_deal_id_contact_id_pk PRIMARY KEY (deal_id, contact_id)
);
ALTER TABLE deal_contacts ADD CONSTRAINT deal_contacts_deal_id_deals_id_fk
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE deal_contacts ADD CONSTRAINT deal_contacts_contact_id_contacts_id_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
CREATE INDEX idx_deal_contacts_contact_id ON deal_contacts (contact_id);

-- Notes (multi-entity: deal, contact, company)
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'note',
  title text,
  content text NOT NULL,
  deal_id uuid,
  contact_id uuid,
  company_id uuid,
  embedding extensions.vector(768),
  token_count integer,
  search_vector tsvector,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_at_least_one_entity CHECK (
    COALESCE(deal_id, contact_id, company_id) IS NOT NULL
  )
);
ALTER TABLE notes ADD CONSTRAINT notes_deal_id_deals_id_fk
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
ALTER TABLE notes ADD CONSTRAINT notes_contact_id_contacts_id_fk
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE notes ADD CONSTRAINT notes_company_id_companies_id_fk
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX idx_notes_deal_id ON notes (deal_id);
CREATE INDEX idx_notes_contact_id ON notes (contact_id);
CREATE INDEX idx_notes_company_id ON notes (company_id);
CREATE INDEX idx_notes_created_at ON notes (created_at);
CREATE INDEX idx_notes_embedding ON notes USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX idx_notes_search_vector ON notes USING gin (search_vector);

-- Note attachments
CREATE TABLE note_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE note_attachments ADD CONSTRAINT note_attachments_note_id_notes_id_fk
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
CREATE INDEX idx_note_attachments_note_id ON note_attachments (note_id);

-- Gmail OAuth tokens
CREATE TABLE gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gmail_tokens_clerk_user_id_unique UNIQUE (clerk_user_id)
);

-- Composite indexes for common ORDER BY patterns on detail pages
CREATE INDEX idx_deal_activities_deal_created ON deal_activities (deal_id, created_at);
CREATE INDEX idx_deal_insights_deal_generated ON deal_insights (deal_id, generated_at);

-- ---------------------------------------------------------------------------
-- Trigger functions (all with SET search_path = '' for security)
-- ---------------------------------------------------------------------------

-- Deals: weighted tsvector from title + company + contact + source detail
CREATE OR REPLACE FUNCTION public.deals_generate_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_company_name text;
  v_contact_first text;
  v_contact_last text;
BEGIN
  SELECT name INTO v_company_name FROM public.companies WHERE id = NEW.company_id;
  SELECT first_name, last_name INTO v_contact_first, v_contact_last
    FROM public.contacts WHERE id = NEW.primary_contact_id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(v_company_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(v_contact_first, '') || ' ' || coalesce(v_contact_last, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.source_detail, '')), 'D');

  RETURN NEW;
END;
$$;

-- Companies: weighted tsvector from name + industry + size
CREATE OR REPLACE FUNCTION public.companies_generate_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.industry, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.company_size, '')), 'C');
  RETURN NEW;
END;
$$;

-- Contacts: weighted tsvector from name + email + job title + company + phone
CREATE OR REPLACE FUNCTION public.contacts_generate_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_company_name text;
BEGIN
  SELECT name INTO v_company_name FROM public.companies WHERE id = NEW.company_id;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.job_title, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(v_company_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.phone, '')), 'D');
  RETURN NEW;
END;
$$;

-- Notes: weighted tsvector from title + content
CREATE OR REPLACE FUNCTION public.notes_generate_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$;

-- Propagate company name changes to deals + contacts search vectors
CREATE OR REPLACE FUNCTION public.companies_propagate_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.deals SET updated_at = updated_at WHERE company_id = NEW.id;
    UPDATE public.contacts SET updated_at = updated_at WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Propagate contact name changes to deals search vector
CREATE OR REPLACE FUNCTION public.contacts_propagate_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.first_name IS DISTINCT FROM OLD.first_name
     OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    UPDATE public.deals SET updated_at = updated_at WHERE primary_contact_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Notes: auto-update updated_at
CREATE OR REPLACE FUNCTION public.notes_update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER deals_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_generate_search_vector();

CREATE TRIGGER companies_search_vector_update
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_generate_search_vector();

CREATE TRIGGER companies_search_vector_trigger
  AFTER UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_propagate_search_vector();

CREATE TRIGGER contacts_search_vector_update
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.contacts_generate_search_vector();

CREATE TRIGGER contacts_search_vector_trigger
  AFTER UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.contacts_propagate_search_vector();

CREATE TRIGGER notes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notes_generate_search_vector();

CREATE TRIGGER notes_updated_at_trigger
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notes_update_timestamp();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Enable + force RLS on every public table
ALTER TABLE public.tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_insights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_tokens      ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tags              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.companies         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contacts          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deals             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deal_insights     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deal_tags         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.company_tags      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notes             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_tokens      FORCE ROW LEVEL SECURITY;

-- Authenticated users get read access (single-tenant app)
-- All writes go through server actions as postgres (bypasses RLS).
-- SELECT-only is sufficient: Realtime subscriptions need SELECT on deals,
-- and read-through-PostgREST is a reasonable future use case.
CREATE POLICY "Authenticated read access" ON public.tags             FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.companies        FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.contacts         FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.deals            FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.deal_insights    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.deal_activities  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.deal_tags        FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.company_tags     FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.deal_contacts    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.notes            FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access" ON public.note_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner read access" ON public.gmail_tokens
  FOR SELECT TO authenticated
  USING (clerk_user_id = (SELECT auth.jwt() ->> 'sub'));

-- Revoke default grants — least privilege
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, public;

-- Re-grant SELECT to authenticated (revoke above removed inherited grants)
-- All writes go through server actions as postgres role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
