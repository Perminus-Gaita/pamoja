import { NextRequest, NextResponse } from 'next/server'

// Routing:
//   Root host "/"                    -> the directory landing (demo + create)
//   /memorial/<slug>/...  (any host) -> the memorial app (path-based; no new
//                                       domains are handed out anymore)
//   /demo/<slug>/...      (any host) -> the memorial app in demo mode
//   <slug>.mydomain.com              -> legacy: the primary memorial keeps its
//                                       own domain; "/" serves the memorial
//
// Demo mode for API calls is signalled with the x-pamoja-demo request header:
// set here when the API call's referring page lives under /demo/, or when the
// host itself is a demo memorial's (legacy subdomain flow). The header is
// always normalised so clients can't smuggle it in — though all it unlocks is
// the sandbox.

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase()
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '').split(':')[0].toLowerCase()

  const isRootHost =
    (root && (host === root || host === `www.${root}`)) ||
    host === 'localhost' ||
    host === '127.0.0.1'

  // API requests: tag demo-ness from the referring page's path
  if (url.pathname.startsWith('/api/')) {
    let demo = false
    try {
      demo = new URL(req.headers.get('referer') ?? '').pathname.startsWith('/demo/')
    } catch {}
    const headers = new Headers(req.headers)
    headers.delete('x-pamoja-demo')
    headers.delete('x-pamoja-slug')
    if (demo) headers.set('x-pamoja-demo', '1')
    return NextResponse.next({ request: { headers } })
  }

  // Path-based memorial serving (single-tenant: the slug only picks the realm)
  const m = url.pathname.match(/^\/(memorial|demo)\/([^/]+)(\/.*)?$/)
  if (m) {
    const rewritten = url.clone()
    rewritten.pathname = m[3] || '/'
    const headers = new Headers(req.headers)
    headers.delete('x-pamoja-demo')
    headers.delete('x-pamoja-slug')
    headers.set('x-pamoja-slug', m[2])
    if (m[1] === 'demo') headers.set('x-pamoja-demo', '1')
    return NextResponse.rewrite(rewritten, { request: { headers } })
  }

  if (isRootHost && url.pathname === '/') {
    const rewritten = url.clone()
    rewritten.pathname = '/directory'
    return NextResponse.rewrite(rewritten)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/memorial/:path*', '/demo/:path*', '/api/:path*'],
}
