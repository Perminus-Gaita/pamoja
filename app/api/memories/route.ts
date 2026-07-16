import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getViewer, getAccessSettings } from '@/lib/access'
import { hasFeature } from '@/lib/entitlements'

// Photo memories now live on person profiles. Visibility is admin-controlled:
//   tabs.memories on/off, and access.memoriesScope = own | group | all
//   'own'   — a signed-in visitor sees only their own memories
//   'group' — plus memories of people sharing a group with them
//   'all'   — any signed-in visitor sees everyone's
export async function GET(req: NextRequest) {
  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  const personId = req.nextUrl.searchParams.get('person_id')
  const sql = await db()

  if (viewer.isAdmin) {
    const rows = personId
      ? await withRetry(() => sql`SELECT * FROM memories WHERE person_id = ${personId} ORDER BY created_at DESC`)
      : await withRetry(() => sql`SELECT * FROM memories ORDER BY created_at DESC`)
    return NextResponse.json(rows)
  }

  if (access['tabs.memories'] !== 'on' || !viewer.user || !await hasFeature('galleries'))
    return NextResponse.json([], { status: 200 })

  const scope = access['access.memoriesScope']
  let visibleIds: number[] = []
  if (scope === 'all') {
    const rows = personId
      ? await withRetry(() => sql`SELECT * FROM memories WHERE person_id = ${personId} ORDER BY created_at DESC`)
      : await withRetry(() => sql`SELECT * FROM memories ORDER BY created_at DESC`)
    return NextResponse.json(rows)
  }
  if (viewer.personId) visibleIds.push(viewer.personId)
  if (scope === 'group' && viewer.personId) {
    const mates = await withRetry(() => sql`
      SELECT DISTINCT pg2.person_id FROM person_groups pg1
      JOIN person_groups pg2 ON pg2.group_id = pg1.group_id
      WHERE pg1.person_id = ${viewer.personId}
    `)
    visibleIds = [...new Set([...visibleIds, ...mates.map(m => m.person_id as number)])]
  }
  if (visibleIds.length === 0) return NextResponse.json([])

  const rows = personId
    ? (visibleIds.includes(Number(personId))
        ? await withRetry(() => sql`SELECT * FROM memories WHERE person_id = ${personId} ORDER BY created_at DESC`)
        : [])
    : await withRetry(() => sql`SELECT * FROM memories WHERE person_id = ANY(${visibleIds}) ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const viewer = await getViewer()
  if (!viewer.user)
    return NextResponse.json({ error: 'Sign in to add a memory' }, { status: 401 })
  const body = await req.json()
  const { src, caption = '', added_by, person_id = null } = body
  if (!src || !added_by)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const sql = await db()
  const rows = await sql`
    INSERT INTO memories (src, caption, added_by, person_id, user_id)
    VALUES (${src}, ${caption}, ${added_by}, ${person_id ?? viewer.personId}, ${viewer.user.id})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
