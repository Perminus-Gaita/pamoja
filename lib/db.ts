import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null
let _ready: Promise<void> | null = null

function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!)
  return _sql
}

const DEDUP_VERSION   = 'dedup-v1'
const DEDUP_VERSION_2 = 'dedup-v2'

async function init() {
  const sql = getSql()

  await sql`
    CREATE TABLE IF NOT EXISTS people (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      relation   TEXT NOT NULL DEFAULT '',
      photo      TEXT DEFAULT '',
      bio        TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE people ADD COLUMN IF NOT EXISTS family_group TEXT`
  // Demo partition: demo-memorial rows live in the same tables flagged
  // is_demo = TRUE; every read is scoped by it. Names are unique per realm,
  // so the old global unique index is replaced by a composite one.
  await sql`ALTER TABLE people ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS people_name_lower_v2 ON people (LOWER(name), is_demo)`
  await sql`DROP INDEX IF EXISTS people_name_lower`

  await sql`
    CREATE TABLE IF NOT EXISTS condolences (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      relation   TEXT NOT NULL,
      message    TEXT NOT NULL,
      photo      TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE condolences ADD COLUMN IF NOT EXISTS person_id INTEGER`

  await sql`
    CREATE TABLE IF NOT EXISTS memories (
      id         SERIAL PRIMARY KEY,
      src        TEXT NOT NULL,
      caption    TEXT DEFAULT '',
      added_by   TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS contributions (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      relation   TEXT NOT NULL,
      amount     INTEGER NOT NULL,
      note       TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS person_id INTEGER`
  await sql`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS family_group TEXT`

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS memorials (
      id            SERIAL PRIMARY KEY,
      slug          TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      born          TEXT DEFAULT '',
      passed        TEXT DEFAULT '',
      portrait      TEXT DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'pending',
      contact_name  TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      contact_email TEXT DEFAULT '',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // ── Better Auth core tables (schema matches better-auth's generated migration) ──
  await sql`
    CREATE TABLE IF NOT EXISTS "user" (
      "id"            TEXT PRIMARY KEY,
      "name"          TEXT NOT NULL,
      "email"         TEXT NOT NULL UNIQUE,
      "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
      "image"         TEXT,
      "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS "session" (
      "id"        TEXT PRIMARY KEY,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "token"     TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId"    TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS session_user_idx ON "session" ("userId")`
  await sql`
    CREATE TABLE IF NOT EXISTS "account" (
      "id"                    TEXT PRIMARY KEY,
      "accountId"             TEXT NOT NULL,
      "providerId"            TEXT NOT NULL,
      "userId"                TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
      "accessToken"           TEXT,
      "refreshToken"          TEXT,
      "idToken"               TEXT,
      "accessTokenExpiresAt"  TIMESTAMPTZ,
      "refreshTokenExpiresAt" TIMESTAMPTZ,
      "scope"                 TEXT,
      "password"              TEXT,
      "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS account_user_idx ON "account" ("userId")`
  await sql`
    CREATE TABLE IF NOT EXISTS "verification" (
      "id"         TEXT PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "value"      TEXT NOT NULL,
      "expiresAt"  TIMESTAMPTZ NOT NULL,
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification" ("identifier")`

  // ── Roles & access control ──
  await sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id     TEXT PRIMARY KEY,
      role        TEXT NOT NULL DEFAULT 'admin',
      permissions JSONB NOT NULL DEFAULT '["*"]',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // Pre-approval whitelist: area is 'relation_tree' | 'program' | 'contributions'
  await sql`
    CREATE TABLE IF NOT EXISTS access_grants (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      area       TEXT NOT NULL,
      granted_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, area)
    )
  `

  // ── Groups of people (e.g. "Class of 2012") ──
  await sql`
    CREATE TABLE IF NOT EXISTS groups (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS person_groups (
      person_id  INTEGER NOT NULL,
      group_id   INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (person_id, group_id)
    )
  `

  // ── Relation tree edges. person_b NULL means "related to the deceased". ──
  // relation reads "person_a is <relation> of person_b" (or of the deceased).
  await sql`
    CREATE TABLE IF NOT EXISTS relations (
      id         SERIAL PRIMARY KEY,
      person_a   INTEGER NOT NULL,
      person_b   INTEGER,
      relation   TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // ── Tributes: longer pieces written by a person about the deceased ──
  await sql`
    CREATE TABLE IF NOT EXISTS tributes (
      id             SERIAL PRIMARY KEY,
      person_id      INTEGER NOT NULL,
      author_user_id TEXT DEFAULT '',
      body           TEXT NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Link existing entities to auth users / people — additive, never destructive
  await sql`ALTER TABLE people      ADD COLUMN IF NOT EXISTS user_id TEXT`
  await sql`ALTER TABLE condolences ADD COLUMN IF NOT EXISTS user_id TEXT`
  await sql`ALTER TABLE memories    ADD COLUMN IF NOT EXISTS person_id INTEGER`
  await sql`ALTER TABLE memories    ADD COLUMN IF NOT EXISTS user_id TEXT`

  // Ownership + plans: the account that creates a memorial is its admin
  await sql`ALTER TABLE memorials ADD COLUMN IF NOT EXISTS owner_user_id TEXT`
  await sql`ALTER TABLE memorials ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'`

  // Demo partition flags (see lib/demo.ts)
  await sql`ALTER TABLE memorials     ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE condolences   ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE memories      ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`

  // Platform admin — the site developer/operator (distinct from memorial
  // admins). Flag lives on the auth user; seeded from PLATFORM_ADMIN_EMAIL so
  // no personal email lives in the source.
  await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT FALSE`
  const platformAdminEmail = (process.env.PLATFORM_ADMIN_EMAIL ?? '').trim().toLowerCase()
  if (platformAdminEmail) {
    await sql`UPDATE "user" SET "isPlatformAdmin" = TRUE WHERE LOWER(email) = ${platformAdminEmail} AND "isPlatformAdmin" = FALSE`
  }

  // Moderation & visibility are distinct states (spec: soft-hide, never silent-drop)
  //   moderation: 'approved' | 'pending' (awaiting admin) | 'held' (AI triage)
  //   hidden:     admin soft-hide — record retained, invisible to the public
  await sql`ALTER TABLE condolences ADD COLUMN IF NOT EXISTS moderation TEXT NOT NULL DEFAULT 'approved'`
  await sql`ALTER TABLE condolences ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE`

  // Universal retention rule: every "delete" is a soft delete (deleted_at
  // stamp) restorable for 90 days; rows are purged automatically after that.
  await sql`ALTER TABLE condolences   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE memorials     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE groups        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE relations     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE tributes      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE memories      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE people        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE feedback      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`

  // Opportunistic purge of soft-deleted rows past the 90-day window
  await sql`DELETE FROM condolences   WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM memorials     WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM groups        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM relations     WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM tributes      WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM memories      WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM contributions WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM people        WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM feedback      WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days'`
  await sql`DELETE FROM person_groups WHERE group_id NOT IN (SELECT id FROM groups)`

  // Remove orphan condolences left from before person_id was added
  await sql`DELETE FROM condolences WHERE person_id IS NULL`

  // dedup-v1: remove duplicate people and contributions
  const [dedupClaimed] = await sql`
    INSERT INTO settings (key, value) VALUES (${DEDUP_VERSION}, 'in-progress')
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `
  if (dedupClaimed) {
    await sql`
      UPDATE condolences SET person_id = sub.keep_id
      FROM (SELECT id, MIN(id) OVER (PARTITION BY LOWER(name)) AS keep_id FROM people) sub
      WHERE condolences.person_id = sub.id AND sub.id != sub.keep_id
    `
    await sql`
      UPDATE contributions SET person_id = sub.keep_id
      FROM (SELECT id, MIN(id) OVER (PARTITION BY LOWER(name)) AS keep_id FROM people) sub
      WHERE contributions.person_id = sub.id AND sub.id != sub.keep_id
    `
    await sql`DELETE FROM people WHERE id NOT IN (SELECT MIN(id) FROM people GROUP BY LOWER(name))`
    await sql`DELETE FROM contributions WHERE id NOT IN (SELECT MIN(id) FROM contributions GROUP BY name, amount)`
    await sql`UPDATE settings SET value = 'done' WHERE key = ${DEDUP_VERSION}`
  }

  // dedup-v2: also deduplicates condolences
  const [dedup2Claimed] = await sql`
    INSERT INTO settings (key, value) VALUES (${DEDUP_VERSION_2}, 'in-progress')
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `
  if (dedup2Claimed) {
    await sql`
      UPDATE condolences SET person_id = sub.keep_id
      FROM (SELECT id, MIN(id) OVER (PARTITION BY LOWER(name)) AS keep_id FROM people) sub
      WHERE condolences.person_id = sub.id AND sub.id != sub.keep_id
    `
    await sql`
      UPDATE contributions SET person_id = sub.keep_id
      FROM (SELECT id, MIN(id) OVER (PARTITION BY LOWER(name)) AS keep_id FROM people) sub
      WHERE contributions.person_id = sub.id AND sub.id != sub.keep_id
    `
    await sql`DELETE FROM people WHERE id NOT IN (SELECT MIN(id) FROM people GROUP BY LOWER(name))`
    await sql`DELETE FROM contributions WHERE id NOT IN (SELECT MIN(id) FROM contributions GROUP BY name, amount)`
    await sql`DELETE FROM condolences WHERE id NOT IN (SELECT MIN(id) FROM condolences GROUP BY LOWER(name), message)`
    await sql`UPDATE settings SET value = 'done' WHERE key = ${DEDUP_VERSION_2}`
  }

  // Seed generic UI defaults — idempotent, never overwrites admin edits
  await sql`
    INSERT INTO settings (key, value)
    VALUES ('cfg.kicker', 'In loving memory of')
    ON CONFLICT (key) DO NOTHING
  `
  // The primary memorial — always approved; its card is hydrated from settings at read time.
  // Configured via NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG so no real name lives in the source.
  const primarySlug = process.env.NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG
  if (primarySlug) {
    await sql`
      INSERT INTO memorials (slug, name, status)
      VALUES (${primarySlug}, '', 'approved')
      ON CONFLICT (slug) DO NOTHING
    `
  }

  // ── Demo memorial (see lib/demo.ts) ──
  // Visitor-added demo rows are purged after 7 days; the seed rows below are
  // idempotent per-row, so they self-heal on the next init after a purge.
  await sql`DELETE FROM condolences WHERE is_demo AND created_at < NOW() - INTERVAL '7 days'`
  await sql`DELETE FROM memories    WHERE is_demo AND created_at < NOW() - INTERVAL '7 days'`
  await sql`
    DELETE FROM people WHERE is_demo AND created_at < NOW() - INTERVAL '7 days'
      AND id NOT IN (SELECT person_id FROM condolences WHERE person_id IS NOT NULL)
  `
  await sql`
    INSERT INTO memorials (slug, name, born, passed, status, is_demo)
    SELECT 'pamoja-demo', 'Jina Mpendwa', '1 January 1950', '1 June 2026', 'approved', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM memorials WHERE is_demo AND deleted_at IS NULL)
    ON CONFLICT (slug) DO NOTHING
  `
  // Fictional demo people + condolences + contributions (never real names)
  const demoPeople: Array<[string, string]> = [
    ['Amani Baraka', 'Friend'],
    ['Neema Zawadi', 'Niece'],
    ['Juma Tumaini', 'Neighbour and friend'],
  ]
  for (const [name, relation] of demoPeople) {
    await sql`
      INSERT INTO people (name, relation, is_demo)
      SELECT ${name}, ${relation}, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM people WHERE LOWER(name) = LOWER(${name}) AND is_demo)
    `
  }
  const demoCondolences: Array<[string, string, string]> = [
    ['Amani Baraka', 'Friend', 'A gentle soul who welcomed everyone. Rest well, mzee — your kindness lives on in all of us.'],
    ['Neema Zawadi', 'Niece', 'Thank you for every story, every laugh, every lesson. We will carry you with us always.'],
    ['Juma Tumaini', 'Neighbour and friend', 'Pole sana to the family. He was a pillar of our community and will be deeply missed.'],
  ]
  for (const [name, relation, message] of demoCondolences) {
    await sql`
      INSERT INTO condolences (name, relation, message, person_id, is_demo)
      SELECT ${name}, ${relation}, ${message},
             (SELECT id FROM people WHERE LOWER(name) = LOWER(${name}) AND is_demo LIMIT 1),
             TRUE
      WHERE NOT EXISTS (SELECT 1 FROM condolences WHERE name = ${name} AND message = ${message} AND is_demo)
    `
  }
  const demoContributions: Array<[string, string, number]> = [
    ['Amani Baraka', 'Friend', 5000],
    ['Neema Zawadi', 'Niece', 2000],
  ]
  for (const [name, relation, amount] of demoContributions) {
    await sql`
      INSERT INTO contributions (name, relation, amount, person_id, is_demo)
      SELECT ${name}, ${relation}, ${amount},
             (SELECT id FROM people WHERE LOWER(name) = LOWER(${name}) AND is_demo LIMIT 1),
             TRUE
      WHERE NOT EXISTS (SELECT 1 FROM contributions WHERE name = ${name} AND amount = ${amount} AND is_demo)
    `
  }

  await sql`
    INSERT INTO settings (key, value)
    VALUES ('cfg.relations', ${JSON.stringify([
      'Brother', 'Sister',
      'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin',
      'Brother-in-law', 'Sister-in-law',
      'Friend', 'Neighbour and friend',
      'Other',
    ])})
    ON CONFLICT (key) DO NOTHING
  `
}

export async function db() {
  if (!_ready) {
    _ready = init().catch(e => { _ready = null; throw e })
  }
  await _ready
  return getSql()
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e: unknown) {
    const cause = (e as { cause?: { code?: string } })?.cause
    const msg = (e as { message?: string })?.message ?? ''
    if (cause?.code === 'ETIMEDOUT' || msg.includes('fetch failed')) {
      await new Promise(r => setTimeout(r, 700))
      return fn()
    }
    throw e
  }
}
