'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Me } from '@/lib/config'
import { photoThumb } from '@/lib/photo'

/*
 * Public profile for a person who took part in the memorial — reached by
 * clicking their name on a condolence. Twitter-style header + tabs:
 * Condolence · Relation tree · Contributions · Memories · Tribute.
 * Which tabs exist is admin-controlled (see /api/me gates).
 */

type Condolence = { id: number; name: string; relation: string; message: string; created_at: string }
type Contribution = { id: number; amount: number; note: string; created_at: string }
type GroupChip = { id: number; name: string }
type MemoryRow = { id: number; src: string; caption: string; added_by: string }
type Tribute = { id: number; body: string; updated_at: string }
type Edge = {
  id: number; person_a: number; person_b: number | null; relation: string
  a_name: string; a_photo: string; a_relation?: string
  b_name?: string; b_photo?: string
}

type Person = {
  id: number
  name: string
  relation: string
  photo: string
  bio: string
  family_group?: string
  isOwn: boolean
  condolences: Condolence[]
  contributions: Contribution[]
  groups: GroupChip[]
  showContributionsTab: boolean
}

function Av({ src, seed, className = '' }: { src?: string; seed: string; className?: string }) {
  const url = src && src.trim()
    ? photoThumb(src)
    : `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f5f0e8`
  return <img src={url} alt={seed} className={className} loading="lazy" />
}

const fmtMoney = (n: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  } catch { return `${currency} ${n.toLocaleString()}` }
}

export default function PersonPage({ personId }: { personId: string }) {
  const router = useRouter()
  const [person, setPerson] = useState<Person | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [currency, setCurrency] = useState('KES')
  const [tab, setTab] = useState('condolence')
  const [edges, setEdges] = useState<Edge[] | null>(null)
  const [memories, setMemories] = useState<MemoryRow[] | null>(null)
  const [tributes, setTributes] = useState<Tribute[] | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/people/${personId}`).then(r => r.ok ? r.json() : null),
      fetch('/api/me').then(r => r.ok ? r.json() : null),
      fetch('/api/config').then(r => r.ok ? r.json() : null),
    ]).then(([p, m, cfg]) => {
      if (!p) { setNotFound(true); return }
      setPerson(p as Person)
      if (m) setMe(m as Me)
      if (cfg?.currency) setCurrency(cfg.currency)
    }).catch(() => setNotFound(true))
  }, [personId])

  // Lazy-load per tab
  useEffect(() => {
    if (tab === 'tree' && edges === null)
      fetch(`/api/relations?person=${personId}`).then(r => r.ok ? r.json() : []).then(setEdges).catch(() => setEdges([]))
    if (tab === 'memories' && memories === null)
      fetch(`/api/memories?person_id=${personId}`).then(r => r.ok ? r.json() : []).then(setMemories).catch(() => setMemories([]))
    if (tab === 'tribute' && tributes === null)
      fetch(`/api/tributes?person_id=${personId}`).then(r => r.ok ? r.json() : []).then(setTributes).catch(() => setTributes([]))
  }, [tab, personId, edges, memories, tributes])

  if (notFound) return (
    <div className="pp-page"><div className="pp-card">
      <p className="p-empty">Person not found.</p>
      <button className="btn ghost sm" onClick={() => router.push('/')}>← Back to the memorial</button>
    </div></div>
  )
  if (!person) return <div className="pp-page"><div className="pp-card"><p className="p-empty">Loading…</p></div></div>

  const isAdmin = !!me?.isAdmin
  const canSeeTree = !!me?.access.relationTree
  const showMemories = isAdmin || (!!me?.gates.tabs.memories && !!me?.user)
  const showTribute = isAdmin || !!me?.gates.tabs.tribute

  const tabs: Array<{ id: string; label: string }> = [
    { id: 'condolence', label: 'Condolence' },
    ...(canSeeTree ? [{ id: 'tree', label: 'Relation tree' }] : []),
    ...(person.showContributionsTab ? [{ id: 'contributions', label: 'Contributions' }] : []),
    ...(showMemories ? [{ id: 'memories', label: 'Memories' }] : []),
    ...(showTribute ? [{ id: 'tribute', label: 'Tribute' }] : []),
  ]

  return (
    <div className="pp-page">
      <div className="pp-card">
        <button className="pp-back" onClick={() => router.push('/condolences')}>← Back to the memorial</button>

        <div className="pp-hero">
          <div className="pp-av"><Av src={person.photo} seed={person.name} /></div>
          <div className="pp-id">
            <h1 className="pp-name">{person.name}</h1>
            {person.relation && <div className="pp-rel">{person.relation}</div>}
            <div className="pp-chips">
              {person.family_group && <span className="pp-chip">{person.family_group}</span>}
              {person.groups.map(g => (
                <button key={g.id} className="pp-chip pp-chip-link" onClick={() => router.push(`/g/${g.id}`)}>{g.name}</button>
              ))}
            </div>
          </div>
        </div>
        {person.bio && <p className="pp-bio">{person.bio}</p>}

        <div className="pp-tabs">
          {tabs.map(t => (
            <button key={t.id} className={'pp-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'condolence' && (
          <div className="pp-body">
            {person.condolences.length === 0 && <p className="p-empty">No condolence written yet.</p>}
            {person.condolences.map(c => (
              <div className="cond-item" key={c.id}>
                <p className="cond-msg">{c.message}</p>
                <div className="cond-date">{new Date(c.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tree' && (
          <div className="pp-body">
            {edges === null && <p className="p-empty">Loading…</p>}
            {edges !== null && edges.length === 0 && <p className="p-empty">No connections added yet.</p>}
            {edges !== null && edges.length > 0 && (
              <div className="gen">
                {edges.map(e => {
                  const isA = e.person_a === Number(personId)
                  const otherId = isA ? e.person_b : e.person_a
                  const otherName = isA ? (e.b_name ?? 'The deceased') : e.a_name
                  const otherPhoto = (isA ? e.b_photo : e.a_photo) ?? ''
                  return (
                    <div className="node" key={e.id}>
                      <button className="node-av" onClick={() => otherId && router.push(`/p/${otherId}`)}>
                        <Av src={otherPhoto} seed={otherName} />
                      </button>
                      <div className="node-nm">{otherName}</div>
                      {e.relation && <div className="node-rl">{e.relation}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'contributions' && (
          <div className="pp-body">
            {person.contributions.map(c => (
              <div className="p-row" key={c.id} style={{ cursor: 'default' }}>
                <div className="p-info">
                  {c.note && <span className="contrib-note">{c.note}</span>}
                  <span className="p-rel">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <span className="contrib-amt">{fmtMoney(Number(c.amount), currency)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'memories' && (
          <MemoriesTab
            personId={Number(personId)}
            personName={person.name}
            isOwn={person.isOwn}
            isAdmin={isAdmin}
            memories={memories}
            onAdded={mrow => setMemories(ms => [mrow, ...(ms ?? [])])}
          />
        )}

        {tab === 'tribute' && (
          <TributeTab
            personId={Number(personId)}
            canWrite={person.isOwn || isAdmin}
            maxLength={me?.gates.tributeMaxLength ?? 2000}
            tributes={tributes}
            onSaved={t => setTributes([t])}
          />
        )}
      </div>
    </div>
  )
}

/* ── Memories tab ─────────────────────────────────────────────────────────── */

function MemoriesTab({ personId, personName, isOwn, isAdmin, memories, onAdded }: {
  personId: number
  personName: string
  isOwn: boolean
  isAdmin: boolean
  memories: MemoryRow[] | null
  onAdded: (m: MemoryRow) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const add = async () => {
    if (!file) return setErr('Choose a photo first.')
    setErr(''); setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error()
      const { url } = await up.json()
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: url, caption: caption.trim(), added_by: personName, person_id: personId }),
      })
      if (!res.ok) throw new Error()
      onAdded(await res.json())
      setCaption(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setErr('Could not add the memory. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="pp-body">
      {(isOwn || isAdmin) && (
        <div className="pp-mem-add">
          <input ref={fileRef} type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption (optional)" />
          <button className="btn sm" onClick={add} disabled={busy}>{busy ? 'Adding…' : 'Add memory'}</button>
          {err && <p className="form-err">{err}</p>}
        </div>
      )}
      {memories === null && <p className="p-empty">Loading…</p>}
      {memories !== null && memories.length === 0 && <p className="p-empty">No photo memories to show.</p>}
      {memories !== null && memories.length > 0 && (
        <div className="mem-grid">
          {memories.map(m => (
            <div key={m.id} className="mem-tile">
              <div className="mem-img"><img src={photoThumb(m.src)} alt={m.caption || 'Photo memory'} loading="lazy" /></div>
              <div className="mem-cap">
                {m.caption && <span className="mem-caption">{m.caption}</span>}
                {m.added_by && <span className="mem-by">{m.added_by}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Tribute tab ──────────────────────────────────────────────────────────── */

function TributeTab({ personId, canWrite, maxLength, tributes, onSaved }: {
  personId: number
  canWrite: boolean
  maxLength: number
  tributes: Tribute[] | null
  onSaved: (t: Tribute) => void
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const existing = tributes?.[0]

  const save = async () => {
    if (!body.trim()) return setErr('Write something first.')
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/tributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person_id: personId, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved(data)
      setEditing(false)
    } catch (e) {
      setErr((e as Error).message || 'Could not save the tribute.')
    }
    setBusy(false)
  }

  return (
    <div className="pp-body">
      {tributes === null && <p className="p-empty">Loading…</p>}
      {existing && !editing && <p className="pp-tribute">{existing.body}</p>}
      {tributes !== null && !existing && !editing && <p className="p-empty">No tribute written yet.</p>}

      {canWrite && !editing && (
        <button className="btn ghost sm" onClick={() => { setBody(existing?.body ?? ''); setEditing(true) }}>
          {existing ? 'Edit tribute' : 'Write a tribute'}
        </button>
      )}
      {editing && (
        <div className="pp-tribute-edit">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, maxLength))}
            rows={8}
            placeholder="Share a longer tribute…"
          />
          <div className="pp-tribute-count">{body.length} / {maxLength}</div>
          {err && <p className="form-err">{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button className="btn sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save tribute'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
