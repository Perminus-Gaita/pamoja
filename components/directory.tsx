'use client'

import { useState, useEffect, useRef } from 'react'
import PamojaLogo from '@/components/pamoja-logo'
import FooterMeta from '@/components/footer-meta'
import { photoThumb } from '@/lib/photo'
import { authClient } from '@/lib/auth-client'

type Memorial = {
  id: number
  slug: string
  name: string
  born: string
  passed: string
  portrait: string
  is_demo?: boolean
}

/* ── IMG with skeleton / placeholder ─────────────────────────────────────── */
function Img({ src, alt = '', loading: isLoading = false }: { src?: string; alt?: string; loading?: boolean }) {
  const [errSrc, setErrSrc] = useState<string | null>(null)

  if (isLoading) return <div className="ph-skel" />
  const shown = src && src.trim() ? photoThumb(src) : ''
  if (shown && shown !== errSrc)
    return <img src={shown} alt={alt} loading="lazy" onError={() => setErrSrc(shown)} />
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

/* ── Memorial URL — path-based on this same host ─────────────────────────── */
// No new domains are handed out anymore: memorials live at /memorial/<slug>
// (the demo at /demo/<slug>). Only the original memorial also keeps its own
// legacy domain.
function memorialUrl(slug: string): string {
  return `/memorial/${slug}`
}

/* ── Add-memorial modal ──────────────────────────────────────────────────── */
// Creating a memorial requires an account — the creator becomes its admin.
// No approval step: the memorial goes live immediately.
function AddMemorialModal({ onClose, onCreated, signedIn }: { onClose: () => void; onCreated: () => void; signedIn: boolean }) {
  const [name, setName]     = useState('')
  const [born, setBorn]     = useState('')
  const [passed, setPassed] = useState('')
  const [portrait, setPortrait] = useState('')
  const [err, setErr]       = useState('')
  const [busy, setBusy]     = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const longDate = (iso: string) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
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
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setCreatedSlug(data.slug ?? '')
      onCreated()
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
          <h3>{createdSlug !== null ? 'Memorial created' : 'Create a memorial'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {createdSlug !== null ? (
          <div className="modal-body">
            <div className="dir-done">
              <div className="dir-done-heart">♥</div>
              <p className="dir-done-title">The memorial for {name.trim()} is live.</p>
              <p className="dir-done-text">
                It has its own address — share the link with family and friends so they can
                begin gathering condolences, memories, and support. You are its admin.
              </p>
              <p style={{ marginTop: 18 }}>
                <a href={memorialUrl(createdSlug)}><button className="btn amber">Visit memorial</button></a>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-body">
              <p className="dir-form-intro">
                Add the name, dates, and a photo — the memorial goes live immediately,
                and the account you are signed in with becomes its admin.
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

              {err && <p className="form-err">{err}</p>}
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn amber" onClick={submit} disabled={busy}>
                {busy ? 'Creating…' : 'Create memorial'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Directory — the landing grid ────────────────────────────────────────── */
export default function Directory({ stars = null }: { stars?: number | null }) {
  const [memorials, setMemorials] = useState<Memorial[]>([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [user, setUser]           = useState<{ name: string; image: string | null } | null>(null)
  const [authKnown, setAuthKnown] = useState(false)
  const [userMenu, setUserMenu]   = useState(false)

  const signOut = async () => {
    try { await authClient.signOut() } catch {}
    window.location.reload()
  }

  const loadMemorials = () => {
    fetch('/api/memorials')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setMemorials(data as Memorial[]); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadMemorials()
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setUser(d?.user ?? null); setAuthKnown(true) })
      .catch(() => setAuthKnown(true))
  }, [])

  return (
    <div className="dir-page">
      <FallingHearts />

      <div className="dir-top">
        {user ? (
          <div className="dir-user">
            <button className="dir-avatar-btn" onClick={() => setUserMenu(v => !v)} title={`Signed in as ${user.name}`}>
              <img
                className="dir-avatar"
                src={user.image || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=f5f0e8`}
                alt={user.name}
              />
            </button>
            {userMenu && (
              <>
                <div className="tb-menu-scrim" onClick={() => setUserMenu(false)} />
                <div className="dir-user-menu">
                  <div className="dir-user-name">{user.name}</div>
                  <button className="tb-menu-item" onClick={signOut}>Sign out</button>
                </div>
              </>
            )}
          </div>
        ) : authKnown ? (
          <a href="/sign-in"><button className="btn ghost sm">Sign in</button></a>
        ) : null}
      </div>

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

        {/* The landing shows just the demo + create; real memorials live on /memorials */}
        {!loading && memorials.filter(m => m.is_demo).map(m => (
          <a key={m.id} className="dir-card dir-card-demo" href={`/demo/${m.slug}`}>
            <span className="dir-demo-badge dir-demo-tag">Demo</span>
            <div className="dir-card-photo"><Img src={m.portrait} alt={m.name} /></div>
            <div className="dir-card-body">
              <div className="dir-card-kick">In loving memory of</div>
              <h2 className="dir-card-name">{m.name}</h2>
              {(m.born || m.passed) && (
                <p className="dir-card-dates">{m.born}<span className="ndash">—</span>{m.passed}</p>
              )}
              <span className="dir-card-cta">Visit demo memorial →</span>
              <p className="dir-demo-note">Fictional memorial for demonstration</p>
            </div>
          </a>
        ))}

        <button className="dir-add" onClick={() => setAdding(true)}>
          <span className="dir-add-plus">+</span>
          <span className="dir-add-title">Create a memorial</span>
          <span className="dir-add-sub">Honour someone you love</span>
        </button>
      </main>

      <a className="dir-recent-link" href="/memorials">View recent memorials →</a>

      <footer className="dir-foot">
        Pamoja — <em>together</em>. A free, open-source digital condolence book and memorial.
        <nav className="dir-foot-links">
          <a href="/about">About</a>
          <a href="/faq">FAQ</a>
          <a href="/terms">Terms &amp; Conditions</a>
          <a href="/contact">Contact</a>
          <FooterMeta stars={stars} />
        </nav>
      </footer>

      {adding && <AddMemorialModal onClose={() => setAdding(false)} onCreated={loadMemorials} signedIn={!!user} />}
    </div>
  )
}
