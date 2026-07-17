import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// One codebase serves the directory (root host) and every memorial host, so
// robots.txt is a host-aware route handler rather than a static app/robots.ts.
// Pages holding personal memorial data (condolences, contributions, profiles,
// program, people…) carry a noindex meta tag instead of a Disallow here —
// crawlers must be able to fetch a page to see its noindex, otherwise
// URL-only stubs can still show up in search results.
export function GET(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0]
  const body = [
    'User-agent: *',
    'Disallow: /api/',
    '',
    ...(host ? [`Sitemap: https://${host}/sitemap.xml`, ''] : []),
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
