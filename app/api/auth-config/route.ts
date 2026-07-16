import { NextResponse } from 'next/server'
import { configuredProviders } from '@/lib/auth'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public: which sign-in methods the sign-in page should offer.
export async function GET() {
  const sql = await db()
  const rows = await withRetry(() => sql`SELECT value FROM settings WHERE key = 'auth.providers'`)
  const configured = configuredProviders()
  let enabled: string[] | null = null
  try { enabled = rows[0] ? JSON.parse(rows[0].value as string) : null } catch {}
  return NextResponse.json({
    providers: enabled ? configured.filter(p => enabled!.includes(p)) : configured,
    configured,
    enabled,
    emailPassword: true,
  })
}
