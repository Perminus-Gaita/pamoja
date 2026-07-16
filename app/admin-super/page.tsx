'use client'

import { useState, useEffect } from 'react'
import type { Me } from '@/lib/config'
import { ADMIN_TABS, AdminTabContent, type AdminTab } from '@/components/admin-panel'

// Standalone admin page. The same panel is embedded in the memorial's left
// menu (components/pamoja.tsx) — this route remains for direct access.

const S: Record<string, React.CSSProperties> = {
  page:      { minHeight: '100vh', background: '#f2ede4', padding: '28px 16px', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#1a1c18' },
  container: { maxWidth: 780, margin: '0 auto' },
  header:    { marginBottom: 28 },
  title:     { fontSize: '1.55rem', fontWeight: 700, color: '#213029', marginBottom: 4 },
  subtitle:  { fontSize: '.9rem', color: '#5a5f58' },
  tabBar:    { display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap' },
  tabBtn:    { padding: '9px 18px', background: '#e4ddd0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '.85rem', fontWeight: 500, color: '#4a4d46' },
  tabActive: { background: '#213029', color: '#f7f4ee' },
  card:      { background: '#fff', borderRadius: 14, padding: '28px 28px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' },
  btn:       { padding: '10px 22px', background: '#213029', color: '#f7f4ee', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 },
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('basic')
  const [me, setMe] = useState<Me | null | 'loading'>('loading')
  const [claimable, setClaimable] = useState(false)
  const [claimErr, setClaimErr] = useState('')

  const loadMe = () => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setMe(d))
      .catch(() => setMe(null))
  }
  useEffect(loadMe, [])
  useEffect(() => {
    fetch('/api/memorials/claim')
      .then(r => r.ok ? r.json() : { claimable: false })
      .then(d => setClaimable(!!d.claimable))
      .catch(() => {})
  }, [])

  const claim = async () => {
    setClaimErr('')
    const r = await fetch('/api/memorials/claim', { method: 'POST' })
    const d = await r.json().catch(() => ({}))
    if (r.ok) loadMe()
    else setClaimErr(d.error ?? 'Could not claim the memorial.')
  }

  if (me === 'loading') {
    return <div style={S.page}><div style={S.container}><p style={{ color: '#888' }}>Loading…</p></div></div>
  }

  if (!me || !me.isAdmin) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={S.card}>
            <h1 style={S.title}>Site Administration</h1>
            {me?.user ? (
              claimable ? (
                <>
                  <p style={S.subtitle}>
                    This memorial doesn&rsquo;t have an admin yet. If you created it, claim it —
                    your account ({me.user.email}) will become its administrator.
                  </p>
                  <button style={{ ...S.btn, marginTop: 12 }} onClick={claim}>Claim this memorial</button>
                  {claimErr && <p style={{ color: '#b83c3c', fontSize: '.85rem', marginTop: 8 }}>{claimErr}</p>}
                </>
              ) : (
                <p style={S.subtitle}>
                  Signed in as {me.user.email} — this account is not an administrator of this
                  memorial. The person who created the memorial can add you as an admin.
                </p>
              )
            ) : (
              <>
                <p style={S.subtitle}>Sign in with the account that created this memorial to continue.</p>
                <a href="/sign-in"><button style={{ ...S.btn, marginTop: 12 }}>Sign in</button></a>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <h1 style={S.title}>Site Administration</h1>
          <p style={S.subtitle}>Update the content shown on the memorial site. Changes take effect immediately.</p>
        </div>

        <div style={S.tabBar}>
          {ADMIN_TABS.map(t => (
            <button
              key={t.id}
              style={{ ...S.tabBtn, ...(tab === t.id ? S.tabActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AdminTabContent tab={tab} />
      </div>
    </div>
  )
}
