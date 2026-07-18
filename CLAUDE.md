# Pamoja — Project Memory

Pamoja (Swahili for "together") is a free, open-source memorial web app — a digital condolence book gathering condolences, tributes, contributions, and program info. Next.js 15 (App Router), React 19, TypeScript, hand-written CSS (no Tailwind), Neon serverless Postgres, S3-compatible object storage (R2 primary) for photos, Better Auth for authentication, Claude API for the AI assistant. **Always use pnpm.**

Instance-specific deployment details (live Vercel setup, real memorial slug, gotchas) live in `CLAUDE.local.md`, which is gitignored — read it too when working on this machine.

## SEO (added July 2026)

Policy: index ONLY the deceased's name + dates and the marketing/landing content; never condolences or any personal memorial data.

- **Memorial home** (`app/page.tsx`, only rendered for memorial hosts): `generateMetadata()` reads the request host, resolves the memorial via `lib/seo.ts` (`memorialForHost()` — slug = first host label, falls back to primary), and emits title/description with name + dates only, plus schema.org Person JSON-LD (dates ISO-converted via `toIsoDate`). Personal data stays out of crawlable HTML anyway since the SPA fetches client-side.
- **Noindex** (`robots: {index:false}` metadata) on all section/personal routes: /condolences, /contributions, /family, /program, /people, /p/[id], /g/[id]; layout.tsx wrappers for the client pages /sign-in, /reset-password and /admin-super. Deliberately noindex-via-meta, NOT robots.txt Disallow (a Disallow would hide the noindex tag → URL-only stubs can still be indexed).
- **robots.txt + sitemap.xml are host-aware route handlers** (`app/robots.txt/route.ts`, `app/sitemap.xml/route.ts`) because one codebase serves the directory host + every memorial host — static app/robots.ts can't vary by host. robots disallows only /api/. Root-host sitemap lists directory + all approved memorial home URLs (sibling .vercel.app hosts, per memorialUrl logic); memorial hosts list just their own homepage.
- **Directory landing** (`app/directory/page.tsx`): feature-keyword metadata + WebApplication JSON-LD. The former on-page `.dir-seo` copy moved to dedicated indexable footer pages (July 2026 redesign): `/about` (feature copy + credits), `/faq` (FAQ + FAQPage JSON-LD), `/terms`, `/contact`. All share `components/doc-shell.tsx` (logo header + footer links) and are listed in the root-host sitemap.
- Root layout has a title template (`%s · Pamoja`) + metadataBase from `NEXT_PUBLIC_ROOT_DOMAIN`.

## Brand / logo (added July 2026)

- **PamojaLogo** (`components/pamoja-logo.tsx`, server component): wordmark "Pam-[o]-ja" where the o is Twemoji artwork animating hug 🫂 → heart ❤️ → hug via pure-CSS keyframes (`pjHug`/`pjHeart` in globals.css, respects prefers-reduced-motion). Letters use Poppins via `--font-poppins` (next/font in app/layout.tsx, alongside Cormorant + Inter). Props: size, animated, color, className.
- Used in: directory hero (42px), doc-shell header (30px), memorial sidebar (`sb-brand`, 24px amber `#d4a65a`), sign-in page (22px).
- Assets in `public/`: favicon.svg (wired via metadata `icons`), og.png (OG/twitter images in root layout metadata), pamoja-wordmark-animated.svg + pamoja-o-animated.svg (standalone, no font needed). `NOTICE` at repo root carries required Twemoji CC-BY 4.0 + Poppins OFL attribution (also on /about).
- Raw asset drop lives in `context_docs/` (gitignored); shipped copies are the source of truth.

## Directory landing (redesigned July 2026)

- Hero is just the animated logo + "Together in remembrance" kicker (no title/sub paragraph). Memorial cards are a compact grid (96px photos) so grid + footer fit one viewport.
- Footer: tagline "Pamoja — together. A free, open-source digital condolence book." above nav links About / FAQ / Terms & Conditions / Contact.
- Top-right (`.dir-top`): "Sign in" ghost button when signed out; the user's avatar (their image or Dicebear-by-name) when signed in.

## Contact & operator notifications (added July 2026)

- `/contact` page is deliberately simple: just a mailto link to the operator's email (perminusgaita1@gmail.com). A form + `POST /api/contact` + `contact_messages` table existed briefly but was removed by owner request — don't reintroduce without asking. (The table may still exist in live DBs; harmless.)
- **`lib/notify.ts` `notifyAdmins(text)`**: Telegram pings via `TELEGRAM_BOT_TOKEN` + `ADMINS_TELEGRAM_IDS` (comma-separated chat ids); silently no-ops when unset, logs a console.warn on API failure. Called from `/api/memorials` POST (pending memorial requests include the requester's contact details).

## Blog app (separate repo: `../pamoja-blog`)

The Pamoja Journal blog is a SEPARATE repository and Vercel project (`pamoja-blog`, live at pamoja-blog.vercel.app) living at `~/Desktop/Code/pamoja-blog` — content marketing for grief/funeral/mourning/death-statistics topics, cross-linking here via `NEXT_PUBLIC_APP_URL`. It is NOT part of this repo or this build. See its own README/CLAUDE notes: static markdown posts, a 1000-topic roadmap (`data/topics.json`), and a Claude Batches API generator (`scripts/generate-posts.mjs`, needs ANTHROPIC_API_KEY) for the ~960 posts not yet written.

## Auth & access control (added July 2026)

- **Better Auth** (`lib/auth.ts`) with email+password always on, plus 12 optional social providers (google, facebook, twitter, linkedin, tiktok, github, apple, microsoft, discord, spotify, twitch, reddit) that activate when their env credential pair is set (`PROVIDER_ENV` map). Handler at `app/api/auth/[...all]/route.ts`; client at `lib/auth-client.ts`; sign-in page at `/sign-in`. Better Auth's tables (`user`, `session`, `account`, `verification` — quoted camelCase columns) are created in `lib/db.ts` alongside app tables (no CLI migration). NOTE: in production Better Auth sets `__Secure-` cookies — sessions only work over https (or in dev mode locally).
- **Password reset (added July 2026)**: "Forgot password?" link on `/sign-in` → `requestPasswordReset({ email, redirectTo: '/reset-password' })` → Better Auth emails a token link via `emailAndPassword.sendResetPassword` (`lib/auth.ts`), which calls `sendPasswordResetEmail()` in `lib/email.ts` (Resend, `RESEND_API_KEY` + `RESEND_FROM_EMAIL`). Optional like `notify.ts`: no-ops with a console.warn if unset, so self-host works without it (just no self-service recovery). `/reset-password` (noindex) reads `?token=` and calls `resetPassword({ newPassword, token })`.
- **Admins — creator-as-owner model**: the account that creates a memorial is its admin (`memorials.owner_user_id`); no bootstrap env var. Deployments that predate ownership expose a one-time claim (`/api/memorials/claim`, surfaced on the admin gate screen). `ADMIN_EMAILS` survives only as an optional operator override. Other admins live in `user_roles` (permissions JSONB; `["*"]` = all). Granular permissions: settings, people, condolences, contributions, memorials, admins, access, groups, relations, tributes, memories, ai.
- **Platform admin (added July 2026)** — distinct from memorial admins: the site developer/operator. Flag is `user."isPlatformAdmin"` (boolean on the Better Auth user table), seeded on db init from `PLATFORM_ADMIN_EMAIL` env (idempotent UPDATE each init, so it applies once the account signs up). Exposed via `Viewer.isPlatformAdmin` (lib/access.ts) → `/api/me` → `Me` type. `/platform-admin` (noindex, client-gated) is currently a placeholder panel page.
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
- **Retention rule (90 days, universal)**: every DELETE endpoint (condolences, memorials, groups, relations, tributes) is a SOFT delete — `deleted_at` stamp, restorable for 90 days (condolences: Restore button in the Moderation tab; others via PATCH `{restore:true}` where implemented or directly in the DB), then purged automatically by opportunistic purge statements in `lib/db.ts` init. All reads filter `deleted_at IS NULL`. There is NO manual hard delete anywhere.
- **AI service boundary**: ALL LLM calls live in `lib/ai.ts` (askMemorial, triageCondolence, parseContributionEntry, runAdminAgent) so execution can later be swapped to workflows without touching callers. NL contribution entry: `POST /api/ai/parse-entry` (admin + aiEntry feature).

## Profiles, relation tree, groups, tributes

- **Person profile pages** (`/p/[id]`, `components/person-page.tsx`): clicking a condolence author opens their profile — tabs: Condolence (always), Relation tree (if viewer can see it), Contributions (if `tabs.contributions` on AND viewer can see contributions AND they have any), Memories (`tabs.memories` + `access.memoriesScope` = own | group | all), Tribute (`tabs.tribute`, read access `access.tribute`, length `tribute.maxLength` with per-person override key `tribute.maxLength.<personId>`). A person is "owned" by the auth user in `people.user_id` (linked when a signed-in user posts a condolence); owners edit their own memories/tribute.
- **Relation tree** (`components/relation-tree.tsx`, still routed at `/family`, label renamed): dynamic — root is the deceased; edges live in the `relations` table (`person_b NULL` = edge to the deceased); clicking a person re-centres on their connections. Falls back to the legacy `cfg.familyTree` generations grid when no edges exist. Groups render as nodes on the root view.
- **Groups** (`groups` + `person_groups` tables, `/g/[id]` page): e.g. "Class of 2012" — members grid + the group's condolences. Managed in Admin → Groups.
- **Tributes** (`tributes` table): one longer piece per person about the deceased; upsert on POST.

## AI features (optional, needs ANTHROPIC_API_KEY)

- Public: `components/ask-widget.tsx` floating widget → `/api/ai/ask` — answers practical questions grounded on config + program (deliberately public per product decision, even though the Program section is gated).
- Admin: Admin → AI Assistant tab → `/api/ai/admin` — manual tool-use loop (model `claude-opus-4-8`, adaptive thinking) with tools: get_stats, list_recent, add_contribution, grant_access. Each tool re-checks the admin's own permission.

## Demo memorial (added July 2026)

- **`lib/demo.ts`** is the hub: `isDemoRequest()`/`isDemoHost()` (host slug → `memorials.is_demo`, 60s in-memory cache), `demoOk()` (pretend-success JSON for admin mutations), `DEMO_CONFIG` (fabricated Jina Mpendwa config served instead of the settings table), `DEMO_SLUG='pamoja-demo'`.
- **Data structure**: `is_demo BOOLEAN` columns on memorials, people, condolences, memories, contributions. People's unique name index is now composite: `people_name_lower_v2 (LOWER(name), is_demo)` (old `people_name_lower` dropped). EVERY read is partitioned by `is_demo = <mode>` — demo hosts can never see real data (incl. probing /api/people/[id], tributes, memorials?status=all) and real hosts never see demo rows.
- **db.ts init** seeds the demo memorial (slug `pamoja-demo`, status approved, is_demo TRUE) + 3 fictional people/condolences + 2 contributions, all idempotent per-row (`WHERE NOT EXISTS`); visitor-added demo rows purge after **7 days** (seeds self-heal on next init).
- **Viewer** (`lib/access.ts`): on a demo host `getViewer()` returns `demo:true`; signed-out visitors get a fake user ("Demo Visitor") with `isAdmin:true`/`['*']` and `realUser:false`; signed-in users keep their identity but are forced admin. `/api/me` demo branch: everything unlocked, all gates open, `demo:true` (in `Me` type).
- **Consequence rules**: admin mutations across ALL routes short-circuit with `demoOk()` before touching the DB (settings, config POST, people, contributions, groups, relations, condolence moderation, users, access-grants, memorials incl. claim, ai/parse-entry; ai ask/admin return canned answers). Condolences (anyone) and memories/tributes/own-person-edits (real sign-in required) DO persist, flagged `is_demo`. `/api/upload` requires `realUser` (fake sign-in can't fill the bucket). Demo condolences skip moderation/AI triage.
- **UI**: directory splits demo cards into a dashed "Try the demo" card (badge, `dir-card-demo`/`dir-demo-badge` CSS); memorial SPA shows a `.demo-note` banner under the topbar ("admin changes aren't saved").
- ⚠ On the live vercel.app setup, sibling-domain routing means the demo lives at `pamoja-demo.vercel.app` — that domain must be added/aliased like any memorial (locally: `pamoja-demo.localhost:3000`).

## Multi-memorial architecture

One codebase serves two experiences, split by hostname in `middleware.ts`:
- **Root domain** (`NEXT_PUBLIC_ROOT_DOMAIN`, `www.`, or plain `localhost`) — `/` rewrites to `/directory` (`components/directory.tsx`), a grid of approved memorials + "Create a memorial" card.
- **Memorial subdomain** — serves the memorial app. Unknown hosts fall through to the memorial.
- The primary memorial's slug comes from `NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG` (env, no real name in source); its landing card hydrates live from the `settings` table. **Not yet multi-tenant** — all subdomains serve the same single-tenant data.

## Memorial creation flow (approvals removed July 2026)

Visitor clicks "+" on the landing grid → sign-in required → modal collects name, dates, optional photo → memorial is created with `status='approved'` immediately (NO approval queue; creator becomes admin) and the done screen links straight to it. Telegram `notifyAdmins` fires on every creation. **admin-super → Memorial Requests** still exists for managing/unpublishing (and any legacy `pending` rows), but nothing new lands there as pending.

## Key structure

- `lib/db.ts` — Neon client; lazily creates ALL tables on first use (app tables + Better Auth tables + user_roles, access_grants, groups, person_groups, relations, tributes); additive-only migrations via `ADD COLUMN IF NOT EXISTS`.
- `lib/config.ts` — static fallbacks + types (incl. `Me`, `SocialLink`); DB `settings` overrides via `/api/config`.
- `lib/auth.ts` / `lib/auth-client.ts` / `lib/access.ts` — auth stack (see above); `lib/email.ts` — Resend wrapper for password reset emails, same optional-service pattern as `lib/notify.ts`.
- `components/pamoja.tsx` — the memorial SPA; nav filtered per-viewer via `navVisible()`; top-right is Sign in / user chip; sidebar footer renders admin-configured `cfg.socialLinks` (legacy `cfg.whatsapp` still used as fallback in /api/me).
- `components/admin-panel.tsx` — ALL admin tabs (`ADMIN_TABS` + `AdminTabContent`, incl. Moderation and the "show in directory" ListingToggle); `app/admin-super/page.tsx` is a thin gated wrapper (with the claim button). The panel is ALSO embedded in the memorial's left menu: pamoja.tsx has an "Admin panel" sidebar item (admins only) that swaps the sidebar to admin menu items, plus an avatar dropdown (top right) with admin/visitor view toggle + sign out.
- `app/globals.css` — all styles; new sections: AUTH, GATE PANEL, TOPBAR USER, RELATION TREE EXTRAS, PERSON/GROUP PAGES, ASK WIDGET.
- `scripts/backup-db.mjs` — DB backup to `backups/`.

## Photo storage (migrated July 2026 — bypasses Vercel image billing)

- **`lib/storage.ts`** is the single adapter; **`lib/r2.ts` is gone**. Three env-picked modes: `s3` (`S3_ENDPOINT`+`S3_BUCKET`+keys+`S3_REGION`(auto)+`S3_PUBLIC_URL` — any S3-compatible store: R2/MinIO/Spaces/AWS), `r2` (legacy private-bucket `R2_*` vars, proxied via `/api/images/<key>`), `local` (no vars — files in `./uploads` or `UPLOADS_DIR`, gitignored; self-host fallback, useless on serverless).
- **Upload = one-time compute** (`storePhoto()` in lib/storage.ts, called from `/api/upload`; sharp is a real dependency now): exactly two WebP derivatives — thumb 400px longest edge q75, display 1600px q80 — keys `memorials/{memorialId}/{photoId}-thumb|-display.webp`. `.rotate()` bakes orientation, ALL EXIF/GPS stripped, **original discarded**. memorialId resolved from the request host (root host → `unassigned`, since the create-memorial flow uploads before the memorial exists). The `folder` FormData field was removed from all four client call sites. Response: `{ url, thumbUrl }` — `url` is the display variant and is what lands in DB columns (people.photo, condolences.photo, memories.src, memorials.portrait, settings cfg.portrait).
- **Serving**: in s3 mode with `S3_PUBLIC_URL`, DB stores the full public URL — browser fetches straight from the bucket domain, zero Vercel involvement. `/api/images/[...key]` survives only for legacy keys + r2/local modes. `next.config.ts` sets `images: { unoptimized: true }` as a guard (no next/image is used anywhere — all plain `<img loading="lazy">`).
- **Render-time variant pick, no data migration**: `photoThumb()` in `lib/photo.ts` maps `…-display.webp` → `…-thumb.webp` and passes legacy URLs through unchanged. All grids/avatars (every rendition ≤180px) use photoThumb; only the lightbox in pamoja.tsx uses the raw stored display URL.
- README has a "Photo storage" setup section (R2 bucket + public custom domain + env vars).

## Conventions

- Dates stored as long-form text ("1 January 1950"), not ISO.
- Images: POST `/api/upload` (FormData `file`; auth required; images only, ≤10 MB) → `{ url, thumbUrl }` (see Photo storage above).
- Avatars fall back to Dicebear Notionists seeded by name.
- Demo/placeholder person name is **"Jina Mpendwa"** (lib/config.ts CONFIG.name) — never use a real person's name in demo data.
- Fonts: Cormorant Garamond (`--D`) + Inter (`--B`); palette in `:root` custom properties.
- People are the central entity; condolences find-or-create a person by case-insensitive name and claim `user_id` for signed-in authors.
- Never delete data in migrations — additive only, so rollback stays easy.

## Run

`pnpm dev` — dev server at http://localhost:3000 (directory on plain localhost; memorial on `<slug>.localhost:3000`). Admin: the "Admin panel" item in the memorial's left menu, or `/admin-super`. First admin: create the memorial while signed in (creator = admin), or claim an unowned one from the admin gate screen.

⚠ Never run `pnpm build` while the dev server is running — they share `.next` and corrupt each other (MODULE_NOT_FOUND vendor-chunk errors). Kill the server fully (`fuser -k 3000/tcp` — killing the pnpm wrapper pid leaves the node child alive), `rm -rf .next`, then build.
