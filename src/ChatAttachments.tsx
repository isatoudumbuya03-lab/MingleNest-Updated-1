import { useEffect, useMemo, useRef, useState } from 'react'
import { Paperclip, Image as ImageIcon, Camera, MapPin, UserRound, FileText, BarChart3, CalendarDays, Video, Sparkles, X, Plus, Send, RefreshCw, Smile } from 'lucide-react'
import { Browser } from '@capacitor/browser'
import { supabase, resizeImage } from './supabase'
import { sendPrivateMedia, sendPrivatePayload, privateMediaUrl, type ChatContact, type PrivateMessage } from './privateChat'
import { formatCreatedAt } from './timestamps'
import { type Language } from './i18n'
import SafeVideo from './SafeVideo'
import './chat-attachments.css'
import './chat-layout.css'

type Sheet = null | 'menu' | 'contact' | 'poll' | 'event' | 'ai'

export function VoiceDraftPreview({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <audio className="voice-draft-audio" controls preload="metadata" src={url} aria-label="Listen to your voice message" />
}

const EMOJIS = ['😀', '😂', '😍', '🥰', '😊', '😉', '😎', '🤗', '😢', '😭', '😡', '🙏', '👍', '👏', '🙌', '💪', '❤️', '💜', '🔥', '🎉', '✨', '🌙', '🌸', '🎂']

export function EmojiButton({ onPick, disabled }: { onPick: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return <span className="emoji-wrap">
    <button type="button" className="emoji-trigger" onClick={() => setOpen(v => !v)} disabled={disabled} aria-label="Emoji" aria-expanded={open}><Smile size={18} /></button>
    {open && <div className="emoji-pop" role="listbox" aria-label="Emoji">{EMOJIS.map(e => <button type="button" key={e} onClick={() => { onPick(e); setOpen(false) }} aria-label={e}>{e}</button>)}</div>}
  </span>
}

export function ChatAttachments({ chatId, userId, contacts, disabled, onSent, onError }: { chatId: string | null; userId: string | undefined; contacts: ChatContact[]; disabled?: boolean; onSent: (message: PrivateMessage) => void; onError: (text: string) => void }) {
  const [sheet, setSheet] = useState<Sheet>(null)
  const [busy, setBusy] = useState(false)
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const docs = useRef<HTMLInputElement>(null)
  const videos = useRef<HTMLInputElement>(null)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [place, setPlace] = useState('')
  const [details, setDetails] = useState('')
  const [prompt, setPrompt] = useState('')
  const [aiImage, setAiImage] = useState<{ blob: Blob; url: string } | null>(null)
  useEffect(() => () => { if (aiImage) URL.revokeObjectURL(aiImage.url) }, [aiImage])
  const ready = !!chatId && !!userId && !disabled
  const close = () => { if (!busy) setSheet(null) }
  const run = async (task: () => Promise<PrivateMessage | void>) => {
    if (!chatId || !userId || busy) return
    setBusy(true)
    try { const message = await task(); if (message) onSent(message); setSheet(null) }
    catch (error) { onError(error instanceof Error ? error.message : 'Could not send. Please try again.') }
    finally { setBusy(false) }
  }
  const sendFile = (event: React.ChangeEvent<HTMLInputElement>, forceDocument = false) => {
    const picked = event.target.files?.[0]; event.target.value = ''
    if (!picked || !chatId || !userId) return
    if (picked.size > 100 * 1024 * 1024) { onError('Choose a file under 100 MB.'); return }
    setSheet('menu')
    const ext = (picked.name.split('.').pop() || '').toLowerCase()
    const guessed = ['mp4', 'm4v', 'mov', '3gp', 'webm'].includes(ext) ? 'video/' + ext : ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'].includes(ext) ? 'image/' + ext : ''
    const file = !picked.type && guessed ? new File([picked], picked.name, { type: guessed }) : picked
    void run(async () => {
      if (!forceDocument && file.type.startsWith('image/')) {
        let body: Blob = file
        try { body = await resizeImage(file, 2048) } catch { body = file }
        return sendPrivateMedia(chatId, userId, body, 'image', file.name || 'photo.jpg')
      }
      if (!forceDocument && file.type.startsWith('video/')) return sendPrivateMedia(chatId, userId, file, 'video', file.name || 'video.mp4')
      return sendPrivateMedia(chatId, userId, file, 'document', file.name || 'document')
    })
  }
  const sendLocation = () => {
    if (!navigator.geolocation) { onError('Location is not available on this device'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(async position => {
      setBusy(false)
      void run(() => sendPrivatePayload(chatId!, userId!, 'location', { lat: position.coords.latitude, lng: position.coords.longitude }))
    }, () => { setBusy(false); onError('Allow location access to share where you are') }, { enableHighAccuracy: true, timeout: 15000 })
  }
  const makeImage = async () => {
    if (!prompt.trim() || busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-chat-image', { body: { prompt: prompt.trim() } })
      if (error || !data?.image) throw new Error(data?.error || 'The image could not be created. Please try again.')
      const bytes = Uint8Array.from(atob(data.image), c => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: data.mimeType || 'image/png' })
      setAiImage({ blob, url: URL.createObjectURL(blob) })
    } catch (error) { onError(error instanceof Error ? error.message : 'The image could not be created.') }
    finally { setBusy(false) }
  }
  const items: { key: string; label: string; icon: React.ReactNode; action: () => void }[] = [
    { key: 'gallery', label: 'Gallery', icon: <ImageIcon size={22} />, action: () => gallery.current?.click() },
    { key: 'camera', label: 'Camera', icon: <Camera size={22} />, action: () => camera.current?.click() },
    { key: 'video', label: 'Video', icon: <Video size={22} />, action: () => videos.current?.click() },
    { key: 'location', label: 'Location', icon: <MapPin size={22} />, action: sendLocation },
    { key: 'contact', label: 'Contact', icon: <UserRound size={22} />, action: () => setSheet('contact') },
    { key: 'document', label: 'Document', icon: <FileText size={22} />, action: () => docs.current?.click() },
    { key: 'poll', label: 'Poll', icon: <BarChart3 size={22} />, action: () => setSheet('poll') },
    { key: 'event', label: 'Event', icon: <CalendarDays size={22} />, action: () => setSheet('event') },
    { key: 'ai', label: 'AI Images', icon: <Sparkles size={22} />, action: () => setSheet('ai') },
  ]
  const cleanOptions = options.map(o => o.trim()).filter(Boolean)
  return <>
    <button type="button" className="attach-trigger" onClick={() => setSheet(sheet ? null : 'menu')} disabled={!ready || busy} aria-label="Attach" aria-expanded={!!sheet}><Paperclip size={18} /></button>
    <input ref={gallery} type="file" accept="image/*,video/*" hidden onChange={sendFile} />
    <input ref={camera} type="file" accept="image/*,video/*" capture="environment" hidden onChange={sendFile} />
    <input ref={videos} type="file" accept="video/*" hidden onChange={sendFile} />
    <input ref={docs} type="file" hidden onChange={e => sendFile(e, true)} />
    {sheet && <div className="attach-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className="attach-sheet" role="dialog" aria-modal="true" aria-label="Attach to chat">
        <div className="attach-top"><strong>{sheet === 'menu' ? 'Share' : sheet === 'contact' ? 'Share a contact' : sheet === 'poll' ? 'Create a poll' : sheet === 'event' ? 'Create an event' : 'AI Images'}</strong><button type="button" onClick={close} aria-label="Close"><X size={20} /></button></div>
        {busy && sheet === 'menu' && <p className="attach-note">Sending…</p>}
        {sheet === 'menu' && <div className="attach-grid">{items.map(item => <button type="button" key={item.key} disabled={busy} onClick={item.action}><span>{item.icon}</span>{item.label}</button>)}</div>}
        {sheet === 'contact' && <div className="attach-list">{!contacts.length && <p className="attach-note">Your MingleNest contacts will appear here.</p>}{contacts.map(person => <button type="button" key={person.id} disabled={busy} onClick={() => void run(() => sendPrivatePayload(chatId!, userId!, 'contact', { userId: person.id, name: person.name, username: person.username || '' }))}><UserRound size={18} /><span translate="no">{person.name}{person.username ? ` · @${person.username}` : ''}</span></button>)}</div>}
        {sheet === 'poll' && <form className="attach-form" onSubmit={e => { e.preventDefault(); if (question.trim() && cleanOptions.length >= 2) void run(async () => { const m = await sendPrivatePayload(chatId!, userId!, 'poll', { question: question.trim().normalize('NFC'), options: cleanOptions.map(o => o.normalize('NFC')) }); setQuestion(''); setOptions(['', '']); return m }) }}>
          <label>Question<input value={question} onChange={e => setQuestion(e.target.value)} maxLength={200} placeholder="Ask something…" dir="auto" /></label>
          {options.map((option, index) => <label key={index}>Option {index + 1}<input value={option} onChange={e => setOptions(current => current.map((o, i) => i === index ? e.target.value : o))} maxLength={100} dir="auto" /></label>)}
          {options.length < 6 && <button type="button" className="text-link" onClick={() => setOptions(current => [...current, ''])}><Plus size={15} /> Add option</button>}
          <button className="primary-button" disabled={busy || !question.trim() || cleanOptions.length < 2}>Send poll</button></form>}
        {sheet === 'event' && <form className="attach-form" onSubmit={e => { e.preventDefault(); const when = new Date(startsAt); if (title.trim() && !Number.isNaN(when.getTime())) void run(async () => { const m = await sendPrivatePayload(chatId!, userId!, 'event', { title: title.trim().normalize('NFC'), startsAt: when.toISOString(), place: place.trim().normalize('NFC'), details: details.trim().normalize('NFC') }); setTitle(''); setStartsAt(''); setPlace(''); setDetails(''); return m }) }}>
          <label>Event name<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} dir="auto" /></label>
          <label>Date and time<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} /></label>
          <label>Place<input value={place} onChange={e => setPlace(e.target.value)} maxLength={120} dir="auto" /></label>
          <label>Details<textarea rows={3} value={details} onChange={e => setDetails(e.target.value)} maxLength={500} dir="auto" /></label>
          <button className="primary-button" disabled={busy || !title.trim() || !startsAt}>Send event</button></form>}
        {sheet === 'ai' && <div className="attach-form">
          {!aiImage ? <><label>Describe the picture<textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={500} placeholder="A sleepy fox under a purple moon" dir="auto" /></label>
            <button type="button" className="primary-button" disabled={busy || !prompt.trim()} onClick={() => void makeImage()}><Sparkles size={16} /> {busy ? 'Creating…' : 'Create image'}</button></>
            : <><img className="attach-ai-preview" src={aiImage.url} alt="Generated preview" />
              <div className="attach-row"><button type="button" className="secondary-button" disabled={busy} onClick={() => { setAiImage(null) }}><RefreshCw size={15} /> Try again</button>
                <button type="button" className="primary-button" disabled={busy} onClick={() => void run(async () => { const m = await sendPrivateMedia(chatId!, userId!, aiImage.blob, 'ai_image', 'ai-image.png'); setAiImage(null); setPrompt(''); return m })}><Send size={15} /> Send</button></div></>}
        </div>}
      </div>
    </div>}
  </>
}

export function ChatMessageBody({ message, myId, language, onError }: { message: PrivateMessage; myId?: string; language: Language; onError: (text: string) => void }) {
  const [url, setUrl] = useState('')
  const [votes, setVotes] = useState<{ user_id: string; option_index: number }[]>([])
  const kind = message.message_type
  useEffect(() => {
    let live = true
    if (message.media_path && ['image', 'video', 'document', 'ai_image'].includes(kind)) privateMediaUrl(message.media_path).then(link => { if (live) setUrl(link) }).catch(() => { if (live) onError('Could not load the attachment') })
    return () => { live = false }
  }, [message.media_path, kind])
  const loadVotes = async () => { const { data } = await supabase.from('message_poll_votes').select('user_id,option_index').eq('message_id', message.id); setVotes(data || []) }
  useEffect(() => { if (kind === 'poll') { void loadVotes(); const t = window.setInterval(() => void loadVotes(), 8000); return () => clearInterval(t) } }, [message.id, kind])
  const vote = async (index: number) => {
    if (!myId) return
    const mine = votes.find(v => v.user_id === myId)
    if (mine?.option_index === index) return
    if (mine) { const r = await supabase.from('message_poll_votes').delete().eq('message_id', message.id).eq('user_id', myId); if (r.error) { onError('Could not save your vote'); return } }
    const { error } = await supabase.from('message_poll_votes').insert({ message_id: message.id, user_id: myId, option_index: index })
    if (error) onError('Could not save your vote'); else void loadVotes()
  }
  const open = (link: string) => { void Browser.open({ url: link }).catch(() => window.open(link, '_blank', 'noopener')) }
  const p = message.payload || {}
  if (kind === 'image' || kind === 'ai_image') return url ? <img className="chat-media" src={url} alt={kind === 'ai_image' ? 'AI image' : 'Shared photo'} loading="lazy" /> : <span className="chat-media-loading">Loading photo…</span>
  if (kind === 'video') return url ? <SafeVideo src={url} className="chat-media" label="Shared video" /> : <span className="chat-media-loading">Loading video…</span>
  if (kind === 'document') return <button type="button" className="chat-card" disabled={!url} onClick={() => open(url)}><FileText size={20} /><span translate="no">{message.media_name || 'Document'}</span></button>
  if (kind === 'location') { const link = `https://www.google.com/maps?q=${Number(p.lat)},${Number(p.lng)}`; return <button type="button" className="chat-card" onClick={() => open(link)}><MapPin size={20} /><span>Shared location<small>{Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)}</small></span></button> }
  if (kind === 'contact') return <div className="chat-card"><UserRound size={20} /><span translate="no">{String(p.name || 'Contact')}<small>{p.username ? `@${p.username}` : 'MingleNest contact'}</small></span></div>
  if (kind === 'event') return <div className="chat-card event"><CalendarDays size={20} /><span translate="no"><strong>{String(p.title || 'Event')}</strong><small>{p.startsAt ? formatCreatedAt(String(p.startsAt), language) : ''}</small>{p.place ? <small>{String(p.place)}</small> : null}{p.details ? <small>{String(p.details)}</small> : null}</span></div>
  if (kind === 'poll') { const opts: string[] = Array.isArray(p.options) ? p.options : []; const mine = votes.find(v => v.user_id === myId)?.option_index; return <div className="chat-poll"><strong translate="no" dir="auto">{String(p.question || '')}</strong>{opts.map((option, index) => { const count = votes.filter(v => v.option_index === index).length; return <button type="button" key={index} className={mine === index ? 'voted' : ''} onClick={() => void vote(index)}><span translate="no" dir="auto">{option}</span><em>{count}</em></button> })}</div> }
  return null
}
