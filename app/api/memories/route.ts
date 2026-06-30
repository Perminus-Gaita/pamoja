import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  const sql = await db()
  const rows = await withRetry(() => sql`SELECT * FROM memories ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { src, caption = '', added_by } = body
  if (!src || !added_by)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const sql = await db()
  const rows = await sql`
    INSERT INTO memories (src, caption, added_by)
    VALUES (${src}, ${caption}, ${added_by})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
