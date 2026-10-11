import { useEffect, useState } from 'react'
import { ArrowLeft, Copy, LifeBuoy, Mail } from 'lucide-react'
import './premium.css'

export const SUPPORT_EMAIL = 'minglenest.support@gmail.com'

export default function Support({ accountEmail, username, onClose }: { accountEmail?: string | null; username?: string | null; onClose: () => void }) {
  const [subject, setSubject] = useState('MingleNest support request')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')

  const body = `${message}\n\n---\nAccount: ${accountEmail || 'not signed in'}${username ? ` (@${username})` : ''}`
  const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(SUPPORT_EMAIL); setNotice('Email address copied.') }
    catch { setNotice(`Please copy this address: ${SUPPORT_EMAIL}`) }
  }
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!pending) return
    let left = document.visibilityState === 'hidden'
    const onVis = () => {
      if (document.visibilityState === 'hidden') { left = true; return }
      if (left) {
        setPending(false)
        setNotice('Message sent! Thank you for contacting MingleNest Support. We’ll reply to your email address.')
      }
    }
    const onBlur = () => { left = true }
    const onFocus = () => {
      if (left) {
        setPending(false)
        setNotice('Message sent! Thank you for contacting MingleNest Support. We’ll reply to your email address.')
      }
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [pending])
  const contact = () => {
    setNotice(`If your email app did not open, write to ${SUPPORT_EMAIL}.`)
    setPending(true)
    window.location.href = href
  }

  return (
    <div className="premium-page" role="dialog" aria-label="Help and Support">
      <header className="premium-top">
        <button onClick={onClose} aria-label="Back"><ArrowLeft size={20} /></button>
        <h2>Help &amp; Support</h2>
      </header>
      <div className="premium-body">
        <section className="premium-hero">
          <span className="premium-crown"><LifeBuoy size={26} /></span>
          <h1>Contact Us</h1>
          <p>Need help with your account or an app problem? Write to us and we will get back to you by email.</p>
        </section>
        <section className="plan">
          <h3>Support email</h3>
          <p className="plan-price" style={{ wordBreak: 'break-all' }}>{SUPPORT_EMAIL}</p>
          <label style={{ display: 'grid', gap: 6, marginBottom: 10, fontSize: '.88rem' }}>Subject
            <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={120} style={{ minHeight: 42, borderRadius: 12, border: '1px solid var(--line)', padding: '0 12px', font: 'inherit' }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: '.88rem' }}>How can we help?
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Describe the problem…" style={{ borderRadius: 12, border: '1px solid var(--line)', padding: 12, font: 'inherit', resize: 'vertical' }} />
          </label>
          <button className="premium-cta" onClick={contact}><Mail size={16} style={{ verticalAlign: '-3px' }} /> Contact Support</button>
          <p className="plan-fine">This opens your email app with our address filled in. Replies come to the email you send from.</p>
        </section>
        <button className="premium-manage" onClick={copy}><Copy size={16} style={{ verticalAlign: '-3px' }} /> Copy support email</button>
        {notice && <p className="premium-fine" aria-live="polite">{notice}</p>}
      </div>
    </div>
  )
}
