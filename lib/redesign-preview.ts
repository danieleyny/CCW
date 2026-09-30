/**
 * Redesign-v2 password-gated preview gateway (see REDESIGN_V2_PREVIEW_PROMPT). A handful
 * of reviewers open gunlicensenyc.com/redesignv2, enter a password, and thereafter see the
 * v2 marketing build (served from its OWN Vercel project) proxied under the real domain,
 * with a "preview" banner. Production is untouched for everyone else.
 *
 * KILL SWITCH: if REDESIGN_V2_ORIGIN or REDESIGN_V2_PASSWORD is unset, `enabled` is false
 * and the whole feature behaves as if it doesn't exist — /redesignv2 is a normal 404 and
 * proxy.ts skips its block entirely.
 *
 * Web Crypto ONLY (no node:crypto) so this module is safe to import from the EDGE middleware
 * (proxy.ts). The password itself is never stored client-side: the cookie holds an
 * HMAC-SHA256 keyed with the password, which proxy.ts re-derives and compares.
 */

export const PREVIEW_COOKIE = "glnyc_v2_preview"
export const PREVIEW_ENTRY = "/redesignv2"
export const PREVIEW_EXIT = "/redesignv2/exit"
const HMAC_MESSAGE = "glnyc-redesign-v2-preview"

export interface PreviewConfig {
  origin: string
  password: string
  bypass: string | null
  enabled: boolean
}

export function previewConfig(): PreviewConfig {
  const origin = (process.env.REDESIGN_V2_ORIGIN ?? "").trim().replace(/\/+$/, "")
  const password = process.env.REDESIGN_V2_PASSWORD ?? ""
  const bypass = process.env.REDESIGN_V2_BYPASS?.trim() || null
  return { origin, password, bypass, enabled: origin.length > 0 && password.length > 0 }
}

async function hmacHex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("")
}

/** The signed cookie value — HMAC-SHA256(fixed message, password). Set by the route,
 *  re-derived and verified by proxy.ts, so a forged `glnyc_v2_preview=anything` fails. */
export function previewCookieToken(password: string): Promise<string> {
  return hmacHex(HMAC_MESSAGE, password)
}

/** Constant-time compare of two equal-length hex strings. */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export async function verifyPreviewCookie(value: string | undefined | null, password: string): Promise<boolean> {
  if (!value) return false
  return constantTimeEqualHex(value, await previewCookieToken(password))
}

/**
 * Paths the preview must NEVER proxy. The gateway entry/exit routes handle themselves, and
 * — critically — /api, /portal, /admin and /auth are kept OFF the preview entirely so a
 * reviewer never reaches anything that touches applicant data, even on a non-prod database.
 */
export function isPreviewExcludedPath(path: string): boolean {
  return (
    path === PREVIEW_ENTRY ||
    path === PREVIEW_EXIT ||
    path === "/api" ||
    path.startsWith("/api/") ||
    path === "/portal" ||
    path.startsWith("/portal/") ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/auth" ||
    path.startsWith("/auth/")
  )
}

/**
 * The fixed preview banner, injected into every rewritten HTML page. Inline styles only —
 * it must render identically regardless of the v2 CSS, and be impossible to mistake for
 * production. High z-index; a spacer nudges the page content down so it isn't covered.
 */
export const PREVIEW_BANNER_HTML =
  `<div style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#0b0b0c;color:#fff;` +
  `font:600 13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;padding:8px 16px;display:flex;gap:12px;` +
  `align-items:center;justify-content:center;border-bottom:1px solid #3a3a3d">` +
  `<span><strong style="color:#f5c451">Preview — redesign v2.</strong> Not the live site.</span>` +
  `<a href="/redesignv2/exit" style="color:#f5c451;text-decoration:underline">Exit preview</a>` +
  `</div><div style="height:33px"></div>`
