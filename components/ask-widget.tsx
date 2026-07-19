'use client'

import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

// Floating "Ask a question" helper — answers practical questions
// (venue, dates, how to take part) for any visitor via /api/ai/ask.

type Msg = { role: 'user' | 'assistant'; text: string }

export default function AskWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
  }, [msgs, open])

  const ask = async () => {
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const res = await apiFetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'assistant', text: res.ok ? data.answer : (data.error ?? 'Something went wrong.') }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', text: 'Something went wrong. Please try again.' }])
    }
    setBusy(false)
  }

  return (
    <>
      {open && (
        <div className="ask-panel">
          <div className="ask-head">
            <span>Ask a question</span>
            <button className="ask-close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="ask-body" ref={bodyRef}>
            {msgs.length === 0 && (
              <p className="ask-hint">Ask anything practical — for example, &ldquo;Where will the funeral be held?&rdquo;</p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={'ask-msg ' + m.role}>{m.text}</div>
            ))}
            {busy && <div className="ask-msg assistant">…</div>}
          </div>
          <div className="ask-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask()}
              placeholder="Type your question…"
            />
            <button className="btn amber sm" onClick={ask} disabled={busy}>Ask</button>
          </div>
        </div>
      )}
      <button className="ask-fab" aria-label="Ask a question" onClick={() => setOpen(v => !v)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
    </>
  )
}
