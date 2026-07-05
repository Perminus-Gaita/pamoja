# Pamoja — Project Memory

Pamoja (Swahili for "together") is a free, open-source memorial web app — a digital condolence book gathering condolences, memories, contributions, and program info. Next.js 15 (App Router), React 19, TypeScript, hand-written CSS (no Tailwind), Neon serverless Postgres, Cloudflare R2 for images. **Always use pnpm.**

## Multi-memorial architecture (added July 2026)

One codebase serves two experiences, split by hostname in `middleware.ts`:

- **Root domain** (`mydomain.com`, `www.`, or plain `localhost`) — `/` is rewritten to `/directory`, a grid landing page ([components/directory.tsx](components/directory.tsx)) listing approved memorials plus a "+ Create a memorial" card.
- **Memorial subdomain** (`eng-maina-kamau.mydomain.com`, or `eng-maina-kamau.localhost:3000` in dev) — serves the original memorial app unchanged.
- **Unknown hosts** (e.g. `*.vercel.app` previews) fall through to the memorial, so previously shared links keep working until the custom domain is configured.

Configuration: set `NEXT_PUBLIC_ROOT_DOMAIN` (e.g. `mydomain.com`) in Vercel env. Both the apex domain and `eng-maina-kamau.<root>` (or wildcard `*.<root>`) must be added as domains on the Vercel project.

**Current live setup (no custom domain yet):** The real Vercel project is **`pamoja`** (owns `pamoja-love.vercel.app` + all DB/R2 env vars). `NEXT_PUBLIC_ROOT_DOMAIN=pamoja-love.vercel.app` is set in its production env. Since vercel.app has no nested subdomains (Vercel returns 403 for `*.pamoja-love.vercel.app` — reserved for its own preview URLs), each memorial gets a *sibling* domain: `eng-maina-kamau.vercel.app`, and `memorialUrl()` in [components/directory.tsx](components/directory.tsx) links to `<slug>.vercel.app` when the root ends in `.vercel.app`. When a real domain arrives: change the env var, add apex + wildcard domains, done.

**⚠ Deployment gotchas (July 2026):**
- A duplicate project **`pamoja-love`** was accidentally created by `vercel link --project pamoja-love` (the real project is named `pamoja`). It still holds the `eng-maina-kamau.vercel.app` *domain record*; the working traffic goes through an **alias** pinned to a specific deployment of `pamoja`. **After each production deploy, re-run** `vercel alias set <new-deployment-url> eng-maina-kamau.vercel.app` — or better, delete the duplicate `pamoja-love` project in the dashboard, then `vercel domains add eng-maina-kamau.vercel.app` once so it tracks production automatically.
- Git pushes did not auto-deploy the `pamoja` project despite the repo showing as connected — deploy with `vercel deploy --prod` until confirmed otherwise.

The primary memorial's slug is `PRIMARY_MEMORIAL_SLUG` in [lib/config.ts](lib/config.ts). Its landing-grid card is hydrated live from the `settings` table (`cfg.name`, `cfg.born`, `cfg.passed`, `portrait`) so admin edits stay in sync; other memorials store their own fields on the `memorials` row.

**Not yet multi-tenant:** approving a new memorial lists it on the grid and reserves a slug, but all subdomains currently serve the same single-tenant data. Real per-memorial data (scoping condolences/people/etc. by memorial) is future work.

## Memorial request flow

- Visitor clicks "+" on the landing grid → modal collects deceased's name, dates (formatted to long form, e.g. "1 January 1950"), optional photo (via `/api/upload`), and **required contact name + phone** (email optional) — submissions are `pending` and the visitor is told they'll be contacted once approved.
- Admin reviews under **admin-super → Memorial Requests** tab: Approve / Unpublish / Remove.
- API: `app/api/memorials/route.ts` (GET approved, `?status=all` for admin; POST creates pending with auto-uniquified slug) and `app/api/memorials/[id]/route.ts` (PATCH status, DELETE — primary slug is protected from deletion).

## Key structure

- `lib/db.ts` — Neon client; lazily creates tables on first use (people, condolences, memories, contributions, settings, feedback, memorials); seeds primary memorial row + UI defaults; `withRetry` wraps reads.
- `lib/config.ts` — static fallbacks + types; DB `settings` table overrides via `/api/config`.
- `components/pamoja.tsx` — the memorial SPA (`'use client'`), section routing via `usePathname`.
- `components/directory.tsx` — root-domain landing grid + add-memorial modal.
- `app/<section>/page.tsx` — each memorial section renders `<Pamoja />`.
- `app/admin-super/page.tsx` — admin UI (Basic Info, People, Family, Program, Feedback, Memorial Requests).
- `app/globals.css` — all styles; directory styles under `/* ── DIRECTORY ── */`, palette in `:root` custom properties.
- `scripts/backup-db.mjs` — DB backup to `backups/`.

## Conventions

- Dates are stored as long-form text ("1 January 1950"), not ISO.
- Images upload via POST `/api/upload` (FormData `file`, `folder`) → `{ url: '/api/images/<key>' }`; served from private R2.
- Avatars fall back to Dicebear Notionists seeded by name.
- Fonts: Cormorant Garamond (`--D`) + Inter (`--B`); palette: paper/linen/dusk/amber/antique.
- People are the central entity; condolences find-or-create a person by case-insensitive name.

## Run

`pnpm dev` — dev server. Memorial: http://eng-maina-kamau.localhost:3000 · Directory: http://localhost:3000
