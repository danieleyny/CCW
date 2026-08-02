"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureClientCaseForProfile } from "@/lib/onboarding"
import { getSiteUrl } from "@/lib/site-url"

export interface AuthFormState {
  error?: string
}

export interface ResetRequestState {
  error?: string
  sent?: boolean
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

const signUpSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
})

export async function login(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  const redirectTo = (formData.get("redirect") as string) || "/dashboard"
  redirect(redirectTo)
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  // Role is NOT set here: user_metadata (options.data) is client-controlled, and
  // handle_new_user deliberately ignores it for role — self-serve signups always
  // become 'client'. Non-client roles are set via app_metadata in the
  // service-role creation flows only.
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      // Only used if email confirmation is ever re-enabled at the project level;
      // with "Confirm email" OFF (see docs/AUTH_EMAIL_CONFIRMATION.md), signUp
      // returns a session directly and this round-trip never happens.
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
    },
  })
  if (error) return { error: error.message }

  // Open their case immediately so they land in a ready portal — no manual
  // handoff. Non-fatal if it fails: the portal falls back to the "concierge
  // will reach out" state and staff can open the case.
  if (data.user) {
    try {
      const admin = createAdminClient()
      await ensureClientCaseForProfile(admin, {
        profileId: data.user.id,
        email: parsed.data.email,
        fullName: parsed.data.fullName,
      })
    } catch (e) {
      console.error("signup auto-provision failed", e)
    }
  }

  // Confirm-email OFF → signUp returns a live session; go straight into the app.
  // If confirmation is ever turned back on, there's no session yet, so send them
  // to sign in (they'll confirm via the email link first).
  if (data.session) redirect("/dashboard")
  redirect("/auth/login")
}

/**
 * Truly end the session. supabase.auth.signOut() emits cookie-removal writes
 * through the SSR adapter, but that adapter's setAll swallows errors and does
 * NOT sweep the chunked auth cookies (sb-<ref>-auth-token.0/.1). A surviving
 * chunk lets proxy.ts still see a user and — per its intentional "signed-in →
 * /dashboard" bounce — auto-log you back in. So we delete every sb-* cookie
 * explicitly, then revalidate the layout so the deletions flush before the
 * redirect throws.
 */
async function clearSession() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const jar = await cookies()
  for (const c of jar.getAll()) {
    if (c.name.startsWith("sb-")) jar.delete(c.name)
  }
  revalidatePath("/", "layout")
}

export async function signOut() {
  await clearSession()
  redirect("/auth/login?loggedout=1")
}

/**
 * "Use a different account": sign out cleanly, then land on the login form.
 * Unlike a bare link to /auth/login (which the proxy bounces back to the
 * dashboard for a signed-in user), this signs out first so the form is reached.
 */
export async function switchAccount() {
  await clearSession()
  redirect("/auth/login?switch=1")
}

const emailSchema = z.object({ email: z.string().email("Enter a valid email") })

/**
 * Send a password-reset email. Neutral by design: the response is identical
 * whether or not an account exists, so it never leaks which emails are
 * registered. The recovery link lands on /auth/callback (type=recovery), which
 * establishes the recovery session and forwards to /auth/reset-password.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" }
  }
  const supabase = await createClient()
  // Ignore the result: surfacing an error here would reveal account existence.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/auth/reset-password`,
  })
  return { sent: true }
}

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters"),
})

/**
 * Set a new password. Requires the recovery session the callback established;
 * if it's missing/expired, updateUser errors and we route the user to request
 * a fresh link rather than showing a raw Supabase error.
 */
export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")
  const parsed = updatePasswordSchema.safeParse({ password })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" }
  }
  if (password !== confirm) {
    return { error: "Passwords don't match" }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: "This reset link has expired or is invalid. Request a new one below." }
  }
  redirect("/dashboard")
}
