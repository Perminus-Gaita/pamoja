import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { CONFIG } from '@/lib/config'

export async function GET() {
  const sql = await db()
  const rows = await withRetry(() => sql`SELECT key, value FROM settings`)
  const s: Record<string, string> = {}
  for (const r of rows) s[r.key as string] = r.value as string

  const parse = (key: string) => {
    try { return s[key] ? JSON.parse(s[key]) : null } catch { return null }
  }

  return NextResponse.json({
    name:        s['cfg.name']        ?? CONFIG.name,
    kicker:      s['cfg.kicker']      ?? CONFIG.kicker,
    born:        s['cfg.born']        ?? CONFIG.born,
    passed:      s['cfg.passed']      ?? CONFIG.passed,
    epitaph:     s['cfg.epitaph']     ?? CONFIG.epitaph,
    whatsapp:    s['cfg.whatsapp']    ?? CONFIG.whatsapp,
    currency:    s['cfg.currency']    ?? CONFIG.currency,
    cta:         s['cfg.cta']         ?? CONFIG.cta,
    portrait:    s['portrait']        ?? CONFIG.portrait,
    programNote: s['cfg.programNote'] ?? CONFIG.programNote,
    relations:   parse('cfg.relations') ?? CONFIG.relations,
    payment:     parse('cfg.payment')   ?? CONFIG.payment,
    people:      parse('cfg.people')      ?? CONFIG.people,
    familyTree:  parse('cfg.familyTree')  ?? CONFIG.familyTree,
    program:     parse('cfg.program')     ?? CONFIG.program,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>
  const sql = await db()
  for (const [key, value] of Object.entries(body)) {
    const v = typeof value === 'string' ? value : JSON.stringify(value)
    await sql`
      INSERT INTO settings (key, value) VALUES (${key}, ${v})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `
  }
  return NextResponse.json({ ok: true })
}
