import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase } from './supabase'
import CommentThread from './CommentThread'
import './story-compact.css'
import { localizeView, type Language } from './i18n'
export default function StoryInteractions({ storyId, userId, language, onError, focusId }: { storyId: string; userId: string | null; language: Language; onError: (message: string) => void; focusId?: string }) {
  const [likes,setLikes]=useState<string[]>([])
  const [busy,setBusy]=useState(false)
  useEffect(()=>{let live=true;const load=async()=>{const {data,error}=await supabase.from('story_reactions').select('user_id').eq('story_id',storyId);if(live){if(error)onError('Could not load reactions');else setLikes((data||[]).map(r=>r.user_id))}};void load();const timer=setInterval(()=>void load(),8000);return()=>{live=false;clearInterval(timer)}},[storyId])
  const react=async()=>{if(!userId||busy)return;setBusy(true);const liked=likes.includes(userId);const {error}=await(liked?supabase.from('story_reactions').delete().eq('story_id',storyId).eq('user_id',userId):supabase.from('story_reactions').insert({story_id:storyId,user_id:userId}));if(error)onError('Could not update your reaction');else setLikes(current=>liked?current.filter(id=>id!==userId):[...new Set([...current,userId])]);setBusy(false)}
  return localizeView(<section className="story-interactions"><button className="secondary-button" disabled={busy||!userId} onClick={()=>void react()} aria-label="Like post"><Heart size={17} fill={userId&&likes.includes(userId)?'currentColor':'none'}/> {likes.length}</button><CommentThread targetId={storyId} kind="story" userId={userId} language={language} onError={onError} focusId={focusId}/></section>,language)
}
