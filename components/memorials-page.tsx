'use client'

import { useState, useEffect } from 'react'
import PamojaLogo from '@/components/pamoja-logo'
import { photoThumb } from '@/lib/photo'

// Recent (real) memorials, each served path-based at /memorial/<slug> on this
// same host — no separate domains anymore.

type Memorial = {
  id: number
  slug: string
  name: string
  born: string
  passed: string
  portrait: string
  is_demo?: boolean
}

function Img({ src, alt = '' }: { src?: string; alt?: string }) {
  const [errSrc, setErrSrc] = useState<string | null>(null)
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

export default function MemorialsPage() {
  const [memorials, setMemorials] = useState<Memorial[] | null>(null)

  useEffect(() => {
    fetch('/api/memorials')
      .then(r => r.ok ? r.json() : [])
      .then(data => setMemorials((data as Memorial[]).filter(m => !m.is_demo)))
      .catch(() => setMemorials([]))
  }, [])

  return (
    <div className="dir-page">
      <div className="dir-top">
        <a href="/"><button className="btn ghost sm">← Home</button></a>
      </div>

      <header className="dir-head">
        <h1 style={{ lineHeight: 1 }}><a href="/" aria-label="Pamoja home"><PamojaLogo size={36} className="dir-logo" /></a></h1>
        <p className="dir-kick">Recent memorials</p>
      </header>

      <main className="dir-grid">
        {memorials === null && (
          <div className="dir-card" aria-hidden="true">
            <div className="dir-card-photo"><div className="ph-skel" /></div>
            <div className="dir-card-body">
              <div className="dir-card-kick">In loving memory of</div>
              <div className="dir-skel-line" />
              <div className="dir-skel-line short" />
            </div>
          </div>
        )}

        {memorials !== null && memorials.length === 0 && (
          <p className="dir-empty">No memorials yet.</p>
        )}

        {memorials !== null && memorials.map(m => (
          <a key={m.id} className="dir-card" href={`/memorial/${m.slug}`}>
            <div className="dir-card-photo"><Img src={m.portrait} alt={m.name} /></div>
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
      </main>
    </div>
  )
}
