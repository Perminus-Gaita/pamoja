import { NextRequest, NextResponse } from 'next/server'
import { askMemorial, aiAvailable } from '@/lib/ai'
import { isDemoRequest } from '@/lib/demo'

export const maxDuration = 60

// Public Q&A: anyone can ask practical questions ("where will the funeral
// be?") and get an answer grounded in the memorial's own information.
export async function POST(req: NextRequest) {
  // Demo: canned reply — no model calls from the sandbox (works keyless too)
  if (await isDemoRequest())
    return NextResponse.json({ answer: 'This is the demo memorial, so the assistant is answering with a canned reply. On a real memorial it answers practical questions — where the service is, how to contribute — grounded in the memorial’s own program and details.' })

  if (!aiAvailable())
    return NextResponse.json({ error: 'The assistant is not configured on this deployment.' }, { status: 503 })

  const { question } = await req.json()
  if (!question?.trim())
    return NextResponse.json({ error: 'Missing question' }, { status: 400 })

  const answer = await askMemorial(String(question))
  return NextResponse.json({ answer })
}
