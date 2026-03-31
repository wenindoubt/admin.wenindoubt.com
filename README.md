<div align="center">

# 🎯 Admin | WenInDoubt

**AI-powered lead management CRM with pipeline tracking, real-time Kanban board, and intelligent insights.**

</div>

## ⚡ Setup

**Prerequisites:** [mise](https://mise.jdx.dev/), Docker (for local Supabase)

```bash
# Install dependencies
mise run install

# Start local Supabase (Postgres + Realtime + runs migrations)
mise run db:start

# Push Drizzle schema (should be a no-op after migrations)
mise run db:push

# Seed sample data (optional)
mise run seed

# Start dev server
mise run dev
```

> ⚠️ First `supabase start` pulls ~2GB of Docker images. Subsequent starts are fast.

### Environment Variables

Set these in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `ANTHROPIC_MODEL` | Claude model ID (e.g. `claude-sonnet-4-6`) |
| `GOOGLE_AI_API_KEY` | Gemini API key (embeddings) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth public key |
| `CLERK_SECRET_KEY` | Clerk auth secret key |
| `GOOGLE_GMAIL_CLIENT_ID` | Gmail OAuth2 client ID (optional) |
| `GOOGLE_GMAIL_CLIENT_SECRET` | Gmail OAuth2 client secret (optional) |
| `GOOGLE_GMAIL_REDIRECT_URI` | Gmail OAuth2 redirect URI (optional) |

Local dev uses Supabase CLI defaults. Production values go in Vercel.

## 🚀 Usage

All commands run via `mise run <task>`. Env vars auto-loaded from `.env.local`.

| Command | Description |
|---------|-------------|
| `mise run dev` | Start development server |
| `mise run build` | Production build |
| `mise run lint` | Run Biome (lint + format) |
| `mise run db:start` | Start local Postgres + services |
| `mise run db:stop` | Stop local stack |
| `mise run db:reset` | Wipe local DB + re-run migrations |
| `mise run seed` | Seed sample data |
| `mise run seed:clean` | Remove sample data |
| `mise run backfill:embeddings` | Backfill note embeddings + token counts |
| `mise run test` | Run unit tests (vitest) |
| `mise run test:e2e` | Run E2E tests (Playwright) |

<details>
<summary>Production database commands</summary>

Requires `.env.prod` with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`.

| Command | Description |
|---------|-------------|
| `mise run db:prod:link` | Link to production Supabase project (one-time) |
| `mise run db:prod:push` | Push pending migrations (dry-run first) |
| `mise run db:prod:reset` | Reset production DB + replay migrations (DESTRUCTIVE) |

</details>

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19 |
| Auth | Clerk |
| Database | PostgreSQL + Drizzle ORM |
| AI | Claude (analysis, scoring, research, outreach, token counting) + Gemini (embeddings, semantic retrieval) |
| Rich Text | Tiptap + tiptap-markdown (notes editor) |
| Realtime | Supabase (Kanban live sync) |
| UI | shadcn v4, Tailwind CSS v4 |
| Forms | react-hook-form + Zod |
| Drag & Drop | @hello-pangea/dnd |

## 📐 Architecture

See [docs/](docs/README.md) for architecture diagrams and detailed documentation.
