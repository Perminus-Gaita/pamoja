import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const folder = (formData.get('folder') as string | null) ?? 'misc'
  const buffer = Buffer.from(await file.arrayBuffer())
  const key = await uploadToR2(buffer, file.name, file.type || 'application/octet-stream', folder)
  return NextResponse.json({ url: `/api/images/${key}` })
}
