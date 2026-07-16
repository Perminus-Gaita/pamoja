import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getViewer, getAccessSettings, canView, requireAdmin } from '@/lib/access'
import { hasFeature } from '@/lib/entitlements'

// Relation tree edges. person_b NULL = edge to the deceased (the tree root).
// GET             → edges touching the root (the deceased's immediate circle)
// GET ?person=id  → edges touching that person (their immediate connections)
// GET ?all=1      → every edge (admin editors)
export async function GET(req: NextRequest) {
  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  if (!canView('relationTree', viewer, access) || !await hasFeature('relationTree'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const sql = await db()
  const personParam = req.nextUrl.searchParams.get('person')
  const all = req.nextUrl.searchParams.get('all') === '1'

  const edges = all
    ? await withRetry(() => sql`
        SELECT r.id, r.person_a, r.person_b, r.relation,
               pa.name AS a_name, pa.photo AS a_photo,
               pb.name AS b_name, pb.photo AS b_photo
        FROM relations r
        JOIN people pa ON pa.id = r.person_a
        LEFT JOIN people pb ON pb.id = r.person_b
        WHERE r.deleted_at IS NULL
        ORDER BY r.id
      `)
    : personParam
      ? await withRetry(() => sql`
          SELECT r.id, r.person_a, r.person_b, r.relation,
                 pa.name AS a_name, pa.photo AS a_photo, pa.relation AS a_relation,
                 pb.name AS b_name, pb.photo AS b_photo, pb.relation AS b_relation
          FROM relations r
          JOIN people pa ON pa.id = r.person_a
          LEFT JOIN people pb ON pb.id = r.person_b
          WHERE (r.person_a = ${personParam} OR r.person_b = ${personParam})
            AND r.deleted_at IS NULL
          ORDER BY r.id
        `)
      : await withRetry(() => sql`
          SELECT r.id, r.person_a, r.person_b, r.relation,
                 pa.name AS a_name, pa.photo AS a_photo, pa.relation AS a_relation
          FROM relations r
          JOIN people pa ON pa.id = r.person_a
          WHERE r.person_b IS NULL AND r.deleted_at IS NULL
          ORDER BY r.id
        `)

  return NextResponse.json(edges)
}

// POST { person_a, person_b?, relation } — person_b omitted = the deceased
export async function POST(req: NextRequest) {
  if (!await requireAdmin('relations'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { person_a, person_b = null, relation = '' } = await req.json()
  if (!person_a)
    return NextResponse.json({ error: 'Missing person_a' }, { status: 400 })
  const sql = await db()
  const [edge] = await sql`
    INSERT INTO relations (person_a, person_b, relation)
    VALUES (${person_a}, ${person_b}, ${relation})
    RETURNING *
  `
  return NextResponse.json(edge, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin('relations'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const sql = await db()
  // Soft delete — restorable for 90 days, then purged automatically
  await sql`UPDATE relations SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`
  return NextResponse.json({ ok: true, note: 'Marked as deleted — restorable for 90 days, then removed permanently.' })
}
