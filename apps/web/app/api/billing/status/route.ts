import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isStripeConfigured } from '@/lib/stripe/server';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({
      configured: false,
      hasCustomer: false,
      isActive: false,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('billing_customers')
    .select(
      'stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_subscription_status, current_period_end, cancel_at_period_end'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch billing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing status' },
      { status: 500 }
    );
  }

  const subscriptionStatus = data?.stripe_subscription_status ?? null;

  return NextResponse.json({
    configured: true,
    hasCustomer: Boolean(data?.stripe_customer_id),
    isActive: subscriptionStatus ? ACTIVE_STATUSES.has(subscriptionStatus) : false,
    subscriptionStatus,
    subscriptionId: data?.stripe_subscription_id ?? null,
    priceId: data?.stripe_price_id ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
  });
}
