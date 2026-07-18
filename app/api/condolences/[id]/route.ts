import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/access'
import { isDemoRequest, demoOk } from '@/lib/demo'

// Visibility & retention rules:
//  - Hiding keeps the message on the page's records but invisible to visitors.
//  - "Deleting" is a soft delete: the row is stamped deleted_at, disappears
//    everywhere, and stays restorable for 90 days — then it is purged
//    automatically. Nothing is ever hard-deleted on request.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (await isDemoRequest()) return demoOk()
  if (!await requireAdmin('condolences'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { hidden, moderation, restore } = await req.json()
  if (hidden === undefined && moderation === undefined && restore === undefined)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  if (moderation !== undefined && !['approved', 'pending', 'held'].includes(moderation))
    return NextResponse.json({ error: 'Invalid moderation state' }, { status: 400 })

  const sql = await db()
  if (restore === true) {
    const [restored] = await sql`
      UPDATE condolences SET deleted_at = NULL WHERE id = ${id} RETURNING *
    `
    if (!restored) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(restored)
  }

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
  if (await isDemoRequest()) return demoOk()
  if (!await requireAdmin('condolences'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sql = await db()
  const [deleted] = await sql`
    UPDATE condolences SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL RETURNING id
  `
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, note: 'Marked as deleted — restorable for 90 days, then removed permanently.' })
}
