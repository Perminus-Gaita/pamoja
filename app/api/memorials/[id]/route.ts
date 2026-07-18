import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getViewer, hasPermission } from '@/lib/access'
import { getPrimarySlug } from '@/lib/site'
import { isDemoRequest, demoOk } from '@/lib/demo'

// Status changes: site admins with the memorials permission, OR the
// memorial's own owner (so a creator can list/unlist their memorial on
// the main directory from their admin panel).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (await isDemoRequest()) return demoOk()
  const { id } = await params
  const viewer = await getViewer()
  if (!viewer.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = await db()
  const [memorial] = await sql`SELECT owner_user_id FROM memorials WHERE id = ${id}`
  if (!memorial) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwn = memorial.owner_user_id === viewer.user.id
  if (!isOwn && !(viewer.isAdmin && hasPermission(viewer, 'memorials')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { status } = await req.json()
  if (status !== 'approved' && status !== 'pending') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const [updated] = await sql`
    UPDATE memorials SET status = ${status} WHERE id = ${id} RETURNING *
  `
  return NextResponse.json(updated)
}

// Soft delete: stamped deleted_at, restorable for 90 days, then purged.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (await isDemoRequest()) return demoOk()
  if (!await requireAdmin('memorials'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sql = await db()
  const primarySlug = await getPrimarySlug()
  const [deleted] = await sql`
    UPDATE memorials SET deleted_at = NOW()
    WHERE id = ${id} AND slug != ${primarySlug} AND deleted_at IS NULL
    RETURNING id
  `
  if (!deleted) return NextResponse.json({ error: 'Not found or protected' }, { status: 404 })
  return NextResponse.json({ ok: true, note: 'Marked as deleted — restorable for 90 days, then removed permanently.' })
}
