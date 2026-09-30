import { NextResponse, type NextRequest } from "next/server"
import { previewConfig, PREVIEW_COOKIE } from "@/lib/redesign-preview"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Leave the preview: clear the cookie and return to the live site. */
export async function GET(request: NextRequest) {
  const cfg = previewConfig()
  if (!cfg.enabled) return new NextResponse(null, { status: 404 })
  const res = NextResponse.redirect(new URL("/", request.url))
  res.cookies.set(PREVIEW_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 })
  return res
}
