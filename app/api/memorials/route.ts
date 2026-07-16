import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { CONFIG } from '@/lib/config'
import { requireAdmin, getViewer } from '@/lib/access'
import { getPrimarySlug, setPrimarySlug } from '@/lib/site'

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
  if (all && !await requireAdmin('memorials'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = await db()

  const rows = (all
    ? await withRetry(() => sql`SELECT * FROM memorials WHERE deleted_at IS NULL ORDER BY status DESC, created_at ASC`)
    : await withRetry(() => sql`SELECT id, slug, name, born, passed, portrait FROM memorials WHERE status = 'approved' AND deleted_at IS NULL ORDER BY created_at ASC`)
  ) as MemorialRow[]

  // The primary memorial's details live in the settings table — hydrate its card
  const [primarySlug, settings] = await Promise.all([
    getPrimarySlug(),
    withRetry(() => sql`SELECT key, value FROM settings WHERE key IN ('cfg.name', 'cfg.born', 'cfg.passed', 'portrait')`),
  ])
  const s: Record<string, string> = {}
  for (const r of settings) s[r.key as string] = r.value as string

  const memorials = rows.map(m =>
    m.slug === primarySlug
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

// Creating a memorial requires sign-in: the creator becomes its owner/admin.
// The very first memorial on a deployment becomes the primary one and is
// approved immediately (that's the self-hoster setting up their own site).
export async function POST(req: NextRequest) {
  const viewer = await getViewer()
  if (!viewer.user)
    return NextResponse.json({ error: 'Sign in to create a memorial — the account you use becomes its admin' }, { status: 401 })

  const body = await req.json()
  const name          = String(body.name ?? '').trim()
  const born          = String(body.born ?? '').trim()
  const passed        = String(body.passed ?? '').trim()
  const portrait      = String(body.portrait ?? '').trim()
  const contact_name  = String(body.contact_name ?? viewer.user.name).trim()
  const contact_phone = String(body.contact_phone ?? '').trim()
  const contact_email = String(body.contact_email ?? viewer.user.email).trim()

  if (!name) return NextResponse.json({ error: 'Name of the deceased is required' }, { status: 400 })

  const base = slugify(name) || 'memorial'
  const sql = await db()
  const taken = await sql`SELECT slug FROM memorials WHERE slug = ${base} OR slug LIKE ${base + '-%'}`
  const existing = new Set(taken.map(r => r.slug as string))
  let slug = base
  for (let i = 2; existing.has(slug); i++) slug = `${base}-${i}`

  const primarySlug = await getPrimarySlug()
  const [{ n: memorialCount }] = await sql`SELECT COUNT(*)::int AS n FROM memorials`
  const isFirst = Number(memorialCount) === 0 && !primarySlug
  const status = isFirst ? 'approved' : 'pending'

  const [created] = await sql`
    INSERT INTO memorials (slug, name, born, passed, portrait, status, contact_name, contact_phone, contact_email, owner_user_id)
    VALUES (${slug}, ${name}, ${born}, ${passed}, ${portrait}, ${status}, ${contact_name}, ${contact_phone}, ${contact_email}, ${viewer.user.id})
    RETURNING id, slug, name, status
  `
  if (isFirst) await setPrimarySlug(slug)

  return NextResponse.json(created, { status: 201 })
}
