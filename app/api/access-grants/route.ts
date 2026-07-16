import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/access'

const AREAS = ['relation_tree', 'program', 'contributions']

// Pre-approval whitelist for gated sections.
export async function POST(req: NextRequest) {
  const viewer = await requireAdmin('access')
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, area } = await req.json()
  if (!user_id || !AREAS.includes(area))
    return NextResponse.json({ error: 'Invalid user or area' }, { status: 400 })
  const sql = await db()
  await sql`
    INSERT INTO access_grants (user_id, area, granted_by)
    VALUES (${user_id}, ${area}, ${viewer.user!.email})
    ON CONFLICT (user_id, area) DO NOTHING
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin('access'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user_id, area } = await req.json()
  if (!user_id || !area)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const sql = await db()
  await sql`DELETE FROM access_grants WHERE user_id = ${user_id} AND area = ${area}`
  return NextResponse.json({ ok: true })
}
