import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { privateAudioUrl } from './privateChat'
import { localizeView, type Language } from './i18n'
import { supabase } from './supabase'

export const voiceTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
export default function VoicePlayer({ path, durationMs, language = 'en', messageId, trackFor }: { path: string; durationMs: number; language?: Language; messageId?: string; trackFor?: string }) {
  const audio = useRef<HTMLAudioElement>(null)
  // Played state is per listener (message_listens, own rows only); set only after playback actually ends.
  const [unplayed, setUnplayed] = useState(false)
  useEffect(() => {
    setUnplayed(false)
    if (!messageId || !trackFor) return
    let live = true
    supabase.from('message_listens').select('message_id').eq('message_id', messageId).eq('user_id', trackFor).maybeSingle().then(({ data, error }) => { if (live && !error) setUnplayed(!data) })
    return () => { live = false }
  }, [messageId, trackFor])
  const markPlayed = () => {
    if (!unplayed || !messageId || !trackFor) return
    setUnplayed(false)
    void supabase.from('message_listens').upsert({ message_id: messageId, user_id: trackFor }, { onConflict: 'message_id,user_id', ignoreDuplicates: true }).then(({ error }) => { if (error) setUnplayed(true) })
  }
  const [url, setUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
  useEffect(() => {
    let live = true
    let objectUrl = ''
    privateAudioUrl(path).then(value => {
      objectUrl = value
      if (live) setUrl(value)
      else URL.revokeObjectURL(value)
    }).catch(() => { if (live) setError(true) })
    return () => { live = false; audio.current?.pause(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [path])
  const toggle = async () => {
    const element = audio.current
    if (!element || !url) return
    if (!element.paused) { element.pause(); return }
    try {
      if (element.ended) element.currentTime = 0
      await element.play()
    } catch {
      try { const fresh = await privateAudioUrl(path); if (url.startsWith('blob:')) URL.revokeObjectURL(url); setUrl(fresh); element.src = fresh; await element.play() } catch { setError(true) }
    }
  }
  return localizeView(<div className={`voice-player${unplayed ? ' unplayed' : ''}`}>{unplayed && <i className="voice-unplayed-dot" role="img" aria-label="Not played yet" title="Not played yet" />}<button type="button" onClick={toggle} disabled={!url || error} aria-label={playing ? 'Pause voice message' : 'Play voice message'}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><div className="voice-track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Voice playback progress"><span style={{ width: `${progress * 100}%` }} /></div><span>{error ? 'Unavailable' : voiceTime(durationMs)}</span><audio ref={audio} preload="none" src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0); markPlayed() }} onTimeUpdate={event => { const el = event.currentTarget; setProgress(el.duration ? el.currentTime / el.duration : 0) }} /></div>, language)
}
