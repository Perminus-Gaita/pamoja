# Pamoja

**Pamoja** (Swahili for *"together"*) is a free, open-source memorial web app — a digital condolence book where family and friends gather condolences, photo memories, tributes, contributions, and the funeral programme in one gentle place.

## Features

- **Condolence book** — visitors write condolences; each writer gets a profile page with their condolence, their place in the relation tree, and (optionally) their photo memories, tribute, and contributions.
- **Sign-in with anything** — email + password out of the box, plus Google, Facebook, X (Twitter), LinkedIn, TikTok, GitHub, Apple, Microsoft, Discord, Spotify, Twitch, and Reddit via [Better Auth](https://better-auth.com). Each provider activates simply by setting its env credentials.
- **Access control** — the family decides who sees what: contributions can be admins-only, all signed-in visitors, or a whitelist; the relation tree and programme can require sign-in or explicit pre-approval.
- **Relation tree** — a clickable tree rooted at the deceased; click any person to see their immediate connections. Groups (e.g. *Class of 2012*) appear on the tree and have their own pages collecting the group's condolences.
- **Admin panel** — basic info, people, programme, groups, relations, social links (WhatsApp/Telegram/Discord/…), memorial requests, feedback, granular co-admins, and access settings.
- **AI assistant** *(optional)* — visitors can ask practical questions ("where will the funeral be?"); admins get a tool-using assistant for data analysis, recording contributions, and granting access. Powered by the Claude API.
- **Multi-memorial directory** *(optional)* — one deployment can serve a landing grid of memorials, each on its own subdomain.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · hand-written CSS · [Neon](https://neon.tech) serverless Postgres · Cloudflare R2 for images · Better Auth · Claude API.

## Getting started

```bash
git clone https://github.com/<you>/pamoja && cd pamoja
pnpm install
cp .env.example .env        # fill in DATABASE_URL, R2 keys, BETTER_AUTH_SECRET, ADMIN_EMAILS
pnpm dev
```

- Memorial: http://localhost:3000 (or `http://<slug>.localhost:3000` when using the directory)
- **Becoming the admin:** sign up, then create the memorial from the landing page — the account that creates a memorial is its admin. The admin panel lives inside the memorial's left menu (and at `/admin-super`); use the avatar menu (top right) to switch between admin view and visitor view.

Tables are created automatically in Postgres on first request — no migration step.

### Required environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon (or any) Postgres connection string |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 image storage |
| `BETTER_AUTH_SECRET` | Session signing secret (`openssl rand -base64 32`) |

Everything else in [.env.example](.env.example) is optional: social sign-in providers, `ANTHROPIC_API_KEY` for the AI assistant, the multi-memorial domain settings, and the deployment mode.

### Free vs paid (managed hosting only)

The code ships with a single entitlement switch. **Self-hosting enables everything, free, forever.** A managed (hosted) deployment can set `NEXT_PUBLIC_DEPLOYMENT_MODE=managed` to gate the enhancements — relation tree, photo galleries, contributions page, custom program page, AI entry and AI moderation triage — behind a paid plan. The emotional core is never gated: **condolences are unlimited and free in every mode, the photo of the deceased is always free, and manual moderation (approve/hide, block anonymous writers) is always free.**

### Moderation

Three rungs: (1) *approval mode* — every condolence waits for the family's approval before appearing; (2) *anonymous control* — require sign-in to write; (3) *AI triage* (paid on managed) — pre-sorts incoming messages into approve / hold-for-review, and never deletes or silently rejects. There is no hard deletion of condolences: "deleting" hides the message (recoverable), and permanent deletion only becomes possible 30 days after it was written.

### Social sign-in

Register an OAuth app on each platform you want, with callback URL `https://<your-domain>/api/auth/callback/<provider>`, and set the credential pair in the environment (e.g. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`). The provider appears on the sign-in page automatically; admins can hide configured providers from **Admin → Auth & Access**.

## Deployment

Deploys cleanly to [Vercel](https://vercel.com): import the repo, set the env vars, done. For the multi-memorial directory, set `NEXT_PUBLIC_ROOT_DOMAIN` and add both the apex domain and a wildcard (`*.<domain>`) to the project.

## Contributing

PRs and issues are welcome. Keep it simple, dignified, and dependency-light — this app is meant to be easy for a grieving family's tech-comfortable relative to self-host in an afternoon.

## License

[Apache 2.0](LICENSE)
