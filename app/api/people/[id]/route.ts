import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sql = await db()
  const [person] = await sql`SELECT * FROM people WHERE id = ${id}`
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const condolences   = await sql`SELECT * FROM condolences   WHERE person_id = ${id} ORDER BY created_at DESC`
  const contributions = await sql`SELECT * FROM contributions WHERE person_id = ${id} ORDER BY created_at DESC`
  return NextResponse.json({ ...person, condolences, contributions })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { photo, bio, relation } = await req.json()
  const sql = await db()
  const [updated] = await sql`
    UPDATE people SET
      photo    = COALESCE(${photo    ?? null}, photo),
      bio      = COALESCE(${bio      ?? null}, bio),
      relation = COALESCE(${relation ?? null}, relation)
    WHERE id = ${id}
    RETURNING *
  `
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}
