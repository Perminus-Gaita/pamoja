import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import type { Readable } from 'stream'
import { randomUUID } from 'crypto'

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = 'misc',
): Promise<string> {
  const ext = originalName.split('.').pop() ?? 'bin'
  const key = `${folder}/${randomUUID()}.${ext}`

  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  return key
}

export async function getR2Object(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
  )
  const stream = res.Body as Readable
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return {
    buffer: Buffer.concat(chunks),
    contentType: res.ContentType ?? 'application/octet-stream',
  }
}
