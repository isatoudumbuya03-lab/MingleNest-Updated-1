import { useEffect, useState } from 'react'
import { Heart, Send, Trash2 } from 'lucide-react'
import { supabase } from './supabase'
import { formatCreatedAt } from './timestamps'
import { localizeView, type Language } from './i18n'
import { PublicProfileModal } from './ProfileViews'
type Item = { id: string; user_id: string; content: string; created_at: string; deleted_at: string | null; parent_id: string | null; username: string; fullName?: string; bio?: string; avatar?: string }
export default function CommentThread({ targetId, kind, userId, language, onError, focusId, onCount }: { targetId: string; kind: 'post' | 'story'; userId: string | null; language: Language; onError: (message: string) => void; focusId?: string; onCount?: (count: number) => void }) {
  const table = kind === 'post' ? 'post_comments' : 'story_comments'
  const targetColumn = kind === 'post' ? 'post_id' : 'story_id'
  const reactionColumn = kind === 'post' ? 'post_comment_id' : 'story_comment_id'
  const [items, setItems] = useState<Item[]>([])
  const [reactions, setReactions] = useState<{ user_id: string; post_comment_id: string | null; story_comment_id: string | null }[]>([])
  const [text, setText] = useState('')
  const [publicProfile,setPublicProfile] = useState<Item | null>(null)
  const [reply, setReply] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let live = true
    const load = async () => {
      const result = await supabase.from(table).select('id,user_id,content,created_at,parent_id,deleted_at').eq(targetColumn, targetId).order('created_at')
      if (result.error) throw result.error
      const rows = result.data || []
      const ids = [...new Set(rows.map(row => row.user_id))]
      const [profiles, likes] = await Promise.all([
        ids.length ? supabase.from('profiles').select('id,username,full_name,avatar_url,bio').in('id', ids) : Promise.resolve({data: [], error: null}),
        rows.length ? supabase.from('comment_reactions').select('user_id,post_comment_id,story_comment_id').in(reactionColumn, rows.map(row => row.id)) : Promise.resolve({data: [], error: null})
      ])
      if (profiles.error || likes.error) throw profiles.error || likes.error
      if (!live) return
      setItems(rows.map(row => { const profile = profiles.data?.find(p => p.id === row.user_id); return {...row, username: profile?.username || profile?.full_name || 'Member', fullName: profile?.full_name || undefined, bio: profile?.bio || undefined, avatar: profile?.avatar_url || undefined} }))
      setReactions(likes.data || []); setLoading(false); onCount?.(rows.filter(row => !row.deleted_at).length)
    }
    const refresh = () => { void load().catch(() => { if (live) { setLoading(false); onError('Could not load comments. Please try again.') } }) }
    refresh(); const timer = window.setInterval(refresh, 8000)
    return () => { live = false; clearInterval(timer) }
  }, [targetId, kind, revision])
  useEffect(() => { if (focusId && !loading) document.getElementById(`comment-${focusId}`)?.scrollIntoView({block:'center', behavior:'smooth'}) }, [focusId, loading, items.length])
  const send = async () => {
    if (!userId || busy || !text.trim()) return
    setBusy(true)
    const { error } = await supabase.from(table).insert({ [targetColumn]: targetId, user_id: userId, content: text.trim().normalize('NFC'), parent_id: reply?.id || null })
    if (error) onError('Could not add your comment'); else { setText(''); setReply(null); setRevision(n => n + 1) }
    setBusy(false)
  }
  const like = async (item: Item) => {
    if (!userId || busy) return
    setBusy(true)
    const liked = reactions.some(r => r[reactionColumn] === item.id && r.user_id === userId)
    const { error } = await (liked ? supabase.from('comment_reactions').delete().eq(reactionColumn,item.id).eq('user_id',userId) : supabase.from('comment_reactions').insert({ [reactionColumn]:item.id,user_id:userId }))
    if (error) onError('Could not update your reaction'); else setRevision(n => n + 1)
    setBusy(false)
  }
  const remove = async (item: Item) => {
    if (!userId || userId !== item.user_id || busy) return
    setBusy(true)
    const {data,error} = await supabase.rpc('remove_social_comment',{p_kind:kind,p_id:item.id})
    if (error || !data) onError('Could not delete comment'); else { if (reply?.id === item.id) setReply(null); setRevision(n=>n+1) }
    setBusy(false)
  }
  const render = (item: Item, depth = 0): React.ReactNode => {
    const children = items.filter(row => row.parent_id === item.id)
    const likes = reactions.filter(r => r[reactionColumn] === item.id)
    // A deleted comment disappears completely; replies from other people stay visible.
    if (item.deleted_at) return children.length ? <div key={item.id}>{children.map(row => render(row, depth))}</div> : null
    return <div key={item.id} className={`thread-comment ${focusId === item.id ? 'focused-comment' : ''}`} id={`comment-${item.id}`}>
      <div className="comment"><div className="thread-content"><button className="comment-profile" onClick={()=>setPublicProfile(item)} aria-label="View profile"><strong translate="no">{item.avatar ? <img src={item.avatar} alt="" width={28} height={28} /> : <span className="comment-avatar">{item.username[0]}</span>} @{item.username}</strong></button>{item.deleted_at ? <p>Comment deleted</p> : <p translate="no" dir="auto">{item.content}</p>}<time dateTime={item.created_at}>{formatCreatedAt(item.created_at,language)}</time>{!item.deleted_at && <div className="thread-actions"><button disabled={!userId || busy} onClick={()=>void like(item)} aria-label="Like comment"><Heart size={15} fill={likes.some(r=>r.user_id===userId)?'currentColor':'none'} /> {likes.length}</button><button disabled={!userId} onClick={()=>setReply(item)}><span>Reply</span> · {children.filter(row => !row.deleted_at).length}</button>{item.user_id===userId && <button disabled={busy} onClick={()=>void remove(item)} aria-label="Delete comment"><Trash2 size={15}/></button>}</div>}</div></div>
      {!!children.length && <div className={depth < 2 ? 'thread-replies' : ''}>{children.map(row=>render(row,depth+1))}</div>}
    </div>
  }
  return localizeView(<section className="comments-area">{publicProfile && <PublicProfileModal userId={publicProfile.user_id} name={publicProfile.fullName || publicProfile.username} language={language} onClose={()=>setPublicProfile(null)} onError={onError}/>}<h3>Join the conversation</h3>{loading && <p>Loading...</p>}{!loading && !items.some(row => !row.deleted_at) && <p>Be the first to comment.</p>}{items.filter(item=>!item.parent_id).map(item=>render(item))}{reply && <div className="reply-context"><span translate="no">@{reply.username}</span><p translate="no">{reply.content}</p><button onClick={()=>setReply(null)}>Cancel</button></div>}<form onSubmit={event=>{event.preventDefault();void send()}}><textarea rows={1} value={text} onChange={event=>setText(event.target.value)} placeholder="Write a kind comment..." aria-label="Write a comment" disabled={!userId || busy}/><button disabled={!userId || busy || !text.trim()} aria-label="Send comment"><Send size={17}/></button></form></section>,language)
}
