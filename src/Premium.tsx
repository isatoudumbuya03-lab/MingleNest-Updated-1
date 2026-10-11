import { useEffect, useState } from 'react'
import { ArrowLeft, BadgeCheck, Check, Crown, Palette, Sparkles, X } from 'lucide-react'
import { BILLING, isPremium, loadEntitlement, type Entitlement } from './billing'
import './premium.css'

const FREE = ['Private messaging', 'Photos and videos', 'Voice messages', 'Posts, Stories and Status', 'Kids AI Story Maker (standard limit)']
const PREMIUM = [
  { icon: BadgeCheck, title: 'Premium profile badge', text: 'A badge beside your name on your profile.' },
  { icon: Palette, title: 'Exclusive profile themes', text: 'Extra colour themes for your profile page.' },
  { icon: Sparkles, title: 'More Kids AI stories', text: 'A higher monthly limit in the Kids AI Story Maker.' },
]

export default function Premium({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [ent, setEnt] = useState<Entitlement | null>(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!userId) { setEnt({ status: 'none', current_period_end: null, will_renew: false }); return }
    loadEntitlement(userId).then(setEnt).catch(() => { setError(true); setEnt({ status: 'none', current_period_end: null, will_renew: false }) })
  }, [userId])

  const active = ent ? isPremium(ent) : false
  const until = ent?.current_period_end ? new Date(ent.current_period_end).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const subscribe = () => {
    if (!userId) { setNotice('Please sign in to subscribe.'); return }
    if (!BILLING.enabled) { setNotice('Subscriptions are not available yet. No payment was taken and Premium has not been activated.'); return }
    // Future: RevenueCat purchase flow goes here. Premium is granted only by the server after verified payment.
  }
  const manage = () => {
    if (!BILLING.enabled) { setNotice('Subscription management will be available once billing is connected.'); return }
    window.open(BILLING.manageUrl, '_blank', 'noopener')
  }

  const status = !ent ? 'Checking…' : active ? (ent.will_renew ? `Premium active. Renews on ${until}.` : `Premium ends on ${until}.`) : 'You are on MingleNest Free.'

  return (
    <div className="premium-page" role="dialog" aria-label="MingleNest Premium">
      <header className="premium-top">
        <button onClick={onClose} aria-label="Back"><ArrowLeft size={20} /></button>
        <h2>MingleNest Premium</h2>
      </header>
      <div className="premium-body">
        <section className="premium-hero">
          <span className="premium-crown"><Crown size={26} /></span>
          <h1>Make your nest yours</h1>
          <p>Stand out with a badge, themes and more Kids stories.</p>
        </section>

        <section className="premium-status" aria-live="polite">
          <span className={`premium-pill ${active ? 'on' : ''}`}>{active ? 'Premium' : 'Free'}</span>
          <span>{status}</span>
        </section>
        {error && <p className="premium-error">Could not check your subscription status. Please try again later.</p>}

        <div className="premium-plans">
          <article className="plan">
            <h3>MingleNest Free</h3>
            <p className="plan-price">$0</p>
            <ul>{FREE.map(f => <li key={f}><Check size={16} />{f}</li>)}</ul>
          </article>
          <article className="plan featured">
            <span className="plan-tag">Monthly</span>
            <h3>MingleNest Premium</h3>
            <p className="plan-price">{BILLING.priceLabel ?? 'Price shown at checkout'}<small>{BILLING.priceLabel ? ' / month' : ''}</small></p>
            <ul>{PREMIUM.map(({ icon: I, title, text }) => <li key={title}><I size={16} /><span><b>{title}</b><em>{text}</em></span></li>)}</ul>
            <button className="premium-cta" onClick={subscribe} disabled={active}>{active ? 'You are subscribed' : 'Subscribe'}</button>
            <p className="plan-fine">Billed monthly through Google Play. Cancel any time.</p>
          </article>
        </div>

        <button className="premium-manage" onClick={manage}>Manage or cancel subscription</button>
        {!BILLING.enabled && <p className="premium-fine">Payments are not switched on yet. Premium will be unlocked only after a verified Google Play purchase.</p>}
      </div>

      {notice && (
        <div className="premium-toast" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}
    </div>
  )
}
