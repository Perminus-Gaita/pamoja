import { db, withRetry } from '@/lib/db'
import { getPrimarySlug } from '@/lib/site'
import { CONFIG } from '@/lib/config'

export type MemorialSeo = {
  slug: string
  name: string
  born: string
  passed: string
}

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '').split(':')[0].toLowerCase()

/** True when the host is the directory landing, not a memorial. */
export function isRootHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase()
  return (
    (ROOT !== '' && (h === ROOT || h === `www.${ROOT}`)) ||
    h === 'localhost' ||
    h === '127.0.0.1'
  )
}

/** Slug implied by a memorial host: first label of the hostname. */
export function slugFromHost(host: string): string {
  return host.split(':')[0].toLowerCase().split('.')[0] ?? ''
}

/**
 * Resolve the memorial a request host refers to, for metadata purposes only
 * (name + dates — deliberately nothing else). Falls back to the primary
 * memorial for unknown hosts (previews, etc.). Never throws: metadata must
 * not take the page down with it.
 */
export async function memorialForHost(host: string): Promise<MemorialSeo | null> {
  try {
    const sql = await db()
    const slug = slugFromHost(host)
    let row: MemorialSeo | undefined
    if (slug) {
      const rows = await withRetry(
        () => sql`SELECT slug, name, born, passed FROM memorials WHERE slug = ${slug} AND deleted_at IS NULL LIMIT 1`
      )
      row = rows[0] as MemorialSeo | undefined
    }
    const primary = await getPrimarySlug()
    if (!row && primary) {
      const rows = await withRetry(
        () => sql`SELECT slug, name, born, passed FROM memorials WHERE slug = ${primary} AND deleted_at IS NULL LIMIT 1`
      )
      row = rows[0] as MemorialSeo | undefined
    }
    if (!row) return null
    // The primary memorial's row is a stub — its display details live in the
    // settings table (same hydration as /api/memorials).
    if (row.slug === primary) {
      const settings = await withRetry(
        () => sql`SELECT key, value FROM settings WHERE key IN ('cfg.name', 'cfg.born', 'cfg.passed')`
      )
      const s: Record<string, string> = {}
      for (const r of settings) s[r.key as string] = r.value as string
      row = {
        ...row,
        name:   s['cfg.name']   ?? CONFIG.name,
        born:   s['cfg.born']   ?? CONFIG.born,
        passed: s['cfg.passed'] ?? CONFIG.passed,
      }
    }
    return row.name ? row : null
  } catch {
    // metadata falls back to the generic app title
  }
  return null
}

/** Long-form date text ("1 January 1950") → ISO for structured data, or null. */
export function toIsoDate(text: string): string | null {
  const t = (text ?? '').trim()
  if (!t) return null
  const d = new Date(t)
  if (isNaN(d.getTime())) return null
  // Local date parts, not toISOString() — UTC conversion shifts local
  // midnight to the previous day east of Greenwich.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
