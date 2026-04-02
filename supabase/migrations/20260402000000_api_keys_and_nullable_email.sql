-- ─── Migration: API Keys + Nullable Contact Email ───────────────────────────
-- Adds the api_keys table for HMAC-secured external API access,
-- makes contacts.email nullable (for partial contact data from AI ingest),
-- and adds a partial unique index for name-based contact dedup.

-- ─── 1. Make contacts.email nullable ────────────────────────────────────────
-- The existing unique index idx_contacts_company_email still works;
-- Postgres treats NULLs as distinct in unique indexes, so multiple
-- contacts with NULL email under the same company are allowed.
-- The search_vector trigger already uses coalesce(NEW.email, '') — safe.
ALTER TABLE contacts ALTER COLUMN email DROP NOT NULL;

-- ─── 2. Partial unique index for name-based contact dedup ────────────────────
-- Used when a contact has no email: prevents duplicate (firstName, lastName)
-- pairs within the same company. Only applies to rows where email IS NULL.
CREATE UNIQUE INDEX idx_contacts_company_name
  ON contacts (company_id, lower(first_name), lower(last_name))
  WHERE email IS NULL;

-- ─── 3. API keys table ───────────────────────────────────────────────────────
-- Stores hashed API keys + plaintext HMAC secrets for external API auth.
-- key_hash: SHA-256 of the full API key (server never needs plaintext key)
-- hmac_secret: plaintext HMAC-SHA256 secret (server needs it to verify sigs)
-- This table is server-only — no SELECT policy for authenticated role.
CREATE TABLE api_keys (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  key_prefix  text        NOT NULL,                         -- first 12 chars, for log identification
  key_hash    text        NOT NULL UNIQUE,                  -- SHA-256 of the API key
  hmac_secret text        NOT NULL,                         -- plaintext HMAC-SHA256 secret
  scopes      text[]      NOT NULL DEFAULT '{}',
  revoked_at  timestamptz,
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;

-- Explicitly revoke access from all roles — server actions run as postgres
-- (superuser) which bypasses RLS, so no SELECT policy is needed or desired.
REVOKE ALL ON public.api_keys FROM anon, authenticated, public;
