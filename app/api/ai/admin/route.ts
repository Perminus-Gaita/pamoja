import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/access'
import { runAdminAgent, aiAvailable } from '@/lib/ai'

export const maxDuration = 120

// Admin assistant: tool-using agent for stats/analysis, recording
// contributions, and granting access. Logic lives in lib/ai.ts.
export async function POST(req: NextRequest) {
  const viewer = await requireAdmin('ai')
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiAvailable())
    return NextResponse.json({ error: 'Set ANTHROPIC_API_KEY to enable the assistant.' }, { status: 503 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })

  const answer = await runAdminAgent(messages, viewer)
  return NextResponse.json({ answer })
}
