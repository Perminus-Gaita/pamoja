'use client'

import { useState, useEffect, useRef } from 'react'
import type { FamilyMember, ProgramEvent, SocialLink } from '@/lib/config'
import { CONFIG } from '@/lib/config'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdminTab = 'basic' | 'people' | 'moderation' | 'family' | 'program' | 'feedback' | 'memorials'
  | 'access' | 'admins' | 'social' | 'groups' | 'relations' | 'ai'
type Tab = AdminTab

export const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'basic',      label: 'Basic Info' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'people',     label: 'People' },
  { id: 'family',     label: 'Family Tree (legacy)' },
  { id: 'relations',  label: 'Relation Tree' },
  { id: 'groups',     label: 'Groups' },
  { id: 'program',    label: 'Program' },
  { id: 'access',     label: 'Auth & Access' },
  { id: 'admins',     label: 'Admins' },
  { id: 'social',     label: 'Social Links' },
  { id: 'feedback',   label: 'Feedback' },
  { id: 'memorials',  label: 'Memorial Requests' },
  { id: 'ai',         label: 'AI Assistant' },
]

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

export function AdminTabContent({ tab }: { tab: AdminTab }) {
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

  return (
    <div style={S.card}>
          {tab === 'basic' && (
            <>
              <BasicTab
                basic={basic} setBasic={setBasic}
                onSave={saveBasic} status={status.basic ?? ''} saving={!!saving.basic}
                portraitRef={portraitRef} uploadPortrait={uploadPortrait}
                uploading={uploading} portraitStatus={status.portrait ?? ''}
              />
              <ListingToggle />
            </>
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
          {tab === 'memorials' && <MemorialsTab />}
          {tab === 'access' && <AccessTab />}
          {tab === 'admins' && <AdminsTab />}
          {tab === 'social' && <SocialTab />}
          {tab === 'groups' && <GroupsTab />}
          {tab === 'relations' && <RelationsTab />}
          {tab === 'moderation' && <ModerationTab />}
          {tab === 'ai' && <AiTab />}
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

// ─── Memorial requests tab ───────────────────────────────────────────────────

type MemorialRow = {
  id: number
  slug: string
  name: string
  born: string
  passed: string
  status: string
  contact_name: string
  contact_phone: string
  contact_email: string
  created_at: string
}

function MemorialsTab() {
  const [rows, setRows]       = useState<MemorialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<number | null>(null)

  const load = () => {
    fetch('/api/memorials?status=all')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRows(data as MemorialRow[]); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(load, [])

  const setStatus = async (id: number, status: string) => {
    setBusy(id)
    await fetch(`/api/memorials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusy(null)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Remove this memorial request permanently?')) return
    setBusy(id)
    await fetch(`/api/memorials/${id}`, { method: 'DELETE' })
    setBusy(null)
    load()
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })

  const pending  = rows.filter(r => r.status === 'pending')
  const approved = rows.filter(r => r.status === 'approved')

  const renderRow = (r: MemorialRow) => (
    <div key={r.id} style={S.boxItem}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: '.96rem', color: '#213029' }}>{r.name}</span>
        <span style={{ fontSize: '.75rem', color: '#9a9a9a' }}>{fmt(r.created_at)}</span>
      </div>
      <p style={{ margin: '0 0 4px', fontSize: '.84rem', color: '#3a3d36' }}>
        {(r.born || r.passed) ? `${r.born || '?'} — ${r.passed || '?'}` : 'No dates provided'}
        {' · '}subdomain: <code>{r.slug}</code>
      </p>
      {(r.contact_name || r.contact_phone || r.contact_email) && (
        <p style={{ margin: '0 0 10px', fontSize: '.84rem', color: '#5a5f58' }}>
          Contact: {r.contact_name}{r.contact_phone ? ` · ${r.contact_phone}` : ''}{r.contact_email ? ` · ${r.contact_email}` : ''}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {r.status === 'pending' ? (
          <button style={S.btnSmall} disabled={busy === r.id} onClick={() => setStatus(r.id, 'approved')}>
            {busy === r.id ? 'Working…' : 'Approve'}
          </button>
        ) : (
          <button style={S.btnGhost} disabled={busy === r.id} onClick={() => setStatus(r.id, 'pending')}>
            {busy === r.id ? 'Working…' : 'Unpublish'}
          </button>
        )}
        <button style={S.btnDanger} disabled={busy === r.id} onClick={() => remove(r.id)}>Remove</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={S.sectionH}>Memorial Requests</div>
      <div style={S.sectionSub}>
        Requests submitted from the landing page. Approving a request lists it on the landing grid;
        contact the requester on the details shown to set up their memorial.
      </div>

      {loading && <p style={{ color: '#888', fontSize: '.88rem' }}>Loading…</p>}

      {!loading && (
        <>
          <div style={S.genLabel}>Pending ({pending.length})</div>
          {pending.length === 0 && <p style={{ color: '#888', fontSize: '.88rem', padding: '4px 0 16px' }}>No pending requests.</p>}
          {pending.map(renderRow)}

          <div style={S.divider} />

          <div style={S.genLabel}>Approved ({approved.length})</div>
          {approved.map(renderRow)}
        </>
      )}
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

// ─── Auth & Access tab ───────────────────────────────────────────────────────

const ALL_PROVIDERS = ['google','facebook','twitter','linkedin','tiktok','github','apple','microsoft','discord','spotify','twitch','reddit']
const AREAS = [
  { id: 'relation_tree', label: 'Relation tree' },
  { id: 'program',       label: 'Program' },
  { id: 'contributions', label: 'Contributions' },
]

type UserRow = {
  id: string
  name: string
  email: string
  image: string | null
  role: string | null
  permissions: string[] | null
  grants: string[]
  isOwner: boolean
}

function AccessTab() {
  const [s, setS] = useState<Record<string, string>>({})
  const [configured, setConfigured] = useState<string[]>([])
  const [enabled, setEnabled] = useState<string[] | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : {}) as Promise<Record<string, string>>,
      fetch('/api/auth-config').then(r => r.ok ? r.json() : {}) as Promise<{ configured?: string[]; enabled?: string[] | null }>,
      fetch('/api/users').then(r => r.ok ? r.json() : []) as Promise<UserRow[]>,
    ]).then(([settings, auth, u]) => {
      setS(settings)
      setConfigured(auth.configured ?? [])
      setEnabled(auth.enabled ?? null)
      setUsers(u)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const save = async (key: string, value: string) => {
    setS(prev => ({ ...prev, [key]: value }))
    const r = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    toast(r.ok ? '✓ Saved' : '✗ Error')
  }

  const toggleProvider = async (p: string) => {
    const current = enabled ?? configured
    const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p]
    setEnabled(next)
    await save('auth.providers', JSON.stringify(next))
  }

  const toggleGrant = async (u: UserRow, area: string) => {
    const has = u.grants.includes(area)
    const r = await fetch('/api/access-grants', {
      method: has ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, area }),
    })
    if (r.ok) {
      setUsers(us => us.map(x => x.id === u.id
        ? { ...x, grants: has ? x.grants.filter(a => a !== area) : [...x.grants, area] }
        : x))
      toast('✓ Saved')
    } else toast('✗ Error')
  }

  const val = (key: string, dflt: string) => s[key] ?? dflt
  const Sel = ({ k, dflt, opts }: { k: string; dflt: string; opts: [string, string][] }) => (
    <select style={{ ...S.input, width: 'auto' }} value={val(k, dflt)} onChange={e => save(k, e.target.value)}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )

  if (loading) return <p style={{ color: '#888', fontSize: '.88rem' }}>Loading…</p>

  return (
    <div>
      <div style={S.sectionH}>Authentication &amp; Access</div>
      <div style={S.sectionSub}>Who can sign in, and who can see each section. {msg && <span style={S.statusOk}>{msg}</span>}</div>

      <Field label="Writing condolences">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '.88rem' }}>
          <input
            type="checkbox"
            checked={val('access.condolencesRequireAuth', 'false') === 'true'}
            onChange={e => save('access.condolencesRequireAuth', e.target.checked ? 'true' : 'false')}
          />
          Require visitors to sign in before writing a condolence (off by default)
        </label>
      </Field>

      <div style={S.row2}>
        <Field label="Contributions section is visible to">
          <Sel k="access.contributions" dflt="admins" opts={[['admins','Admins only'],['authenticated','Signed-in visitors'],['whitelisted','Whitelisted users only']]} />
        </Field>
        <Field label="Relation tree is visible to">
          <Sel k="access.relationTree" dflt="authenticated" opts={[['authenticated','Any signed-in visitor'],['approved','Pre-approved users only']]} />
        </Field>
      </div>
      <div style={S.row2}>
        <Field label="Program is visible to">
          <Sel k="access.program" dflt="authenticated" opts={[['authenticated','Any signed-in visitor'],['approved','Pre-approved users only']]} />
        </Field>
        <div />
      </div>

      <div style={S.divider} />
      <div style={S.sectionH}>Profile tabs</div>
      <div style={S.sectionSub}>Extra tabs on visitor profile pages.</div>
      <div style={S.row2}>
        <Field label="Contributions tab">
          <Sel k="tabs.contributions" dflt="off" opts={[['off','Off'],['on','On (shown to those who can see contributions)']]} />
        </Field>
        <Field label="Memories tab (photo memories)">
          <Sel k="tabs.memories" dflt="off" opts={[['off','Off'],['on','On']]} />
        </Field>
      </div>
      <div style={S.row2}>
        <Field label="Whose memories can a signed-in visitor see">
          <Sel k="access.memoriesScope" dflt="own" opts={[['own','Only their own'],['group','Their own + their groups'],['all','Everyone’s']]} />
        </Field>
        <Field label="Tribute tab">
          <Sel k="tabs.tribute" dflt="off" opts={[['off','Off'],['on','On']]} />
        </Field>
      </div>
      <div style={S.row2}>
        <Field label="Who can read tributes">
          <Sel k="access.tribute" dflt="authenticated" opts={[['authenticated','Signed-in visitors'],['everyone','Everyone']]} />
        </Field>
        <Field label="Tribute max length (characters)">
          <input
            style={S.input}
            type="number"
            defaultValue={val('tribute.maxLength', '2000')}
            onBlur={e => save('tribute.maxLength', e.target.value || '2000')}
          />
        </Field>
      </div>

      <div style={S.divider} />
      <div style={S.sectionH}>Sign-in providers</div>
      <div style={S.sectionSub}>
        A provider becomes available once you set its credentials in the environment
        (e.g. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) — see .env.example. Untick to hide a configured provider.
        Email + password sign-in is always available.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
        {ALL_PROVIDERS.map(p => {
          const isConfigured = configured.includes(p)
          const isEnabled = (enabled ?? configured).includes(p)
          return (
            <label key={p} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: '.85rem', opacity: isConfigured ? 1 : 0.45 }}>
              <input type="checkbox" disabled={!isConfigured} checked={isConfigured && isEnabled} onChange={() => toggleProvider(p)} />
              <span style={{ textTransform: 'capitalize' }}>{p}</span>
              {!isConfigured && <span style={{ fontSize: '.7rem', color: '#999' }}>no env keys</span>}
            </label>
          )
        })}
      </div>

      <div style={S.divider} />
      <div style={S.sectionH}>Pre-approved users (whitelist)</div>
      <div style={S.sectionSub}>Used when a section above is set to &ldquo;pre-approved&rdquo; or &ldquo;whitelisted&rdquo;.</div>
      {users.length === 0 && <p style={{ color: '#888', fontSize: '.88rem' }}>No user accounts yet.</p>}
      {users.map(u => (
        <div key={u.id} style={{ ...S.boxItem, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{u.name}</div>
            <div style={{ fontSize: '.78rem', color: '#888' }}>{u.email}</div>
          </div>
          {AREAS.map(a => (
            <label key={a.id} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: '.8rem' }}>
              <input type="checkbox" checked={u.grants.includes(a.id)} onChange={() => toggleGrant(u, a.id)} />
              {a.label}
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Admins tab ──────────────────────────────────────────────────────────────

const ADMIN_PERMISSIONS = [
  'settings','people','condolences','contributions','memorials',
  'admins','access','groups','relations','tributes','memories','ai',
]

function AdminsTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = () => {
    fetch('/api/users')
      .then(r => r.ok ? r.json() : [])
      .then(u => { setUsers(u); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(load, [])

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const patch = async (userId: string, admin: boolean, permissions?: string[]) => {
    const r = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, admin, permissions }),
    })
    const d = await r.json().catch(() => ({}))
    toast(r.ok ? '✓ Saved' : `✗ ${d.error ?? 'Error'}`)
    load()
  }

  const togglePermission = (u: UserRow, p: string) => {
    const current = u.permissions?.includes('*') ? [...ADMIN_PERMISSIONS] : (u.permissions ?? [])
    const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p]
    patch(u.id, true, next.length === ADMIN_PERMISSIONS.length ? ['*'] : next)
  }

  const isAdminRow = (u: UserRow) => u.isOwner || u.role === 'admin'
  const hasPerm = (u: UserRow, p: string) =>
    u.isOwner || u.permissions?.includes('*') || u.permissions?.includes(p)

  return (
    <div>
      <div style={S.sectionH}>Administrators</div>
      <div style={S.sectionSub}>
        Grant other users admin powers and choose exactly what each admin can manage.
        Owners come from the ADMIN_EMAILS environment variable and always have full power.
        {msg && <span style={S.statusOk}>{msg}</span>}
      </div>

      {loading && <p style={{ color: '#888', fontSize: '.88rem' }}>Loading…</p>}
      {!loading && users.length === 0 && <p style={{ color: '#888', fontSize: '.88rem' }}>No user accounts yet — users appear here after they sign up.</p>}

      {users.map(u => (
        <div key={u.id} style={S.boxItem}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: isAdminRow(u) ? 10 : 0 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                {u.name}
                {u.isOwner && <span style={{ marginLeft: 8, fontSize: '.7rem', background: '#213029', color: '#f7f4ee', padding: '2px 8px', borderRadius: 5 }}>OWNER</span>}
                {!u.isOwner && u.role === 'admin' && <span style={{ marginLeft: 8, fontSize: '.7rem', background: 'rgba(212,166,90,.25)', color: '#8a6e3e', padding: '2px 8px', borderRadius: 5 }}>ADMIN</span>}
              </div>
              <div style={{ fontSize: '.78rem', color: '#888' }}>{u.email}</div>
            </div>
            {!u.isOwner && (
              isAdminRow(u)
                ? <button style={S.btnDanger} onClick={() => patch(u.id, false)}>Remove admin</button>
                : <button style={S.btnSmall} onClick={() => patch(u.id, true, ['*'])}>Make admin</button>
            )}
          </div>
          {isAdminRow(u) && !u.isOwner && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ADMIN_PERMISSIONS.map(p => (
                <label key={p} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '.78rem' }}>
                  <input type="checkbox" checked={!!hasPerm(u, p)} onChange={() => togglePermission(u, p)} />
                  {p}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Social links tab ────────────────────────────────────────────────────────

const PLATFORMS = ['whatsapp','telegram','discord','facebook','x','instagram','signal','other']

function SocialTab() {
  const [links, setLinks] = useState<SocialLink[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : {})
      .then((d: { socialLinks?: SocialLink[] }) => { setLinks(d.socialLinks ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const upd = (i: number, k: keyof SocialLink, v: string) =>
    setLinks(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l))

  const save = async () => {
    setSaving(true)
    const clean = links.filter(l => l.url.trim())
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'cfg.socialLinks': clean }),
    })
    setMsg(r.ok ? '✓ Saved' : '✗ Error')
    setTimeout(() => setMsg(''), 2500)
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#888', fontSize: '.88rem' }}>Loading…</p>

  return (
    <div>
      <div style={S.sectionH}>Community links</div>
      <div style={S.sectionSub}>
        Links shown in the sidebar — WhatsApp group, Telegram, Discord, or anything else the family uses.
      </div>

      {links.map((l, i) => (
        <div key={i} style={S.memberRow}>
          <select style={{ ...S.input, flex: '0 0 130px' }} value={l.platform} onChange={e => upd(i, 'platform', e.target.value)}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input style={{ ...S.input, flex: '1 1 140px' }} value={l.label} onChange={e => upd(i, 'label', e.target.value)} placeholder="Label, e.g. Join the WhatsApp group" />
          <input style={{ ...S.input, flex: '2 1 180px' }} value={l.url} onChange={e => upd(i, 'url', e.target.value)} placeholder="https://…" />
          <button style={{ ...S.btnDanger, flexShrink: 0 }} onClick={() => setLinks(ls => ls.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}

      <button style={S.btnGhost} onClick={() => setLinks(ls => [...ls, { platform: 'whatsapp', label: 'Join the WhatsApp group', url: '' }])}>
        + Add link
      </button>
      <div style={S.divider} />
      <SaveRow onSave={save} status={msg} saving={saving} />
    </div>
  )
}

// ─── Groups tab ──────────────────────────────────────────────────────────────

type GroupRow = { id: number; name: string; description: string; member_count: number }
type Member = { id: number; name: string }

function GroupsTab() {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [people, setPeople] = useState<DbPerson[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addPerson, setAddPerson] = useState('')
  const [msg, setMsg] = useState('')

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }
  const load = () => {
    fetch('/api/groups').then(r => r.ok ? r.json() : []).then(setGroups).catch(() => {})
    fetch('/api/people').then(r => r.ok ? r.json() : []).then(setPeople).catch(() => {})
  }
  useEffect(load, [])

  const openGroup = async (id: number) => {
    setOpen(id)
    const g = await fetch(`/api/groups/${id}`).then(r => r.ok ? r.json() : null)
    setMembers(g?.members ?? [])
  }

  const create = async () => {
    if (!newName.trim()) return
    const r = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
    })
    toast(r.ok ? '✓ Group created' : '✗ Error')
    setNewName(''); setNewDesc('')
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this group? People in it are not deleted.')) return
    await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (open === id) setOpen(null)
    load()
  }

  const patchMember = async (groupId: number, key: 'add_person_id' | 'remove_person_id', personId: number) => {
    const r = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: personId }),
    })
    toast(r.ok ? '✓ Saved' : '✗ Error')
    openGroup(groupId)
    load()
  }

  return (
    <div>
      <div style={S.sectionH}>Groups</div>
      <div style={S.sectionSub}>
        Groups of people — e.g. &ldquo;Class of 2012&rdquo;. Groups appear on the relation tree, and
        each has a page collecting the members&rsquo; condolences. {msg && <span style={S.statusOk}>{msg}</span>}
      </div>

      <div style={S.memberRow}>
        <input style={{ ...S.input, flex: '1 1 140px' }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name, e.g. Class of 2012" />
        <input style={{ ...S.input, flex: '2 1 160px' }} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" />
        <button style={S.btnSmall} onClick={create}>+ Create group</button>
      </div>
      <div style={S.divider} />

      {groups.length === 0 && <p style={{ color: '#888', fontSize: '.88rem' }}>No groups yet.</p>}
      {groups.map(g => (
        <div key={g.id} style={S.boxItem}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{g.name}</div>
              <div style={{ fontSize: '.78rem', color: '#888' }}>{g.member_count} member{g.member_count !== 1 ? 's' : ''}{g.description ? ` · ${g.description}` : ''}</div>
            </div>
            <button style={S.btnGhost} onClick={() => open === g.id ? setOpen(null) : openGroup(g.id)}>
              {open === g.id ? 'Close' : 'Manage members'}
            </button>
            <button style={S.btnDanger} onClick={() => remove(g.id)}>Delete</button>
          </div>
          {open === g.id && (
            <div style={{ marginTop: 12 }}>
              <div style={S.memberRow}>
                <select style={{ ...S.input, flex: 1 }} value={addPerson} onChange={e => setAddPerson(e.target.value)}>
                  <option value="">Select a person to add…</option>
                  {people.filter(p => !members.some(m => m.id === p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button style={S.btnSmall} disabled={!addPerson} onClick={() => { patchMember(g.id, 'add_person_id', Number(addPerson)); setAddPerson('') }}>Add</button>
              </div>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: '.86rem' }}>
                  <span style={{ flex: 1 }}>{m.name}</span>
                  <button style={S.btnDanger} onClick={() => patchMember(g.id, 'remove_person_id', m.id)}>Remove</button>
                </div>
              ))}
              {members.length === 0 && <p style={{ color: '#888', fontSize: '.82rem' }}>No members yet.</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Relation tree tab ───────────────────────────────────────────────────────

type EdgeRow = {
  id: number
  person_a: number
  person_b: number | null
  relation: string
  a_name: string
  b_name: string | null
}

function RelationsTab() {
  const [edges, setEdges] = useState<EdgeRow[]>([])
  const [people, setPeople] = useState<DbPerson[]>([])
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [rel, setRel] = useState('')
  const [msg, setMsg] = useState('')

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }
  const load = () => {
    fetch('/api/relations?all=1').then(r => r.ok ? r.json() : []).then(setEdges).catch(() => {})
    fetch('/api/people').then(r => r.ok ? r.json() : []).then(setPeople).catch(() => {})
  }
  useEffect(load, [])

  const add = async () => {
    if (!a) return toast('✗ Pick a person')
    const r = await fetch('/api/relations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_a: Number(a), person_b: b ? Number(b) : null, relation: rel.trim() }),
    })
    toast(r.ok ? '✓ Added' : '✗ Error')
    setA(''); setB(''); setRel('')
    load()
  }

  const del = async (id: number) => {
    await fetch('/api/relations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  return (
    <div>
      <div style={S.sectionH}>Relation Tree</div>
      <div style={S.sectionSub}>
        Connections between people. An edge reads &ldquo;A is &lt;relation&gt; of B&rdquo;.
        Leave B as &ldquo;the deceased&rdquo; to place someone in the deceased&rsquo;s immediate circle
        (the root view of the tree). {msg && <span style={S.statusOk}>{msg}</span>}
      </div>

      <div style={S.memberRow}>
        <select style={{ ...S.input, flex: '1 1 130px' }} value={a} onChange={e => setA(e.target.value)}>
          <option value="">Person A…</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input style={{ ...S.input, flex: '1 1 100px' }} value={rel} onChange={e => setRel(e.target.value)} placeholder="is … of (e.g. Brother)" />
        <select style={{ ...S.input, flex: '1 1 130px' }} value={b} onChange={e => setB(e.target.value)}>
          <option value="">the deceased</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button style={S.btnSmall} onClick={add}>+ Add</button>
      </div>
      <div style={S.divider} />

      {edges.length === 0 && <p style={{ color: '#888', fontSize: '.88rem' }}>No connections yet — the tree falls back to the legacy Family Tree rows until you add some.</p>}
      {edges.map(e => (
        <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: '.88rem', borderBottom: '1px solid #f0ece2' }}>
          <span style={{ flex: 1 }}>
            <strong>{e.a_name}</strong>
            {e.relation ? ` is ${e.relation} of ` : ' — '}
            <strong>{e.b_name ?? 'the deceased'}</strong>
          </span>
          <button style={S.btnDanger} onClick={() => del(e.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── AI assistant tab ────────────────────────────────────────────────────────

function AiTab() {
  const [msgs, setMsgs] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    const q = input.trim()
    if (!q || busy) return
    const next = [...msgs, { role: 'user' as const, content: q }]
    setMsgs(next)
    setInput('')
    setBusy(true)
    try {
      const r = await fetch('/api/ai/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const d = await r.json()
      setMsgs(m => [...m, { role: 'assistant', content: r.ok ? d.answer : (d.error ?? 'Something went wrong.') }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setBusy(false)
  }

  return (
    <div>
      <div style={S.sectionH}>AI Assistant</div>
      <div style={S.sectionSub}>
        Ask for data analysis (&ldquo;how many condolences this week?&rdquo;), record contributions
        (&ldquo;add KES 5,000 from Jane Doe, a cousin&rdquo;), or grant access
        (&ldquo;give jane@example.com access to the program&rdquo;). Requires ANTHROPIC_API_KEY.
      </div>

      <div style={{ border: '1px solid #e6e0d4', borderRadius: 10, padding: 14, minHeight: 220, maxHeight: 420, overflowY: 'auto', marginBottom: 12, background: '#fafaf8' }}>
        {msgs.length === 0 && <p style={{ color: '#aaa', fontSize: '.85rem' }}>Start a conversation…</p>}
        {msgs.map((m, i) => (
          <div key={i} style={{
            margin: '8px 0', padding: '9px 13px', borderRadius: 10, fontSize: '.88rem', lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            background: m.role === 'user' ? '#213029' : '#fff',
            color: m.role === 'user' ? '#f7f4ee' : '#1a1c18',
            border: m.role === 'user' ? 'none' : '1px solid #e6e0d4',
            marginLeft: m.role === 'user' ? 60 : 0,
            marginRight: m.role === 'user' ? 0 : 60,
          }}>{m.content}</div>
        ))}
        {busy && <div style={{ color: '#888', fontSize: '.85rem', padding: '8px 0' }}>Thinking…</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...S.input, flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask the assistant…"
        />
        <button style={S.btn} onClick={send} disabled={busy}>{busy ? '…' : 'Send'}</button>
      </div>
    </div>
  )
}

// ─── Directory listing toggle (Basic Info) ───────────────────────────────────

function ListingToggle() {
  const [memorial, setMemorial] = useState<{ id: number; status: string } | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/memorials?status=all')
      .then(r => r.ok ? r.json() : [])
      .then((rows: Array<{ id: number; slug: string; status: string }>) => {
        // The primary memorial is hydrated with settings data server-side and
        // is the earliest approved row; the owner manages their own instance,
        // so pick the first row (single-tenant deployment).
        if (rows.length > 0) setMemorial({ id: rows[0].id, status: rows[0].status })
      })
      .catch(() => {})
  }, [])

  if (!memorial) return null

  const toggle = async (listed: boolean) => {
    const r = await fetch(`/api/memorials/${memorial.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: listed ? 'approved' : 'pending' }),
    })
    if (r.ok) setMemorial(m => m ? { ...m, status: listed ? 'approved' : 'pending' } : m)
    setMsg(r.ok ? '✓ Saved' : '✗ Error')
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div>
      <div style={S.divider} />
      <Field label="Directory listing">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '.88rem' }}>
          <input
            type="checkbox"
            checked={memorial.status === 'approved'}
            onChange={e => toggle(e.target.checked)}
          />
          Show this memorial on the main site&rsquo;s directory
          {msg && <span style={S.statusOk}>{msg}</span>}
        </label>
      </Field>
    </div>
  )
}

// ─── Moderation tab ──────────────────────────────────────────────────────────

type ModRow = {
  id: number
  name: string
  relation: string
  message: string
  moderation: 'approved' | 'pending' | 'held'
  hidden: boolean
  created_at: string
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

function ModerationTab() {
  const [rows, setRows] = useState<ModRow[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }
  const load = () => {
    Promise.all([
      fetch('/api/condolences?all=1').then(r => r.ok ? r.json() : []),
      fetch('/api/settings').then(r => r.ok ? r.json() : {}),
    ]).then(([c, s]) => { setRows(c); setSettings(s); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(load, [])

  const saveSetting = async (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    const r = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    toast(r.ok ? '✓ Saved' : '✗ Error')
  }

  const patch = async (id: number, body: Record<string, unknown>) => {
    const r = await fetch(`/api/condolences/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    toast(r.ok ? '✓ Saved' : '✗ Error')
    load()
  }

  const hardDelete = async (id: number) => {
    if (!confirm('Permanently delete this message? This cannot be undone.')) return
    const r = await fetch(`/api/condolences/${id}`, { method: 'DELETE' })
    const d = await r.json().catch(() => ({}))
    toast(r.ok ? '✓ Deleted' : `✗ ${d.error ?? 'Error'}`)
    load()
  }

  const queue = rows.filter(r => r.moderation !== 'approved')
  const rest  = rows.filter(r => r.moderation === 'approved')

  const renderRow = (r: ModRow) => {
    const canHardDelete = Date.now() - new Date(r.created_at).getTime() >= THIRTY_DAYS
    return (
      <div key={r.id} style={{ ...S.boxItem, opacity: r.hidden ? 0.55 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: '.92rem' }}>
            {r.name} <span style={{ fontWeight: 400, color: '#888', fontSize: '.78rem' }}>· {r.relation}</span>
          </span>
          <span style={{ fontSize: '.72rem', color: '#9a9a9a' }}>{new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <p style={{ margin: '0 0 10px', fontSize: '.88rem', lineHeight: 1.6 }}>{r.message}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {r.moderation === 'pending' && <span style={{ fontSize: '.7rem', background: 'rgba(212,166,90,.2)', color: '#8a6e3e', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>AWAITING APPROVAL</span>}
          {r.moderation === 'held' && <span style={{ fontSize: '.7rem', background: 'rgba(184,60,60,.12)', color: '#b83c3c', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>HELD BY AI</span>}
          {r.hidden && <span style={{ fontSize: '.7rem', background: '#eee', color: '#666', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>HIDDEN</span>}
          {r.moderation !== 'approved' && (
            <button style={S.btnSmall} onClick={() => patch(r.id, { moderation: 'approved' })}>Approve</button>
          )}
          {r.hidden
            ? <button style={S.btnGhost} onClick={() => patch(r.id, { hidden: false })}>Unhide</button>
            : <button style={S.btnGhost} onClick={() => patch(r.id, { hidden: true })}>Hide</button>}
          {canHardDelete && <button style={S.btnDanger} onClick={() => hardDelete(r.id)}>Delete permanently</button>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={S.sectionH}>Moderation</div>
      <div style={S.sectionSub}>
        Nothing is ever silently deleted. Hiding keeps the message recoverable; permanent
        deletion only becomes possible 30 days after a message was written.
        {msg && <span style={S.statusOk}>{msg}</span>}
      </div>

      <div style={S.row2}>
        <Field label="Approval mode">
          <select
            style={{ ...S.input, width: 'auto' }}
            value={settings['moderation.approvalMode'] ?? 'off'}
            onChange={e => saveSetting('moderation.approvalMode', e.target.value)}
          >
            <option value="off">Post immediately</option>
            <option value="on">Hold every condolence until I approve it</option>
          </select>
        </Field>
        <Field label="AI triage (pre-screens incoming condolences)">
          <select
            style={{ ...S.input, width: 'auto' }}
            value={settings['moderation.aiTriage'] ?? 'off'}
            onChange={e => saveSetting('moderation.aiTriage', e.target.value)}
          >
            <option value="off">Off</option>
            <option value="on">On — AI approves or holds for my review (never deletes)</option>
          </select>
        </Field>
      </div>

      {loading && <p style={{ color: '#888', fontSize: '.88rem' }}>Loading…</p>}

      {!loading && (
        <>
          <div style={S.genLabel}>Review queue ({queue.length})</div>
          {queue.length === 0 && <p style={{ color: '#888', fontSize: '.88rem', padding: '4px 0 16px' }}>Nothing waiting for review.</p>}
          {queue.map(renderRow)}
          <div style={S.divider} />
          <div style={S.genLabel}>All condolences ({rest.length})</div>
          {rest.map(renderRow)}
        </>
      )}
    </div>
  )
}
