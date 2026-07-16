import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/access'

// Visibility & retention rules (spec):
//  - "Deleting" = soft hide. The record is retained and recoverable.
//  - Hard deletion is only permitted 30 days after the message was created.
//    Before that, the strongest action available — to anyone — is hide.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin('condolences'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { hidden, moderation } = await req.json()
  if (hidden === undefined && moderation === undefined)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  if (moderation !== undefined && !['approved', 'pending', 'held'].includes(moderation))
    return NextResponse.json({ error: 'Invalid moderation state' }, { status: 400 })

  const sql = await db()
  const [updated] = await sql`
    UPDATE condolences SET
      hidden     = COALESCE(${hidden ?? null}, hidden),
      moderation = COALESCE(${moderation ?? null}, moderation)
    WHERE id = ${id}
    RETURNING *
  `
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin('condolences'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sql = await db()
  const [row] = await sql`SELECT created_at FROM condolences WHERE id = ${id}`
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ageMs = Date.now() - new Date(row.created_at as string).getTime()
  if (ageMs < 30 * 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Messages can only be permanently deleted 30 days after they were written. Until then you can hide it — hidden messages are invisible to visitors but recoverable.' },
      { status: 403 },
    )
  }
  await sql`DELETE FROM condolences WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
