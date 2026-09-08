import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const originalEnv = process.env;

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('requires authentication', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        }),
      },
    });

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it('returns 503 when Stripe is not configured', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
          error: null,
        }),
      },
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain('Stripe');
  });
});

vi.mock('@/lib/stripe/server', () => ({
  isStripeConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
  getStripePriceId: () => 'price-test', getAppUrl: () => 'http://localhost:3678',
  getStripe: () => stripe,
}));
import { createAdminClient } from '@/lib/supabase/admin';
const stripe = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  billingPortal: { sessions: { create: vi.fn() } },
  subscriptions: { list: vi.fn() },
};
describe('checkout concurrency and delayed webhooks', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'test-placeholder', STRIPE_PRICE_ID: 'test-price' };
    mockCreateClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'owner', email: 'owner@example.com' } } }) } });
    vi.mocked(createAdminClient).mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }), upsert: async () => ({ error: null }) }) } as never);
    stripe.customers.create.mockResolvedValue({ id: 'cus-one' });
    stripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/one' });
    stripe.subscriptions.list.mockResolvedValue({ data: [], has_more: false });
    stripe.billingPortal.sessions.create.mockResolvedValue({ url: 'https://billing.stripe.com/portal' });
    vi.clearAllMocks();
  });
  afterEach(() => { process.env = originalEnv; });
  it('uses the same provider idempotency keys for six simultaneous attempts', async () => {
    const responses = await Promise.all(Array.from({ length: 6 }, () => POST()));
    expect(responses.every(r => r.status === 200)).toBe(true);
    const customerKeys = stripe.customers.create.mock.calls.map(call => call[1].idempotencyKey);
    const checkoutKeys = stripe.checkout.sessions.create.mock.calls.map(call => call[1].idempotencyKey);
    expect(new Set(customerKeys)).toEqual(new Set(['captuto-customer:owner']));
    expect(new Set(checkoutKeys)).toEqual(new Set(['captuto-checkout:cus-one:price-test:initial']));
  });
  it('opens the portal if Stripe already has a subscription before its webhook arrives', async () => {
    stripe.subscriptions.list.mockResolvedValue({ data: [{ status: 'active' }], has_more: false });
    const response = await POST();
    expect(await response.json()).toEqual({ url: 'https://billing.stripe.com/portal' });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it('does not create checkout when provider state cannot be checked', async () => {
    stripe.subscriptions.list.mockRejectedValue(new Error('offline'));
    expect((await POST()).status).toBe(503);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
