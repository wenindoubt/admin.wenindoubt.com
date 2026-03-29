# Data Model

Drizzle ORM schema with 8 tables. Defined in `src/db/schema.ts`.

```mermaid
erDiagram
    companies {
        uuid id PK
        text name
        text website
        text industry
        text company_size
        timestamptz created_at
        timestamptz updated_at
    }
    contacts {
        uuid id PK
        uuid company_id FK
        text first_name
        text last_name
        text email
        text phone
        text job_title
        timestamptz created_at
    }
    deals {
        uuid id PK
        uuid company_id FK
        uuid primary_contact_id FK
        text title
        deal_stage stage
        deal_source source
        numeric estimated_value
        text assigned_to
        timestamptz follow_up_at
        timestamptz created_at
    }
    deal_insights {
        uuid id PK
        uuid deal_id FK
        text analysis_text
        text summary
        vector embedding
        text analysis_model
        timestamptz generated_at
    }
    deal_activities {
        uuid id PK
        uuid deal_id FK
        text type
        text description
        jsonb metadata
        text created_by
        timestamptz created_at
    }
    tags {
        uuid id PK
        text name UK
        text color
    }
    deal_tags {
        uuid deal_id PK,FK
        uuid tag_id PK,FK
    }
    company_tags {
        uuid company_id PK,FK
        uuid tag_id PK,FK
    }

    companies ||--o{ contacts : "has"
    companies ||--o{ deals : "has"
    contacts ||--o{ deals : "primary contact"
    deals ||--o{ deal_insights : "has analyses"
    deals ||--o{ deal_activities : "has activities"
    deals ||--o{ deal_tags : "tagged with"
    companies ||--o{ company_tags : "tagged with"
    tags ||--o{ deal_tags : "applied to"
    tags ||--o{ company_tags : "applied to"
```

## Key Details

- **Enums**: `deal_stage` (new, contacted, qualifying, proposal_sent, negotiating, nurture, won, lost), `deal_source` (website, referral, linkedin, conference, cold_outreach, other)
- **Cascade deletes**: deleting a company cascades to contacts and deals. Deleting a deal cascades to insights, activities, and tag associations. Contacts referenced as primary contact use `ON DELETE RESTRICT`.
- **Unique constraint**: `contacts(company_id, email)` prevents duplicate contacts per company
- **Vector column**: `deal_insights.embedding` is 768-dim (Gemini `gemini-embedding-2-preview`) with HNSW index (`vector_cosine_ops`) for semantic search
- **RLS**: enabled on `deals` table — authenticated Clerk users get full access, anon role blocked. Enforced on Supabase Realtime subscriptions.
- **Activity metadata**: `jsonb` stores structured data like `{ from_stage: "new", to_stage: "contacted" }` for stage changes
- **Indexes**: stage, company_id, assigned_to, created_at, primary_contact_id on deals; deal_id on insights and activities; tag_id on junction tables
- **Gmail tokens**: `gmail_tokens` table stores per-user OAuth credentials (clerk_user_id unique) for outreach integration
