'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CONFIG } from '@/lib/config'
import type { Condolence, Memory, PaymentConfig } from '@/lib/config'

/* ── DB-sourced person ───────────────────────────────────────────────────── */
type DbPerson = {
  id: number
  name: string
  relation: string
  photo: string
  bio: string
  family_group?: string
  condolence_count?: number
  total_contributed?: number
  created_at?: string
  condolences?: Array<{ id: number; name: string; relation: string; message: string; photo: string; created_at: string }>
  contributions?: Array<{ id: number; name: string; relation: string; amount: number; note: string; created_at: string }>
}

/* ── module-level cache — survives client-side navigation ──────────────────── */
type CacheContrib = { name: string; relation: string; amount: number; note: string }
let _portrait = CONFIG.portrait
let _dbPeople: DbPerson[] = []
let _condolences: Condolence[] = []
let _contributions: CacheContrib[] = []

/* ── helpers + icons ──────────────────────────────────────────────────────── */
const fmtMoney = (n: number | string | null | undefined) => {
  if (n === "" || n == null || isNaN(Number(n)) || Number(n) === 0) return null
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency: CONFIG.currency, maximumFractionDigits: 0,
    }).format(Number(n))
  } catch {
    return CONFIG.currency + " " + Number(n).toLocaleString()
  }
}
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const fmtCondDate = (d: string) => {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
const parseDate = (d: string) => { const x = new Date(d + "T00:00:00"); return isNaN(x.getTime()) ? null : x }
const mapLink = (e: { mapUrl?: string; venue?: string; address?: string }) =>
  e.mapUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((e.venue || "") + " " + (e.address || ""))

const NAV = [
  { id:"landing",       label:"Home",          icon:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" },
  { id:"people",        label:"People",        icon:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  { id:"condolences",   label:"Condolences",   icon:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { id:"contributions", label:"Contributions", icon:"M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { id:"memories",      label:"Memories",      icon:"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { id:"family",        label:"Family tree",   icon:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M12 3a4 4 0 0 1 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  { id:"program",       label:"Program",       icon:"M8 2v4 M16 2v4 M3 9h18 M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" },
]

const Ic = ({ path, size = 18 }: { path: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path.split(" M ").map((d, i) => <path key={i} d={(i === 0 ? "" : " M ") + d} />)}
  </svg>
)

/* ── IMG with Dicebear fallback ──────────────────────────────────────────── */
function Img({ src, className = "", seed = "", loading: isLoading = false }: {
  src?: string; className?: string; seed?: string; loading?: boolean
}) {
  const [errSrc, setErrSrc] = useState<string | null>(null)
  const dicebear = seed
    ? `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f5f0e8`
    : null

  if (isLoading) return <div className={"ph-skel " + className} />

  if (src && src.trim() && src !== errSrc)
    return <img src={src} alt="" className={className} loading="lazy" onError={() => setErrSrc(src)} />
  if (dicebear)
    return <img src={dicebear} alt="" className={className} loading="lazy" />
  return (
    <div className={"ph " + className}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="9" r="3.5" /><path d="M5 21c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5" />
      </svg>
    </div>
  )
}

/* ── FALLING HEARTS — client-only to avoid hydration mismatch ─────────────── */
function FallingHearts() {
  const [hearts, setHearts] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([])

  useEffect(() => {
    setHearts(Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 96),
      delay: +(Math.random() * 14).toFixed(2),
      duration: +(12 + Math.random() * 11).toFixed(2),
      size: Math.round(12 + Math.random() * 16),
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

/* ── BREADCRUMB ──────────────────────────────────────────────────────────── */
function Breadcrumb({ section, subLabel, onHome, onSection }: {
  section: string
  subLabel?: string
  onHome: () => void
  onSection?: () => void
}) {
  if (section === 'landing') return <div className="bc-space" />
  const label = NAV.find(n => n.id === section)?.label ?? section
  if (subLabel && onSection) {
    return (
      <nav className="breadcrumb">
        <button className="bc-link" onClick={onHome}>Home</button>
        <span className="bc-sep">/</span>
        <button className="bc-link" onClick={onSection}>{label}</button>
        <span className="bc-sep">/</span>
        <span className="bc-cur">{subLabel}</span>
      </nav>
    )
  }
  return (
    <nav className="breadcrumb">
      <button className="bc-link" onClick={onHome}>Home</button>
      <span className="bc-sep">/</span>
      <span className="bc-cur">{label}</span>
    </nav>
  )
}

/* ── ROOT ────────────────────────────────────────────────────────────────── */
export default function Pamoja() {
  const pathname = usePathname()
  const router = useRouter()

  const section = useMemo(() => {
    if (!pathname || pathname === '/') return 'landing'
    return pathname.slice(1)
  }, [pathname])

  const [selectedPerson, setSelectedPerson] = useState<DbPerson | null>(null)
  const [showDeceasedProfile, setShowDeceasedProfile] = useState(false)
  const [modal, setModal] = useState<{ mode: string } | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [condolences, setCondolences] = useState<Condolence[]>(_condolences)
  const [memories, setMemories] = useState<Memory[]>([])
  const [contributions, setContributions] = useState<CacheContrib[]>(_contributions)
  const [portrait, setPortrait] = useState(_portrait)
  const [siteConfig, setSiteConfig] = useState(CONFIG)
  const [dbPeople, setDbPeople] = useState<DbPerson[]>(_dbPeople)
  const [paymentModal, setPaymentModal] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState(false)
  const [dataLoading, setDataLoading] = useState(_dbPeople.length === 0)

  useEffect(() => { document.title = "Pamoja — in memory of " + siteConfig.name }, [siteConfig.name])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightbox(null); setModal(null); setPaymentModal(false); setFeedbackModal(false) }
    }
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k)
  }, [])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [section])

  useEffect(() => {
    Promise.all([
      fetch('/api/condolences').then(r => r.ok ? r.json() : []),
      fetch('/api/memories').then(r => r.ok ? r.json() : []),
      fetch('/api/contributions').then(r => r.ok ? r.json() : []),
      fetch('/api/config').then(r => r.ok ? r.json() : {}),
      fetch('/api/people').then(r => r.ok ? r.json() : []),
    ]).then(([c, m, k, s, p]) => {
      const cfg = s as Partial<typeof CONFIG> & { portrait?: string }
      setSiteConfig(prev => ({
        ...prev,
        ...(cfg.name                                          && { name:        cfg.name }),
        ...(cfg.born                                          && { born:        cfg.born }),
        ...(cfg.passed                                        && { passed:      cfg.passed }),
        ...(cfg.epitaph                                       && { epitaph:     cfg.epitaph }),
        ...(cfg.whatsapp                                      && { whatsapp:    cfg.whatsapp }),
        ...(cfg.currency                                      && { currency:    cfg.currency }),
        ...(cfg.cta                                           && { cta:         cfg.cta }),
        ...(cfg.kicker !== undefined                          && { kicker:      cfg.kicker }),
        ...(cfg.programNote !== undefined                     && { programNote: cfg.programNote }),
        ...(Array.isArray(cfg.relations) && cfg.relations.length && { relations: cfg.relations }),
        ...(cfg.payment != null                               && { payment:     cfg.payment }),
        ...(Array.isArray(cfg.people) && cfg.people.length   && { people:      cfg.people }),
        ...(cfg.familyTree?.generations?.length               && { familyTree:  cfg.familyTree }),
        ...(Array.isArray(cfg.program) && cfg.program.length && { program:     cfg.program }),
      }))
      if (cfg.portrait) { _portrait = cfg.portrait; setPortrait(cfg.portrait) }
      type Row = Record<string, unknown>
      const newCondolences = (c as Row[]).map(x => ({
        name: x.name as string,
        relation: x.relation as string,
        message: x.message as string,
        photo: (x.photo as string) ?? '',
        created_at: (x.created_at as string) ?? '',
      }))
      const newContributions = (k as Row[]).map(x => ({
        name: x.name as string,
        relation: x.relation as string,
        amount: Number(x.amount),
        note: (x.note as string) ?? '',
      }))
      const newPeople = p as DbPerson[]
      _condolences = newCondolences
      _contributions = newContributions
      _dbPeople = newPeople
      setCondolences(newCondolences)
      setMemories((m as Row[]).map(x => ({
        src: x.src as string,
        caption: (x.caption as string) ?? '',
        addedBy: x.added_by as string,
      })))
      setContributions(newContributions)
      setDbPeople(newPeople)
      setDataLoading(false)
    }).catch(() => { setDataLoading(false) })
  }, [])

  const refreshPeople = () => {
    fetch('/api/people').then(r => r.ok ? r.json() : []).then(setDbPeople).catch(() => {})
  }

  const save = (mode: string, entry: Condolence | Memory) => {
    if (mode === "condolence") {
      setCondolences(x => [entry as Condolence, ...x])
      refreshPeople()
      setModal(null)
      goSection('condolences')
      return
    }
    if (mode === "memory") setMemories(x => [entry as Memory, ...x])
    setModal(null)
  }

  const selectPerson = async (person: DbPerson) => {
    setSelectedPerson(person)
    try {
      const data = await fetch(`/api/people/${person.id}`).then(r => r.json())
      setSelectedPerson(data)
    } catch {}
  }

  const updatePerson = (updated: Partial<DbPerson> & { id: number }) => {
    setSelectedPerson(prev => prev ? { ...prev, ...updated } : prev)
    setDbPeople(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))
  }

  const goSection = (id: string) => {
    router.push(id === 'landing' ? '/' : `/${id}`)
    setSelectedPerson(null)
    setShowDeceasedProfile(false)
    setNavOpen(false)
  }

  return (
    <>
      {section === "landing" && <FallingHearts />}

      {/* ── SIDEBAR ── */}
      <aside className={"sidebar" + (navOpen ? " open" : "")}>
        <div className="sb-top">
          <div className="sb-brand">Pamoja</div>
          <div className="sb-who">
            <div className="sb-av"><Img src={portrait} seed={siteConfig.name} /></div>
            <div>
              <div className="sb-kick">In loving memory of</div>
              {dataLoading
                ? <div className="ph-skel" style={{height:'1.1em',width:'130px',borderRadius:'4px',backgroundImage:'linear-gradient(90deg,rgba(255,255,255,.08) 25%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.08) 75%)',backgroundSize:'200% 100%'}} />
                : <div className="sb-name">{siteConfig.name}</div>
              }
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          {NAV.map(n => (
            <button key={n.id}
              className={"sb-link" + (section === n.id && selectedPerson === null ? " active" : "")}
              onClick={() => goSection(n.id)}>
              <Ic path={n.icon} size={17} />{n.label}
            </button>
          ))}
        </nav>

        <div className="sb-update">Site is being updated regularly</div>

        <div className="sb-feedback-wrap">
          <button className="fb-link" onClick={() => setFeedbackModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Send feedback
          </button>
        </div>

        <div className="sb-foot">
          <button className="btn amber block sm" onClick={() => setModal({ mode: "condolence" })}>
            {siteConfig.cta}
          </button>
          <a className="wa-link" href={siteConfig.whatsapp} target="_blank" rel="noopener noreferrer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.102 1.523 5.828L.057 24l6.305-1.654A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.017-1.372l-.36-.213-3.733.979 1-3.638-.234-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818C21.818 17.42 17.42 21.818 12 21.818z" />
            </svg>
            Join the WhatsApp group
          </a>
        </div>
      </aside>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      {/* ── MAIN ── */}
      <main className="main">
        <header className="topbar">
          <button className="ham" aria-label="Menu" onClick={() => setNavOpen(v => !v)}>
            <span /><span /><span />
          </button>
          <div className="nav-hint" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            <span>View more</span>
          </div>
          <Breadcrumb
            section={section}
            subLabel={
              section === 'people' && selectedPerson ? selectedPerson.name
              : section === 'family' && showDeceasedProfile ? siteConfig.name
              : undefined
            }
            onHome={() => goSection('landing')}
            onSection={
              section === 'people' && selectedPerson ? () => setSelectedPerson(null)
              : section === 'family' && showDeceasedProfile ? () => setShowDeceasedProfile(false)
              : undefined
            }
          />
          <button className="btn amber sm tb-cta" onClick={() => section === 'contributions' ? setPaymentModal(true) : setModal({ mode: "condolence" })}>
            {section === 'contributions' ? 'How to contribute' : siteConfig.cta}
          </button>
        </header>

        <div className={"content" + (section === "landing" ? " lp-active" : "")}>
          {section === "landing" && (
            <LandingPanel
              onWrite={() => setModal({ mode: "condolence" })}
              portrait={portrait}
              cfg={siteConfig}
              loading={dataLoading}
            />
          )}
          {section === "people" && selectedPerson === null && (
            <PeopleList people={dbPeople} onSelect={selectPerson} loading={dataLoading} />
          )}
          {section === "people" && selectedPerson !== null && (
            <PersonProfile
              person={selectedPerson}
              setLightbox={setLightbox}
              onPersonUpdate={updatePerson}
            />
          )}
          {section === "condolences" && (
            <CondolencesView items={condolences} onAdd={() => setModal({ mode: "condolence" })} cta={siteConfig.cta} loading={dataLoading} />
          )}
          {section === "contributions" && (
            <ContribView items={contributions} onContribute={() => setPaymentModal(true)} cfg={siteConfig} people={dbPeople} loading={dataLoading} />
          )}
          {section === "memories" && (
            <MemoriesView items={memories} onAdd={() => setModal({ mode: "memory" })} setLightbox={setLightbox} />
          )}
          {section === "family" && !showDeceasedProfile && (
            <FamilyView
              cfg={siteConfig}
              portrait={portrait}
              setLightbox={setLightbox}
              onDeceasedClick={() => setShowDeceasedProfile(true)}
            />
          )}
          {section === "family" && showDeceasedProfile && (
            <DeceasedProfile
              cfg={siteConfig}
              portrait={portrait}
              condolenceCount={condolences.length}
              total={contributions.reduce((s, c) => s + (Number(c.amount) || 0), 0)}
            />
          )}
          {section === "program" && <ProgramView cfg={siteConfig} loading={dataLoading} />}
        </div>
      </main>

      {modal && (
        <AddModal
          mode={modal.mode as 'condolence' | 'memory'}
          onClose={() => setModal(null)}
          onSave={save}
          cfg={siteConfig}
        />
      )}

      {paymentModal && <PaymentInfoModal payment={siteConfig.payment} onClose={() => setPaymentModal(false)} />}
      {feedbackModal && <FeedbackModal onClose={() => setFeedbackModal(false)} />}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lb-close" onClick={() => setLightbox(null)}>×</button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

/* ── PANELS ──────────────────────────────────────────────────────────────── */

function LandingPanel({ onWrite, portrait, cfg, loading }: {
  onWrite: () => void
  portrait: string
  cfg: typeof CONFIG
  loading?: boolean
}) {
  return (
    <div className="landing-panel">
      <div className="lp-portrait-wrap" style={{ cursor: 'default' }}>
        <div className="lp-portrait">
          <Img src={portrait} seed={cfg.name} loading={loading} />
        </div>
      </div>
      <p className="lp-kick">{cfg.kicker}</p>
      <h1 className="lp-name">{cfg.name}</h1>
      <p className="lp-dates">{cfg.born}<span className="ndash"> — </span>{cfg.passed}</p>
      <p className="lp-epitaph">{cfg.epitaph}</p>
      <button className="btn amber lp-btn" onClick={onWrite}>{cfg.cta}</button>
    </div>
  )
}

/* ── PEOPLE LIST ─────────────────────────────────────────────────────────── */

function PeopleList({ people, onSelect, loading }: { people: DbPerson[]; onSelect: (p: DbPerson) => void; loading: boolean }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (!search.trim()) return people
    const q = search.toLowerCase()
    return people.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.relation && p.relation.toLowerCase().includes(q)) ||
      (p.family_group && p.family_group.toLowerCase().includes(q))
    )
  }, [people, search])

  return (
    <>
      <div className="view-bar">
        <div className="vb-left">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input className="search-in" type="search" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="p-list">
        {!loading && people.length === 0 && (
          <p className="p-empty">People who write condolences will appear here.</p>
        )}
        {filtered.map(p => (
          <button key={p.id} className="p-row" onClick={() => onSelect(p)}>
            <div className="p-av"><Img src={p.photo} seed={p.name} loading={loading} /></div>
            <div className="p-info">
              <span className="p-name">{p.name}</span>
              {p.family_group && <span className="p-family">{p.family_group}</span>}
              <span className="p-rel">{p.relation}</span>
            </div>
            <svg className="p-arr" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        ))}
      </div>
    </>
  )
}

/* ── PERSON PROFILE ──────────────────────────────────────────────────────── */

function PersonProfile({ person, setLightbox, onPersonUpdate }: {
  person: DbPerson
  setLightbox: (src: string) => void
  onPersonUpdate: (updated: Partial<DbPerson> & { id: number }) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(person.bio || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setBio(person.bio || '') }, [person.bio])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'people')
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) throw new Error()
      const { url } = await up.json()
      await fetch(`/api/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: url }),
      })
      onPersonUpdate({ id: person.id, photo: url })
    } catch {}
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const saveBio = async () => {
    setSaving(true)
    try {
      await fetch(`/api/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      })
      onPersonUpdate({ id: person.id, bio })
      setEditing(false)
    } catch {}
    setSaving(false)
  }

  const totalContrib = person.contributions?.reduce((s, c) => s + (Number(c.amount) || 0), 0)
    ?? person.total_contributed
    ?? 0

  return (
    <div className="profile">
      <div className="prof-hero">
        <div className="prof-av-wrap" onClick={() => fileRef.current?.click()}>
          <div className="prof-av">
            {uploading
              ? <div className="ph"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" strokeDasharray="42" strokeDashoffset="10"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".8s" repeatCount="indefinite" /></circle></svg></div>
              : <Img src={person.photo} seed={person.name} />
            }
          </div>
          <div className="prof-av-overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        </div>
        <div>
          <h2 className="prof-name">{person.name}</h2>
          {person.family_group && <div className="prof-family">{person.family_group}</div>}
          <div className="prof-rel">{person.relation}</div>
        </div>
      </div>

      {editing ? (
        <div className="prof-bio-edit">
          <textarea
            className="prof-bio-input"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Write a short bio…"
            rows={4}
          />
          <div className="prof-bio-actions">
            <button className="btn sm ghost" onClick={() => { setEditing(false); setBio(person.bio || '') }}>Cancel</button>
            <button className="btn sm" onClick={saveBio} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : (
        <div className="prof-bio" onClick={() => setEditing(true)}>
          {person.bio
            ? <p className="prof-desc">{person.bio}</p>
            : <p className="prof-desc-empty">Click to add a bio…</p>
          }
        </div>
      )}

      {fmtMoney(totalContrib) && (
        <div className="prof-contrib">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          Contributed {fmtMoney(totalContrib)}
        </div>
      )}

      {person.condolences && person.condolences.length > 0 && (
        <div className="prof-section">
          <div className="prof-section-label">Condolence</div>
          {person.condolences.map((c, i) => (
            <p key={i} className="prof-condolence">{c.message}</p>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── CONDOLENCES ─────────────────────────────────────────────────────────── */

function CondolencesView({ items, onAdd, cta, loading }: { items: Condolence[]; onAdd: () => void; cta: string; loading: boolean }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.message && c.message.toLowerCase().includes(q))
    )
  }, [items, search])

  return (
    <>
      <div className="view-bar">
        <div className="vb-left">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input className="search-in" type="search" placeholder="Search condolences…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <button className="btn amber sm" onClick={onAdd}>{cta}</button>
      </div>
      <div className="cond-list">
        {loading && items.length === 0 && Array.from({ length: 4 }, (_, i) => (
          <div className="cond-item" key={'sk' + i}>
            <div className="cond-head">
              <div className="cond-av"><div className="ph-skel" style={{borderRadius:'50%'}} /></div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <div className="ph-skel" style={{height:'1rem',width:'140px',borderRadius:'4px'}} />
                <div className="ph-skel" style={{height:'0.65rem',width:'80px',borderRadius:'3px'}} />
              </div>
            </div>
            <div className="ph-skel" style={{height:'3rem',marginTop:'10px',borderRadius:'4px'}} />
          </div>
        ))}
        {filtered.map((c, i) => (
          <div className="cond-item" key={i}>
            <div className="cond-head">
              <div className="cond-av"><Img src={c.photo} seed={c.name} /></div>
              <div>
                <div className="cond-name">{c.name || "Anonymous"}</div>
                {c.relation && <div className="cond-rel">{c.relation}</div>}
                {c.created_at && <div className="cond-date">{fmtCondDate(c.created_at)}</div>}
              </div>
            </div>
            <p className="cond-msg">{c.message}</p>
          </div>
        ))}
      </div>
    </>
  )
}

/* ── MEMORIES ────────────────────────────────────────────────────────────── */

function MemoriesView({ items, onAdd, setLightbox }: { items: Memory[]; onAdd: () => void; setLightbox: (src: string) => void }) {
  return (
    <>
      <div className="view-bar"><button className="btn sm ghost" onClick={onAdd}>Add a photo</button></div>
      <div className="mem-grid">
        {items.map((m, i) => (
          <button key={i} className="mem-tile" onClick={() => m.src && m.src.trim() && setLightbox(m.src)}>
            <div className="mem-img"><Img src={m.src} /></div>
            <div className="mem-cap">
              {m.caption && <span className="mem-caption">{m.caption}</span>}
              {m.addedBy && <span className="mem-by">{m.addedBy}</span>}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

/* ── CONTRIBUTIONS ───────────────────────────────────────────────────────── */

const CONTRIB_TARGET = 3_250_000

function ContribView({ items, onContribute, cfg, people, loading }: {
  items: Array<{ name: string; relation: string; amount: number; note: string }>
  onContribute: () => void
  cfg: typeof CONFIG
  people: DbPerson[]
  loading: boolean
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    return items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  }, [items, search])

  const total = useMemo(() => items.reduce((s, c) => s + (Number(c.amount) || 0), 0), [items])
  const pct = Math.min(100, Math.round((total / CONTRIB_TARGET) * 100))

  return (
    <>
      <div className="contrib-goal">
        <div className="contrib-goal-head">
          <span className="contrib-goal-label">Fundraising Goal</span>
          <span className="contrib-goal-pct">{pct}%</span>
        </div>
        <div className="contrib-goal-track">
          <div className="contrib-goal-fill" style={{ width: pct + '%' }} />
        </div>
        <div className="contrib-goal-meta">
          <span>Target: {fmtMoney(CONTRIB_TARGET)}</span>
        </div>
      </div>
      <div className="view-bar">
        <div className="vb-left">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input className="search-in" type="search" placeholder="Search contributors…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <button className="btn amber sm" onClick={onContribute}>How to contribute</button>
      </div>
      <div className="p-list">
        {loading && filtered.length === 0 && Array.from({ length: 6 }, (_, i) => (
          <div className="p-row" key={'sk' + i} style={{cursor:'default'}}>
            <div className="p-av"><div className="ph-skel" style={{borderRadius:'50%',width:'100%',height:'100%'}} /></div>
            <div className="p-info">
              <div className="ph-skel" style={{height:'0.9rem',width:'140px',borderRadius:'4px'}} />
              <div className="ph-skel" style={{height:'0.6rem',width:'80px',borderRadius:'3px',marginTop:'4px'}} />
            </div>
            <div className="ph-skel" style={{height:'1.1rem',width:'70px',borderRadius:'4px',flexShrink:0}} />
          </div>
        ))}
        {filtered.map((c, i) => {
          const person = people.find(p => p.name.toLowerCase() === c.name.toLowerCase())
          return (
            <div className="p-row" key={i} style={{cursor:'default'}}>
              <div className="p-av"><Img src={person?.photo} seed={c.name} loading={loading} /></div>
              <div className="p-info">
                <span className="p-name">{c.name}</span>
                {person?.family_group && <span className="p-family">{person.family_group}</span>}
                {c.relation && <span className="p-rel">{c.relation}</span>}
                {c.note && <span className="contrib-note">{c.note}</span>}
              </div>
              {fmtMoney(c.amount) && <span className="contrib-amt">{fmtMoney(c.amount)}</span>}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── FAMILY TREE ─────────────────────────────────────────────────────────── */

function FamilyView({ cfg, portrait, setLightbox, onDeceasedClick }: {
  cfg: typeof CONFIG
  portrait: string
  setLightbox: (src: string) => void
  onDeceasedClick: () => void
}) {
  return (
    <div className="tree">
      {cfg.familyTree.generations.map((gen, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="tree-line" />}
          <div className="gen">
            {gen.map((m, mi) => (
              <div className={"node" + (m.self ? " self" : "")} key={mi}>
                <button className="node-av" onClick={() => {
                  if (m.self) { onDeceasedClick(); return }
                  const photo = m.photo
                  if (photo && photo.trim()) setLightbox(photo)
                }}>
                  <Img src={m.self ? portrait : m.photo} seed={m.self ? cfg.name : m.name} />
                </button>
                <div className="node-nm">{m.self ? cfg.name : m.name}</div>
                {m.self
                  ? <div className="node-dates">{cfg.born.split(" ").pop()}–{cfg.passed.split(" ").pop()}</div>
                  : m.relation && <div className="node-rl">{m.relation}</div>}
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

/* ── DECEASED PROFILE ────────────────────────────────────────────────────── */

function DeceasedProfile({ cfg, portrait, condolenceCount, total }: {
  cfg: typeof CONFIG
  portrait: string
  condolenceCount: number
  total: number
}) {
  return (
    <div className="profile">
      <div className="prof-hero">
        <div className="prof-av-wrap" style={{cursor:'default'}}>
          <div className="prof-av">
            <Img src={portrait} seed={cfg.name} />
          </div>
        </div>
        <div>
          <h2 className="prof-name">{cfg.name}</h2>
          <div className="prof-rel" style={{marginTop:6}}>{cfg.born}<span style={{margin:'0 6px',color:'var(--amber)'}}>—</span>{cfg.passed}</div>
        </div>
      </div>
      {cfg.epitaph && (
        <div className="prof-bio" style={{cursor:'default'}}>
          <p className="prof-desc" style={{fontFamily:'var(--D)',fontStyle:'italic'}}>{cfg.epitaph}</p>
        </div>
      )}
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:20}}>
        {condolenceCount > 0 && (
          <div className="prof-contrib">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {condolenceCount} {condolenceCount === 1 ? 'condolence' : 'condolences'}
          </div>
        )}
        {fmtMoney(total) && (
          <div className="prof-contrib">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            {fmtMoney(total)} contributed
          </div>
        )}
      </div>
    </div>
  )
}

/* ── PROGRAM ─────────────────────────────────────────────────────────────── */

function ProgramView({ cfg, loading }: { cfg: typeof CONFIG; loading?: boolean }) {
  return (
    <div className="timeline">
      {loading && Array.from({ length: 5 }, (_, i) => (
        <div className="ev" key={'sk' + i}>
          <div className="ev-date">
            <div className="ph-skel" style={{height:'1.5rem',width:'28px',borderRadius:'4px',margin:'0 auto 4px'}} />
            <div className="ph-skel" style={{height:'0.6rem',width:'22px',borderRadius:'3px',margin:'0 auto'}} />
          </div>
          <div className="ev-body">
            <div className="ph-skel" style={{height:'1.25rem',width:'60%',borderRadius:'4px',marginBottom:'6px'}} />
            <div className="ph-skel" style={{height:'0.85rem',width:'80%',borderRadius:'3px'}} />
            <div className="ph-skel" style={{height:'0.85rem',width:'70%',borderRadius:'3px',marginTop:'4px'}} />
            <div className="ph-skel" style={{height:'0.7rem',width:'80px',borderRadius:'3px',marginTop:'10px'}} />
          </div>
        </div>
      ))}
      {!loading && cfg.program.map((ev, i) => {
        const dt = parseDate(ev.date)
        return (
          <div className="ev" key={i}>
            <div className="ev-date">
              <div className="d">{dt ? dt.getDate() : "•"}</div>
              <div className="m">{dt ? MONTHS[dt.getMonth()] : ""}</div>
              <div className="day">{dt ? DAYS[dt.getDay()] : ""}</div>
            </div>
            <div className="ev-body">
              <div className="ev-title">{ev.title}</div>
              {ev.time && <div className="ev-meta">{ev.time}</div>}
              {ev.venue && <div className="ev-meta">{ev.venue}{ev.address ? " — " + ev.address : ""}</div>}
              {ev.note && <div className="ev-note">{ev.note}</div>}
              <a className="ev-link" href={mapLink(ev)} target="_blank" rel="noopener noreferrer">Get directions ↗</a>
            </div>
          </div>
        )
      })}
      {!loading && cfg.programNote && <p className="prog-note">{cfg.programNote}</p>}
    </div>
  )
}

/* ── PAYMENT INFO MODAL ──────────────────────────────────────────────────── */

function PaymentInfoModal({ payment, onClose }: { payment: PaymentConfig; onClose: () => void }) {
  const hasMpesa   = !!payment.mpesa_number
  const hasPaybill = !!payment.paybill_number
  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>How to Contribute</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="pay-intro">To contribute to the family, send funds via any of the following:</p>

          {hasMpesa && (
            <div className="pay-method">
              <div className="pay-label">M-Pesa</div>
              <div className="pay-number">{payment.mpesa_number}</div>
              {payment.mpesa_name && <div className="pay-name">{payment.mpesa_name}</div>}
            </div>
          )}

          {hasMpesa && hasPaybill && <div className="pay-or">or</div>}

          {hasPaybill && (
            <div className="pay-method">
              <div className="pay-label">M-Pesa Paybill</div>
              <div className="pay-number">{payment.paybill_number}</div>
              {payment.paybill_account && <div className="pay-row"><span className="pay-key">Account No.</span><strong>{payment.paybill_account}</strong></div>}
              {payment.paybill_bank    && <div className="pay-row"><span className="pay-key">Bank</span><strong>{payment.paybill_bank}</strong></div>}
            </div>
          )}

          <p className="pay-note">The contribution list is updated manually. Thank you for your generosity.</p>
        </div>
        <div className="modal-foot">
          <button className="btn amber" onClick={onClose}>Thank you</button>
        </div>
      </div>
    </div>
  )
}

/* ── ADD MODAL ───────────────────────────────────────────────────────────── */
type AddMode = 'condolence' | 'memory'

function AddModal({ mode, onClose, onSave, cfg }: {
  mode: AddMode
  onClose: () => void
  onSave: (mode: string, entry: Condolence | Memory) => void
  cfg: typeof CONFIG
}) {
  const titles: Record<AddMode, string> = {
    condolence: cfg.cta,
    memory: "Add a photo memory",
  }
  const [f, setF] = useState({ name: "", relation: "", message: "", caption: "" })
  const [customRelation, setCustomRelation] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState("")
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(v => ({ ...v, [k]: e.target.value }))

  const effectiveRelation = f.relation === 'Other' ? customRelation.trim() : f.relation

  const save = async () => {
    if (!f.name.trim()) return setErr("Please add your name.")
    if (!f.relation)    return setErr("Please select how you knew them.")
    if (f.relation === 'Other' && !customRelation.trim()) return setErr("Please specify your relationship.")
    if (mode === "condolence" && !f.message.trim()) return setErr("Please write a message.")
    if (mode === "memory"     && !file)             return setErr("Please select a photo.")

    setErr("")
    setSaving(true)
    try {
      const base = { name: f.name.trim(), relation: effectiveRelation }

      if (mode === "condolence") {
        await fetch('/api/condolences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, message: f.message.trim(), photo: '' }),
        })
        onSave(mode, { ...base, message: f.message.trim(), photo: '', created_at: new Date().toISOString() } as Condolence)
      }

      if (mode === "memory") {
        const fd = new FormData()
        fd.append('file', file!)
        fd.append('folder', 'memories')
        const up = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!up.ok) throw new Error('Upload failed')
        const { url } = await up.json()
        await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src: url, caption: f.caption.trim(), added_by: f.name.trim() }),
        })
        onSave(mode, { src: url, caption: f.caption.trim(), addedBy: f.name.trim() } as Memory)
      }
    } catch {
      setErr("Something went wrong. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{titles[mode]}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="m2">
            <div className="field">
              <label>Your name</label>
              <input type="text" value={f.name} onChange={set("name")} placeholder="Full name" autoFocus />
            </div>
            <div className="field">
              <label>How you knew them</label>
              <select value={f.relation} onChange={set("relation")}>
                <option value="">Select relationship</option>
                {cfg.relations.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {f.relation === 'Other' && (
            <div className="field">
              <label>Please specify</label>
              <input
                type="text"
                value={customRelation}
                onChange={e => setCustomRelation(e.target.value)}
                placeholder="e.g. Mentor, Pastor, Teacher, Business partner…"
                autoFocus
              />
            </div>
          )}
          {mode === "condolence" && (
            <div className="field">
              <label>Your message</label>
              <textarea value={f.message} onChange={set("message")} placeholder="Share a word of comfort…" />
            </div>
          )}
          {mode === "memory" && (<>
            <div className="field">
              <label>Photo</label>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="field">
              <label>Caption — optional</label>
              <input type="text" value={f.caption} onChange={set("caption")} placeholder="Describe the moment" />
            </div>
          </>)}
          {err && <p className="form-err">{err}</p>}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : titles[mode]}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── FEEDBACK MODAL ──────────────────────────────────────────────────────── */

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!name.trim()) return setErr('Please add your name.')
    if (!message.trim()) return setErr('Please write your feedback.')
    setErr('')
    setSaving(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      })
      setDone(true)
    } catch {
      setErr('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Send Feedback</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {done ? (
          <>
            <div className="modal-body">
              <p style={{textAlign:'center',padding:'12px 0',color:'var(--soft)'}}>Thank you for your feedback!</p>
            </div>
            <div className="modal-foot">
              <button className="btn amber" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div className="field">
                <label>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoFocus />
              </div>
              <div className="field">
                <label>Feedback</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Share your thoughts…" />
              </div>
              {err && <p className="form-err">{err}</p>}
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn" onClick={submit} disabled={saving}>{saving ? 'Sending…' : 'Send feedback'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
