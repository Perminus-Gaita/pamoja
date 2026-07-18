import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { isDemoRequest, demoOk } from '@/lib/demo'

// Groups of people, e.g. "Class of 2012". Listing is public: groups appear
// on the relation tree and their pages aggregate public condolences.
export async function GET() {
  // Demo memorials have no groups — and must never list the real ones
  if (await isDemoRequest()) return NextResponse.json([])
  const sql = await db()
  const rows = await withRetry(() => sql`
    SELECT g.id, g.name, g.description, COUNT(pg.person_id)::int AS member_count
    FROM groups g
    LEFT JOIN person_groups pg ON pg.group_id = g.id
    WHERE g.deleted_at IS NULL
    GROUP BY g.id
    ORDER BY g.name
  `)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  if (await isDemoRequest()) return demoOk()
  if (!await requireAdmin('groups'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, description = '' } = await req.json()
  if (!name?.trim())
    return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  const sql = await db()
  const [group] = await sql`
    INSERT INTO groups (name, description)
    VALUES (${name.trim()}, ${description})
    RETURNING *
  `
  return NextResponse.json(group, { status: 201 })
}
