import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'

const callback = 'com.minglenest.app://auth/callback'
export function confirmationRedirect() {
  if (Capacitor.isNativePlatform()) return callback
  // Web confirmation returns to the published site's origin; an explicitly
  // configured URL is useful when the site has multiple domains.
  const redirect = new URL('/auth/callback', import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin)
  if (import.meta.env.PROD && ['localhost', '127.0.0.1'].includes(redirect.hostname)) {
    throw new Error('Set VITE_PUBLIC_APP_URL to your published MingleNest HTTPS address before creating accounts')
  }
  return redirect.href
}

export function listenForAuthCallback(onComplete: () => void, onError: (message: string) => void) {
  const handled = new Set<string>()
  const handle = async (raw: string) => {
    if (handled.has(raw)) return
    const url = new URL(raw)
    if (Capacitor.isNativePlatform() && (url.protocol !== 'com.minglenest.app:' || url.host !== 'auth' || url.pathname !== '/callback')) return
    if (!Capacitor.isNativePlatform() && url.pathname !== '/auth/callback') return
    handled.add(raw)
    try {
      const errorDescription = url.searchParams.get('error_description') || url.searchParams.get('error')
      if (errorDescription) throw new Error(errorDescription)
      const hashError = new URLSearchParams(url.hash.substring(1)).get('error_description')
      if (hashError) throw new Error(hashError)
      const code = url.searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) throw error
      } else {
        // Compatible with confirmation links using the implicit token callback.
        const hash = new URLSearchParams(url.hash.substring(1))
        const access_token = hash.get('access_token')
        const refresh_token = hash.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) throw error
        }
      }
      if (!Capacitor.isNativePlatform()) window.history.replaceState(null, '', '/')
      if (Capacitor.isNativePlatform()) await Browser.close().catch(() => {})
      onComplete()
    } catch (error) { onError(error instanceof Error ? error.message : 'Could not confirm your account') }
  }
  if (!Capacitor.isNativePlatform()) void handle(window.location.href)
  void CapacitorApp.getLaunchUrl().then(result => { if (result?.url) void handle(result.url) }).catch(() => {})
  const listener = CapacitorApp.addListener('appUrlOpen', event => { void handle(event.url) })
  return () => { void listener.then(entry => entry.remove()) }
}
