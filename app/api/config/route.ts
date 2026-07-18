import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { CONFIG } from '@/lib/config'
import { getViewer, getAccessSettings, canView, requireAdmin } from '@/lib/access'
import { allFeatures } from '@/lib/entitlements'
import { isDemoRequest, demoOk, DEMO_CONFIG } from '@/lib/demo'

export async function GET() {
  // Demo hosts get the fabricated dataset — never the real settings table
  if (await isDemoRequest()) return NextResponse.json(DEMO_CONFIG)

  const sql = await db()
  const [rows, viewer, access, features] = await Promise.all([
    withRetry(() => sql`SELECT key, value FROM settings`),
    getViewer(),
    getAccessSettings(),
    allFeatures(),
  ])
  const s: Record<string, string> = {}
  for (const r of rows) s[r.key as string] = r.value as string

  const parse = (key: string) => {
    try { return s[key] ? JSON.parse(s[key]) : null } catch { return null }
  }

  // Gated data is stripped server-side so it never reaches unauthorized clients
  const showProgram = canView('program', viewer, access) && features.programPage
  const showTree    = canView('relationTree', viewer, access) && features.relationTree
  const showPayment = canView('contributions', viewer, access) && features.contributions

  return NextResponse.json({
    name:        s['cfg.name']        ?? CONFIG.name,
    kicker:      s['cfg.kicker']      ?? CONFIG.kicker,
    born:        s['cfg.born']        ?? CONFIG.born,
    passed:      s['cfg.passed']      ?? CONFIG.passed,
    epitaph:     s['cfg.epitaph']     ?? CONFIG.epitaph,
    currency:    s['cfg.currency']    ?? CONFIG.currency,
    cta:         s['cfg.cta']         ?? CONFIG.cta,
    portrait:    s['portrait']        ?? CONFIG.portrait,
    programNote: showProgram ? (s['cfg.programNote'] ?? CONFIG.programNote) : '',
    relations:   parse('cfg.relations') ?? CONFIG.relations,
    payment:     showPayment ? (parse('cfg.payment') ?? CONFIG.payment) : CONFIG.payment,
    people:      parse('cfg.people')      ?? CONFIG.people,
    familyTree:  showTree    ? (parse('cfg.familyTree') ?? CONFIG.familyTree) : { generations: [] },
    program:     showProgram ? (parse('cfg.program') ?? CONFIG.program) : [],
    socialLinks: parse('cfg.socialLinks') ?? [],
  })
}

export async function POST(req: NextRequest) {
  if (await isDemoRequest()) return demoOk()
  if (!await requireAdmin('settings'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
