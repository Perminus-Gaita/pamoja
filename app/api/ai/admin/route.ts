import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/access'
import { runAdminAgent, aiAvailable } from '@/lib/ai'
import { isDemoRequest } from '@/lib/demo'

export const maxDuration = 120

// Admin assistant: tool-using agent for stats/analysis, recording
// contributions, and granting access. Logic lives in lib/ai.ts.
export async function POST(req: NextRequest) {
  // Demo: no model calls, no tool side effects — canned reply
  if (await isDemoRequest())
    return NextResponse.json({ answer: 'This is the demo memorial, so the AI assistant replies with a canned message. On a real memorial it can analyse condolences and contributions, record contributions from natural language, and grant access — each action checked against your admin permissions.' })
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
