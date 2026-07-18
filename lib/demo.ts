import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { isRootHost, slugFromHost } from '@/lib/seo'
import { CONFIG } from '@/lib/config'

/*
 * Demo memorials — a sandbox for trying Pamoja without consequences.
 *
 * A memorial flagged `memorials.is_demo` serves an entirely fabricated
 * dataset ("Jina Mpendwa" — Swahili for "beloved name"; every person here is
 * fictional). On a demo host:
 *   - every visitor browses as if signed in, with the admin view unlocked
 *   - admin mutations pretend to succeed (`demoOk`) but never write —
 *     a refresh resets everything
 *   - really-signed-in visitors CAN leave condolences and memories; those
 *     persist with is_demo = TRUE, invisible to real memorials, and are
 *     purged after 7 days (seed rows self-heal on init)
 *   - reads are partitioned by is_demo, so demo visitors can never see the
 *     real memorial's data and vice versa
 */

export const DEMO_SLUG = 'pamoja-demo'

// slug → is_demo, cached briefly so hot paths don't hit the DB per request
const demoCache = new Map<string, { v: boolean; t: number }>()
const DEMO_CACHE_MS = 60_000

export async function isDemoHost(host: string): Promise<boolean> {
  if (!host || isRootHost(host)) return false
  const slug = slugFromHost(host)
  if (!slug) return false
  const hit = demoCache.get(slug)
  if (hit && Date.now() - hit.t < DEMO_CACHE_MS) return hit.v
  try {
    const sql = await db()
    const rows = await withRetry(
      () => sql`SELECT is_demo FROM memorials WHERE slug = ${slug} AND deleted_at IS NULL LIMIT 1`,
    )
    const v = !!rows[0]?.is_demo
    demoCache.set(slug, { v, t: Date.now() })
    return v
  } catch {
    return false
  }
}

/** Is the current request being served on a demo memorial's host? */
export async function isDemoRequest(): Promise<boolean> {
  return isDemoHost((await headers()).get('host') ?? '')
}

/** Pretend-success response for admin mutations in demo mode. */
export function demoOk(extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, demo: true, ...extra })
}

// The fabricated memorial config served to demo hosts instead of the real
// settings table. Shape mirrors /api/config's GET response.
export const DEMO_CONFIG = {
  name: 'Jina Mpendwa',
  kicker: 'In loving memory of',
  born: '1 January 1950',
  passed: '1 June 2026',
  epitaph: 'Those we love don’t go away, they walk beside us every day.',
  currency: 'KES',
  cta: 'Write your condolence message',
  portrait: '',
  programNote: 'This is a demo memorial — every name and detail here is fictional. Explore freely; nothing you change is saved.',
  relations: CONFIG.relations,
  payment: {
    mpesa_number: '0700 000 000',
    mpesa_name: 'Demo Family',
    paybill_number: '000000',
    paybill_account: 'DEMO',
    paybill_bank: 'Demo Bank',
  },
  people: [],
  familyTree: {
    generations: [
      [
        { name: 'Jina Mpendwa', relation: '', photo: '', self: true },
        { name: 'Pendo Mpendwa', relation: 'Wife', photo: '' },
      ],
      [
        { name: 'Amani Mpendwa', relation: 'Son', photo: '' },
        { name: 'Neema Mpendwa', relation: 'Daughter', photo: '' },
        { name: 'Baraka Mpendwa', relation: 'Son', photo: '' },
      ],
    ],
  },
  program: [
    {
      title: 'Memorial Service',
      date: 'Saturday 20 June 2026',
      time: '10:00 am',
      venue: 'Demo Community Hall',
      address: 'Demo Lane, Nairobi',
      mapUrl: '',
      note: 'Sample event — this memorial is a demo.',
    },
    {
      title: 'Burial',
      date: 'Sunday 21 June 2026',
      time: '2:00 pm',
      venue: 'Demo Gardens',
      address: 'Demo Road, Nairobi',
      mapUrl: '',
      note: '',
    },
  ],
  socialLinks: [],
}
