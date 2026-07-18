import { NextRequest, NextResponse } from 'next/server'
import { getObject } from '@/lib/storage'

// Proxy serving path — used only for legacy keys (pre-S3_PUBLIC_URL uploads)
// and the r2/local storage modes. New s3-mode uploads are served directly
// from the bucket's public domain and never hit this route.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params
  const fullKey = key.join('/')
  try {
    const { buffer, contentType } = await getObject(fullKey)
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
