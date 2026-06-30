import { NextRequest, NextResponse } from 'next/server'
import { getR2Object } from '@/lib/r2'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params
  const fullKey = key.join('/')
  try {
    const { buffer, contentType } = await getR2Object(fullKey)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
