// Transactional email via Resend — currently just password reset. Optional:
// logs a warning and skips sending unless RESEND_API_KEY and RESEND_FROM_EMAIL
// are set (self-host deployments can leave email/password reset unused).
//
//   RESEND_API_KEY    — API key from resend.com
//   RESEND_FROM_EMAIL — verified sender, e.g. "Pamoja <noreply@yourdomain.com>"

import { Resend } from 'resend'

let _resend: Resend | null = null

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  const client = resend()
  const from = process.env.RESEND_FROM_EMAIL
  if (!client || !from) {
    console.warn('sendPasswordResetEmail skipped: RESEND_API_KEY or RESEND_FROM_EMAIL not set')
    return
  }

  const { error } = await client.emails.send({
    from,
    to,
    subject: 'Reset your Pamoja password',
    html: `
      <p>Someone requested a password reset for this email address on Pamoja.</p>
      <p><a href="${url}">Click here to choose a new password</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <p>This link expires in 1 hour.</p>
    `,
  })
  if (error) console.warn('sendPasswordResetEmail failed:', error)
}
