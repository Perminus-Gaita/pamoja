'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { photoThumb } from '@/lib/photo'
import { memorialBase } from '@/lib/paths'
import { apiFetch } from '@/lib/api'

// A group of people (e.g. "Class of 2012") with their condolences together.

type Member = { id: number; name: string; relation: string; photo: string; family_group?: string }
type Condolence = { id: number; name: string; relation: string; message: string; person_id: number; created_at: string }
type Group = { id: number; name: string; description: string; members: Member[]; condolences: Condolence[] }

function Av({ src, seed }: { src?: string; seed: string }) {
  const url = src && src.trim()
    ? photoThumb(src)
    : `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f5f0e8`
  return <img src={url} alt={seed} loading="lazy" />
}

export default function GroupPage({ groupId }: { groupId: string }) {
  const router = useRouter()
  const base = memorialBase(usePathname())
  const [group, setGroup] = useState<Group | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    apiFetch(`/api/groups/${groupId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setGroup)
      .catch(() => setFailed(true))
  }, [groupId])

  if (failed) return (
    <div className="pp-page"><div className="pp-card">
      <p className="p-empty">Group not found.</p>
      <button className="btn ghost sm" onClick={() => router.push(base || '/')}>← Back to the memorial</button>
    </div></div>
  )
  if (!group) return <div className="pp-page"><div className="pp-card"><p className="p-empty">Loading…</p></div></div>

  return (
    <div className="pp-page">
      <div className="pp-card">
        <button className="pp-back" onClick={() => router.push(`${base}/family`)}>← Back to the memorial</button>

        <h1 className="pp-name">{group.name}</h1>
        {group.description && <p className="pp-bio">{group.description}</p>}
        <p className="pp-rel">{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</p>

        <div className="gp-members">
          {group.members.map(m => (
            <button key={m.id} className="gp-member" onClick={() => router.push(`${base}/p/${m.id}`)}>
              <div className="gp-av"><Av src={m.photo} seed={m.name} /></div>
              <span>{m.name}</span>
            </button>
          ))}
        </div>

        <h2 className="gp-h2">Condolences from the group</h2>
        {group.condolences.length === 0 && <p className="p-empty">No condolences from this group yet.</p>}
        {group.condolences.map(c => (
          <div className="cond-item" key={c.id}>
            <div className="cond-head cond-head-link" onClick={() => router.push(`${base}/p/${c.person_id}`)} role="button">
              <div className="cond-av"><Av src="" seed={c.name} /></div>
              <div>
                <div className="cond-name">{c.name}</div>
                {c.relation && <div className="cond-rel">{c.relation}</div>}
              </div>
            </div>
            <p className="cond-msg">{c.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
