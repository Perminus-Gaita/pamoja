import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/access'
import { hasFeature } from '@/lib/entitlements'
import { parseContributionEntry, aiAvailable } from '@/lib/ai'
import { db } from '@/lib/db'

export const maxDuration = 60

// AI natural-language entry (paid feature on managed): the admin types
// "Jane Doe, a cousin, gave 5,000" and it becomes a contribution row.
export async function POST(req: NextRequest) {
  const viewer = await requireAdmin('contributions')
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await hasFeature('aiEntry'))
    return NextResponse.json({ error: 'AI entry is not included in this plan.' }, { status: 402 })
  if (!aiAvailable())
    return NextResponse.json({ error: 'Set ANTHROPIC_API_KEY to enable AI entry.' }, { status: 503 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

  const parsed = await parseContributionEntry(String(text))
  if (!parsed)
    return NextResponse.json({ error: 'Could not find a contributor name and amount in that text.' }, { status: 422 })

  const sql = await db()
  const [row] = await sql`
    INSERT INTO contributions (name, relation, amount, note)
    VALUES (${parsed.name}, ${parsed.relation}, ${parsed.amount}, ${parsed.note})
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
