import { useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'

/** Story picture with a loading indicator and a clear fallback if the media cannot be loaded. */
export default function StoryMedia({ src }: { src: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  return (
    <>
      {state !== 'error' && <img key={attempt} src={src} alt="Shared daily story" onLoad={() => setState('ready')} onError={() => setState('error')} style={state === 'ready' ? undefined : { opacity: 0 }} />}
      {state === 'loading' && <div className="story-media-note" role="status"><Loader2 size={26} className="story-media-spin" /><span>Loading story…</span></div>}
      {state === 'error' && (
        <div className="story-media-note" role="alert">
          <ImageOff size={28} /><span>This story's picture could not be loaded.</span>
          <button type="button" onClick={() => { setState('loading'); setAttempt(n => n + 1) }}>Try again</button>
        </div>
      )}
    </>
  )
}
