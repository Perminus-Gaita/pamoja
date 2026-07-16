import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { requireAdmin, PERMISSIONS } from '@/lib/access'

// Admin management: list users with their roles + access grants,
// promote/demote admins, and set granular permissions.
export async function GET() {
  if (!await requireAdmin('admins'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = await db()
  const users = await withRetry(() => sql`
    SELECT u."id", u."name", u."email", u."image", u."createdAt" AS created_at,
           r.role, r.permissions,
           COALESCE(json_agg(g.area) FILTER (WHERE g.area IS NOT NULL), '[]') AS grants
    FROM "user" u
    LEFT JOIN user_roles r ON r.user_id = u."id"
    LEFT JOIN access_grants g ON g.user_id = u."id"
    GROUP BY u."id", u."name", u."email", u."image", u."createdAt", r.role, r.permissions
    ORDER BY u."createdAt" DESC
  `)
  const ownerEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return NextResponse.json(users.map(u => ({
    ...u,
    isOwner: ownerEmails.includes((u.email as string).toLowerCase()),
  })))
}

export async function PATCH(req: NextRequest) {
  const viewer = await requireAdmin('admins')
  if (!viewer)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, admin, permissions } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const sql = await db()
  if (admin === false) {
    // Owners (ADMIN_EMAILS) can't be demoted from the UI
    const [u] = await sql`SELECT "email" FROM "user" WHERE "id" = ${userId}`
    const ownerEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (u && ownerEmails.includes((u.email as string).toLowerCase()))
      return NextResponse.json({ error: 'This admin is set by ADMIN_EMAILS and cannot be removed here' }, { status: 400 })
    await sql`DELETE FROM user_roles WHERE user_id = ${userId}`
    return NextResponse.json({ ok: true })
  }

  const perms: string[] = Array.isArray(permissions)
    ? permissions.filter((p: string) => p === '*' || (PERMISSIONS as readonly string[]).includes(p))
    : ['*']
  await sql`
    INSERT INTO user_roles (user_id, role, permissions)
    VALUES (${userId}, 'admin', ${JSON.stringify(perms)})
    ON CONFLICT (user_id) DO UPDATE SET permissions = EXCLUDED.permissions
  `
  return NextResponse.json({ ok: true })
}
