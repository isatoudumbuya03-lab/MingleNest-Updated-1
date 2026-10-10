import { useEffect, useState } from 'react'
import { Browser } from '@capacitor/browser'
import { Play } from 'lucide-react'

// Thumbnails are captured one at a time so a screen full of videos never decodes several files at once
// (that load, not file size, is what takes a phone WebView down). Any failure just means "no thumbnail".
let queue: Promise<unknown> = Promise.resolve()
const cache = new Map<string, string | null>()
function grabFrame(src: string): Promise<string | null> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    let done = false
    const finish = (value: string | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      video.removeAttribute('src'); video.load()
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), 7000)
    video.muted = true; video.playsInline = true; video.preload = 'metadata'
    if (!src.startsWith('blob:')) video.crossOrigin = 'anonymous'
    video.onerror = () => finish(null)
    video.onloadedmetadata = () => { try { video.currentTime = Math.min(0.5, (video.duration || 1) / 2) } catch { finish(null) } }
    video.onseeked = () => {
      try {
        const scale = Math.min(1, 480 / (video.videoWidth || 480))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round((video.videoWidth || 480) * scale)); canvas.height = Math.max(1, Math.round((video.videoHeight || 270) * scale))
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
        finish(canvas.toDataURL('image/jpeg', 0.7))
      } catch { finish(null) }
    }
    video.src = src
  })
}
export function useVideoThumb(src?: string) {
  const [thumb, setThumb] = useState<string | null>(src ? cache.get(src) ?? null : null)
  useEffect(() => {
    if (!src) { setThumb(null); return }
    if (cache.has(src)) { setThumb(cache.get(src) ?? null); return }
    let live = true
    queue = queue.then(() => grabFrame(src)).then(value => { cache.set(src, value); if (live) setThumb(value) }).catch(() => undefined)
    return () => { live = false }
  }, [src])
  return thumb
}

// Thumbnail tile with a play badge — never plays, so it is safe inside lists.
export function VideoThumb({ src, className }: { src: string; className?: string }) {
  const thumb = useVideoThumb(src)
  return <span className={`video-thumb ${className || ''}`} style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}><span className="video-thumb-play"><Play size={18} fill="currentColor" /></span></span>
}

// Tap-to-play video: the file is only loaded once the user asks for it. If the WebView cannot decode it,
// a plain "Open video" fallback appears instead of a crash.
export default function SafeVideo({ src, className, label }: { src: string; className?: string; label?: string }) {
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const thumb = useVideoThumb(playing ? undefined : src)
  useEffect(() => { setFailed(false); setPlaying(false) }, [src])
  if (failed) return <div className="safe-video-fallback" role="group" aria-label={label}><p>This video can’t play inside the app on this device.</p><button type="button" className="secondary-button" onClick={() => { void Browser.open({ url: src }).catch(() => window.open(src, '_blank', 'noopener')) }}>Open video</button></div>
  if (!playing) return <button type="button" className={`video-poster ${className || 'post-video'}`} style={thumb ? { backgroundImage: `url(${thumb})` } : undefined} onClick={() => setPlaying(true)} aria-label={label ? `Play: ${label}` : 'Play video'}><span className="video-thumb-play"><Play size={26} fill="currentColor" /></span></button>
  return <video className={className || 'post-video'} src={src} controls autoPlay playsInline preload="metadata" aria-label={label} onError={() => setFailed(true)} />
}
