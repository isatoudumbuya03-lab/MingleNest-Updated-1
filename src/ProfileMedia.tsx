import { useEffect, useState } from 'react'
import { Image as ImageIcon, Play, Video, X, ChevronRight, MoreVertical, Trash2 } from 'lucide-react'
import { supabase } from './supabase'
import { formatCreatedAt } from './timestamps'
import { type Language } from './i18n'
import { VideoThumb } from './SafeVideo'

type Item = { id: string; kind: 'photo' | 'video'; url: string; text: string; createdAt: string; videoPath?: string }

// Real media for the signed-in user only: posts.image_url for photos, posts.video_path (private bucket, signed) / video_url for videos.
export default function ProfileMedia({ userId, language, refreshKey, onDeleted }: { userId: string; language: Language; refreshKey?: number; onDeleted?: (id: string) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [gallery, setGallery] = useState<null | 'photo' | 'video'>(null)
  const [viewing, setViewing] = useState<Item | null>(null)
  const [failed, setFailed] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t) }, [msg])

  const doDelete = async () => {
    if (!confirm || busy) return
    const item = confirm
    const noun = item.kind
    setBusy(true)
    const { data, error } = await supabase.from('posts').delete().eq('id', item.id).eq('user_id', userId).select('id')
    if (error || !data?.length) {
      if (error) console.warn('Media delete failed', error)
      setBusy(false); setConfirm(null); setMsg({ ok: false, text: `Could not delete this ${noun}. Please try again.` }); return
    }
    if (item.videoPath) {
      const { error: e2 } = await supabase.storage.from('post-videos').remove([item.videoPath])
      if (e2) console.warn('Video file cleanup failed', e2)
    }
    setItems(list => list.filter(i => i.id !== item.id))
    onDeleted?.(item.id)
    setBusy(false); setConfirm(null); setMenuId(null)
    setMsg({ ok: true, text: `${noun === 'video' ? 'Video' : 'Photo'} deleted successfully.` })
  }

  useEffect(() => {
    let live = true
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase.from('posts').select('id,content,image_url,video_url,video_path,post_type,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(300)
      if (!live) return
      if (error || !data) { setItems([]); setLoading(false); return }
      const out: Item[] = []
      await Promise.all(data.map(async row => {
        const isVideo = row.post_type === 'video' || !!row.video_path || !!row.video_url
        if (isVideo) {
          let url: string | undefined = row.video_url || undefined
          if (row.video_path) {
            const { data: signed } = await supabase.storage.from('post-videos').createSignedUrl(row.video_path, 3600)
            if (signed?.signedUrl) url = signed.signedUrl
          }
          if (url) out.push({ id: row.id, kind: 'video', url, text: row.content || '', createdAt: row.created_at, videoPath: row.video_path || undefined })
        } else if (row.image_url) {
          out.push({ id: row.id, kind: 'photo', url: row.image_url, text: row.content || '', createdAt: row.created_at })
        }
      }))
      out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      if (live) { setItems(out); setLoading(false) }
    })()
    return () => { live = false }
  }, [userId, refreshKey])

  const photos = items.filter(i => i.kind === 'photo')
  const videos = items.filter(i => i.kind === 'video')
  const list = gallery === 'video' ? videos : photos

  return <>
    <div className="media-boxes">
      <button type="button" className="media-box" onClick={() => setGallery('photo')}>
        <span className="media-box-icon">{photos[0] ? <img src={photos[0].url} alt="" loading="lazy" /> : <ImageIcon size={26} />}</span>
        <strong>Photos</strong><small>{loading ? '…' : photos.length} {photos.length === 1 ? 'photo' : 'photos'}</small><ChevronRight size={16} className="media-box-go" />
      </button>
      <button type="button" className="media-box" onClick={() => setGallery('video')}>
        <span className="media-box-icon">{videos[0] ? <VideoThumb src={videos[0].url} /> : <Video size={26} />}</span>
        <strong>Videos</strong><small>{loading ? '…' : videos.length} {videos.length === 1 ? 'video' : 'videos'}</small><ChevronRight size={16} className="media-box-go" />
      </button>
    </div>

    {gallery && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setGallery(null) }}>
      <div className="modal-panel media-gallery" role="dialog" aria-modal="true" aria-label={gallery === 'video' ? 'Videos' : 'Photos'}>
        <div className="modal-top"><h2>{gallery === 'video' ? 'Videos' : 'Photos'} · {list.length}</h2><button onClick={() => setGallery(null)} aria-label="Close gallery"><X size={21} /></button></div>
        <div className="modal-content">
          {loading && <p>Loading…</p>}
          {!loading && !list.length && <p className="media-empty">{gallery === 'video' ? 'No videos yet.' : 'No photos yet.'}</p>}
          <div className="media-grid">
            {list.map(item => <div key={item.id} className="media-tile-wrap">
              <button type="button" className="media-tile" onClick={() => { setMenuId(null); setFailed(false); setViewing(item) }} aria-label={`Open ${item.kind}`}>
                {item.kind === 'photo' ? <img src={item.url} alt={item.text || 'Photo'} loading="lazy" /> : <VideoThumb src={item.url} />}
                <time dateTime={item.createdAt}>{formatCreatedAt(item.createdAt, language)}</time>
              </button>
              <button type="button" className="media-tile-more" aria-label={`${item.kind === 'video' ? 'Video' : 'Photo'} options`} aria-haspopup="menu" aria-expanded={menuId === item.id} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreVertical size={16} /></button>
              {menuId === item.id && <div className="media-tile-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setMenuId(null); setConfirm(item) }}><Trash2 size={14} /> Delete</button></div>}
            </div>)}
          </div>
        </div>
      </div>
    </div>}

    {confirm && <div className="media-confirm-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setConfirm(null) }}>
      <div className="media-confirm" role="alertdialog" aria-modal="true" aria-labelledby="media-del-title">
        <h3 id="media-del-title">Delete this {confirm.kind}?</h3>
        <p>This can’t be undone.</p>
        <div className="media-confirm-actions">
          <button type="button" className="mc-cancel" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
          <button type="button" className="mc-delete" disabled={busy} onClick={() => void doDelete()}>{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>}
    {msg && <div className={`media-toast ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</div>}

    {viewing && <div className="media-viewer" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) setViewing(null) }}>
      <button className="media-viewer-close" onClick={() => setViewing(null)} aria-label="Close"><X size={24} /></button>
      {viewing.kind === 'photo'
        ? <img src={viewing.url} alt={viewing.text || 'Photo'} />
        : failed
          ? <p className="media-viewer-fail"><Play size={20} /> This video can’t play here. <a href={viewing.url} target="_blank" rel="noopener noreferrer">Open in browser</a></p>
          : <video src={viewing.url} controls autoPlay playsInline preload="metadata" onError={() => setFailed(true)} />}
      <div className="media-viewer-meta"><time dateTime={viewing.createdAt}>{formatCreatedAt(viewing.createdAt, language)}</time>{viewing.text && <p translate="no" dir="auto">{viewing.text}</p>}</div>
    </div>}
  </>
}
