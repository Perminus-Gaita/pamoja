import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getViewer } from '@/lib/access'
import { getPrimaryMemorial } from '@/lib/site'
import { isDemoRequest, demoOk } from '@/lib/demo'

// One-time claim for deployments that predate the ownership model: if the
// primary memorial has no owner yet, the first signed-in user to claim it
// becomes its admin. A no-op (409) once an owner exists.
export async function POST() {
  if (await isDemoRequest()) return demoOk()
  const viewer = await getViewer()
  if (!viewer.realUser || !viewer.user)
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  const primary = await getPrimaryMemorial()
  if (!primary)
    return NextResponse.json({ error: 'No memorial exists yet — create one from the landing page instead' }, { status: 404 })
  if (primary.owner_user_id)
    return NextResponse.json({ error: 'This memorial already has an admin' }, { status: 409 })

  const sql = await db()
  const [updated] = await sql`
    UPDATE memorials SET owner_user_id = ${viewer.user.id}
    WHERE id = ${primary.id} AND owner_user_id IS NULL
    RETURNING id
  `
  if (!updated)
    return NextResponse.json({ error: 'This memorial already has an admin' }, { status: 409 })
  return NextResponse.json({ ok: true })
}

// Tells the client whether a claim is possible (for the admin gate screen).
export async function GET() {
  if (await isDemoRequest()) return NextResponse.json({ claimable: false })
  const primary = await getPrimaryMemorial()
  return NextResponse.json({ claimable: !!primary && !primary.owner_user_id })
}
