"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"

export interface ProfileState {
  error?: string
  ok?: boolean
}

const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().trim().max(40).optional(),
})

/**
 * A client editing THEIR OWN name + phone. `clients`/`profiles` are staff-write
 * under RLS, so this uses the service role scoped to the caller's own rows
 * (profile_id = the session user) — a client-initiated write with an
 * owner-derived target, per the house rule for createAdminClient.
 */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { userId, profile } = await requireRole(["client"])
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const phone = parsed.data.phone?.trim() || null

  const admin = createAdminClient()
  const { error: cErr } = await admin
    .from("clients")
    .update({ full_name: parsed.data.fullName, phone })
    .eq("profile_id", userId)
  if (cErr) return { error: "Couldn't save your profile. Please try again." }
  // Keep the profile name in sync (it's what the header + messages show).
  await admin.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", userId)

  await logActivity({
    action: "client.profile_updated",
    entity: "client",
    detail: { by: profile.full_name },
  })
  revalidatePath("/portal/profile")
  return { ok: true }
}

const passwordSchema = z.object({ password: z.string().min(8, "Use at least 8 characters") })

/** Change password for the signed-in client (works on the live session). */
export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  await requireRole(["client"])
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")
  const parsed = passwordSchema.safeParse({ password })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password" }
  if (password !== confirm) return { error: "Passwords don't match" }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }
  return { ok: true }
}
