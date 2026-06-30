'use client'

import { useState, useEffect, useRef } from 'react'
import type { FamilyMember, ProgramEvent } from '@/lib/config'
import { CONFIG } from '@/lib/config'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'basic' | 'people' | 'family' | 'program' | 'feedback'

type BasicInfo = {
  name: string
  born: string
  passed: string
  epitaph: string
  whatsapp: string
  currency: string
  cta: string
  portrait: string
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:       { minHeight: '100vh', background: '#f2ede4', padding: '28px 16px', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#1a1c18' },
  container:  { maxWidth: 780, margin: '0 auto' },
  header:     { marginBottom: 28 },
  title:      { fontSize: '1.55rem', fontWeight: 700, color: '#213029', marginBottom: 4 },
  subtitle:   { fontSize: '.9rem', color: '#5a5f58' },
  tabBar:     { display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap' },
  tabBtn:     { padding: '9px 18px', background: '#e4ddd0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '.85rem', fontWeight: 500, color: '#4a4d46', transition: '.12s' },
  tabActive:  { background: '#213029', color: '#f7f4ee' },
  card:       { background: '#fff', borderRadius: 14, padding: '28px 28px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' },
  sectionH:   { fontSize: '1rem', fontWeight: 700, color: '#213029', marginBottom: 6 },
  sectionSub: { fontSize: '.85rem', color: '#5a5f58', marginBottom: 22 },
  label:      { display: 'block', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6a6d66', marginBottom: 5 },
  input:      { width: '100%', padding: '9px 12px', border: '1px solid #dce0d8', borderRadius: 8, fontSize: '.9rem', outline: 'none', fontFamily: 'inherit', background: '#fafaf8', boxSizing: 'border-box' },
  textarea:   { width: '100%', padding: '9px 12px', border: '1px solid #dce0d8', borderRadius: 8, fontSize: '.9rem', outline: 'none', fontFamily: 'inherit', background: '#fafaf8', resize: 'vertical', minHeight: 72, boxSizing: 'border-box' },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field:      { marginBottom: 16 },
  btn:        { padding: '10px 22px', background: '#213029', color: '#f7f4ee', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 },
  btnGhost:   { padding: '9px 18px', background: 'transparent', color: '#213029', border: '1px solid #ccc', borderRadius: 8, cursor: 'pointer', fontSize: '.84rem', fontWeight: 500 },
  btnDanger:  { padding: '6px 12px', background: 'transparent', color: '#b83c3c', border: '1px solid #e0c0c0', borderRadius: 7, cursor: 'pointer', fontSize: '.78rem' },
  btnSmall:   { padding: '6px 12px', background: '#213029', color: '#f7f4ee', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 },
  statusOk:   { marginLeft: 12, fontSize: '.84rem', color: '#27ae60', fontWeight: 600 },
  statusErr:  { marginLeft: 12, fontSize: '.84rem', color: '#b83c3c', fontWeight: 600 },
  divider:    { borderTop: '1px solid #ede8de', margin: '22px 0' },
  boxItem:    { border: '1px solid #e6e0d4', borderRadius: 10, padding: '16px 18px', marginBottom: 12 },
  genBox:     { background: '#f8f5ed', borderRadius: 10, padding: '16px 18px', marginBottom: 12 },
  genLabel:   { fontSize: '.74rem', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#8a6e3e', marginBottom: 12 },
  memberRow:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  portrait:   { width: 88, height: 88, borderRadius: 12, background: '#ede8de', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },

}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={S.field}><label style={S.label}>{label}</label>{children}</div>
}

function SaveRow({ onSave, status, saving }: { onSave: () => void; status: string; saving?: boolean }) {
  const isOk = status.startsWith('✓')
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, gap: 12 }}>
      <button
        style={{ ...S.btn, opacity: saving ? 0.65 : 1, cursor: saving ? 'default' : 'pointer' }}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      {status && <span style={isOk ? S.statusOk : S.statusErr}>{status}</span>}
    </div>
  )
}

// ─── Root page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab]         = useState<Tab>('basic')
  const [status, setStatus] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const [basic, setBasic] = useState<BasicInfo>({
    name: CONFIG.name, born: CONFIG.born, passed: CONFIG.passed,
    epitaph: CONFIG.epitaph, whatsapp: CONFIG.whatsapp,
    currency: CONFIG.currency, cta: CONFIG.cta, portrait: CONFIG.portrait,
  })
  const [generations, setGenerations] = useState<FamilyMember[][]>(CONFIG.familyTree.generations)
  const [program,     setProgram]     = useState<ProgramEvent[]>(CONFIG.program)
  const [programNote, setProgramNote] = useState(CONFIG.programNote)

  const portraitRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setBasic({
          name:     d.name     ?? CONFIG.name,
          born:     d.born     ?? CONFIG.born,
          passed:   d.passed   ?? CONFIG.passed,
          epitaph:  d.epitaph  ?? CONFIG.epitaph,
          whatsapp: d.whatsapp ?? CONFIG.whatsapp,
          currency: d.currency ?? CONFIG.currency,
          cta:      d.cta      ?? CONFIG.cta,
          portrait: d.portrait ?? CONFIG.portrait,
        })
        if (d.familyTree?.generations?.length)             setGenerations(d.familyTree.generations)
        if (Array.isArray(d.program) && d.program.length) setProgram(d.program)
        if (d.programNote !== undefined)                   setProgramNote(d.programNote)
      })
      .catch(() => {})
  }, [])

  const toast = (key: string, msg: string) => {
    setStatus(s => ({ ...s, [key]: msg }))
    setTimeout(() => setStatus(s => ({ ...s, [key]: '' })), 2500)
  }

  const post = (payload: Record<string, unknown>) =>
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

  const wrap = async (key: string, fn: () => Promise<Response>) => {
    setSaving(s => ({ ...s, [key]: true }))
    try {
      const r = await fn()
      toast(key, r.ok ? '✓ Saved' : '✗ Server error')
    } catch {
      toast(key, '✗ Could not reach server')
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  const saveBasic   = () => wrap('basic',   () => post({
    'cfg.name': basic.name, 'cfg.born': basic.born, 'cfg.passed': basic.passed,
    'cfg.epitaph': basic.epitaph, 'cfg.whatsapp': basic.whatsapp,
    'cfg.currency': basic.currency, 'cfg.cta': basic.cta, 'portrait': basic.portrait,
  }))
  const saveFamily  = () => wrap('family',  () => post({ 'cfg.familyTree': { generations } }))
  const saveProgram = () => wrap('program', () => post({ 'cfg.program': program, 'cfg.programNote': programNote }))

  const uploadPortrait = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'portraits')
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error()
      const { url } = await up.json()
      setBasic(b => ({ ...b, portrait: url }))
      await post({ portrait: url })
      toast('portrait', '✓ Photo uploaded')
    } catch {
      toast('portrait', '✗ Upload failed')
    }
    setUploading(false)
    if (portraitRef.current) portraitRef.current.value = ''
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'basic',    label: 'Basic Info' },
    { id: 'people',   label: 'People' },
    { id: 'family',   label: 'Family Tree' },
    { id: 'program',  label: 'Program' },
    { id: 'feedback', label: 'Feedback' },
  ]

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <h1 style={S.title}>Site Administration</h1>
          <p style={S.subtitle}>Update the content shown on the memorial site. Changes take effect immediately.</p>
        </div>

        <div style={S.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              style={{ ...S.tabBtn, ...(tab === t.id ? S.tabActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={S.card}>
          {tab === 'basic' && (
            <BasicTab
              basic={basic} setBasic={setBasic}
              onSave={saveBasic} status={status.basic ?? ''} saving={!!saving.basic}
              portraitRef={portraitRef} uploadPortrait={uploadPortrait}
              uploading={uploading} portraitStatus={status.portrait ?? ''}
            />
          )}
          {tab === 'people' && (
            <PeopleTab status={status.people ?? ''} />
          )}
          {tab === 'family' && (
            <FamilyTab
              generations={generations} setGenerations={setGenerations}
              onSave={saveFamily} status={status.family ?? ''} saving={!!saving.family}
            />
          )}
          {tab === 'program' && (
            <ProgramTab
              program={program} setProgram={setProgram}
              programNote={programNote} setProgramNote={setProgramNote}
              onSave={saveProgram} status={status.program ?? ''} saving={!!saving.program}
            />
          )}
          {tab === 'feedback' && <FeedbackTab />}
        </div>
      </div>
    </div>
  )
}

// ─── Basic Info tab ──────────────────────────────────────────────────────────

function BasicTab({
  basic, setBasic, onSave, status, saving,
  portraitRef, uploadPortrait, uploading, portraitStatus,
}: {
  basic: BasicInfo
  setBasic: React.Dispatch<React.SetStateAction<BasicInfo>>
  onSave: () => void
  status: string
  saving: boolean
  portraitRef: React.RefObject<HTMLInputElement | null>
  uploadPortrait: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
  portraitStatus: string
}) {
  const set = (k: keyof BasicInfo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setBasic(b => ({ ...b, [k]: e.target.value }))

  return (
    <div>
      <div style={S.sectionH}>Basic Information</div>
      <div style={S.sectionSub}>Core details that appear at the top of the memorial site.</div>

      {/* Portrait */}
      <Field label="Portrait photo">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <div style={S.portrait}>
            {basic.portrait
              ? <img src={basic.portrait} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '.7rem', color: '#aaa', textAlign: 'center', padding: 8 }}>No photo</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <button style={S.btnGhost} onClick={() => portraitRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
            {portraitStatus && <span style={S.statusOk}> {portraitStatus}</span>}
            <input ref={portraitRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPortrait} />
            <p style={{ fontSize: '.75rem', color: '#9a9a9a', margin: '8px 0 5px' }}>Or paste an image URL directly:</p>
            <input style={S.input} type="text" value={basic.portrait} onChange={set('portrait')} placeholder="https://…" />
          </div>
        </div>
      </Field>

      <div style={S.divider} />

      <div style={S.row2}>
        <Field label="Full name of the deceased">
          <input style={S.input} type="text" value={basic.name} onChange={set('name')} placeholder="e.g. John Kamau Mwangi" />
        </Field>
        <Field label="Currency code">
          <input style={S.input} type="text" value={basic.currency} onChange={set('currency')} placeholder="e.g. KES, USD, GBP" />
        </Field>
      </div>

      <div style={S.row2}>
        <Field label="Date of birth">
          <input style={S.input} type="text" value={basic.born} onChange={set('born')} placeholder="e.g. 14 March 1948" />
        </Field>
        <Field label="Date of passing">
          <input style={S.input} type="text" value={basic.passed} onChange={set('passed')} placeholder="e.g. 5 June 2026" />
        </Field>
      </div>

      <Field label="Epitaph / quote">
        <textarea style={S.textarea} value={basic.epitaph} onChange={set('epitaph')} rows={3}
          placeholder="A short phrase or quote to remember them by" />
      </Field>

      <Field label="WhatsApp group invite link">
        <input style={S.input} type="text" value={basic.whatsapp} onChange={set('whatsapp')}
          placeholder="https://chat.whatsapp.com/…" />
      </Field>

      <Field label="Condolence button text">
        <input style={S.input} type="text" value={basic.cta} onChange={set('cta')}
          placeholder="e.g. Write your condolence message" />
      </Field>

      <SaveRow onSave={onSave} status={status} saving={saving} />
    </div>
  )
}

// ─── People tab ──────────────────────────────────────────────────────────────

type DbPerson = { id: number; name: string; relation: string; photo: string; bio: string; family_group?: string; condolence_count?: number; total_contributed?: number }

function PeopleTab({ status }: { status: string }) {
  const [dbPeople, setDbPeople] = useState<DbPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<Record<number, string>>({})

  useEffect(() => {
    fetch('/api/people')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setDbPeople(data as DbPerson[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const updatePerson = async (id: number, field: 'photo' | 'bio' | 'relation', value: string) => {
    setSaveStatus(s => ({ ...s, [id]: '…' }))
    try {
      const r = await fetch(`/api/people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      setSaveStatus(s => ({ ...s, [id]: r.ok ? '✓ Saved' : '✗ Error' }))
      setTimeout(() => setSaveStatus(s => ({ ...s, [id]: '' })), 2000)
    } catch {
      setSaveStatus(s => ({ ...s, [id]: '✗ Error' }))
    }
  }

  const fmt = (n?: number) => n ? `KES ${Number(n).toLocaleString()}` : null

  return (
    <div>
      <div style={S.sectionH}>People</div>
      <div style={S.sectionSub}>
        Everyone who is in the database — family, friends, contributors, and condolence writers.
      </div>

      {loading && <p style={{ color: '#888', fontSize: '.88rem' }}>Loading…</p>}

      {dbPeople.map(p => (
        <div key={p.id} style={{ ...S.boxItem, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#ede8de', border: '1px solid #dce0d8' }}>
            {p.photo
              ? <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=f5f0e8`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: '.94rem', color: '#213029' }}>{p.name}</div>
            <div style={{ fontSize: '.76rem', color: '#8a6e3e', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              {p.relation || 'Friend'}
              {p.family_group && <span style={{ marginLeft: 8, background: 'rgba(212,166,90,.15)', padding: '1px 7px', borderRadius: 4, fontWeight: 600 }}>{p.family_group}</span>}
              {p.condolence_count ? <span style={{ marginLeft: 8, color: '#aaa' }}>{p.condolence_count} condolence{p.condolence_count !== 1 ? 's' : ''}</span> : null}
              {fmt(p.total_contributed) ? <span style={{ marginLeft: 8, color: '#aaa' }}>{fmt(p.total_contributed)}</span> : null}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                style={{ ...S.input, flex: 1, minWidth: 160, fontSize: '.82rem', padding: '6px 10px' }}
                defaultValue={p.bio || ''}
                placeholder="Bio (optional)"
                onBlur={e => { if (e.target.value !== (p.bio || '')) updatePerson(p.id, 'bio', e.target.value) }}
              />
              <input
                style={{ ...S.input, width: 160, fontSize: '.82rem', padding: '6px 10px' }}
                defaultValue={p.photo || ''}
                placeholder="Photo URL"
                onBlur={e => { if (e.target.value !== (p.photo || '')) updatePerson(p.id, 'photo', e.target.value) }}
              />
            </div>
            {saveStatus[p.id] && (
              <span style={{ fontSize: '.76rem', color: saveStatus[p.id].startsWith('✓') ? '#27ae60' : '#b83c3c', marginTop: 4, display: 'block' }}>
                {saveStatus[p.id]}
              </span>
            )}
          </div>
        </div>
      ))}

      {!loading && dbPeople.length === 0 && (
        <p style={{ color: '#888', fontSize: '.88rem', padding: '20px 0' }}>
          No people in the database yet. They appear here when condolences are written or contributions are added.
        </p>
      )}
      {status && <span style={S.statusOk}>{status}</span>}
    </div>
  )
}

// ─── Family Tree tab ─────────────────────────────────────────────────────────

const GEN_LABELS = [
  'Grandparents / Great-grandparents',
  'Parents & siblings',
  'The deceased & spouse',
  'Children',
  'Grandchildren',
  'Great-grandchildren',
]

function emptyMember(): FamilyMember {
  return { name: '', relation: '', photo: '' }
}

function FamilyTab({
  generations, setGenerations, onSave, status, saving,
}: {
  generations: FamilyMember[][]
  setGenerations: React.Dispatch<React.SetStateAction<FamilyMember[][]>>
  onSave: () => void
  status: string
  saving: boolean
}) {
  const updMember = (gi: number, mi: number, k: keyof FamilyMember, v: unknown) =>
    setGenerations(gs => gs.map((g, i) =>
      i === gi ? g.map((m, j) => j === mi ? { ...m, [k]: v } : m) : g
    ))

  const addMember  = (gi: number) =>
    setGenerations(gs => gs.map((g, i) => i === gi ? [...g, emptyMember()] : g))

  const delMember  = (gi: number, mi: number) =>
    setGenerations(gs => gs.map((g, i) => i === gi ? g.filter((_, j) => j !== mi) : g))

  const addGen = () => setGenerations(gs => [...gs, [emptyMember()]])
  const delGen = (gi: number) => setGenerations(gs => gs.filter((_, i) => i !== gi))

  return (
    <div>
      <div style={S.sectionH}>Family Tree</div>
      <div style={S.sectionSub}>
        Each row is a generation. Tick &ldquo;Deceased&rdquo; on the person this memorial is for.
        Photo URLs are optional — leave blank to show a placeholder.
      </div>

      {generations.map((gen, gi) => (
        <div key={gi} style={S.genBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={S.genLabel}>{GEN_LABELS[gi] ?? `Generation ${gi + 1}`}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnSmall} onClick={() => addMember(gi)}>+ Add person</button>
              <button style={S.btnDanger} onClick={() => delGen(gi)}>Remove row</button>
            </div>
          </div>

          {gen.map((m, mi) => (
            <div key={mi} style={S.memberRow}>
              <input
                style={{ ...S.input, flex: '2 1 120px' }}
                value={m.name}
                onChange={e => updMember(gi, mi, 'name', e.target.value)}
                placeholder="Name"
              />
              <input
                style={{ ...S.input, flex: '1 1 90px' }}
                value={m.relation}
                onChange={e => updMember(gi, mi, 'relation', e.target.value)}
                placeholder="Relation"
                disabled={!!m.self}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.8rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!m.self}
                  onChange={e => updMember(gi, mi, 'self', e.target.checked || undefined)}
                />
                Deceased
              </label>
              <input
                style={{ ...S.input, flex: '2 1 120px' }}
                value={m.photo ?? ''}
                onChange={e => updMember(gi, mi, 'photo', e.target.value)}
                placeholder="Photo URL (optional)"
              />
              <button style={{ ...S.btnDanger, flexShrink: 0 }} onClick={() => delMember(gi, mi)}>✕</button>
            </div>
          ))}
        </div>
      ))}

      <button style={S.btnGhost} onClick={addGen}>+ Add generation row</button>
      <div style={S.divider} />
      <SaveRow onSave={onSave} status={status} saving={saving} />
    </div>
  )
}

// ─── Feedback tab ────────────────────────────────────────────────────────────

type FeedbackRow = { id: number; name: string; message: string; created_at: string }

function FeedbackTab() {
  const [rows, setRows]       = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/feedback')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRows(data as FeedbackRow[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div style={S.sectionH}>Feedback</div>
      <div style={S.sectionSub}>Messages submitted through the feedback form.</div>

      {loading && <p style={{ color: '#888', fontSize: '.88rem' }}>Loading…</p>}

      {!loading && rows.length === 0 && (
        <p style={{ color: '#888', fontSize: '.88rem', padding: '20px 0' }}>No feedback submitted yet.</p>
      )}

      {rows.map(r => (
        <div key={r.id} style={{ ...S.boxItem, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '.94rem', color: '#213029' }}>{r.name}</span>
            <span style={{ fontSize: '.75rem', color: '#9a9a9a' }}>{fmt(r.created_at)}</span>
          </div>
          <p style={{ margin: 0, fontSize: '.88rem', color: '#3a3d36', lineHeight: 1.6 }}>{r.message}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Program tab ─────────────────────────────────────────────────────────────

function emptyEvent(): ProgramEvent {
  return { title: '', date: '', time: '', venue: '', address: '', mapUrl: '', note: '' }
}

function ProgramTab({
  program, setProgram, programNote, setProgramNote, onSave, status, saving,
}: {
  program: ProgramEvent[]
  setProgram: React.Dispatch<React.SetStateAction<ProgramEvent[]>>
  programNote: string
  setProgramNote: (v: string) => void
  onSave: () => void
  status: string
  saving: boolean
}) {
  const upd = (i: number, k: keyof ProgramEvent, v: string) =>
    setProgram(ps => ps.map((p, j) => j === i ? { ...p, [k]: v } : p))

  const add = () => setProgram(ps => [...ps, emptyEvent()])
  const del = (i: number) => setProgram(ps => ps.filter((_, j) => j !== i))

  return (
    <div>
      <div style={S.sectionH}>Program &amp; Events</div>
      <div style={S.sectionSub}>
        The funeral programme — prayer services, vigil, burial, etc. These appear in the &ldquo;Program&rdquo; section.
      </div>

      {program.map((ev, i) => (
        <div key={i} style={S.boxItem}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <input
              style={{ ...S.input, flex: 1, fontWeight: 600 }}
              value={ev.title}
              onChange={e => upd(i, 'title', e.target.value)}
              placeholder="Event title (e.g. Evening Prayer Service)"
            />
            <button style={{ ...S.btnDanger, flexShrink: 0 }} onClick={() => del(i)}>Remove</button>
          </div>

          <div style={S.row2}>
            <Field label="Date">
              <input style={S.input} type="date" value={ev.date} onChange={e => upd(i, 'date', e.target.value)} />
            </Field>
            <Field label="Time">
              <input style={S.input} type="text" value={ev.time} onChange={e => upd(i, 'time', e.target.value)}
                placeholder="e.g. 6:00 PM – 8:00 PM" />
            </Field>
          </div>

          <div style={S.row2}>
            <Field label="Venue name">
              <input style={S.input} type="text" value={ev.venue} onChange={e => upd(i, 'venue', e.target.value)}
                placeholder="e.g. Family Home" />
            </Field>
            <Field label="Address">
              <input style={S.input} type="text" value={ev.address} onChange={e => upd(i, 'address', e.target.value)}
                placeholder="e.g. 123 Riverside Drive, Nairobi" />
            </Field>
          </div>

          <Field label="Note (optional)">
            <input style={S.input} type="text" value={ev.note} onChange={e => upd(i, 'note', e.target.value)}
              placeholder="e.g. All are welcome" />
          </Field>

          <Field label="Google Maps URL (optional — auto-generated from address if blank)">
            <input style={S.input} type="text" value={ev.mapUrl} onChange={e => upd(i, 'mapUrl', e.target.value)}
              placeholder="https://maps.google.com/…" />
          </Field>
        </div>
      ))}

      <button style={S.btnGhost} onClick={add}>+ Add event</button>

      <div style={S.divider} />

      <Field label="Programme footer note">
        <textarea style={S.textarea} value={programNote} rows={2}
          onChange={e => setProgramNote(e.target.value)}
          placeholder="e.g. Burial arrangements are still being finalised." />
      </Field>

      <SaveRow onSave={onSave} status={status} saving={saving} />
    </div>
  )
}
