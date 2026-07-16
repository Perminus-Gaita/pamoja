import { db, withRetry } from '@/lib/db'

/*
 * The primary memorial is the one this deployment is built around (its data
 * lives in the single-tenant tables). Its slug is stored in the settings
 * table — set automatically when the first memorial is created — with the
 * legacy env var as a fallback for existing deployments.
 */
export async function getPrimarySlug(): Promise<string> {
  const sql = await db()
  const rows = await withRetry(() => sql`SELECT value FROM settings WHERE key = 'site.primarySlug'`)
  const fromDb = rows[0]?.value as string | undefined
  return fromDb || process.env.NEXT_PUBLIC_PRIMARY_MEMORIAL_SLUG || ''
}

export async function setPrimarySlug(slug: string): Promise<void> {
  const sql = await db()
  await sql`
    INSERT INTO settings (key, value) VALUES ('site.primarySlug', ${slug})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
}

/** The primary memorial row, if any. */
export async function getPrimaryMemorial(): Promise<{ id: number; slug: string; owner_user_id: string | null; plan: string } | null> {
  const slug = await getPrimarySlug()
  if (!slug) return null
  const sql = await db()
  const rows = await withRetry(() =>
    sql`SELECT id, slug, owner_user_id, plan FROM memorials WHERE slug = ${slug} LIMIT 1`
  )
  return (rows[0] as { id: number; slug: string; owner_user_id: string | null; plan: string } | undefined) ?? null
}
