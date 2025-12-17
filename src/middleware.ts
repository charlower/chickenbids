import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create response that we'll modify
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
          // First update the request cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Then create a new response with updated request
          supabaseResponse = NextResponse.next({
            request,
          });
          // Finally set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not remove this getUser() call!
  // It refreshes the auth token if expired and syncs cookies
  // This is what makes auth work reliably on refresh
  const { data: { user }, error } = await supabase.auth.getUser();

  // Debug logging (remove in production if noisy)
  if (request.nextUrl.pathname === '/') {
    console.log('[Middleware] Path:', request.nextUrl.pathname);
    console.log('[Middleware] User:', user?.id ?? 'NONE');
    console.log('[Middleware] Error:', error?.message ?? 'NONE');
    console.log('[Middleware] Cookies being set:', supabaseResponse.cookies.getAll().map(c => c.name));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)$).*)',
  ],
};
