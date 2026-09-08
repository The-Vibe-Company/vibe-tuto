import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl, getStripe, isStripeConfigured } from '@/lib/stripe/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch billing customer:', error);
    return NextResponse.json(
      { error: 'Failed to open billing portal' },
      { status: 500 }
    );
  }

  if (!data?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer found' },
      { status: 404 }
    );
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${getAppUrl()}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
