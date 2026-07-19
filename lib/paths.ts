/*
 * Client-safe path helpers. The memorial app is served either at a host's
 * root (legacy subdomain flow) or under a path base on the main domain:
 *   /memorial/<slug>/…   real memorial
 *   /demo/<slug>/…       demo memorial
 * memorialBase() returns that base ('' at host root) so in-app navigation
 * stays inside the memorial it started from.
 */
export function memorialBase(pathname: string | null | undefined): string {
  const m = (pathname ?? '').match(/^\/(memorial|demo)\/[^/]+/)
  return m ? m[0] : ''
}
