import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { isDemoRequest, demoOk } from '@/lib/demo'

export async function GET() {
  if (!await requireAdmin())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Demo: operator feedback is real-memorial data
  if (await isDemoRequest()) return NextResponse.json([])
  const sql = await db()
  const rows = await sql`SELECT * FROM feedback ORDER BY created_at DESC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, message } = body
  if (!name || !message)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (await isDemoRequest()) return demoOk()
  const sql = await db()
  const rows = await sql`
    INSERT INTO feedback (name, message)
    VALUES (${name}, ${message})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
