-- Store Stripe customer/subscription state for each Supabase user.

CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  stripe_subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_stripe_customer
  ON public.billing_customers(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_billing_customers_subscription_status
  ON public.billing_customers(stripe_subscription_status)
  WHERE stripe_subscription_status IS NOT NULL;

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their billing state"
  ON public.billing_customers FOR SELECT
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_billing_customers_updated_at ON public.billing_customers;
CREATE TRIGGER update_billing_customers_updated_at
  BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
