import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getViewer, getAccessSettings, canView, requireAdmin } from '@/lib/access'

export async function GET() {
  // The full people list backs two gated surfaces: the admin-only People
  // section and the Contributions view (for avatars) — same rule applies.
  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  if (!viewer.isAdmin && !canView('contributions', viewer, access))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const sql = await db()
  const rows = await withRetry(() => sql`
    SELECT
      p.id, p.name, p.relation, p.photo, p.bio, p.family_group, p.created_at,
      COUNT(DISTINCT c.id)::int          AS condolence_count,
      COALESCE(SUM(k.amount), 0)::int    AS total_contributed
    FROM people p
    LEFT JOIN condolences   c ON c.person_id = p.id
    LEFT JOIN contributions k ON k.person_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin('people'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, relation = '', photo = '', bio = '' } = await req.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  const sql = await db()
  const existing = await sql`SELECT id FROM people WHERE LOWER(name) = LOWER(${name}) LIMIT 1`
  if (existing.length > 0) return NextResponse.json(existing[0])
  const [person] = await sql`
    INSERT INTO people (name, relation, photo, bio)
    VALUES (${name}, ${relation}, ${photo}, ${bio})
    RETURNING *
  `
  return NextResponse.json(person, { status: 201 })
}
