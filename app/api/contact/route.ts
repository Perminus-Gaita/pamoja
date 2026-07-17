import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { notifyAdmins } from '@/lib/notify'

// Public contact form (/contact). Stores the message and pings the operator
// on Telegram so nobody waits on an unread inbox.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name    = String(body.name ?? '').trim().slice(0, 200)
  const phone   = String(body.phone ?? '').trim().slice(0, 50)
  const email   = String(body.email ?? '').trim().slice(0, 200)
  const message = String(body.message ?? '').trim().slice(0, 4000)

  if (!name) return NextResponse.json({ error: 'Please tell us your name.' }, { status: 400 })
  if (!phone && !email)
    return NextResponse.json({ error: 'Please leave a phone number or an email so we can reach you.' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'Please write a short message.' }, { status: 400 })

  const sql = await db()
  await withRetry(() => sql`
    INSERT INTO contact_messages (name, phone, email, message)
    VALUES (${name}, ${phone}, ${email}, ${message})
  `)

  const lines = ['📮 Pamoja — new contact message', `From: ${name}`]
  if (phone) lines.push(`Phone: ${phone}`)
  if (email) lines.push(`Email: ${email}`)
  lines.push('', message)
  await notifyAdmins(lines.join('\n'))

  return NextResponse.json({ ok: true }, { status: 201 })
}
