'use client'

// Platform admin — the site developer/operator's panel (distinct from
// memorial admins). Gated by user."isPlatformAdmin"; placeholder for now.

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import PamojaLogo from '@/components/pamoja-logo'

export default function PlatformAdminPage() {
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading')

  useEffect(() => {
    apiFetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setState(d?.isPlatformAdmin ? 'ok' : 'denied'))
      .catch(() => setState('denied'))
  }, [])

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-brand" style={{ display: 'flex', justifyContent: 'center' }}>
          <PamojaLogo size={22} />
        </div>
        {state === 'loading' && <p className="auth-sub">Loading…</p>}
        {state === 'denied' && (
          <>
            <h1 className="auth-title">Platform admin</h1>
            <p className="auth-sub">This area is for the site operator. <a href="/sign-in">Sign in</a> with the operator account to continue.</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <h1 className="auth-title">Platform admin</h1>
            <p className="auth-sub">The platform admin panel will be here.</p>
          </>
        )}
      </div>
    </div>
  )
}
