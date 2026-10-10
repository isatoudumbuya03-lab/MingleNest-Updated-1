import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

const KEY = 'mn-last-active'
export const INACTIVITY_LIMIT_MS = 5 * 60 * 1000

const read = () => { try { return Number(localStorage.getItem(KEY) || 0) } catch { return 0 } }
const touch = () => { try { localStorage.setItem(KEY, String(Date.now())) } catch { /* storage restricted */ } }

// Signs the device out (data stays on the server) after five minutes without activity
// or after the app has been in the background for five minutes.
export default function useInactivityLock(user: User | null, onLock: () => void) {
  useEffect(() => {
    if (!user) return
    const signedInAt = Date.parse(user.last_sign_in_at || '') || 0
    const idleFor = () => Date.now() - Math.max(read(), signedInAt)
    // Reopening the app after a long gap requires a fresh sign-in; a fresh sign-in resets the clock.
    if (idleFor() > INACTIVITY_LIMIT_MS) { onLock(); return }
    touch()
    let last = Date.now()
    const activity = () => { const now = Date.now(); if (now - last > 5000) { last = now; touch() } }
    const check = () => { if (Date.now() - read() > INACTIVITY_LIMIT_MS) onLock() }
    const visibility = () => { if (document.visibilityState === 'visible') check(); else touch() }
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input'] as const
    events.forEach(name => window.addEventListener(name, activity, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', visibility)
    const timer = window.setInterval(check, 15000)
    return () => {
      events.forEach(name => window.removeEventListener(name, activity, { capture: true }))
      document.removeEventListener('visibilitychange', visibility)
      window.clearInterval(timer)
    }
  }, [user?.id])
}
