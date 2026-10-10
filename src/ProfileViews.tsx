import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from './supabase'
import { formatCreatedAt } from './timestamps'
import { type Language } from './i18n'
import SafeVideo, { VideoThumb } from './SafeVideo'
import { ImagePlus } from 'lucide-react'

type CardPost = { id: number | string; text: string; image?: string; video?: string; createdAt?: string }
// Clear list of posts/videos: thumbnail, readable title, date and time. Tapping opens the full post.
export function PostCards<T extends CardPost>({ items, language, onOpen, empty }: { items: T[]; language: Language; onOpen: (item: T) => void; empty: string }) {
  if (!items.length) return <p className="contacts-note">{empty}</p>
  return <div className="profile-cards">{items.map(item => {
    const title = item.text.trim().split('\n')[0] || (item.video ? 'Video' : 'Photo')
    return <button type="button" className="profile-card" key={item.id} onClick={() => onOpen(item)}>
      {item.video ? <VideoThumb src={item.video} /> : item.image ? <img className="card-thumb" src={item.image} alt="" loading="lazy" /> : <span className="card-thumb"><ImagePlus size={22} /></span>}
      <span className="card-text"><span className="card-title" translate="no">{title}</span><span className="card-date">{item.video ? 'Video · ' : item.image ? 'Photo · ' : ''}{item.createdAt ? formatCreatedAt(item.createdAt, language) : ''}</span></span>
    </button>
  })}</div>
}
import CommentThread from './CommentThread'

type PostLike = { cloudId?: string; author: string; handle: string; avatarUrl?: string; createdAt?: string; text: string; image?: string; video?: string }

export function PostDetailModal({ post, userId, language, focusId, onClose, onError, onProfile }: { post: PostLike; userId: string | null; language: Language; focusId?: string; onClose: () => void; onError: (m: string) => void; onProfile?: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal-panel post-detail" role="dialog" aria-modal="true" aria-label="Post">
      <div className="modal-top"><h2>Post</h2><button onClick={onClose} aria-label="Close post"><X size={21} /></button></div>
      <div className="modal-content">
        <div className="post-author"><button className="text-link" onClick={onProfile} disabled={!onProfile}><strong translate="no">{post.author}</strong></button><span translate="no">@{post.handle}{post.createdAt && <> · <time dateTime={post.createdAt}>{formatCreatedAt(post.createdAt, language)}</time></>}</span></div>
        <p className="post-text" translate="no" dir="auto">{post.text}</p>
        {post.image && <img className="post-image" src={post.image} alt={`A moment shared by ${post.author}`} />}
        {post.video && <SafeVideo src={post.video} label={`Video shared by ${post.author}`} />}
        {post.cloudId && <CommentThread targetId={post.cloudId} kind="post" userId={userId} language={language} onError={onError} focusId={focusId} />}
      </div>
    </div>
  </div>
}

type Row = { id: string; content: string; image_url: string | null; video_path: string | null; created_at: string; video?: string }
export function PublicProfileModal({ userId, name, language, onClose, onError }: { userId: string; name: string; language: Language; onClose: () => void; onError: (m: string) => void }) {
  const [person, setPerson] = useState<{ username: string | null; full_name: string | null; avatar_url: string | null; bio: string | null } | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [stories, setStories] = useState<{ id: string; caption: string | null; media_url: string | null; created_at: string }[]>([])
  useEffect(() => {
    let live = true
    supabase.from('stories').select('id,caption,media_url,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30).then(({ data }) => { if (live) setStories(data || []) })
    ;(async () => {
      const [profile, posts] = await Promise.all([
        supabase.from('profiles').select('username,full_name,avatar_url,bio').eq('id', userId).maybeSingle(),
        supabase.from('posts').select('id,content,image_url,video_path,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      ])
      if (profile.error || posts.error) throw profile.error || posts.error
      const withVideo = await Promise.all((posts.data || []).map(async (row: Row) => { if (!row.video_path) return row; const link = await supabase.storage.from('post-videos').createSignedUrl(row.video_path, 3600); return { ...row, video: link.data?.signedUrl } }))
      if (live) { setPerson(profile.data); setRows(withVideo); setLoading(false) }
    })().catch(() => { if (live) { setLoading(false); onError('Could not load this profile') } })
    return () => { live = false }
  }, [userId])
  const display = person?.full_name || name
  return <div className="modal-backdrop profile-full-modal" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal-panel post-detail" role="dialog" aria-modal="true" aria-label="Profile">
      <div className="modal-top"><h2>Profile</h2><button onClick={onClose} aria-label="Close profile"><X size={21} /></button></div>
      <div className="modal-content">
        {person?.avatar_url && <img src={person.avatar_url} alt="" width={72} height={72} style={{ borderRadius: '50%', objectFit: 'cover' }} />}
        <h3 translate="no">{display}</h3>
        {person?.username && <strong translate="no">@{person.username}</strong>}
        {person?.bio && <p translate="no" dir="auto">{person.bio}</p>}
        {loading && <p>Loading…</p>}
        {!loading && <h4 className="profile-sub">Posts · {rows.length}</h4>}
        {!loading && !rows.length && <p>No posts yet.</p>}
        {rows.map(row => <article className="profile-post" key={row.id}><time dateTime={row.created_at}>{formatCreatedAt(row.created_at, language)}</time><p translate="no" dir="auto">{row.content}</p>{row.image_url && <img src={row.image_url} alt="Shared moment" />}{row.video && <SafeVideo src={row.video} />}</article>)}
        {!loading && <h4 className="profile-sub">Stories · {stories.length}</h4>}
        {!loading && !stories.length && <p>No stories yet.</p>}
        {stories.map(s => <article className="profile-post" key={s.id}><time dateTime={s.created_at}>{formatCreatedAt(s.created_at, language)}</time>{s.caption && <p translate="no" dir="auto">{s.caption}</p>}{s.media_url && <img src={s.media_url} alt="Shared story" />}</article>)}
      </div>
    </div>
  </div>
}
