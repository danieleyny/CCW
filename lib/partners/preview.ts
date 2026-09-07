import { cookies } from "next/headers"

/**
 * A SOFT preview gate for coming-soon partner pages — NOT security and NOT
 * authentication. It only keeps a work-in-progress page from being read as finished; it
 * protects nothing sensitive, and nothing sensitive goes on these pages. Do not hang any
 * real access-control decision off this cookie or this code.
 *
 * The code is read from PARTNER_PREVIEW_CODE and FAILS CLOSED: if the env var is unset,
 * no code matches, so there is no bypass. The cookie value is an opaque marker — never
 * the code itself.
 */

export const PREVIEW_COOKIE = "glnyc_preview"
export const PREVIEW_MARKER = "1"

/** Cookie options shared by the Server Action and the Route Handler. */
export function previewCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  }
}

/** The configured code, or null when unset (→ gate is closed, no bypass possible). */
function configuredCode(): string | null {
  const code = process.env.PARTNER_PREVIEW_CODE
  return code && code.length > 0 ? code : null
}

export function previewConfigured(): boolean {
  return configuredCode() !== null
}

/** True only when a code is configured AND the input matches it exactly. */
export function codeMatches(input: string | null | undefined): boolean {
  const code = configuredCode()
  return code !== null && typeof input === "string" && input === code
}

/** Whether the current request carries a valid preview cookie. Reading it opts the
 *  route out of static rendering, so call this ONLY for a coming_soon partner. */
export async function hasPreviewAccess(): Promise<boolean> {
  const store = await cookies()
  return store.get(PREVIEW_COOKIE)?.value === PREVIEW_MARKER
}

/** Set the opaque preview marker (7 days). Server Action / Route Handler only. */
export async function setPreviewCookie(): Promise<void> {
  const store = await cookies()
  store.set(PREVIEW_COOKIE, PREVIEW_MARKER, previewCookieOptions())
}

/** Clear the preview marker. Server Action / Route Handler only. */
export async function clearPreviewCookie(): Promise<void> {
  const store = await cookies()
  store.delete(PREVIEW_COOKIE)
}
