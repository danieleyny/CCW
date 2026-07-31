import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Proxy (Next 16's renamed Middleware). Two jobs:
 *   1. Refresh the Supabase auth session cookie on every request.
 *   2. Optimistic redirects only — bounce signed-out users away from gated
 *      areas. Real role authorization lives in the route layouts/server
 *      actions (see lib/auth.ts requireRole), per Next's guidance that Proxy
 *      must not be the sole authorization layer.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isGated =
    path.startsWith("/admin") ||
    path.startsWith("/portal") ||
    path.startsWith("/instructor")

  if (!user && isGated) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("redirect", path)
    return NextResponse.redirect(url)
  }

  // INTENTIONAL: a genuinely signed-in user who lands on the login/sign-up
  // page is bounced to their dashboard (the auto-login convenience). This is
  // NOT the source of the old "logout then instantly back in" bug — that was
  // signOut() failing to clear the chunked auth cookies, so the user was still
  // signed in here. The "Switch account" action signs out FIRST, so it reaches
  // the form cleanly instead of being bounced. Keep this exact-match on
  // /auth/login and /auth/sign-up only (so /auth/reset-password etc. are never
  // bounced while carrying a recovery session).
  if (user && (path === "/auth/login" || path === "/auth/sign-up")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
