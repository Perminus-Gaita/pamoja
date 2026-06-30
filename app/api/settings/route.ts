import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const sql = await db()
  const rows = await sql`SELECT key, value FROM settings`
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key as string] = r.value as string
  return NextResponse.json(out)
}

export async function PATCH(req: NextRequest) {
  const { key, value } = await req.json()
  if (!key || value === undefined)
    return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
  const sql = await db()
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
  return NextResponse.json({ ok: true })
}
