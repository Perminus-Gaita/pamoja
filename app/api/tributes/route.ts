import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getViewer, getAccessSettings, hasPermission } from '@/lib/access'
import { demoOk } from '@/lib/demo'

// Tributes: longer written pieces by a person about the deceased, shown on
// their profile tab. Admin controls the tab (tabs.tribute), who can read
// (access.tribute: everyone | authenticated) and length limits — global
// tribute.maxLength with optional per-person override tribute.maxLength.<id>.
export async function GET(req: NextRequest) {
  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  const personId = req.nextUrl.searchParams.get('person_id')
  if (!personId) return NextResponse.json({ error: 'Missing person_id' }, { status: 400 })

  if (!viewer.isAdmin) {
    if (access['tabs.tribute'] !== 'on') return NextResponse.json([])
    if (access['access.tribute'] === 'authenticated' && !viewer.user) return NextResponse.json([])
  }
  const sql = await db()
  // Tributes surface through their person, so partition via the person's realm
  const rows = await withRetry(() =>
    sql`
      SELECT t.* FROM tributes t
      JOIN people p ON p.id = t.person_id
      WHERE t.person_id = ${personId} AND t.deleted_at IS NULL AND p.is_demo = ${viewer.demo}
      ORDER BY t.created_at DESC
    `
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  if (!viewer.user)
    return NextResponse.json({ error: 'Sign in to write a tribute' }, { status: 401 })
  if (access['tabs.tribute'] !== 'on' && !viewer.isAdmin)
    return NextResponse.json({ error: 'Tributes are not enabled' }, { status: 403 })

  const { person_id, body } = await req.json()
  if (!person_id || !body?.trim())
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const sql = await db()
  const [person] = await sql`SELECT user_id FROM people WHERE id = ${person_id} AND is_demo = ${viewer.demo}`
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 })
  const isOwn = viewer.realUser && person.user_id === viewer.user.id
  // Demo fake-admins pretend; real owners of their own demo person persist
  if (viewer.demo && !isOwn) return demoOk()
  if (!isOwn && !(viewer.isAdmin && hasPermission(viewer, 'tributes')))
    return NextResponse.json({ error: 'You can only write a tribute on your own profile' }, { status: 403 })

  const maxLength = Number(access[`tribute.maxLength.${person_id}`] ?? access['tribute.maxLength']) || 2000
  if (body.trim().length > maxLength)
    return NextResponse.json({ error: `Tribute must be under ${maxLength} characters` }, { status: 400 })

  // One tribute per person — writing again replaces it
  const [existing] = await sql`SELECT id FROM tributes WHERE person_id = ${person_id} AND deleted_at IS NULL LIMIT 1`
  const [row] = existing
    ? await sql`
        UPDATE tributes SET body = ${body.trim()}, author_user_id = ${viewer.user.id}, updated_at = NOW()
        WHERE id = ${existing.id} RETURNING *
      `
    : await sql`
        INSERT INTO tributes (person_id, author_user_id, body)
        VALUES (${person_id}, ${viewer.user.id}, ${body.trim()})
        RETURNING *
      `
  return NextResponse.json(row, { status: existing ? 200 : 201 })
}

export async function DELETE(req: NextRequest) {
  const viewer = await getViewer()
  if (!viewer.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const sql = await db()
  const [t] = await sql`
    SELECT t.id, p.user_id FROM tributes t JOIN people p ON p.id = t.person_id WHERE t.id = ${id}
  `
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const isOwn = viewer.realUser && t.user_id === viewer.user.id
  if (viewer.demo && !isOwn) return demoOk()
  if (!isOwn && !(viewer.isAdmin && hasPermission(viewer, 'tributes')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  // Soft delete — restorable for 90 days, then purged automatically
  await sql`UPDATE tributes SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`
  return NextResponse.json({ ok: true, note: 'Marked as deleted — restorable for 90 days, then removed permanently.' })
}
