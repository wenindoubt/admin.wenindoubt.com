-- HNSW vector index for cosine similarity search on deal insights
CREATE INDEX idx_deal_insights_embedding
  ON public.deal_insights
  USING hnsw (embedding vector_cosine_ops);

-- Reverse lookup index on junction tables (tag filtering)
CREATE INDEX idx_deal_tags_tag_id ON public.deal_tags (tag_id);
CREATE INDEX idx_company_tags_tag_id ON public.company_tags (tag_id);

-- FK index on deals.primary_contact_id (used in LEFT JOIN from companies)
CREATE INDEX idx_deals_primary_contact_id ON public.deals (primary_contact_id);

-- Unique constraint: one email per contact per company
CREATE UNIQUE INDEX idx_contacts_company_email ON public.contacts (company_id, email);
