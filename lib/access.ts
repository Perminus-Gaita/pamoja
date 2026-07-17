import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db, withRetry } from '@/lib/db'
import { getPrimaryMemorial } from '@/lib/site'

/*
 * Access control:
 *  - The OWNER is the account that created (or claimed) the primary memorial —
 *    full power, can't be demoted from the UI. Additional admins live in the
 *    user_roles table with granular permissions. ADMIN_EMAILS remains as an
 *    optional operator override (e.g. the platform team on a managed host).
 *  - Sections/tabs are gated by settings; defaults live in ACCESS_DEFAULTS
 *    so only overrides are stored in the settings table.
 */

export const PERMISSIONS = [
  'settings', 'people', 'condolences', 'contributions', 'memorials',
  'admins', 'access', 'groups', 'relations', 'tributes', 'memories', 'ai',
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const ACCESS_DEFAULTS: Record<string, string> = {
  'access.condolencesRequireAuth': 'false',
  // 'admins' | 'authenticated' | 'whitelisted'
  'access.contributions': 'admins',
  // 'authenticated' | 'approved'
  'access.relationTree': 'authenticated',
  'access.program': 'authenticated',
  // Profile tabs
  'tabs.contributions': 'off',
  'tabs.memories': 'off',
  // 'own' | 'group' | 'all' — whose memories a signed-in visitor can see
  'access.memoriesScope': 'own',
  'tabs.tribute': 'off',
  // 'authenticated' | 'everyone' — who can read tributes when the tab is on
  'access.tribute': 'authenticated',
  'tribute.maxLength': '2000',
  // Moderation ladder (spec): approval mode is free; AI triage is the paid rung
  'moderation.approvalMode': 'off',
  'moderation.aiTriage': 'off',
}

export type Viewer = {
  user: { id: string; name: string; email: string; image: string | null } | null
  isAdmin: boolean
  isPlatformAdmin: boolean   // the site developer/operator (user."isPlatformAdmin")
  permissions: string[]
  grants: string[]           // whitelisted areas: relation_tree | program | contributions
  personId: number | null    // people row linked to this account, if any
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function getViewer(): Promise<Viewer> {
  await db()
  const session = await auth().api.getSession({ headers: await headers() }).catch(() => null)
  if (!session?.user) {
    return { user: null, isAdmin: false, isPlatformAdmin: false, permissions: [], grants: [], personId: null }
  }
  const u = session.user
  const sql = await db()
  const [roleRows, grantRows, personRows, primary, platformRows] = await Promise.all([
    withRetry(() => sql`SELECT role, permissions FROM user_roles WHERE user_id = ${u.id}`),
    withRetry(() => sql`SELECT area FROM access_grants WHERE user_id = ${u.id}`),
    withRetry(() => sql`SELECT id FROM people WHERE user_id = ${u.id} LIMIT 1`),
    getPrimaryMemorial(),
    withRetry(() => sql`SELECT "isPlatformAdmin" FROM "user" WHERE id = ${u.id}`),
  ])
  const isOwner =
    (primary?.owner_user_id != null && primary.owner_user_id === u.id) ||
    adminEmails().includes(u.email.toLowerCase())
  const roleRow = roleRows[0] as { role: string; permissions: string[] } | undefined
  const isAdmin = isOwner || roleRow?.role === 'admin'
  const permissions = isOwner ? ['*'] : (isAdmin ? (roleRow?.permissions ?? []) : [])
  return {
    user: { id: u.id, name: u.name, email: u.email, image: u.image ?? null },
    isAdmin,
    isPlatformAdmin: !!platformRows[0]?.isPlatformAdmin,
    permissions,
    grants: grantRows.map(g => g.area as string),
    personId: (personRows[0]?.id as number | undefined) ?? null,
  }
}

export function hasPermission(viewer: Viewer, permission: Permission): boolean {
  if (!viewer.isAdmin) return false
  return viewer.permissions.includes('*') || viewer.permissions.includes(permission)
}

/** Returns the viewer if they are an admin holding `permission`, else null. */
export async function requireAdmin(permission?: Permission): Promise<Viewer | null> {
  const viewer = await getViewer()
  if (!viewer.isAdmin) return null
  if (permission && !hasPermission(viewer, permission)) return null
  return viewer
}

export async function getAccessSettings(): Promise<Record<string, string>> {
  const sql = await db()
  const rows = await withRetry(() =>
    sql`SELECT key, value FROM settings WHERE key LIKE 'access.%' OR key LIKE 'tabs.%' OR key LIKE 'tribute.%' OR key LIKE 'moderation.%'`
  )
  const out = { ...ACCESS_DEFAULTS }
  for (const r of rows) out[r.key as string] = r.value as string
  return out
}

export type Area = 'people' | 'contributions' | 'relationTree' | 'program'

export function canView(area: Area, viewer: Viewer, settings: Record<string, string>): boolean {
  if (viewer.isAdmin) return true
  switch (area) {
    case 'people':
      return false // admins only
    case 'contributions': {
      const mode = settings['access.contributions']
      if (mode === 'authenticated') return !!viewer.user
      if (mode === 'whitelisted') return viewer.grants.includes('contributions')
      return false // 'admins'
    }
    case 'relationTree': {
      const mode = settings['access.relationTree']
      if (mode === 'approved') return viewer.grants.includes('relation_tree')
      return !!viewer.user // 'authenticated'
    }
    case 'program': {
      const mode = settings['access.program']
      if (mode === 'approved') return viewer.grants.includes('program')
      return !!viewer.user // 'authenticated'
    }
  }
}
