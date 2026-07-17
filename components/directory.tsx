'use client'

import { useState, useEffect, useRef } from 'react'
import PamojaLogo from '@/components/pamoja-logo'

type Memorial = {
  id: number
  slug: string
  name: string
  born: string
  passed: string
  portrait: string
}

/* ── IMG with skeleton / placeholder ─────────────────────────────────────── */
function Img({ src, loading: isLoading = false }: { src?: string; loading?: boolean }) {
  const [errSrc, setErrSrc] = useState<string | null>(null)

  if (isLoading) return <div className="ph-skel" />
  if (src && src.trim() && src !== errSrc)
    return <img src={src} alt="" loading="lazy" onError={() => setErrSrc(src)} />
  return (
    <div className="ph">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="9" r="3.5" /><path d="M5 21c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5" />
      </svg>
    </div>
  )
}

/* ── FALLING HEARTS — client-only to avoid hydration mismatch ─────────────── */
function FallingHearts() {
  const [hearts, setHearts] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([])

  useEffect(() => {
    setHearts(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 96),
      delay: +(Math.random() * 14).toFixed(2),
      duration: +(12 + Math.random() * 11).toFixed(2),
      size: Math.round(11 + Math.random() * 14),
    })))
  }, [])

  return (
    <div className="hearts-wrap" aria-hidden="true">
      {hearts.map(h => (
        <span key={h.id} className="heart" style={{
          left: h.left + '%',
          animationDelay: h.delay + 's',
          animationDuration: h.duration + 's',
          fontSize: h.size + 'px',
        }}>♥</span>
      ))}
    </div>
  )
}

/* ── Memorial URL — subdomain of the root domain ─────────────────────────── */
function memorialUrl(slug: string): string {
  if (typeof window === 'undefined') return '/'
  const { protocol, host } = window.location
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  if (root) {
    // vercel.app has no nested subdomains — each memorial is a sibling <slug>.vercel.app
    if (root.endsWith('.vercel.app')) return `${protocol}//${slug}.vercel.app`
    return `${protocol}//${slug}.${root}`
  }
  const [hostname, port] = host.split(':')
  if (hostname === 'localhost' || hostname === '127.0.0.1')
    return `${protocol}//${slug}.localhost${port ? ':' + port : ''}`
  // Unknown host (e.g. preview deployment) — the memorial lives on this same host
  return '/'
}

/* ── Add-memorial modal ──────────────────────────────────────────────────── */
// Creating a memorial requires an account — the creator becomes its admin.
function AddMemorialModal({ onClose, signedIn }: { onClose: () => void; signedIn: boolean }) {
  const [name, setName]     = useState('')
  const [born, setBorn]     = useState('')
  const [passed, setPassed] = useState('')
  const [portrait, setPortrait] = useState('')
  const [cName, setCName]   = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [err, setErr]       = useState('')
  const [busy, setBusy]     = useState(false)
  const [done, setDone]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const longDate = (iso: string) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'memorials')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.url) setPortrait(data.url)
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!name.trim()) { setErr('Please enter the name of your loved one.'); return }
    setErr('')
    setBusy(true)
    try {
      const res = await fetch('/api/memorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          born: longDate(born),
          passed: longDate(passed),
          portrait,
          contact_name: cName.trim(),
          contact_phone: cPhone.trim(),
          contact_email: cEmail.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErr(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setErr('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!signedIn) {
    return (
      <div className="modal-wrap" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Create a memorial</h3>
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="modal-body">
            <p style={{ textAlign: 'center', padding: '10px 0', color: 'var(--soft)' }}>
              Sign in to continue.
            </p>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <a href="/sign-in"><button className="btn amber">Sign in</button></a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-wrap" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <h3>{done ? 'Request received' : 'Create a memorial'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {done ? (
          <div className="modal-body">
            <div className="dir-done">
              <div className="dir-done-heart">♥</div>
              <p className="dir-done-title">Thank you{cName.trim() ? `, ${cName.trim().split(' ')[0]}` : ''}.</p>
              <p className="dir-done-text">
                Your request to create a memorial for <strong>{name.trim()}</strong> has been received
                and is awaiting approval. We will reach out to you on the contact details you provided
                — once approved, the memorial will have its own address and you can begin gathering
                condolences, memories, and support.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-body">
              <p className="dir-form-intro">
                Every memorial is reviewed before it goes live. Please include your contact details
                so we can reach you once it is approved.
              </p>

              <div className="field">
                <label>Name of the deceased</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Wanjiru Kamau" />
              </div>

              <div className="m2">
                <div className="field">
                  <label>Date of birth</label>
                  <input type="date" value={born} onChange={e => setBorn(e.target.value)} />
                </div>
                <div className="field">
                  <label>Date of passing</label>
                  <input type="date" value={passed} onChange={e => setPassed(e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label>Photo (optional)</label>
                <div className="dir-upload-row">
                  <div className="dir-upload-preview">
                    <Img src={portrait} loading={uploading} />
                  </div>
                  <button className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading…' : portrait ? 'Change photo' : 'Upload photo'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden
                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
                </div>
              </div>

              <div className="dir-form-divider">Your contact details (optional)</div>

              <div className="field">
                <label>Your name</label>
                <input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. John Kamau" />
              </div>
              <div className="m2">
                <div className="field">
                  <label>Phone (WhatsApp)</label>
                  <input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="e.g. 0712 345 678" inputMode="tel" />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="you@example.com" inputMode="email" />
                </div>
              </div>

              {err && <p className="form-err">{err}</p>}
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn amber" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Directory — the landing grid ────────────────────────────────────────── */
export default function Directory() {
  const [memorials, setMemorials] = useState<Memorial[]>([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [signedIn, setSignedIn]   = useState(false)

  useEffect(() => {
    fetch('/api/memorials')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setMemorials(data as Memorial[]); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setSignedIn(!!d?.user))
      .catch(() => {})
  }, [])

  return (
    <div className="dir-page">
      <FallingHearts />

      <header className="dir-head">
        <h1 style={{ lineHeight: 1 }}><PamojaLogo size={42} className="dir-logo" /></h1>
        <p className="dir-kick">Together in remembrance</p>
      </header>

      <main className="dir-grid">
        {loading && (
          <div className="dir-card" aria-hidden="true">
            <div className="dir-card-photo"><div className="ph-skel" /></div>
            <div className="dir-card-body">
              <div className="dir-card-kick">In loving memory of</div>
              <div className="dir-skel-line" />
              <div className="dir-skel-line short" />
            </div>
          </div>
        )}

        {!loading && memorials.map(m => (
          <a key={m.id} className="dir-card" href={memorialUrl(m.slug)}>
            <div className="dir-card-photo"><Img src={m.portrait} /></div>
            <div className="dir-card-body">
              <div className="dir-card-kick">In loving memory of</div>
              <h2 className="dir-card-name">{m.name}</h2>
              {(m.born || m.passed) && (
                <p className="dir-card-dates">{m.born}<span className="ndash">—</span>{m.passed}</p>
              )}
              <span className="dir-card-cta">Visit memorial →</span>
            </div>
          </a>
        ))}

        <button className="dir-add" onClick={() => setAdding(true)}>
          <span className="dir-add-plus">+</span>
          <span className="dir-add-title">Create a memorial</span>
          <span className="dir-add-sub">Honour someone you love</span>
        </button>
      </main>

      <footer className="dir-foot">
        <nav className="dir-foot-links">
          <a href="/about">About</a>
          <a href="/faq">FAQ</a>
          <a href="/terms">Terms &amp; Conditions</a>
          <a href="/contact">Contact</a>
        </nav>
        Pamoja — <em>together</em>. A free, open-source digital condolence book.
      </footer>

      {adding && <AddMemorialModal onClose={() => setAdding(false)} signedIn={signedIn} />}
    </div>
  )
}
