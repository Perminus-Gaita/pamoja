# Pamoja — Project Memory

Pamoja (Swahili for "together") is a free, open-source memorial web app — a digital condolence book gathering condolences, tributes, contributions, and program info. Next.js 15 (App Router), React 19, TypeScript, hand-written CSS (no Tailwind), Neon serverless Postgres, Cloudflare R2 for images, Better Auth for authentication, Claude API for the AI assistant. **Always use pnpm.**

Instance-specific deployment details (live Vercel setup, real memorial slug, gotchas) live in `CLAUDE.local.md`, which is gitignored — read it too when working on this machine.

## Auth & access control (added July 2026)

- **Better Auth** (`lib/auth.ts`) with email+password always on, plus 12 optional social providers (google, facebook, twitter, linkedin, tiktok, github, apple, microsoft, discord, spotify, twitch, reddit) that activate when their env credential pair is set (`PROVIDER_ENV` map). Handler at `app/api/auth/[...all]/route.ts`; client at `lib/auth-client.ts`; sign-in page at `/sign-in`. Better Auth's tables (`user`, `session`, `account`, `verification` — quoted camelCase columns) are created in `lib/db.ts` alongside app tables (no CLI migration). NOTE: in production Better Auth sets `__Secure-` cookies — sessions only work over https (or in dev mode locally).
- **Admins — creator-as-owner model**: the account that creates a memorial is its admin (`memorials.owner_user_id`); no bootstrap env var. Deployments that predate ownership expose a one-time claim (`/api/memorials/claim`, surfaced on the admin gate screen). `ADMIN_EMAILS` survives only as an optional operator override. Other admins live in `user_roles` (permissions JSONB; `["*"]` = all). Granular permissions: settings, people, condolences, contributions, memorials, admins, access, groups, relations, tributes, memories, ai.
- **Primary memorial slug lives in the DB** (`settings` key `site.primarySlug`, helpers in `lib/site.ts`), set automatically when the first memorial is created; `NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG` env is only a legacy fallback.
- **`lib/access.ts`** is the heart: `getViewer()`, `requireAdmin(permission?)`, `canView(area, viewer, settings)`, `ACCESS_DEFAULTS` (defaults live in code; only overrides are stored in `settings`). `/api/me` returns the viewer + access flags + gates + social links; the client renders from that, the API routes enforce server-side.
- **Section visibility** (nav order: Home, Condolences, Contributions, Relation tree, Program, People):
  - Home + Condolences: public. Condolences POST optionally requires sign-in (`access.condolencesRequireAuth`, default off).
  - Contributions: `access.contributions` = admins (default) | authenticated | whitelisted.
  - Relation tree + Program: `access.relationTree` / `access.program` = authenticated (default) | approved (pre-approval via `access_grants` table, managed in Admin → Auth & Access).
  - People: admins only. Memories section removed from nav (photo memories now live on profile tabs).
- `/api/config` GET strips program/familyTree/payment server-side for viewers who can't see them. `/api/upload` requires sign-in (memorial creation itself now requires sign-in anyway).
- **Gates show a comforting quote** ("This page isn't available…"), never a bare error, via `GatePanel` in pamoja.tsx.

## Entitlements & moderation (spec, added July 2026)

- **Entitlements** (`lib/entitlements.ts`): `NEXT_PUBLIC_DEPLOYMENT_MODE` = `selfhost` (default; everything free) | `managed` (paid features gated by `memorials.plan`). Paid set: relationTree, aiEntry, galleries, contributions, programPage, aiModeration. Hard rules: condolences, the primary photo, and manual moderation are NEVER gated. Flags flow through `/api/me` (`features`, folded into `access`) and are enforced in the relations/contributions/memories/config APIs.
- **Moderation ladder** on condolences (`moderation` + `hidden` columns — distinct states):
  1. Approval mode (free): `moderation.approvalMode` setting → new condolences start `pending`; public GET returns only `hidden=FALSE AND moderation='approved'`; admins use `?all=1`. Admin panel → Moderation tab has the review queue + both toggles.
  2. Anonymous control (free): `access.condolencesRequireAuth`.
  3. AI triage (paid rung): `moderation.aiTriage` setting → `triageCondolence()` sorts approve/hold, never deletes; fail-safe = hold.
- **Retention rule**: no hard delete of condolences before 30 days (`DELETE /api/condolences/[id]` returns 403 with a gentle explanation); "delete" = `hidden` soft-hide via PATCH, always recoverable.
- **AI service boundary**: ALL LLM calls live in `lib/ai.ts` (askMemorial, triageCondolence, parseContributionEntry, runAdminAgent) so execution can later be swapped to workflows without touching callers. NL contribution entry: `POST /api/ai/parse-entry` (admin + aiEntry feature).

## Profiles, relation tree, groups, tributes

- **Person profile pages** (`/p/[id]`, `components/person-page.tsx`): clicking a condolence author opens their profile — tabs: Condolence (always), Relation tree (if viewer can see it), Contributions (if `tabs.contributions` on AND viewer can see contributions AND they have any), Memories (`tabs.memories` + `access.memoriesScope` = own | group | all), Tribute (`tabs.tribute`, read access `access.tribute`, length `tribute.maxLength` with per-person override key `tribute.maxLength.<personId>`). A person is "owned" by the auth user in `people.user_id` (linked when a signed-in user posts a condolence); owners edit their own memories/tribute.
- **Relation tree** (`components/relation-tree.tsx`, still routed at `/family`, label renamed): dynamic — root is the deceased; edges live in the `relations` table (`person_b NULL` = edge to the deceased); clicking a person re-centres on their connections. Falls back to the legacy `cfg.familyTree` generations grid when no edges exist. Groups render as nodes on the root view.
- **Groups** (`groups` + `person_groups` tables, `/g/[id]` page): e.g. "Class of 2012" — members grid + the group's condolences. Managed in Admin → Groups.
- **Tributes** (`tributes` table): one longer piece per person about the deceased; upsert on POST.

## AI features (optional, needs ANTHROPIC_API_KEY)

- Public: `components/ask-widget.tsx` floating widget → `/api/ai/ask` — answers practical questions grounded on config + program (deliberately public per product decision, even though the Program section is gated).
- Admin: Admin → AI Assistant tab → `/api/ai/admin` — manual tool-use loop (model `claude-opus-4-8`, adaptive thinking) with tools: get_stats, list_recent, add_contribution, grant_access. Each tool re-checks the admin's own permission.

## Multi-memorial architecture

One codebase serves two experiences, split by hostname in `middleware.ts`:
- **Root domain** (`NEXT_PUBLIC_ROOT_DOMAIN`, `www.`, or plain `localhost`) — `/` rewrites to `/directory` (`components/directory.tsx`), a grid of approved memorials + "Create a memorial" card.
- **Memorial subdomain** — serves the memorial app. Unknown hosts fall through to the memorial.
- The primary memorial's slug comes from `NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG` (env, no real name in source); its landing card hydrates live from the `settings` table. **Not yet multi-tenant** — all subdomains serve the same single-tenant data.

## Memorial request flow

Visitor clicks "+" on the landing grid → modal collects name, dates, optional photo (needs sign-in since upload requires auth), required contact name+phone → `pending`. Admin reviews under **admin-super → Memorial Requests** (Approve / Unpublish / Remove; primary slug protected from deletion).

## Key structure

- `lib/db.ts` — Neon client; lazily creates ALL tables on first use (app tables + Better Auth tables + user_roles, access_grants, groups, person_groups, relations, tributes); additive-only migrations via `ADD COLUMN IF NOT EXISTS`.
- `lib/config.ts` — static fallbacks + types (incl. `Me`, `SocialLink`); DB `settings` overrides via `/api/config`.
- `lib/auth.ts` / `lib/auth-client.ts` / `lib/access.ts` — auth stack (see above).
- `components/pamoja.tsx` — the memorial SPA; nav filtered per-viewer via `navVisible()`; top-right is Sign in / user chip; sidebar footer renders admin-configured `cfg.socialLinks` (legacy `cfg.whatsapp` still used as fallback in /api/me).
- `components/admin-panel.tsx` — ALL admin tabs (`ADMIN_TABS` + `AdminTabContent`, incl. Moderation and the "show in directory" ListingToggle); `app/admin-super/page.tsx` is a thin gated wrapper (with the claim button). The panel is ALSO embedded in the memorial's left menu: pamoja.tsx has an "Admin panel" sidebar item (admins only) that swaps the sidebar to admin menu items, plus an avatar dropdown (top right) with admin/visitor view toggle + sign out.
- `app/globals.css` — all styles; new sections: AUTH, GATE PANEL, TOPBAR USER, RELATION TREE EXTRAS, PERSON/GROUP PAGES, ASK WIDGET.
- `scripts/backup-db.mjs` — DB backup to `backups/`.

## Conventions

- Dates stored as long-form text ("1 January 1950"), not ISO.
- Images: POST `/api/upload` (FormData `file`, `folder`; auth required; images only, ≤10 MB) → `{ url: '/api/images/<key>' }`; served from private R2.
- Avatars fall back to Dicebear Notionists seeded by name.
- Fonts: Cormorant Garamond (`--D`) + Inter (`--B`); palette in `:root` custom properties.
- People are the central entity; condolences find-or-create a person by case-insensitive name and claim `user_id` for signed-in authors.
- Never delete data in migrations — additive only, so rollback stays easy.

## Run

`pnpm dev` — dev server at http://localhost:3000 (directory on plain localhost; memorial on `<slug>.localhost:3000`). Admin: the "Admin panel" item in the memorial's left menu, or `/admin-super`. First admin: create the memorial while signed in (creator = admin), or claim an unowned one from the admin gate screen.

⚠ Never run `pnpm build` while the dev server is running — they share `.next` and corrupt each other (MODULE_NOT_FOUND vendor-chunk errors). Kill the server fully (`fuser -k 3000/tcp` — killing the pnpm wrapper pid leaves the node child alive), `rm -rf .next`, then build.
