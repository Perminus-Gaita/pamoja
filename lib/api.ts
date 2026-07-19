import { memorialBase } from '@/lib/paths'

/*
 * All client API calls go through here. When the page lives under a memorial
 * base path (/demo/<slug> or /memorial/<slug>), the API call is made under
 * that same base — e.g. /demo/pamoja-demo/api/condolences — and the
 * middleware rewrites it to /api/* while stamping the demo/slug headers
 * server-side. That makes the realm (demo vs real) an explicit part of the
 * request URL: no Referer sniffing, nothing for privacy extensions to break.
 * At the host root the base is '' and this is a plain fetch.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = typeof window === 'undefined' ? '' : memorialBase(window.location.pathname)
  return fetch(base + path, init)
}
