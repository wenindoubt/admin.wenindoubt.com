<div align="center">

# 🎯 Admin | WenInDoubt

**AI-powered lead management CRM with pipeline tracking, real-time Kanban board, and intelligent insights.**

</div>

## ⚡ Setup

**Prerequisites:** Node.js 20+, Docker (for local Supabase)

```bash
# Install dependencies
npm install

# Start local Supabase (Postgres + Realtime)
supabase start

# Push database schema
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" npx drizzle-kit push

# Seed sample data (optional)
npx tsx scripts/seed.ts

# Start dev server
npm run dev
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

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run Biome (lint + format) |
| `supabase start` | Start local Postgres + services |
| `supabase stop` | Stop local stack |
| `npx tsx scripts/seed.ts` | Seed sample data |
| `npx tsx scripts/seed.ts --clean` | Remove sample data |
| `npx tsx scripts/backfill-note-embeddings.ts` | Backfill note embeddings + token counts (run after seeding) |

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
