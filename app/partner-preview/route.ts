import { NextResponse, type NextRequest } from "next/server"
import { PREVIEW_COOKIE, PREVIEW_MARKER, codeMatches, previewCookieOptions } from "@/lib/partners/preview"

/**
 * Entry point for the ?preview=<code> / ?preview=off links on the coming-soon partner
 * pages. A page (a Server Component) cannot set a cookie during render, so it redirects
 * here; this Route Handler sets or clears the opaque preview marker and then lands the
 * visitor on the CLEAN URL, so the code never sits in the address bar or history.
 *
 * SOFT preview gate — not security. Fails closed: an unset PARTNER_PREVIEW_CODE means
 * no code matches, so `code=` grants nothing.
 */
function safePath(to: string | null): string {
  // Internal paths only — never an open redirect.
  if (to && to.startsWith("/") && !to.startsWith("//") && !to.startsWith("/\\")) return to
  return "/partners"
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const to = safePath(searchParams.get("to"))
  const res = NextResponse.redirect(new URL(to, req.url))

  if (searchParams.get("off") === "1") {
    res.cookies.delete(PREVIEW_COOKIE)
  } else if (codeMatches(searchParams.get("code"))) {
    res.cookies.set(PREVIEW_COOKIE, PREVIEW_MARKER, previewCookieOptions())
  }
  // A wrong/absent code sets nothing — fail closed.
  return res
}
