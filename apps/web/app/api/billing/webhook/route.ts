import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe/server';

export const dynamic = 'force-dynamic';

function unixToIso(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const userId = subscription.metadata?.supabase_user_id;
  const admin = createAdminClient();
  const firstItem = subscription.items.data[0];

  const update = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: firstItem?.price?.id ?? null,
    stripe_subscription_status: subscription.status,
    current_period_end: unixToIso(firstItem?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  if (userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('billing_customers')
      .upsert({
        user_id: userId,
        ...update,
      });

    if (error) throw error;
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('billing_customers')
    .update(update)
    .eq('stripe_customer_id', customerId);

  if (error) throw error;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) return;

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await upsertSubscription(subscription);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Stripe webhook handling failed:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
