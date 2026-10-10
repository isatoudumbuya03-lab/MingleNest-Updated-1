import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { formatCreatedAt } from './timestamps'
import { localizeView, type Language } from './i18n'
type Activity = { id: string; kind: string; target_type: 'post' | 'story'; target_id: string; comment_id: string; created_at: string; username: string; content: string; avatar?: string }
export default function SocialActivity({userId,language,onOpen}:{userId:string;language:Language;onOpen:(kind:'post'|'story',target:string,comment:string)=>void}) {
  const [items,setItems]=useState<Activity[]>([])
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    let live=true
    const load=async()=>{
      const result=await supabase.from('social_activity').select('id,actor_id,kind,target_type,target_id,comment_id,created_at').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(100)
      if(result.error) throw result.error
      const rows=result.data||[]
      const actors=[...new Set(rows.map(r=>r.actor_id))]
      const postIds=rows.filter(r=>r.target_type==='post').map(r=>r.comment_id)
      const storyIds=rows.filter(r=>r.target_type==='story').map(r=>r.comment_id)
      const [profiles,posts,stories]=await Promise.all([
        actors.length?supabase.from('profiles').select('id,username,full_name,avatar_url').in('id',actors):Promise.resolve({data:[],error:null}),
        postIds.length?supabase.from('post_comments').select('id,content').in('id',postIds):Promise.resolve({data:[],error:null}),
        storyIds.length?supabase.from('story_comments').select('id,content').in('id',storyIds):Promise.resolve({data:[],error:null})
      ])
      if(profiles.error||posts.error||stories.error)throw profiles.error||posts.error||stories.error
      if(!live)return
      setItems(rows.map(row=>{const profile=profiles.data?.find(p=>p.id===row.actor_id);return {...row,username:profile?.username||profile?.full_name||'Member',avatar:profile?.avatar_url||undefined,content:(row.target_type==='post'?posts.data:stories.data)?.find(c=>c.id===row.comment_id)?.content||'Comment removed'}}));setLoading(false);setError('')
    }
    const refresh=()=>{void load().catch(()=>{if(live){setError('Could not load activity. Please try again.');setLoading(false)}})}
    refresh();const timer=setInterval(refresh,10000);return()=>{live=false;clearInterval(timer)}
  },[userId])
  return localizeView(<div className="modal-content activity-list">{loading&&<p>Loading...</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!items.length&&<p>All caught up.</p>}{items.map(item=><button key={item.id} className="activity-item" onClick={()=>onOpen(item.target_type,item.target_id,item.comment_id)}>{item.avatar&&<img src={item.avatar} alt="" width={32} height={32}/>}<strong translate="no">@{item.username}</strong><span>{item.kind==='comment_like'?'Liked your comment':item.kind==='reply'?'Replied to your comment':item.target_type==='story'?'Commented on your story':'Commented on your post'}</span>{item.content === '[Comment deleted]' ? <p>Comment deleted</p> : <p translate="no" dir="auto">{item.content}</p>}<time dateTime={item.created_at}>{formatCreatedAt(item.created_at,language)}</time></button>)}</div>,language)
}
