'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, useSession, requestPasswordReset } from '@/lib/auth-client'
import PamojaLogo from '@/components/pamoja-logo'

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google', facebook: 'Facebook', twitter: 'X (Twitter)', linkedin: 'LinkedIn',
  tiktok: 'TikTok', github: 'GitHub', apple: 'Apple', microsoft: 'Microsoft',
  discord: 'Discord', spotify: 'Spotify', twitch: 'Twitch', reddit: 'Reddit',
}

export default function SignInPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [providers, setProviders] = useState<string[]>([])
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetch('/api/auth-config')
      .then(r => r.ok ? r.json() : { providers: [] })
      .then(d => setProviders(d.providers ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => { if (session?.user) router.push('/') }, [session, router])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(v => ({ ...v, [k]: e.target.value }))

  const submit = async () => {
    setErr('')
    if (!f.email.trim() || !f.password) return setErr('Please fill in your email and password.')
    if (mode === 'signup' && !f.name.trim()) return setErr('Please add your name.')
    setBusy(true)
    const res = mode === 'signup'
      ? await signUp.email({ name: f.name.trim(), email: f.email.trim(), password: f.password })
      : await signIn.email({ email: f.email.trim(), password: f.password })
    setBusy(false)
    if (res.error) return setErr(res.error.message ?? 'Something went wrong. Please try again.')
    router.push('/')
  }

  const social = async (provider: string) => {
    setErr('')
    await signIn.social({ provider: provider as 'google', callbackURL: '/' })
  }

  const sendReset = async () => {
    setErr('')
    if (!f.email.trim()) return setErr('Please enter your email.')
    setBusy(true)
    const res = await requestPasswordReset({ email: f.email.trim(), redirectTo: '/reset-password' })
    setBusy(false)
    if (res.error) return setErr(res.error.message ?? 'Something went wrong. Please try again.')
    setSent(true)
  }

  if (mode === 'forgot') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand"><PamojaLogo size={22} /></div>
          <h1 className="auth-title">Reset your password</h1>
          {sent ? (
            <p className="auth-sub">If an account exists for that email, we&apos;ve sent a link to reset your password.</p>
          ) : (
            <>
              <p className="auth-sub">Enter your email and we&apos;ll send you a link to choose a new password.</p>
              <div className="field">
                <label>Email</label>
                <input type="email" value={f.email} onChange={set('email')} placeholder="you@example.com"
                  onKeyDown={e => e.key === 'Enter' && sendReset()} />
              </div>
              {err && <p className="form-err">{err}</p>}
              <button className="btn amber block" onClick={sendReset} disabled={busy}>
                {busy ? 'Please wait…' : 'Send reset link'}
              </button>
            </>
          )}
          <p className="auth-switch">
            <button onClick={() => { setMode('signin'); setErr(''); setSent(false) }}>← Back to sign in</button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><PamojaLogo size={22} /></div>
        <h1 className="auth-title">{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
        <p className="auth-sub">
          {mode === 'signin'
            ? 'Welcome back. Sign in to take part in the memorial.'
            : 'Join to write condolences, share memories and view family sections.'}
        </p>

        {providers.length > 0 && (
          <>
            <div className="auth-providers">
              {providers.map(p => (
                <button key={p} className="auth-provider-btn" onClick={() => social(p)}>
                  Continue with {PROVIDER_LABELS[p] ?? p}
                </button>
              ))}
            </div>
            <div className="auth-or"><span>or use email</span></div>
          </>
        )}

        {mode === 'signup' && (
          <div className="field">
            <label>Your name</label>
            <input type="text" value={f.name} onChange={set('name')} placeholder="Full name" />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={f.password} onChange={set('password')} placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {mode === 'signin' && (
          <button className="auth-forgot" onClick={() => { setMode('forgot'); setErr(''); setSent(false) }}>
            Forgot password?
          </button>
        )}

        {err && <p className="form-err">{err}</p>}

        <button className="btn amber block" onClick={submit} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <p className="auth-switch">
          {mode === 'signin' ? (
            <>New here? <button onClick={() => { setMode('signup'); setErr('') }}>Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('signin'); setErr('') }}>Sign in</button></>
          )}
        </p>

        <button className="auth-back" onClick={() => router.push('/')}>← Back to the memorial</button>
      </div>
    </div>
  )
}
