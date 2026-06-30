import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  const sql = await db()
  const rows = await withRetry(() => sql`SELECT * FROM contributions ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, relation, amount, note = '' } = body
  if (!name || !relation || !amount)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const sql = await db()
  const rows = await sql`
    INSERT INTO contributions (name, relation, amount, note)
    VALUES (${name}, ${relation}, ${amount}, ${note})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, amount } = await req.json()
  if (!id || !amount)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const sql = await db()
  const rows = await sql`
    UPDATE contributions SET amount = ${amount} WHERE id = ${id} RETURNING *
  `
  return NextResponse.json(rows[0])
}
