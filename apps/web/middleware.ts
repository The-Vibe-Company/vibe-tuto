import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Allow embedding for /t/[token]/embed routes
  // Remove X-Frame-Options and use CSP frame-ancestors instead (modern standard)
  if (request.nextUrl.pathname.match(/^\/t\/[^/]+\/embed$/)) {
    response.headers.delete('X-Frame-Options');
    response.headers.set('Content-Security-Policy', 'frame-ancestors *');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match only pages that need auth check:
     * - /dashboard and subroutes
     * - /editor and subroutes  
     * - /settings and subroutes
     * - /api routes that need auth
     * 
     * Excludes:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - All static assets (favicon, images, fonts, etc.)
     */
    '/dashboard/:path*',
    '/editor/:path*',
    '/settings/:path*',
    '/api/:path*',
    '/t/:path*/embed',
  ],
};
