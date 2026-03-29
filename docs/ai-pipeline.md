# AI Pipeline

Two AI providers serve different purposes: Claude for natural language analysis, Gemini for structured scoring and embeddings.

```mermaid
sequenceDiagram
    participant Browser
    participant API as /api/ai/analyze
    participant Claude as Claude API
    participant Gemini as Gemini API
    participant DB as PostgreSQL

    Browser->>API: POST {dealId}
    API->>DB: Fetch deal data
    activate API
    API->>Claude: Stream analysis (max 1024 tokens)
    activate Claude
    Claude-->>API: Text deltas
    API-->>Browser: Stream chunks (ReadableStream)
    Claude-->>API: Stream complete
    deactivate Claude
    API->>Gemini: Generate embedding (768-dim)
    activate Gemini
    Gemini-->>API: Vector
    deactivate Gemini
    API->>DB: Save insight + embedding
    deactivate API
    Browser->>Browser: Reload to show saved insight
```

## AI Actions

| Action | Provider | Model | Purpose |
|--------|----------|-------|---------|
| Deal analysis | Claude | claude-sonnet-4-6 | Full structured analysis (company, decision-maker, risks, approach) |
| Deal scoring | Gemini | gemini-3.1-pro-preview | Score 1-100 with weighted factors (JSON output) |
| Company research | Gemini | gemini-3.1-pro-preview | Company summary, landscape, pain points |
| Outreach draft | Claude | claude-sonnet-4-6 | Personalized email under 150 words |
| Next steps | Gemini | gemini-3.1-pro-preview | 2-3 actionable steps with timelines (JSON output) |
| Embeddings | Gemini | gemini-embedding-2-preview | 768-dim vectors for semantic search |

## Key Details

- **Streaming**: Only the deal analysis endpoint streams. Other AI actions return complete responses via server actions.
- **Embedding pipeline**: After Claude generates analysis text, Gemini embeds it into a 768-dim vector stored alongside the insight. This powers `semanticSearch()` and `findSimilarDeals()`. HNSW index on `vector_cosine_ops` accelerates similarity queries.
- **Prompts**: All system prompts are in `src/lib/ai/prompts.ts` — structured with explicit output format instructions.
- **Token limits**: Analysis capped at 1024 tokens, outreach at 512 tokens.
