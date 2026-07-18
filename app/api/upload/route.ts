import { NextRequest, NextResponse } from 'next/server'
import { storePhoto } from '@/lib/storage'
import { getViewer } from '@/lib/access'
import { isRootHost, slugFromHost } from '@/lib/seo'
import { getPrimaryMemorial } from '@/lib/site'
import { db, withRetry } from '@/lib/db'

const MAX_BYTES = 10 * 1024 * 1024

// Keys are namespaced per memorial. On a memorial host that's the host's
// memorial; on the root host (create-memorial flow — the memorial doesn't
// exist yet) photos land under 'unassigned'.
async function memorialIdForHost(host: string): Promise<number | 'unassigned'> {
  try {
    if (isRootHost(host)) return 'unassigned'
    const slug = slugFromHost(host)
    if (slug) {
      const sql = await db()
      const rows = await withRetry(
        () => sql`SELECT id FROM memorials WHERE slug = ${slug} AND deleted_at IS NULL LIMIT 1`,
      )
      if (rows[0]) return rows[0].id as number
    }
    const primary = await getPrimaryMemorial()
    if (primary) return primary.id
  } catch {
    // fall through — the namespace is cosmetic, never block an upload on it
  }
  return 'unassigned'
}

export async function POST(req: NextRequest) {
  const viewer = await getViewer()
  // Uploads always need a real account — the demo's fake sign-in doesn't
  // count, or anonymous visitors could fill the bucket.
  if (!viewer.realUser)
    return NextResponse.json({ error: 'Sign in to upload images' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/'))
    return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 })
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })

  const memorialId = await memorialIdForHost(req.headers.get('host') ?? '')
  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    // One-time processing: two WebP derivatives, EXIF stripped, original discarded.
    const { url, thumbUrl } = await storePhoto(buffer, memorialId)
    return NextResponse.json({ url, thumbUrl })
  } catch {
    return NextResponse.json({ error: 'Could not process that image' }, { status: 400 })
  }
}
