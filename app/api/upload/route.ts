import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'
import { getViewer } from '@/lib/access'

const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const viewer = await getViewer()
  if (!viewer.user)
    return NextResponse.json({ error: 'Sign in to upload images' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/'))
    return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 })
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 })

  const folder = (formData.get('folder') as string | null) ?? 'misc'
  const buffer = Buffer.from(await file.arrayBuffer())
  const key = await uploadToR2(buffer, file.name, file.type || 'application/octet-stream', folder)
  return NextResponse.json({ url: `/api/images/${key}` })
}
