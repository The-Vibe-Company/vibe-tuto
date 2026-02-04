import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/editor'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser();

  // Check if current route is protected
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Store user email in response header for layouts to use (avoids duplicate getUser calls)
  if (user?.email) {
    supabaseResponse.headers.set('x-user-email', user.email);
  }

  return supabaseResponse;
}
