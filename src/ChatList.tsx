import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { ChatContact } from './privateChat'

type Last = { at: string; kind: string | null; text: string | null; mine: boolean }

const preview = (last: Last) => {
  const body = last.kind === 'voice' ? 'Voice message' : last.kind === 'image' || last.kind === 'ai_image' ? 'Photo' : last.kind === 'video' ? 'Video' : last.kind === 'document' ? 'Document' : last.kind === 'text' ? (last.text || '').replace(/\s+/g, ' ').trim() || 'Message' : 'Message'
  return last.mine ? `You: ${body}` : body
}
const when = (iso: string) => {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

// Conversation list built from the real conversation_members + messages tables (RLS limits both to the user's own chats).
export default function ChatList({ userId, contacts, unreadBy, activeId, refreshKey, onOpen }: { userId: string; contacts: ChatContact[]; unreadBy: Record<string, number>; activeId: string | null; refreshKey: number; onOpen: (name: string, id: string) => void }) {
  const [last, setLast] = useState<Record<string, Last> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    const load = async () => {
      const [members, msgs] = await Promise.all([
        supabase.from('conversation_members').select('conversation_id,user_id'),
        supabase.from('messages').select('conversation_id,sender_user_id,message_type,content,created_at').not('conversation_id', 'is', null).order('created_at', { ascending: false }).limit(500),
      ])
      if (!live) return
      if (members.error || msgs.error) { setFailed(true); setLast(current => current || {}); return }
      setFailed(false)
      const other: Record<string, string> = {}
      for (const m of members.data || []) if (m.user_id !== userId) other[m.conversation_id as string] = m.user_id as string
      const next: Record<string, Last> = {}
      for (const row of msgs.data || []) {
        const person = other[row.conversation_id as string]
        if (person && !next[person]) next[person] = { at: row.created_at as string, kind: row.message_type as string, text: row.content as string | null, mine: row.sender_user_id === userId }
      }
      setLast(next)
    }
    void load()
    const channel = supabase.channel(`chat-list:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => void load())
      .subscribe()
    window.addEventListener('focus', load)
    return () => { live = false; supabase.removeChannel(channel); window.removeEventListener('focus', load) }
  }, [userId, refreshKey])

  const rows = (last ? contacts.filter(c => last[c.id]) : []).sort((a, b) => Date.parse(last![b.id].at) - Date.parse(last![a.id].at))
  return <div className="chats-list">
    <div className="chats-list-title">Messages</div>
    {last === null && <p className="chats-hint">Loading conversations…</p>}
    {failed && <p className="chats-hint">Could not load conversations. Pull to refresh or try again.</p>}
    {last !== null && !failed && !rows.length && <p className="chats-hint">No conversations yet. Search a username above to say hello.</p>}
    {rows.map(person => {
      const l = last![person.id], unread = unreadBy[person.id] || 0
      return <button type="button" key={person.id} className={`chat-row chats-convo ${activeId === person.id ? 'selected' : ''}`} onClick={() => onOpen(person.name, person.id)}>
        <span className="avatar avatar-small">{person.avatar ? <img src={person.avatar} alt="" /> : (person.name || '—').charAt(0).toUpperCase()}</span>
        <span className="chat-row-copy" translate="no">
          <strong>{person.name}{person.username ? <em> @{person.username}</em> : null}</strong>
          <small className={unread ? 'chats-unread-text' : ''}>{preview(l)}</small>
        </span>
        <span className="chats-meta"><time dateTime={l.at}>{when(l.at)}</time>{unread > 0 && <b aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</b>}</span>
      </button>
    })}
  </div>
}
