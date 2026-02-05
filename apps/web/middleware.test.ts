import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

import { updateSession } from '@/lib/supabase/middleware';
import { middleware } from './middleware';

const mockUpdateSession = updateSession as ReturnType<typeof vi.fn>;

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateSession with the request', async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost/dashboard');
    await middleware(request);

    expect(mockUpdateSession).toHaveBeenCalledWith(request);
  });

  it('sets CSP frame-ancestors for embed routes', async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost/t/abc123/embed');
    const response = await middleware(request);

    expect(response.headers.get('Content-Security-Policy')).toBe('frame-ancestors *');
  });

  it('deletes X-Frame-Options for embed routes', async () => {
    const mockResponse = NextResponse.next();
    mockResponse.headers.set('X-Frame-Options', 'DENY');
    mockUpdateSession.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost/t/some-token/embed');
    const response = await middleware(request);

    expect(response.headers.get('X-Frame-Options')).toBeNull();
  });

  it('does not modify headers for non-embed routes', async () => {
    const mockResponse = NextResponse.next();
    mockResponse.headers.set('X-Frame-Options', 'DENY');
    mockUpdateSession.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost/dashboard');
    const response = await middleware(request);

    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Content-Security-Policy')).toBeNull();
  });

  it('does not modify headers for partial embed path', async () => {
    const mockResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost/t/token123/embed/extra');
    const response = await middleware(request);

    expect(response.headers.get('Content-Security-Policy')).toBeNull();
  });
});
