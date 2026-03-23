# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # start dev server (requires local Supabase running)
npm run build      # production build
npm run lint       # biome check (lint + format)
npm run lint:fix   # biome auto-fix
mise run check     # lint + typecheck
supabase start     # start local Postgres + Supabase services
supabase stop      # stop local stack
npx tsx scripts/seed.ts          # seed sample data
npx tsx scripts/seed.ts --clean  # remove sample data
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" npx drizzle-kit push  # push schema to local db
```

## Architecture

- **Next.js 16** App Router with React 19 — server components by default, `"use client"` only where needed
- **Auth**: Clerk middleware in `src/proxy.ts` protects all routes except `/sign-in`, `/sign-up`. Server actions validate via `auth()`.
- **DB**: Drizzle ORM + `postgres` driver. Schema in `src/db/schema.ts`. Connection uses `prepare: false` for Supabase pooler compatibility.
- **AI**: Claude (`@anthropic-ai/sdk`) for lead analysis + outreach drafting. Gemini (`@google/genai`) for scoring, research, embeddings (768-dim vectors).
- **Realtime**: Supabase client-side subscriptions for Kanban board live updates.
- **UI**: shadcn v4 (built on `@base-ui/react`), Tailwind CSS v4. Light mode only.
- Detailed architecture: `docs/`

## Project Structure

```
src/app/                  # Pages + API routes (App Router)
src/app/(dashboard)/      # Auth-protected dashboard pages
src/app/api/ai/analyze/   # Streaming Claude analysis endpoint
src/components/           # App components + ui/ (shadcn)
src/db/                   # Drizzle schema + connection singleton
src/lib/actions/          # Server actions (leads, ai, search)
src/lib/ai/               # AI client singletons + prompts
src/lib/supabase/         # Supabase realtime client
scripts/                  # Seed script
```

## Code Patterns

- **Server actions**: all in `src/lib/actions/`, marked `"use server"`, auth-gated with `auth()` from Clerk
- **Forms**: `react-hook-form` + `zod` schemas from `src/lib/validations.ts`
- **Imports**: path alias `@/*` maps to `./src/*`
- **Styling**: Tailwind utility classes, `cn()` helper from `src/lib/utils.ts` for conditional classes
- **Components**: shadcn v4 uses `@base-ui/react` primitives — `render` prop pattern instead of `asChild`
- **Next.js 16 params**: page `params` and `searchParams` are `Promise<>` — must be awaited
- **Naming**: camelCase for variables/functions, PascalCase for components/types

## Environment

Local dev uses Supabase CLI (`supabase start`) for Postgres + Realtime. Production env vars go in Vercel.
Required: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, Clerk keys.

## Gotchas

- Middleware is in `src/proxy.ts`, not `middleware.ts` — Clerk convention
- `@anthropic-ai/sdk` is in `serverExternalPackages` in next.config.ts — don't remove
- Server action body limit is 10MB (configured in next.config.ts)
- Drizzle uses `prepare: false` — required for Supabase Supavisor transaction pooling
