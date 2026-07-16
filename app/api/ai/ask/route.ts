import { NextRequest, NextResponse } from 'next/server'
import { askMemorial, aiAvailable } from '@/lib/ai'

export const maxDuration = 60

// Public Q&A: anyone can ask practical questions ("where will the funeral
// be?") and get an answer grounded in the memorial's own information.
export async function POST(req: NextRequest) {
  if (!aiAvailable())
    return NextResponse.json({ error: 'The assistant is not configured on this deployment.' }, { status: 503 })

  const { question } = await req.json()
  if (!question?.trim())
    return NextResponse.json({ error: 'Missing question' }, { status: 400 })

  const answer = await askMemorial(String(question))
  return NextResponse.json({ answer })
}
