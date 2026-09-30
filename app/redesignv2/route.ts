import { NextResponse, type NextRequest } from "next/server"
import { previewConfig, previewCookieToken, verifyPreviewCookie, PREVIEW_COOKIE } from "@/lib/redesign-preview"
import { timingSafeEqualStrings } from "@/lib/access-codes"

// Node runtime: the password check reuses lib/access-codes (node:crypto).
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** A minimal, unbranded password form. No layout, no marketing chrome, no hint about what
 *  is behind it beyond "Gun License NYC — preview". Never indexed. */
function formHtml(error?: string): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Gun License NYC — preview</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0c;color:#eaeaea;
    font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
  form{width:min(340px,90vw);padding:28px 24px;border:1px solid #2a2a2d;border-radius:12px;background:#141416}
  h1{margin:0 0 4px;font-size:16px;font-weight:600}
  p{margin:0 0 18px;color:#9a9a9e;font-size:13px}
  label{display:block;font-size:12px;color:#9a9a9e;margin-bottom:6px}
  input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #333;border-radius:8px;
    background:#0e0e10;color:#fff;font-size:14px}
  button{margin-top:14px;width:100%;padding:10px 12px;border:0;border-radius:8px;background:#f5c451;
    color:#111;font-size:14px;font-weight:600;cursor:pointer}
  .err{margin:0 0 14px;color:#f0a3a3;font-size:13px}
</style></head><body>
<form method="post" action="/redesignv2">
  <h1>Gun License NYC — preview</h1>
  <p>Enter the password to continue.</p>
  ${error ? `<p class="err">${error}</p>` : ""}
  <label for="p">Password</label>
  <input id="p" name="password" type="password" autocomplete="off" autofocus>
  <button type="submit">Continue</button>
</form></body></html>`
}

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" }

export async function GET(request: NextRequest) {
  const cfg = previewConfig()
  if (!cfg.enabled) return new NextResponse(null, { status: 404 }) // kill switch → normal 404
  // Already unlocked → send them into the (proxied) preview.
  const token = request.cookies.get(PREVIEW_COOKIE)?.value
  if (await verifyPreviewCookie(token, cfg.password)) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  return new NextResponse(formHtml(), { status: 200, headers: HTML_HEADERS })
}

export async function POST(request: NextRequest) {
  const cfg = previewConfig()
  if (!cfg.enabled) return new NextResponse(null, { status: 404 })
  const form = await request.formData().catch(() => null)
  const submitted = String(form?.get("password") ?? "")
  // Timing-safe; a wrong password reveals nothing about whether the feature exists.
  if (!timingSafeEqualStrings(submitted, cfg.password)) {
    return new NextResponse(formHtml("Incorrect password"), { status: 401, headers: HTML_HEADERS })
  }
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 })
  res.cookies.set(PREVIEW_COOKIE, await previewCookieToken(cfg.password), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return res
}
