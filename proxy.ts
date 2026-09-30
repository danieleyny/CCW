import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  previewConfig,
  verifyPreviewCookie,
  isPreviewExcludedPath,
  PREVIEW_COOKIE,
  PREVIEW_BANNER_HTML,
} from "@/lib/redesign-preview"

/**
 * Proxy (Next 16's renamed Middleware). Two jobs:
 *   1. Refresh the Supabase auth session cookie on every request.
 *   2. Optimistic redirects only — bounce signed-out users away from gated
 *      areas. Real role authorization lives in the route layouts/server
 *      actions (see lib/auth.ts requireRole), per Next's guidance that Proxy
 *      must not be the sole authorization layer.
 *
 * NOTE ON SATELLITE SITES. This file briefly carried a host-rewrite table that
 * served firearmlicensenyc.com and nycgunlaws.com from this deployment. Both are
 * now their own repos and Vercel projects, so the rewrite is gone and no
 * satellite domain should ever be attached to this project. They read pricing
 * from the public feed at /api/public/pricing, which is the only coupling left.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ── Redesign-v2 preview gateway (kill-switched) ─────────────────────────────
  // When REDESIGN_V2_ORIGIN/PASSWORD are unset, `enabled` is false and this whole
  // block is inert — the feature "doesn't exist". When enabled AND the caller holds a
  // VERIFIED preview cookie, marketing pages are proxied from the v2 origin (with a
  // banner); /api, /portal, /admin, /auth and the gateway routes are never proxied.
  const preview = previewConfig()
  if (preview.enabled && !isPreviewExcludedPath(path)) {
    const token = request.cookies.get(PREVIEW_COOKIE)?.value
    if (await verifyPreviewCookie(token, preview.password)) {
      return proxyRedesignV2(request, preview.origin, preview.bypass)
    }
  }
  // Static assets never needed the Supabase session refresh. The matcher now includes
  // /_next/* (so the preview can serve v2's own asset hashes above), so return early here
  // to keep non-preview asset traffic as cheap as before — no Supabase client per chunk.
  if (path.startsWith("/_next/")) {
    return NextResponse.next()
  }

  // Forward the pathname to server components (layouts can't read it otherwise).
  // The portal intake soft-gate reads this to exempt /portal/intake itself.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  let response = NextResponse.next({ request: { headers: requestHeaders } })

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
          response = NextResponse.next({ request: { headers: requestHeaders } })
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

/**
 * Proxy a request to the redesign-v2 origin (its own Vercel project). The origin keeps
 * Vercel Deployment Protection ON, so we forward the Protection-Bypass token as a header
 * (never a cookie, never in a URL). HTML responses get the preview banner injected right
 * after <body>; everything else (incl. /_next/* assets) streams straight through. Every
 * response carries X-Robots-Tag: noindex so unreviewed copy can't be indexed on the real
 * domain.
 */
async function proxyRedesignV2(request: NextRequest, origin: string, bypass: string | null): Promise<Response> {
  const target = origin + request.nextUrl.pathname + request.nextUrl.search
  const headers = new Headers(request.headers)
  headers.set("host", new URL(origin).host)
  headers.delete("accept-encoding") // ask for identity so we can transform the HTML body
  if (bypass) {
    headers.set("x-vercel-protection-bypass", bypass)
    headers.set("x-vercel-set-bypass-cookie", "false")
  }

  const init: RequestInit = { method: request.method, headers, redirect: "manual" }
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    // Streaming a request body requires duplex; not yet in the DOM RequestInit types.
    ;(init as RequestInit & { duplex: "half" }).duplex = "half"
  }

  let upstream: Response
  try {
    upstream = await fetch(target, init)
  } catch {
    return new Response("Preview origin unreachable.", { status: 502, headers: { "x-robots-tag": "noindex" } })
  }

  const out = new Headers(upstream.headers)
  out.set("x-robots-tag", "noindex")
  out.delete("content-encoding") // we requested identity; declared encoding would be wrong

  const contentType = upstream.headers.get("content-type") ?? ""
  if (contentType.includes("text/html")) {
    const html = await upstream.text()
    const withBanner = html.replace(/<body([^>]*)>/i, (m) => `${m}${PREVIEW_BANNER_HTML}`)
    out.delete("content-length") // body length changed
    return new Response(withBanner, { status: upstream.status, headers: out })
  }
  return new Response(upstream.body, { status: upstream.status, headers: out })
}

export const config = {
  matcher: [
    // Run on everything except favicon and image files. /_next/* IS included (unlike the
    // pre-preview matcher) so the gateway can serve the v2 build's own asset hashes;
    // non-preview /_next/* traffic returns early in proxy() before any Supabase work.
    "/((?!favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
