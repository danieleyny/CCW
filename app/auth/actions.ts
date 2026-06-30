"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureClientCaseForProfile } from "@/lib/onboarding"
import { getSiteUrl } from "@/lib/site-url"

export interface AuthFormState {
  error?: string
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
  // New users default to the `client` role (handle_new_user trigger).
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, role: "client" },
      // Where the confirmation email sends them back to — our live site, not localhost.
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

  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
