import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Satellite acquisition sites.
 *
 * Each of these is a distinct public property with its own branding, content
 * spine and URL space, served from THIS deployment so packages, fees and the
 * handoff into the main website can never drift. The host is rewritten (not
 * redirected) onto an isolated app tree, so the public URL stays clean.
 *
 * These are NOT doorway pages: each satellite carries content the main site
 * does not — nycgunlaws.com is a legal reference. See DOMAIN_STRATEGY.md.
 *
 * ⚠️ A host listed here MUST NOT also appear in BRAND_ALIAS_HOSTS or
 * KEYWORD_REDIRECTS in next.config.ts. Next runs next.config `redirects()`
 * BEFORE Proxy, so a 301 there fires first and the satellite never renders.
 */
const SATELLITE_SITES: { hosts: string[]; basePath: string }[] = [
  { hosts: ["nycgunlaws.com", "www.nycgunlaws.com"], basePath: "/nycgunlaws" },
]

/**
 * Proxy (Next 16's renamed Middleware). Three jobs:
 *   1. Rewrite satellite hosts onto their isolated app trees.
 *   2. Refresh the Supabase auth session cookie on every request.
 *   3. Optimistic redirects only — bounce signed-out users away from gated
 *      areas. Real role authorization lives in the route layouts/server
 *      actions (see lib/auth.ts requireRole), per Next's guidance that Proxy
 *      must not be the sole authorization layer.
 */
export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase()
  const satellite = SATELLITE_SITES.find((s) => s.hosts.includes(hostname ?? ""))

  if (satellite && !request.nextUrl.pathname.startsWith(satellite.basePath)) {
    const url = request.nextUrl.clone()
    const path = url.pathname

    // robots.txt and sitemap.xml must resolve to the SATELLITE's versions, not
    // the main site's — otherwise each satellite advertises gunlicensenyc.com's
    // sitemap and disallow rules under its own host.
    if (path === "/robots.txt" || path === "/sitemap.xml") {
      url.pathname = `${satellite.basePath}${path === "/sitemap.xml" ? "/sitemap.xml" : "/robots.txt"}`
      return NextResponse.rewrite(url)
    }

    url.pathname = `${satellite.basePath}${path === "/" ? "" : path}`
    return NextResponse.rewrite(url)
  }

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
    // The instructor APP surface (singular) — NOT the public "/instructors"
    // marketing directory (plural), which must stay reachable signed-out.
    path === "/instructor" ||
    path.startsWith("/instructor/")

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
