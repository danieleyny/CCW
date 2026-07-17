import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

/**
 * Auth landing route. Consumes both flavours Supabase can hand back:
 *  - `code`: the PKCE exchange (OAuth, and browser-initiated flows).
 *  - `token_hash` + `type`: the token-hash flow used by email confirmation,
 *    magic links, and PASSWORD RECOVERY. Without this branch the app had no way
 *    to complete a recovery link, so a forgotten password was unrecoverable.
 * On success, routes to `next` (default the post-login dispatcher).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/dashboard"

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback`)
}
