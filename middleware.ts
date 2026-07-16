import { NextRequest, NextResponse } from 'next/server'

// Host-based routing:
//   mydomain.com (root)       -> "/" shows the memorial directory (grid landing)
//   <slug>.mydomain.com       -> "/" shows the memorial itself (existing app)
//
// The root domain comes from NEXT_PUBLIC_ROOT_DOMAIN (e.g. "mydomain.com").
// Unknown hosts (e.g. *.vercel.app previews) keep serving the memorial so
// links already shared keep working until the custom domain is wired up.
// In dev: localhost:3000 shows the directory, <slug>.localhost:3000 shows
// the memorial.

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase()
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '').split(':')[0].toLowerCase()

  const isRootHost =
    (root && (host === root || host === `www.${root}`)) ||
    host === 'localhost' ||
    host === '127.0.0.1'

  if (isRootHost) {
    const url = req.nextUrl.clone()
    url.pathname = '/directory'
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/'],
}
