import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getViewer, getAccessSettings, canView, hasPermission } from '@/lib/access'
import { isDemoRequest, demoOk, isRealDemoAdmin } from '@/lib/demo'

// Public profile: condolence names link here, so the person + their
// condolences are public. Contributions are included only when the viewer
// can see contributions AND the profile tab is enabled. Groups always show.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sql = await db()
  const demo = await isDemoRequest()
  const [person] = await sql`SELECT * FROM people WHERE id = ${id} AND is_demo = ${demo}`
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  const showContribs = access['tabs.contributions'] === 'on' && canView('contributions', viewer, access)

  const [condolences, groups, contributions] = await Promise.all([
    withRetry(() => sql`
      SELECT * FROM condolences
      WHERE person_id = ${id} AND hidden = FALSE AND moderation = 'approved' AND deleted_at IS NULL
      ORDER BY created_at DESC
    `),
    withRetry(() => sql`
      SELECT g.id, g.name FROM groups g
      JOIN person_groups pg ON pg.group_id = g.id
      WHERE pg.person_id = ${id} AND g.deleted_at IS NULL ORDER BY g.name
    `),
    showContribs
      ? withRetry(() => sql`SELECT * FROM contributions WHERE person_id = ${id} AND deleted_at IS NULL ORDER BY created_at DESC`)
      : Promise.resolve([]),
  ])

  const { user_id, ...safePerson } = person as Record<string, unknown>
  return NextResponse.json({
    ...safePerson,
    isOwn: !!viewer.user && user_id === viewer.user.id,
    condolences,
    groups,
    contributions,
    showContributionsTab: showContribs && contributions.length > 0,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const viewer = await getViewer()
  if (!viewer.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = await db()
  const [person] = await sql`SELECT user_id FROM people WHERE id = ${id} AND is_demo = ${viewer.demo}`
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = viewer.realUser && person.user_id === viewer.user.id
  // In demo, "admin" is everyone — only real owners (their own demo person)
  // and the platform admin persist; fake-admin edits pretend to succeed.
  if (viewer.demo && !isOwner && !isRealDemoAdmin(viewer)) return demoOk()
  if (!isOwner && !(viewer.isAdmin && hasPermission(viewer, 'people')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { photo, bio, relation } = await req.json()
  const [updated] = await sql`
    UPDATE people SET
      photo    = COALESCE(${photo    ?? null}, photo),
      bio      = COALESCE(${bio      ?? null}, bio),
      relation = COALESCE(${relation ?? null}, relation)
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(updated)
}
