import { supabase } from './supabase'

// Billing is NOT connected yet. Fill these in once the Google Play and
// RevenueCat accounts exist. Nothing here is a real product or key.
export const BILLING = {
  enabled: false,
  provider: null as null | 'revenuecat',
  monthlyProductId: null as string | null, // Google Play subscription product ID
  entitlementId: null as string | null, // RevenueCat entitlement identifier
  priceLabel: null as string | null, // should come from the store at runtime
  manageUrl: 'https://play.google.com/store/account/subscriptions',
}

export type Entitlement = {
  status: 'none' | 'active' | 'grace' | 'cancelled' | 'expired'
  current_period_end: string | null
  will_renew: boolean
}

// Read-only: the row is written only by a trusted server after verified payment.
export async function loadEntitlement(userId: string): Promise<Entitlement> {
  const { data } = await supabase
    .from('premium_entitlements')
    .select('status,current_period_end,will_renew')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Entitlement | null) ?? { status: 'none', current_period_end: null, will_renew: false }
}

export function isPremium(e: Entitlement) {
  if (e.status === 'active' || e.status === 'grace') return true
  return e.status === 'cancelled' && !!e.current_period_end && new Date(e.current_period_end) > new Date()
}
