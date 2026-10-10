import { supabase } from './supabase'

// Signed Status URLs are cached per file and reused until they are nearly out of time, so thumbnails do not
// get a brand-new address (and a flicker or blank) on every refresh, and one failed signing never blanks the rest.
const cache = new Map<string, { url: string; until: number }>()

export async function signStatusUrl(path: string, expiresAt: string): Promise<string | undefined> {
  const now = Date.now()
  const hit = cache.get(path)
  if (hit && hit.until - now > 120000) return hit.url
  const lifetime = Math.max(1, Math.min(3600, Math.floor((Date.parse(expiresAt) - now) / 1000)))
  const { data, error } = await supabase.storage.from('status-media').createSignedUrl(path, lifetime)
  if (error || !data?.signedUrl) return hit && hit.until > now ? hit.url : undefined
  cache.set(path, { url: data.signedUrl, until: now + lifetime * 1000 })
  return data.signedUrl
}
