# Data Model

Drizzle ORM schema with 5 tables. Defined in `src/db/schema.ts`.

```mermaid
erDiagram
    leads {
        uuid id PK
        text first_name
        text last_name
        text email
        text company_name
        text job_title
        lead_status status
        lead_source source
        numeric estimated_value
        timestamptz created_at
        timestamptz last_contacted_at
    }
    lead_insights {
        uuid id PK
        uuid lead_id FK
        text analysis_text
        text summary
        vector embedding
        text analysis_model
        timestamptz generated_at
    }
    lead_activities {
        uuid id PK
        uuid lead_id FK
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
    lead_tags {
        uuid lead_id PK,FK
        uuid tag_id PK,FK
    }

    leads ||--o{ lead_insights : "has analyses"
    leads ||--o{ lead_activities : "has activities"
    leads ||--o{ lead_tags : "tagged with"
    tags ||--o{ lead_tags : "applied to"
```

## Key Details

- **Enums**: `lead_status` (new → contacted → qualifying → proposal_sent → negotiating → won/lost/churned), `lead_source` (website, referral, linkedin, conference, cold_outreach, other)
- **Cascade deletes**: deleting a lead cascades to insights, activities, and tag associations
- **Vector column**: `lead_insights.embedding` is 768-dimensional (Gemini `gemini-embedding-2-preview`), used for semantic search and similar lead discovery
- **Activity metadata**: `jsonb` field stores structured data like `{ from: "new", to: "contacted" }` for status changes
- **Indexes**: status, assigned_to, created_at, company_name on leads; lead_id on insights and activities
