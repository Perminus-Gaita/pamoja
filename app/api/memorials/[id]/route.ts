import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PRIMARY_MEMORIAL_SLUG } from '@/lib/config'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { status } = await req.json()
  if (status !== 'approved' && status !== 'pending') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const sql = await db()
  const [updated] = await sql`
    UPDATE memorials SET status = ${status} WHERE id = ${id} RETURNING *
  `
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const sql = await db()
  const [deleted] = await sql`
    DELETE FROM memorials WHERE id = ${id} AND slug != ${PRIMARY_MEMORIAL_SLUG} RETURNING id
  `
  if (!deleted) return NextResponse.json({ error: 'Not found or protected' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
