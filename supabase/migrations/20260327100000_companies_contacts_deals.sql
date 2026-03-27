-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE deal_stage AS ENUM (
  'new', 'contacted', 'qualifying', 'proposal_sent',
  'negotiating', 'nurture', 'won', 'lost'
);

CREATE TYPE deal_source AS ENUM (
  'website', 'referral', 'linkedin', 'conference',
  'cold_outreach', 'other'
);

-- Tags (shared across entities)
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text
);

-- Companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  industry text,
  company_size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_companies_name ON companies (name);

-- Contacts
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  linkedin_url text,
  job_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_company_id ON contacts (company_id);

-- Deals
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  primary_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
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
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_stage ON deals (stage);
CREATE INDEX idx_deals_company_id ON deals (company_id);
CREATE INDEX idx_deals_assigned_to ON deals (assigned_to);
CREATE INDEX idx_deals_created_at ON deals (created_at);
CREATE INDEX idx_deals_follow_up_at ON deals (follow_up_at) WHERE follow_up_at IS NOT NULL;

-- Deal insights (AI analysis)
CREATE TABLE deal_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  prompt text,
  raw_input text,
  analysis_text text NOT NULL,
  summary text,
  embedding vector(768),
  analysis_model text NOT NULL,
  embedding_model text NOT NULL DEFAULT 'gemini-embedding-2-preview',
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_insights_deal_id ON deal_insights (deal_id);

-- Deal activities (audit log)
CREATE TABLE deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deal_activities_deal_id ON deal_activities (deal_id);
CREATE INDEX idx_deal_activities_created_at ON deal_activities (created_at);

-- Deal tags
CREATE TABLE deal_tags (
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, tag_id)
);

-- Company tags
CREATE TABLE company_tags (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, tag_id)
);

-- Enable realtime on deals
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
