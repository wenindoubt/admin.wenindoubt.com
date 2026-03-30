# Data Model

Drizzle ORM schema with 11 tables. Defined in `src/db/schema.ts`.

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
        tsvector search_vector
    }
    contacts {
        uuid id PK
        uuid company_id FK
        text first_name
        text last_name
        text email
        text phone
        text linkedin_url
        text job_title
        timestamptz created_at
        timestamptz updated_at
        tsvector search_vector
    }
    deals {
        uuid id PK
        uuid company_id FK
        uuid primary_contact_id FK
        text title
        deal_stage stage
        deal_source source
        text source_detail
        numeric estimated_value
        text assigned_to
        timestamptz follow_up_at
        timestamptz converted_at
        timestamptz closed_at
        timestamptz last_contacted_at
        timestamptz created_at
        timestamptz updated_at
        tsvector search_vector
    }
    deal_insights {
        uuid id PK
        uuid deal_id FK
        text prompt
        text raw_input
        text analysis_text
        text summary
        vector embedding
        text analysis_model
        text embedding_model
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
    notes {
        uuid id PK
        text type
        text title
        text content
        uuid deal_id FK
        uuid contact_id FK
        uuid company_id FK
        vector embedding
        integer token_count
        tsvector search_vector
        text created_by
        timestamptz created_at
        timestamptz updated_at
    }
    note_attachments {
        uuid id PK
        uuid note_id FK
        text file_name
        text storage_path
        integer file_size
        text mime_type
        text created_by
        timestamptz created_at
    }
    gmail_tokens {
        uuid id PK
        text clerk_user_id UK
        text email
        text access_token
        text refresh_token
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
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
    deals ||--o{ notes : "has notes"
    contacts ||--o{ notes : "has notes"
    companies ||--o{ notes : "has notes"
    notes ||--o{ note_attachments : "has files"
```

## Key Details

- **Enums**: `deal_stage` (new, contacted, qualifying, proposal_sent, negotiating, nurture, won, lost), `deal_source` (website, referral, linkedin, conference, cold_outreach, other)
- **Cascade deletes**: deleting a company cascades to contacts and deals. Deleting a deal cascades to insights, activities, and tag associations. Contacts referenced as primary contact use `ON DELETE RESTRICT`.
- **Unique constraint**: `contacts(company_id, email)` prevents duplicate contacts per company
- **Vector column**: `deal_insights.embedding` is 768-dim (Gemini `gemini-embedding-2-preview`) with HNSW index (`vector_cosine_ops`) for semantic search
- **RLS**: enabled on all tables except `note_attachments` — authenticated Clerk users get full access, anon role blocked. `gmail_tokens` has an additional explicit deny-anon policy. RLS on `deals` enforced on Supabase Realtime subscriptions.
- **Note attachments**: stored in Supabase Storage (`note-attachments` bucket), metadata in `note_attachments` table. Cascade-deleted with parent note. No RLS (accessed only via server-side admin client).
- **Notes**: multi-entity association via nullable FKs (`deal_id`, `contact_id`, `company_id`). CHECK constraint requires at least one non-null FK. Types: `note`, `transcript`, `document`. Content stored as markdown. 768-dim embedding (Gemini) with HNSW index for semantic search. `token_count` column stores exact Claude token count. Auto-surfaced on deal pages across deal + contact + company.
- **Activity metadata**: `jsonb` stores structured data like `{ from_stage: "new", to_stage: "contacted" }` for stage changes
- **Indexes**: stage, company_id, assigned_to, created_at, primary_contact_id on deals; deal_id on insights and activities; composite `(deal_id, created_at DESC)` on activities and `(deal_id, generated_at DESC)` on insights for detail page queries; tag_id on junction tables; GIN indexes on search_vector for companies, contacts, and deals
- **Gmail tokens**: `gmail_tokens` table stores per-user OAuth credentials (clerk_user_id unique) for outreach integration
