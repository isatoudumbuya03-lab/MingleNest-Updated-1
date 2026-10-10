import type { Language } from './i18n'

/** Format the stored instant in the viewer's local zone, never in a fixed country zone. */
export function formatCreatedAt(value: string | null | undefined, language: Language = 'en', timeZone?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  const locale = language === 'en' ? 'en-GB' : language
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(date)
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).format(date)
  return `${day}, ${time.replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM')}`
}
