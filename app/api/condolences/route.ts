import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  const sql = await db()
  const rows = await withRetry(() => sql`SELECT * FROM condolences ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, relation, message, photo = '' } = body
  if (!name || !relation || !message)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const sql = await db()

  // Find or create person so they appear in the People section
  const existing = await sql`SELECT id FROM people WHERE LOWER(name) = LOWER(${name}) LIMIT 1`
  let personId: number
  if (existing.length > 0) {
    personId = existing[0].id as number
  } else {
    const [p] = await sql`
      INSERT INTO people (name, relation, photo)
      VALUES (${name}, ${relation}, ${photo})
      RETURNING id
    `
    personId = p.id as number
  }

  const rows = await sql`
    INSERT INTO condolences (name, relation, message, photo, person_id)
    VALUES (${name}, ${relation}, ${message}, ${photo}, ${personId})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
