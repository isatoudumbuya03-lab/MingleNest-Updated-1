import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from './supabase'
import { localizeView, type Language } from './i18n'
import type { ChatContact } from './privateChat'
import './chats-redesign.css'

type PublicProfile = { id: string; full_name: string; username: string; bio: string; avatar_url: string | null }
const face = (url: string | null, name: string) => <span className="avatar avatar-small">{url ? <img src={url} alt="" /> : (name || '—').charAt(0).toUpperCase()}</span>

// One username search bar. Searches real profiles (case-insensitive, with or without "@"), never the signed-in user.
// `children` (the conversation list) is shown only while the search box is empty.
export default function ContactsPanel({ language, onChat, onError, children }: { language: Language; onChat: (person: ChatContact) => void; onError: (message: string) => void; children?: ReactNode }) {
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [owner, setOwner] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<PublicProfile | null>(null)
  const value = query.trim().replace(/^@/, '').replace(/[%_\\,()]/g, '')

  useEffect(() => {
    const focus = () => { input.current?.focus(); input.current?.scrollIntoView({ block: 'center' }) }
    window.addEventListener('minglenest-add-contact', focus)
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) setOwner(data.session?.user.id || null) })
    return () => { active = false; window.removeEventListener('minglenest-add-contact', focus) }
  }, [])

  useEffect(() => {
    if (!value || !owner) { setResults([]); setFailed(false); setSearching(false); return }
    let live = true
    setSearching(true)
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.from('profiles').select('id,full_name,username,bio,avatar_url').neq('id', owner).ilike('username', `%${value}%`).limit(30)
      if (!live) return
      setSearching(false)
      if (error) { setFailed(true); setResults([]); onError('Something went wrong. Please try again.'); return }
      setFailed(false)
      const exact = value.toLowerCase()
      setResults((data || []).sort((a, b) => Number((b.username || '').toLowerCase() === exact) - Number((a.username || '').toLowerCase() === exact) || (a.username || '').localeCompare(b.username || '')))
    }, 250)
    return () => { live = false; window.clearTimeout(timer) }
  }, [value, owner])

  const chatWith = (person: PublicProfile) => onChat({ id: person.id, name: person.full_name || person.username, username: person.username, avatar: person.avatar_url || undefined })
  return localizeView(<section className="chats-search">
    <label className="search-box chats-search-bar">
      <Search size={18} />
      <input ref={input} id="contact-user-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by username…" aria-label="Search by username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      {query && <button type="button" className="chats-search-clear" onClick={() => { setQuery(''); input.current?.focus() }} aria-label="Clear search"><X size={16} /></button>}
    </label>
    {value ? <div className="chats-results" role="status">
      {searching && <p className="chats-hint">Searching…</p>}
      {!searching && failed && <p className="chats-hint">Could not load results. Please try again.</p>}
      {!searching && !failed && !results.length && <p className="chats-hint">No users found for @{value}.</p>}
      {results.map(person => <button type="button" className="chat-row chats-result" key={person.id} onClick={() => setSelected(person)}>
        {face(person.avatar_url, person.full_name || person.username)}
        <span className="chat-row-copy" translate="no"><strong>{person.full_name || person.username}</strong><small>@{person.username}</small></span>
      </button>)}
    </div> : children}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal-panel" role="dialog" aria-modal="true" aria-label="Profile" onClick={event => event.stopPropagation()}><div className="modal-top"><h2>Profile</h2><button onClick={() => setSelected(null)} aria-label="Close"><X size={21} /></button></div><div className="modal-content"><div translate="no">{selected.avatar_url && <span className="avatar avatar-large"><img src={selected.avatar_url} alt="" /></span>}<h3>{selected.full_name}</h3><p>@{selected.username}</p><p>{selected.bio}</p></div><button className="primary-button" onClick={() => { chatWith(selected); setSelected(null); setQuery('') }}>Message {selected.full_name || ''} (@{selected.username})</button></div></div></div>}
  </section>, language)
}
