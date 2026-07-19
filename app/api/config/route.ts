import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { CONFIG } from '@/lib/config'
import { getViewer, getAccessSettings, canView, requireAdmin } from '@/lib/access'
import { allFeatures } from '@/lib/entitlements'
import { isDemoRequest, demoOk, DEMO_CONFIG, demoSettings, isRealDemoAdmin } from '@/lib/demo'

export async function GET() {
  // Demo requests get the fabricated dataset — never the real settings table.
  // The platform admin can curate the demo: their saves live under
  // 'demo:'-prefixed settings keys and overlay the static defaults here.
  if (await isDemoRequest()) {
    const s = await demoSettings()
    const parse = (key: string) => {
      try { return s[key] ? JSON.parse(s[key]) : null } catch { return null }
    }
    return NextResponse.json({
      ...DEMO_CONFIG,
      name:        s['cfg.name']        ?? DEMO_CONFIG.name,
      kicker:      s['cfg.kicker']      ?? DEMO_CONFIG.kicker,
      born:        s['cfg.born']        ?? DEMO_CONFIG.born,
      passed:      s['cfg.passed']      ?? DEMO_CONFIG.passed,
      epitaph:     s['cfg.epitaph']     ?? DEMO_CONFIG.epitaph,
      currency:    s['cfg.currency']    ?? DEMO_CONFIG.currency,
      cta:         s['cfg.cta']         ?? DEMO_CONFIG.cta,
      portrait:    s['portrait']        ?? DEMO_CONFIG.portrait,
      programNote: s['cfg.programNote'] ?? DEMO_CONFIG.programNote,
      relations:   parse('cfg.relations')   ?? DEMO_CONFIG.relations,
      payment:     parse('cfg.payment')     ?? DEMO_CONFIG.payment,
      familyTree:  parse('cfg.familyTree')  ?? DEMO_CONFIG.familyTree,
      program:     parse('cfg.program')     ?? DEMO_CONFIG.program,
      socialLinks: parse('cfg.socialLinks') ?? DEMO_CONFIG.socialLinks,
    })
  }

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
  const demo = await isDemoRequest()
  if (demo) {
    // Only the platform admin's demo edits persist — namespaced 'demo:' keys
    const viewer = await getViewer()
    if (!isRealDemoAdmin(viewer)) return demoOk()
  } else if (!await requireAdmin('settings')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json() as Record<string, unknown>
  const sql = await db()
  for (const [key, value] of Object.entries(body)) {
    const v = typeof value === 'string' ? value : JSON.stringify(value)
    const k = demo ? `demo:${key}` : key
    await sql`
      INSERT INTO settings (key, value) VALUES (${k}, ${v})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `
  }
  return NextResponse.json({ ok: true })
}
