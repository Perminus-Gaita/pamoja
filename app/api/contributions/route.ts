import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getViewer, getAccessSettings, canView, requireAdmin } from '@/lib/access'
import { hasFeature } from '@/lib/entitlements'
import { isDemoRequest, demoOk } from '@/lib/demo'

export async function GET() {
  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  if (!canView('contributions', viewer, access) || !await hasFeature('contributions'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const sql = await db()
  const demo = await isDemoRequest()
  const rows = await withRetry(() => sql`SELECT * FROM contributions WHERE is_demo = ${demo} ORDER BY created_at DESC`)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  if (await isDemoRequest()) return demoOk()
  if (!await requireAdmin('contributions'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  if (await isDemoRequest()) return demoOk()
  if (!await requireAdmin('contributions'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, amount } = await req.json()
  if (!id || !amount)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const sql = await db()
  const rows = await sql`
    UPDATE contributions SET amount = ${amount} WHERE id = ${id} RETURNING *
  `
  return NextResponse.json(rows[0])
}
