# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

All commands run via `mise run <task>`. Env vars are auto-loaded from `.env.local` by mise.

```bash
mise run dev             # start dev server (requires local Supabase running)
mise run build           # production build
mise run lint            # biome check (lint + format)
mise run lint:fix        # biome auto-fix
mise run check           # lint + typecheck
mise run db:start        # start local Postgres + Supabase services
mise run db:stop         # stop local stack
mise run db:push         # push Drizzle schema to local DB
mise run seed            # seed sample data
mise run seed:clean      # remove sample data
mise run backfill:embeddings  # backfill embeddings + token counts (run after seeding)
mise run backfill:assigned-to # backfill assigned-to field
mise run test              # vitest unit tests
mise run test:watch        # vitest in watch mode
mise run test:e2e          # playwright E2E tests
mise run test:e2e:ui       # playwright with UI
```

## Architecture

- **Next.js 16** App Router with React 19 — server components by default, `"use client"` only where needed
- **Auth**: Clerk middleware in `src/proxy.ts` protects all routes except `/sign-in`, `/sign-up`. Server actions validate via `auth()`.
- **DB**: Drizzle ORM + `postgres` driver. Schema in `src/db/schema.ts`. Connection uses `prepare: false` for Supabase pooler compatibility.
- **AI**: Claude (`@anthropic-ai/sdk`) for analysis, scoring, research, outreach drafting, token counting. Gemini (`@google/genai`) for embeddings only (768-dim vectors). Model configured via `ANTHROPIC_MODEL` env var.
- **Notes**: Centralized `notes` table with multi-entity association (deal/contact/company). Rich text via Tiptap (`tiptap-markdown`), stored as markdown. Gemini embeddings for semantic retrieval. Auto-surfaces related notes across entity graph (deal + all associated contacts + company) on deal pages.
- **Multi-contact deals**: `deal_contacts` junction table links deals to multiple contacts. `deals.primaryContactId` remains for backward compat. Notes, AI context, and semantic search operate on all associated contacts.
- **Realtime**: Supabase client-side subscriptions for Kanban board live updates. Authenticated via Clerk third-party JWT (JWKS). RLS enabled on all tables (except `note_attachments`).
- **UI**: shadcn v4 (built on `@base-ui/react`), Tailwind CSS v4. Light mode only.
- Detailed architecture: `docs/`

## Project Structure

```
src/app/                  # Pages + API routes (App Router)
src/app/(dashboard)/      # Auth-protected dashboard pages
src/app/api/ai/           # Streaming Claude endpoints (analyze, outreach)
src/app/api/gmail/        # Gmail OAuth2 flow (authorize, callback)
src/components/           # App components + ui/ (shadcn) + skeletons/ + kanban/
src/db/                   # Drizzle schema + connection singleton
src/lib/actions/          # Server actions (deals, companies, contacts, notes, ai, search, gmail)
src/lib/ai/               # AI client singletons, prompts, embeddings, token counting
src/lib/google/           # Gmail OAuth2 client
src/lib/supabase/         # Supabase realtime client + server admin client
src/lib/note-utils.ts     # Shared note query helpers (auto-surface conditions)
scripts/                  # Seed + backfill scripts
```

## Code Patterns

- **Server actions**: all in `src/lib/actions/`, marked `"use server"`, auth-gated with `auth()` from Clerk
- **Forms**: `react-hook-form` + `zod` schemas from `src/lib/validations.ts`
- **Imports**: path alias `@/*` maps to `./src/*`
- **Styling**: Tailwind utility classes, `cn()` helper from `src/lib/utils.ts` for conditional classes
- **Components**: shadcn v4 uses `@base-ui/react` primitives — `render` prop pattern instead of `asChild`
- **Next.js 16 params**: page `params` and `searchParams` are `Promise<>` — must be awaited
- **Pagination**: server actions for lists return `{ data, total }` with `limit`/`offset` support. Pages read `page` from searchParams. Constants in `src/lib/types.ts` (`PAGE_SIZE=25`, `PAGE_SIZE_ACTIVITY=5`, `PAGE_SIZE_NOTES=10`). Shared `Pagination` component (URL-driven) and `PaginationBar` (callback-driven) in `src/components/pagination.tsx`. Filter/sort changes reset `page` param.
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Suspense streaming**: detail pages use `<Suspense>` with async server component children (e.g., `EntityNotesSection`) to stream heavy sections independently. Skeletons in `src/components/skeletons/` match layout dimensions.
- **Dynamic imports**: heavy client components (Tiptap, MarkdownRenderer) lazy-loaded via shared exports in `src/components/lazy.tsx`. Use `LazyTiptapEditor` / `LazyMarkdownRenderer` instead of direct imports.
- **`after()` for fire-and-forget**: use `after()` from `next/server` for post-response work (embeddings, token counting). See `enrichNoteAfterResponse` in `notes.ts` and analyze route.
- **Navigation-persistent streaming**: AI analysis fetch lives in a module-level store (`src/lib/analysis-store.ts`) outside component lifecycle. The fetch survives App Router client-side navigation; components reconnect via `subscribeAnalysis()` on remount.
- **Fonts**: `font-heading` (DM Serif Text) is for headings only — h1, CardTitle, DialogTitle, SheetTitle, branding. All data, numbers, labels, and buttons use `font-sans` (Inter). Never apply `font-heading` to numeric/data content.

## Environment

Local dev uses Supabase CLI (`supabase start`) for Postgres + Realtime. Production env vars go in Vercel.
Required: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `GOOGLE_AI_API_KEY`, Clerk keys. Gmail integration also needs `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, `GOOGLE_GMAIL_REDIRECT_URI`.

## Page Inspection

When asked to check, inspect, look at, or troubleshoot a page, use the headless Playwright inspector:
```bash
mise run inspect /path   # screenshot + console errors + network errors + a11y tree
```
Read the report at `playwright/.inspect/report.md` and screenshot at `playwright/.inspect/screenshot.png`.
Requires auth state — run `mise run test:e2e` first if `playwright/.clerk/user.json` doesn't exist.

## Gotchas

- Middleware is in `src/proxy.ts`, not `middleware.ts` — Clerk convention
- `@anthropic-ai/sdk` and `googleapis` are in `serverExternalPackages` in next.config.ts — don't remove
- Server action body limit is 10MB (configured in next.config.ts)
- Drizzle uses `prepare: false` — required for Supabase Supavisor transaction pooling
