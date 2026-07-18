'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword } from '@/lib/auth-client'
import PamojaLogo from '@/components/pamoja-logo'

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setErr('')
    if (!password || password.length < 8) return setErr('Password must be at least 8 characters.')
    if (password !== confirm) return setErr('Passwords don’t match.')
    setBusy(true)
    const res = await resetPassword({ newPassword: password, token })
    setBusy(false)
    if (res.error) return setErr(res.error.message ?? 'This link may have expired. Please request a new one.')
    setDone(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><PamojaLogo size={22} /></div>
        <h1 className="auth-title">Choose a new password</h1>

        {!token ? (
          <p className="auth-sub">This reset link is invalid or missing a token. Please request a new one.</p>
        ) : done ? (
          <p className="auth-sub">Your password has been reset. You can now sign in with your new password.</p>
        ) : (
          <>
            <p className="auth-sub">Enter a new password for your account.</p>
            <div className="field">
              <label>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            {err && <p className="form-err">{err}</p>}
            <button className="btn amber block" onClick={submit} disabled={busy}>
              {busy ? 'Please wait…' : 'Reset password'}
            </button>
          </>
        )}

        <p className="auth-switch">
          <button onClick={() => router.push('/sign-in')}>← Back to sign in</button>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
