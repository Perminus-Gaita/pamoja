import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import type { Readable } from 'stream'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

/*
 * Photo storage adapter. One module, three modes, picked from the environment:
 *
 *  - 's3'    S3_ENDPOINT + S3_BUCKET (+ keys) set — any S3-compatible store
 *            (Cloudflare R2, MinIO, DO Spaces, AWS S3). With S3_PUBLIC_URL set,
 *            photos are served straight from the bucket's public domain and
 *            never touch a Vercel function or the image optimizer.
 *  - 'r2'    legacy R2_* vars only — private R2 bucket, proxied through
 *            /api/images/<key>. Kept so existing deployments keep working.
 *  - 'local' nothing set — files under ./uploads (or UPLOADS_DIR), proxied
 *            through /api/images/<key>. Self-host fallback, no bucket needed.
 */

export type StorageMode = 's3' | 'r2' | 'local'

export function storageMode(): StorageMode {
  if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) return 's3'
  if (process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) return 'r2'
  return 'local'
}

function localDir() {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
}

function getClient(): { client: S3Client; bucket: string } {
  if (storageMode() === 's3') {
    return {
      client: new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      }),
      bucket: process.env.S3_BUCKET!,
    }
  }
  return {
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    }),
    bucket: process.env.R2_BUCKET_NAME!,
  }
}

/** Public URL a stored key is reachable at. Only the s3 mode (with
 *  S3_PUBLIC_URL) serves directly; the other modes go through the proxy route. */
export function publicUrlFor(key: string): string {
  const base = (process.env.S3_PUBLIC_URL ?? '').replace(/\/+$/, '')
  if (storageMode() === 's3' && base) return `${base}/${key}`
  return `/api/images/${key}`
}

// Keys are server-generated (uuid-based), but the proxy route passes
// user-supplied paths — refuse anything that could escape the uploads dir.
function safeLocalPath(key: string): string {
  const abs = path.resolve(localDir(), key)
  if (!abs.startsWith(path.resolve(localDir()) + path.sep)) throw new Error('Bad key')
  return abs
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (storageMode() === 'local') {
    const abs = safeLocalPath(key)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, body)
    return
  }
  const { client, bucket } = getClient()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
}

const EXT_TYPES: Record<string, string> = {
  webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif',
}

export async function getObject(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (storageMode() === 'local') {
    const buffer = await fs.readFile(safeLocalPath(key))
    const ext = key.split('.').pop()?.toLowerCase() ?? ''
    return { buffer, contentType: EXT_TYPES[ext] ?? 'application/octet-stream' }
  }
  const { client, bucket } = getClient()
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const stream = res.Body as Readable
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return {
    buffer: Buffer.concat(chunks),
    contentType: res.ContentType ?? 'application/octet-stream',
  }
}

export type StoredPhoto = { url: string; thumbUrl: string }

/**
 * Process an uploaded photo once and store exactly two derivatives:
 *   memorials/<memorialId>/<photoId>-thumb.webp    400px longest edge, q75
 *   memorials/<memorialId>/<photoId>-display.webp  1600px longest edge, q80
 * .rotate() bakes the EXIF orientation into the pixels; sharp then drops all
 * metadata (EXIF/GPS/XMP) from the output by default — uploads of phone photos
 * must never leak location data. The original file is discarded.
 */
export async function storePhoto(buffer: Buffer, memorialId: number | string): Promise<StoredPhoto> {
  const base = `memorials/${memorialId}/${randomUUID()}`
  const img = sharp(buffer, { failOn: 'none' }).rotate()
  const [display, thumb] = await Promise.all([
    img.clone().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    img.clone().resize(400, 400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
  ])
  await Promise.all([
    putObject(`${base}-display.webp`, display, 'image/webp'),
    putObject(`${base}-thumb.webp`, thumb, 'image/webp'),
  ])
  return {
    url: publicUrlFor(`${base}-display.webp`),
    thumbUrl: publicUrlFor(`${base}-thumb.webp`),
  }
}
