import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from './supabase'
import { signStatusUrl } from './statusMedia'
import './status-row.css'

export type RowExtra = { ownerId?: string; name: string; image?: string; count: number; index: number }
type Row = { owner: string; count: number; unseen: number; name: string; avatar?: string | null; fallback?: string | null }

/** Circle face: tries the picture, then the profile photo, then the first initial — never a broken image. */
function Face({ name, img, fallback }: { name: string; img?: string | null; fallback?: string | null }) {
  const [failed, setFailed] = useState<string[]>([])
  const src = [img, fallback].find(u => u && !failed.includes(u))
  return <span className="sr-face">{src ? <img key={src} src={src} alt="" onError={() => setFailed(f => [...f, src])} /> : (name.trim().charAt(0) || '?').toUpperCase()}</span>
}

/** Group any list of items by owner (user id when known, otherwise exact name) so each person shows once. */
export function groupByOwner<T extends { ownerId?: string; name: string; image?: string }>(list: T[]): RowExtra[] {
  const map = new Map<string, RowExtra>()
  list.forEach((s, index) => {
    const key = s.ownerId || `name:${s.name}`
    const found = map.get(key)
    if (found) found.count += 1
    else map.set(key, { ownerId: s.ownerId, name: s.name, image: s.image, count: 1, index })
  })
  return [...map.values()]
}

export default function StatusRow({ userId, extras, onAdd, onExtra, onOpenTab }: {
  userId?: string; extras: RowExtra[]; onAdd: () => void; onExtra: (index: number) => void; onOpenTab: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => {
    if (!userId) return
    let live = true
    const load = async () => {
      const since = new Date(Date.now() - 864e5).toISOString()
      const [st, views, profs] = await Promise.all([
        supabase.from('status_updates').select('id,owner_id,kind,media_path,created_at,expires_at').gt('expires_at', new Date().toISOString()).gt('created_at', since).order('created_at'),
        supabase.from('status_views').select('status_id').eq('user_id', userId),
        supabase.from('profiles').select('id,username,full_name,avatar_url'),
      ])
      if (!live || st.error) return
      const seen = new Set((views.data || []).map(v => v.status_id))
      const pm = new Map((profs.data || []).map(p => [p.id, p]))
      const g = new Map<string, Row>()
      const firstPhoto = new Map<string, { path: string; expires: string }>()
      ;(st.data || []).forEach(s => { if (s.kind === 'photo' && s.media_path && !firstPhoto.has(s.owner_id)) firstPhoto.set(s.owner_id, { path: s.media_path, expires: s.expires_at }) })
      const thumbs = new Map<string, string>()
      await Promise.all([...firstPhoto.entries()].map(async ([owner, f]) => {
        const url = await signStatusUrl(f.path, f.expires)
        if (url) thumbs.set(owner, url)
      }))
      if (!live) return
      ;(st.data || []).forEach(s => {
        const p = pm.get(s.owner_id)
        const label = s.owner_id === userId ? ((p?.full_name || p?.username || 'Me').trim().split(/\s+/)[0]) : (p?.username || p?.full_name || 'Member')
        const r = g.get(s.owner_id) || { owner: s.owner_id, count: 0, unseen: 0, name: label, avatar: thumbs.get(s.owner_id) || p?.avatar_url, fallback: p?.avatar_url }
        r.count += 1
        if (s.owner_id !== userId && !seen.has(s.id)) r.unseen += 1
        g.set(s.owner_id, r)
      })
      setRows([...g.values()].sort((a, b) => Number(b.unseen > 0) - Number(a.unseen > 0)))
    }
    void load()
    const t = setInterval(() => void load(), 30000)
    return () => { live = false; clearInterval(t) }
  }, [userId])
  const statusOwners = new Set(rows.map(r => r.owner))
  const storyOf = new Map(extras.filter(e => e.ownerId).map(e => [e.ownerId as string, e]))
  const face = (name: string, img?: string | null, fallback?: string | null) => <Face name={name} img={img} fallback={fallback} />
  return (
    <div className="story-avatars sr-row">
      <button className="sr-item" onClick={onAdd}><span className="sr-ring sr-add"><span className="sr-face"><Plus size={20} /></span></span><small>Your story</small></button>
      {rows.map(r => (
        <button className="sr-item" key={r.owner} onClick={() => { sessionStorage.setItem('mn-open-status-owner', r.owner); onOpenTab() }}>
          <span className={`sr-ring ${r.unseen > 0 ? 'new' : 'seen'}`}>{face(r.name, r.avatar, r.fallback)}{r.count + (storyOf.get(r.owner)?.count || 0) > 1 && <b className="sr-count">{r.count + (storyOf.get(r.owner)?.count || 0)}</b>}</span>
          <small translate="no">{r.name}</small>
        </button>
      ))}
      {extras.filter(e => !(e.ownerId && statusOwners.has(e.ownerId))).slice(0, 12).map(e => (
        <button className="sr-item" key={`story-${e.ownerId || e.name}`} aria-label={`${e.name}'s story`} onClick={() => onExtra(e.index)}>
          <span className="sr-ring new">{face(e.name, e.image)}{e.count > 1 && <b className="sr-count">{e.count}</b>}</span>
          <small translate="no">{e.name.split(' ')[0]}</small>
        </button>
      ))}
    </div>
  )
}
