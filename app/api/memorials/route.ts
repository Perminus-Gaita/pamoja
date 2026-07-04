import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { CONFIG, PRIMARY_MEMORIAL_SLUG } from '@/lib/config'

type MemorialRow = {
  id: number
  slug: string
  name: string
  born: string
  passed: string
  portrait: string
  status: string
  contact_name: string
  contact_phone: string
  contact_email: string
  created_at: string
}

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('status') === 'all'
  const sql = await db()

  const rows = (all
    ? await withRetry(() => sql`SELECT * FROM memorials ORDER BY status DESC, created_at ASC`)
    : await withRetry(() => sql`SELECT id, slug, name, born, passed, portrait FROM memorials WHERE status = 'approved' ORDER BY created_at ASC`)
  ) as MemorialRow[]

  // The primary memorial's details live in the settings table — hydrate its card
  const settings = await withRetry(() =>
    sql`SELECT key, value FROM settings WHERE key IN ('cfg.name', 'cfg.born', 'cfg.passed', 'portrait')`
  )
  const s: Record<string, string> = {}
  for (const r of settings) s[r.key as string] = r.value as string

  const memorials = rows.map(m =>
    m.slug === PRIMARY_MEMORIAL_SLUG
      ? {
          ...m,
          name:     s['cfg.name']   ?? CONFIG.name,
          born:     s['cfg.born']   ?? CONFIG.born,
          passed:   s['cfg.passed'] ?? CONFIG.passed,
          portrait: s['portrait']   ?? CONFIG.portrait,
        }
      : m
  )

  return NextResponse.json(memorials)
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name          = String(body.name ?? '').trim()
  const born          = String(body.born ?? '').trim()
  const passed        = String(body.passed ?? '').trim()
  const portrait      = String(body.portrait ?? '').trim()
  const contact_name  = String(body.contact_name ?? '').trim()
  const contact_phone = String(body.contact_phone ?? '').trim()
  const contact_email = String(body.contact_email ?? '').trim()

  if (!name) return NextResponse.json({ error: 'Name of the deceased is required' }, { status: 400 })
  if (!contact_name || !contact_phone) {
    return NextResponse.json({ error: 'Your name and phone number are required so we can contact you' }, { status: 400 })
  }

  const base = slugify(name) || 'memorial'
  const sql = await db()
  const taken = await sql`SELECT slug FROM memorials WHERE slug = ${base} OR slug LIKE ${base + '-%'}`
  const existing = new Set(taken.map(r => r.slug as string))
  let slug = base
  for (let i = 2; existing.has(slug); i++) slug = `${base}-${i}`

  const [created] = await sql`
    INSERT INTO memorials (slug, name, born, passed, portrait, status, contact_name, contact_phone, contact_email)
    VALUES (${slug}, ${name}, ${born}, ${passed}, ${portrait}, 'pending', ${contact_name}, ${contact_phone}, ${contact_email})
    RETURNING id, slug, name, status
  `
  return NextResponse.json(created, { status: 201 })
}
