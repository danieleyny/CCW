import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { flBrandEnabled } from "@/config/brands"
import { resolveBrandFromHost } from "@/lib/brand/resolve"

/**
 * Proxy (Next 16's renamed Middleware). Two jobs:
 *   1. Refresh the Supabase auth session cookie on every request.
 *   2. Optimistic redirects only — bounce signed-out users away from gated
 *      areas. Real role authorization lives in the route layouts/server
 *      actions (see lib/auth.ts requireRole), per Next's guidance that Proxy
 *      must not be the sole authorization layer.
 *
 * NOTE ON SATELLITE SITES. The FL apex (firearmlicensenyc.com) and
 * nycgunlaws.com remain separate deployments and must never be attached here.
 * app.firearmlicensenyc.com IS intentionally attached and resolves to the FL
 * application brand below. The satellites still read the public pricing feed.
 */
export async function proxy(request: NextRequest) {
  const isProduction = process.env.VERCEL_ENV === "production"
  const requestedOverride = request.nextUrl.searchParams.get("brand")
  const cookieOverride = request.cookies.get("ccw_brand_preview")?.value ?? null
  const override = isProduction
    ? null
    : requestedOverride === "fl"
      ? "fl"
      : requestedOverride === "gln"
        ? null
        : cookieOverride
  const requestBrand = resolveBrandFromHost(request.nextUrl.hostname, {
    enabled: flBrandEnabled(),
    vercelEnv: process.env.VERCEL_ENV,
    override,
  })

  const applyPreviewCookie = <T extends NextResponse>(res: T): T => {
    if (!isProduction && requestedOverride === "fl") {
      res.cookies.set("ccw_brand_preview", "fl", { httpOnly: true, sameSite: "lax", path: "/" })
    } else if (!isProduction && requestedOverride === "gln") {
      res.cookies.delete("ccw_brand_preview")
    }
    return res
  }

  // Route matching is case-insensitive in Next redirects. Keep the comparison
  // URLs canonical without making `/V1` redirect to itself.
  const colorway = request.nextUrl.pathname.match(/^\/v([1-4])$/)
  if (colorway) {
    const url = request.nextUrl.clone()
    url.pathname = `/V${colorway[1]}`
    return applyPreviewCookie(NextResponse.redirect(url))
  }

  // Forward the pathname to server components (layouts can't read it otherwise).
  // The portal intake soft-gate reads this to exempt /portal/intake itself.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  requestHeaders.set("x-brand", requestBrand)
  let response = applyPreviewCookie(NextResponse.next({ request: { headers: requestHeaders } }))

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
          response = applyPreviewCookie(NextResponse.next({ request: { headers: requestHeaders } }))
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

  if (requestBrand === "fl") {
    const glnOnly =
      path === "/admin" || path.startsWith("/admin/") ||
      path === "/instructor" || path.startsWith("/instructor/") ||
      path === "/sponsor" || path.startsWith("/sponsor/") ||
      path === "/dashboard"
    if (glnOnly) {
      return applyPreviewCookie(NextResponse.redirect(new URL(path + request.nextUrl.search, "https://gunlicensenyc.com"), 308))
    }

    const allowed =
      path === "/" || path === "/eligibility" ||
      path === "/og" ||
      path.startsWith("/auth/") || path.startsWith("/portal") ||
      path.startsWith("/api/") || path.startsWith("/r/") ||
      path.startsWith("/g/") || path.startsWith("/c/") ||
      path.startsWith("/legal/")
    if (!allowed) {
      return applyPreviewCookie(NextResponse.redirect(new URL(path + request.nextUrl.search, "https://firearmlicensenyc.com"), 308))
    }
  }

  const isGated =
    path.startsWith("/admin") ||
    path.startsWith("/portal") ||
    // The instructor APP surface (singular) — NOT the public "/instructors"
    // marketing directory (plural), which must stay reachable signed-out.
    path === "/instructor" ||
    path.startsWith("/instructor/") ||
    // The (unlisted) sponsor surface. /invite/[token] stays UNGATED — it's a
    // public capability link that carries the sign-in prompt itself.
    path === "/sponsor" ||
    path.startsWith("/sponsor/")

  if (!user && isGated) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("redirect", path)
    return applyPreviewCookie(NextResponse.redirect(url))
  }

  if (requestBrand === "fl" && path === "/") {
    return applyPreviewCookie(
      user
        ? NextResponse.redirect(new URL("/portal", request.url), 308)
        : NextResponse.redirect(new URL("https://firearmlicensenyc.com/"), 308)
    )
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
    url.pathname = requestBrand === "fl" ? "/portal" : "/dashboard"
    return applyPreviewCookie(NextResponse.redirect(url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
