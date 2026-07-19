import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getViewer } from '@/lib/access'
import { isDemoRequest, demoOk, demoSettings, isRealDemoAdmin } from '@/lib/demo'

export async function GET() {
  if (!await requireAdmin('settings'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Demo admin panel sees only the demo's own persisted overrides ('demo:'
  // keys, prefix stripped) — never the real memorial's settings.
  if (await isDemoRequest()) return NextResponse.json(await demoSettings())
  const sql = await db()
  const rows = await sql`SELECT key, value FROM settings`
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key as string] = r.value as string
  return NextResponse.json(out)
}

export async function PATCH(req: NextRequest) {
  const demo = await isDemoRequest()
  if (demo && !isRealDemoAdmin(await getViewer())) return demoOk()
  if (!demo && !await requireAdmin('settings'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, value } = await req.json()
  if (!key || value === undefined)
    return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
  const sql = await db()
  const k = demo ? `demo:${key}` : key
  await sql`
    INSERT INTO settings (key, value) VALUES (${k}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
  return NextResponse.json({ ok: true })
}
