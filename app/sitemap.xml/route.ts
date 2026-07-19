import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { isRootHost } from '@/lib/seo'

export const dynamic = 'force-dynamic'

function urlTag(loc: string, changefreq = 'weekly'): string {
  return `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq></url>`
}

// Host-aware sitemap: the root host lists the directory plus every approved
// memorial home (each on its own sibling/subdomain host); a memorial host
// lists just its own homepage — the only page of it that is indexable.
export async function GET(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0]
  const urls: string[] = []

  if (host && isRootHost(host)) {
    urls.push(urlTag(`https://${host}/`, 'daily'))
    urls.push(urlTag(`https://${host}/memorials`, 'daily'))
    for (const p of ['about', 'faq', 'terms', 'contact'])
      urls.push(urlTag(`https://${host}/${p}`, 'monthly'))
    try {
      const sql = await db()
      // Memorials are served path-based on this host (no new domains); the
      // fictional demo is left out of the sitemap.
      const rows = await withRetry(
        () => sql`SELECT slug FROM memorials WHERE status = 'approved' AND deleted_at IS NULL AND is_demo = FALSE ORDER BY id`
      )
      for (const r of rows as { slug: string }[]) {
        urls.push(urlTag(`https://${host}/memorial/${r.slug}`))
      }
    } catch {
      // sitemap still returns the landing page
    }
  } else if (host) {
    urls.push(urlTag(`https://${host}/`))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
