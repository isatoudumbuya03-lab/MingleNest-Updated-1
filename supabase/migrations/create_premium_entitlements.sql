CREATE TABLE IF NOT EXISTS public.premium_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'none' CHECK (status IN ('none','active','grace','cancelled','expired')),
  plan text,
  current_period_end timestamptz,
  will_renew boolean NOT NULL DEFAULT false,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.premium_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own entitlement" ON public.premium_entitlements;
CREATE POLICY "read own entitlement" ON public.premium_entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- No insert/update/delete policies: only a server-side function using the service role (after verified payment) may write.