'use client'

import React, { useState, useEffect } from 'react'
import { CONFIG } from '@/lib/config'
import { photoThumb } from '@/lib/photo'
import { apiFetch } from '@/lib/api'

/*
 * Dynamic relation tree. The deceased is the root; clicking any person
 * re-centres the tree on them and shows their immediate connections
 * (admin-curated edges from the relations table). Groups appear as nodes
 * on the root view. Falls back to the legacy generations grid when no
 * edges have been added yet.
 */

type Edge = {
  id: number
  person_a: number
  person_b: number | null
  relation: string
  a_name: string
  a_photo: string
  a_relation?: string
  b_name?: string
  b_photo?: string
  b_relation?: string
}

type Group = { id: number; name: string; description: string; member_count: number }

type Focus = { id: number; name: string; photo: string; relation: string } | null

function Av({ src, seed, className = '' }: { src?: string; seed: string; className?: string }) {
  const url = src && src.trim()
    ? photoThumb(src)
    : `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f5f0e8`
  return <img src={url} alt={seed} className={className} loading="lazy" />
}

export default function RelationTree({ cfg, portrait, onDeceasedClick, onPerson, onGroup }: {
  cfg: typeof CONFIG
  portrait: string
  onDeceasedClick: () => void
  onPerson: (id: number) => void
  onGroup: (id: number) => void
}) {
  const [rootEdges, setRootEdges] = useState<Edge[]>([])
  const [focusEdges, setFocusEdges] = useState<Edge[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [focus, setFocus] = useState<Focus>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/relations').then(r => r.ok ? r.json() : []),
      apiFetch('/api/groups').then(r => r.ok ? r.json() : []),
    ]).then(([e, g]) => {
      setRootEdges(e as Edge[])
      setGroups(g as Group[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const focusOn = async (p: { id: number; name: string; photo: string; relation: string }) => {
    setFocus(p)
    setFocusEdges([])
    try {
      const e = await apiFetch(`/api/relations?person=${p.id}`).then(r => r.ok ? r.json() : [])
      setFocusEdges(e as Edge[])
    } catch {}
  }

  if (loading) return <div className="tree"><p className="p-empty">Loading…</p></div>

  // Legacy fallback: no curated edges yet, but an old generations tree exists
  if (rootEdges.length === 0 && !focus && cfg.familyTree.generations.length > 0) {
    return (
      <div className="tree">
        {cfg.familyTree.generations.map((gen, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="tree-line" />}
            <div className="gen">
              {gen.map((m, mi) => (
                <div className={"node" + (m.self ? " self" : "")} key={mi}>
                  <button className="node-av" onClick={() => { if (m.self) onDeceasedClick() }}>
                    <Av src={m.self ? portrait : m.photo} seed={m.self ? cfg.name : m.name} />
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
        {groups.length > 0 && (
          <GroupRow groups={groups} onGroup={onGroup} />
        )}
      </div>
    )
  }

  // Focused on a person: show them centred with their immediate connections
  if (focus) {
    const connections: Array<{ key: string; id: number | null; name: string; photo: string; label: string }> = []
    for (const e of focusEdges) {
      if (e.person_a === focus.id) {
        // focus is <relation> of the other node
        connections.push(e.person_b == null
          ? { key: 'e' + e.id, id: null, name: cfg.name, photo: portrait, label: focus.name.split(' ')[0] + (e.relation ? ` is ${e.relation.toLowerCase()}` : '') }
          : { key: 'e' + e.id, id: e.person_b, name: e.b_name ?? '', photo: e.b_photo ?? '', label: e.relation ? `${focus.name.split(' ')[0]} is ${e.relation.toLowerCase()}` : '' })
      } else {
        connections.push({ key: 'e' + e.id, id: e.person_a, name: e.a_name, photo: e.a_photo, label: e.relation || e.a_relation || '' })
      }
    }
    return (
      <div className="tree">
        <button className="rt-back" onClick={() => setFocus(null)}>← Back to {cfg.name}</button>
        <div className="gen">
          <div className="node self">
            <button className="node-av" onClick={() => onPerson(focus.id)}>
              <Av src={focus.photo} seed={focus.name} />
            </button>
            <div className="node-nm">{focus.name}</div>
            {focus.relation && <div className="node-rl">{focus.relation}</div>}
            <button className="rt-profile" onClick={() => onPerson(focus.id)}>View profile</button>
          </div>
        </div>
        <div className="tree-line" />
        {connections.length === 0 && <p className="p-empty">No connections added yet.</p>}
        <div className="gen">
          {connections.map(c => (
            <div className="node" key={c.key}>
              <button className="node-av" onClick={() => {
                if (c.id == null) setFocus(null)
                else focusOn({ id: c.id, name: c.name, photo: c.photo, relation: c.label })
              }}>
                <Av src={c.photo} seed={c.name} />
              </button>
              <div className="node-nm">{c.name}</div>
              {c.label && <div className="node-rl">{c.label}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Root view: the deceased + their immediate circle + groups
  return (
    <div className="tree">
      <div className="gen">
        <div className="node self">
          <button className="node-av" onClick={onDeceasedClick}>
            <Av src={portrait} seed={cfg.name} />
          </button>
          <div className="node-nm">{cfg.name}</div>
          <div className="node-dates">{cfg.born.split(" ").pop()}–{cfg.passed.split(" ").pop()}</div>
        </div>
      </div>
      <div className="tree-line" />
      {rootEdges.length === 0 && <p className="p-empty">The relation tree has not been set up yet.</p>}
      <div className="gen">
        {rootEdges.map(e => (
          <div className="node" key={e.id}>
            <button className="node-av" onClick={() => focusOn({ id: e.person_a, name: e.a_name, photo: e.a_photo, relation: e.relation || e.a_relation || '' })}>
              <Av src={e.a_photo} seed={e.a_name} />
            </button>
            <div className="node-nm">{e.a_name}</div>
            {(e.relation || e.a_relation) && <div className="node-rl">{e.relation || e.a_relation}</div>}
          </div>
        ))}
      </div>
      {groups.length > 0 && <GroupRow groups={groups} onGroup={onGroup} />}
    </div>
  )
}

function GroupRow({ groups, onGroup }: { groups: Group[]; onGroup: (id: number) => void }) {
  return (
    <>
      <div className="tree-line" />
      <div className="rt-groups-label">Groups</div>
      <div className="gen">
        {groups.map(g => (
          <div className="node" key={'g' + g.id}>
            <button className="node-av rt-group-av" onClick={() => onGroup(g.id)}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
            <div className="node-nm">{g.name}</div>
            <div className="node-rl">{g.member_count} {g.member_count === 1 ? 'member' : 'members'}</div>
          </div>
        ))}
      </div>
    </>
  )
}
