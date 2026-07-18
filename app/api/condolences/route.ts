import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getViewer, getAccessSettings } from '@/lib/access'
import { hasFeature } from '@/lib/entitlements'
import { triageCondolence, aiAvailable } from '@/lib/ai'
import { isDemoRequest } from '@/lib/demo'

// Public view: only visible (not hidden, not deleted) approved condolences.
// Admins can pass ?all=1 to see everything, including moderation state and
// soft-deleted rows still inside the 90-day restore window.
export async function GET(req: NextRequest) {
  const sql = await db()
  const demo = await isDemoRequest()
  if (req.nextUrl.searchParams.get('all') === '1') {
    const viewer = await getViewer()
    if (!viewer.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const rows = await withRetry(() => sql`SELECT * FROM condolences WHERE is_demo = ${demo} ORDER BY created_at DESC`)
    return NextResponse.json(rows)
  }
  const rows = await withRetry(() =>
    sql`SELECT * FROM condolences WHERE hidden = FALSE AND moderation = 'approved' AND deleted_at IS NULL AND is_demo = ${demo} ORDER BY created_at DESC`
  )
  return NextResponse.json(rows)
}

// Writing a condolence is free, unlimited, and never behind a paywall.
// Sign-in is only required if the admin turned that on. Moderation ladder:
//   1. approval mode (free): every condolence starts 'pending'
//   2. AI triage (paid rung): pre-sorts into approve / hold — never deletes
export async function POST(req: NextRequest) {
  const [viewer, access] = await Promise.all([getViewer(), getAccessSettings()])
  if (access['access.condolencesRequireAuth'] === 'true' && !viewer.user)
    return NextResponse.json({ error: 'Sign in to write a condolence' }, { status: 401 })

  const body = await req.json()
  const { name, relation, message, photo = '' } = body
  if (!name || !relation || !message)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Demo condolences persist (flagged is_demo, purged after 7 days) but skip
  // moderation/AI — the sandbox is always instant.
  const demo = viewer.demo
  let moderation = 'approved'
  if (!demo) {
    if (access['moderation.approvalMode'] === 'on') {
      moderation = 'pending'
    } else if (access['moderation.aiTriage'] === 'on' && aiAvailable() && await hasFeature('aiModeration')) {
      moderation = (await triageCondolence(String(name), String(message))) === 'approve' ? 'approved' : 'held'
    }
  }

  const sql = await db()
  const userId = viewer.realUser ? viewer.user!.id : null

  // Find or create person so they appear in the People section
  const existing = await sql`SELECT id, user_id FROM people WHERE LOWER(name) = LOWER(${name}) AND is_demo = ${demo} LIMIT 1`
  let personId: number
  if (existing.length > 0) {
    personId = existing[0].id as number
    // Claim the person record for the signed-in author if unclaimed
    if (userId && !existing[0].user_id) {
      await sql`UPDATE people SET user_id = ${userId} WHERE id = ${personId}`
    }
  } else {
    const [p] = await sql`
      INSERT INTO people (name, relation, photo, user_id, is_demo)
      VALUES (${name}, ${relation}, ${photo}, ${userId}, ${demo})
      RETURNING id
    `
    personId = p.id as number
  }

  const rows = await sql`
    INSERT INTO condolences (name, relation, message, photo, person_id, user_id, moderation, is_demo)
    VALUES (${name}, ${relation}, ${message}, ${photo}, ${personId}, ${userId}, ${moderation}, ${demo})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
