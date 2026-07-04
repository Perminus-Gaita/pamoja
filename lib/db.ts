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
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS people_name_lower ON people (LOWER(name))`

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
  // The original memorial — always approved; its card is hydrated from settings at read time
  await sql`
    INSERT INTO memorials (slug, name, status)
    VALUES ('eng-maina-kamau', '', 'approved')
    ON CONFLICT (slug) DO NOTHING
  `

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
