'use client'

import { useState } from 'react'

export default function ContactForm() {
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [err, setErr]         = useState('')
  const [busy, setBusy]       = useState(false)
  const [sent, setSent]       = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Please tell us your name.'); return }
    if (!phone.trim() && !email.trim()) { setErr('Please leave a phone number or an email so we can reach you.'); return }
    if (!message.trim()) { setErr('Please write a short message.'); return }
    setErr('')
    setBusy(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErr(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setSent(true)
    } catch {
      setErr('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="contact-sent">
        <div className="contact-sent-heart">♥</div>
        <p><strong>Thank you{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}.</strong></p>
        <p style={{ marginBottom: 0 }}>Your message has been received — we will get back to you soon.</p>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="field">
        <label>Your name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Kamau" />
      </div>
      <div className="field">
        <label>Phone (WhatsApp)</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0712 345 678" inputMode="tel" />
      </div>
      <div className="field">
        <label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" />
      </div>
      <div className="field">
        <label>Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" />
      </div>
      {err && <p className="form-err">{err}</p>}
      <div>
        <button className="btn amber" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  )
}
