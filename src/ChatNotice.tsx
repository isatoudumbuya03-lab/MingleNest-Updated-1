import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import './chat-notify.css'

// Unread tracking for private chats. Messages come from the existing `messages` table
// (RLS decides what this user can see). The read position lives in the existing
// `conversation_members.last_read_at` column (own row only), so it syncs across devices.
type Incoming = { sender: string; at: string; conv: string }
export type ChatNotice = { id: string; contactId: string; name: string; preview: string }
type Contact = { id: string; name: string }

const previewOf = (row: { message_type?: string | null; content?: string | null }) => {
  switch (row.message_type) {
    case 'voice': return 'Voice message'
    case 'image': case 'ai_image': return 'Photo'
    case 'video': return 'Video'
    case 'document': return 'Document'
    case 'text': return (row.content || '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'New message'
    default: return 'New message'
  }
}

export function useChatNotifications({ userId, contacts, activeContactId, tab, messageCount }: { userId: string | null; contacts: Contact[]; activeContactId: string | null; tab: string; messageCount: number }) {
  const readRef = useRef<Record<string, string>>({})
  const baseRef = useRef(new Date().toISOString())
  const [incoming, setIncoming] = useState<Record<string, Incoming>>({})
  const [notice, setNotice] = useState<ChatNotice | null>(null)
  const [version, setVersion] = useState(0)
  const noticed = useRef(new Set<string>())
  const contactsRef = useRef(contacts)
  contactsRef.current = contacts
  const viewing = tab === 'chats' ? activeContactId : null
  const viewingRef = useRef<string | null>(null)
  viewingRef.current = viewing
  const readAt = (conv: string) => readRef.current[conv] || baseRef.current

  useEffect(() => {
    readRef.current = {}; baseRef.current = new Date().toISOString(); setIncoming({}); setNotice(null); noticed.current.clear()
    if (!userId) return
    let live = true
    const sync = async () => {
      const [members, msgs] = await Promise.all([
        supabase.from('conversation_members').select('conversation_id,last_read_at').eq('user_id', userId),
        supabase.from('messages').select('id,conversation_id,sender_user_id,created_at').neq('sender_user_id', userId).order('created_at', { ascending: false }).limit(500),
      ])
      if (!live || msgs.error || !msgs.data) return
      if (!members.error && members.data) {
        const next: Record<string, string> = { ...readRef.current }
        for (const m of members.data) {
          const dbValue = m.last_read_at as string | null
          if (dbValue && (!next[m.conversation_id as string] || Date.parse(dbValue) > Date.parse(next[m.conversation_id as string]))) next[m.conversation_id as string] = dbValue
        }
        readRef.current = next
      }
      setIncoming(Object.fromEntries(msgs.data.map(row => [row.id as string, { sender: row.sender_user_id as string, at: row.created_at as string, conv: row.conversation_id as string }])))
      setVersion(v => v + 1)
    }
    void sync()
    const channel = supabase.channel(`chat-inbox:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const row = payload.new as { id: string; conversation_id: string; sender_user_id: string; created_at: string; message_type?: string; content?: string }
        if (!row?.id || row.sender_user_id === userId) return
        setIncoming(prev => prev[row.id] ? prev : { ...prev, [row.id]: { sender: row.sender_user_id, at: row.created_at, conv: row.conversation_id } })
        const isViewing = viewingRef.current === row.sender_user_id && !document.hidden
        if (isViewing || noticed.current.has(row.id)) return
        noticed.current.add(row.id)
        const name = contactsRef.current.find(c => c.id === row.sender_user_id)?.name || 'New message'
        const preview = previewOf(row)
        setNotice({ id: row.id, contactId: row.sender_user_id, name, preview })
        if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try { new Notification(name, { body: preview, tag: row.id }) } catch { /* not supported in this webview */ }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        const id = (payload.old as { id?: string })?.id
        if (id) setIncoming(prev => { if (!prev[id]) return prev; const next = { ...prev }; delete next[id]; return next })
      })
      .subscribe()
    const timer = window.setInterval(() => void sync(), 30000)
    const onFocus = () => void sync()
    window.addEventListener('focus', onFocus)
    return () => { live = false; supabase.removeChannel(channel); window.clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [userId])

  // Opening a conversation (or receiving a message while it is open) saves last_read_at on the user's own membership row.
  useEffect(() => {
    if (!userId || !viewing || document.hidden) return
    const latestByConv = new Map<string, number>()
    for (const m of Object.values(incoming)) {
      if (m.sender !== viewing) continue
      const t = Date.parse(m.at)
      if (t > Date.parse(readAt(m.conv))) latestByConv.set(m.conv, Math.max(latestByConv.get(m.conv) || 0, t))
    }
    latestByConv.forEach((t, conv) => {
      const iso = new Date(t).toISOString()
      const previous = readRef.current[conv]
      readRef.current = { ...readRef.current, [conv]: iso }
      setVersion(v => v + 1)
      void supabase.from('conversation_members').update({ last_read_at: iso }).eq('conversation_id', conv).eq('user_id', userId).then(({ error }) => {
        if (error) console.warn('Could not save read state', error.message)
        if (error && readRef.current[conv] === iso) { readRef.current = { ...readRef.current, [conv]: previous || baseRef.current }; setVersion(v => v + 1) }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing, incoming, messageCount, userId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const unreadBy = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of Object.values(incoming)) {
      if (Date.parse(m.at) > Date.parse(readAt(m.conv))) counts[m.sender] = (counts[m.sender] || 0) + 1
    }
    return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming, version])
  const unreadTotal = Object.values(unreadBy).reduce((a, b) => a + b, 0)
  return { unreadBy, unreadTotal, notice, dismiss: () => setNotice(null) }
}

export function ChatNoticeBanner({ notice, onOpen, onClose }: { notice: ChatNotice | null; onOpen: (contactId: string, name: string) => void; onClose: () => void }) {
  if (!notice) return null
  return <div className="chat-notice" role="status" aria-live="polite">
    <button type="button" className="chat-notice-main" onClick={() => { onOpen(notice.contactId, notice.name); onClose() }}><strong translate="no">{notice.name}</strong><span translate="no">{notice.preview}</span></button>
    <button type="button" className="chat-notice-x" aria-label="Dismiss notification" onClick={onClose}>×</button>
  </div>
}
