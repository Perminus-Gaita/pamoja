import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { requireAdmin } from '@/lib/access'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sql = await db()
  const [group] = await sql`SELECT * FROM groups WHERE id = ${id}`
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [members, condolences] = await Promise.all([
    withRetry(() => sql`
      SELECT p.id, p.name, p.relation, p.photo, p.family_group
      FROM people p JOIN person_groups pg ON pg.person_id = p.id
      WHERE pg.group_id = ${id} ORDER BY p.name
    `),
    withRetry(() => sql`
      SELECT c.* FROM condolences c
      JOIN person_groups pg ON pg.person_id = c.person_id
      WHERE pg.group_id = ${id} ORDER BY c.created_at DESC
    `),
  ])
  return NextResponse.json({ ...group, members, condolences })
}

// PATCH updates the group and/or manages membership:
//   { name?, description?, add_person_id?, remove_person_id? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin('groups'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { name, description, add_person_id, remove_person_id } = await req.json()
  const sql = await db()

  if (name !== undefined || description !== undefined) {
    await sql`
      UPDATE groups SET
        name        = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description)
      WHERE id = ${id}
    `
  }
  if (add_person_id) {
    await sql`
      INSERT INTO person_groups (person_id, group_id)
      VALUES (${add_person_id}, ${id})
      ON CONFLICT DO NOTHING
    `
  }
  if (remove_person_id) {
    await sql`DELETE FROM person_groups WHERE person_id = ${remove_person_id} AND group_id = ${id}`
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin('groups'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sql = await db()
  await sql`DELETE FROM person_groups WHERE group_id = ${id}`
  await sql`DELETE FROM groups WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
