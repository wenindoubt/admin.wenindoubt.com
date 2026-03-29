-- Gmail OAuth tokens for creating drafts on behalf of co-founders
CREATE TABLE gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gmail_tokens_clerk_user_id ON gmail_tokens (clerk_user_id);
