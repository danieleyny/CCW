"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { ANIMAL_AVATAR_KEYS } from "@/components/portal/avatars/registry"

export interface ProfileState {
  error?: string
  ok?: boolean
}

export interface AvatarUpdateState {
  error?: string
  ok?: boolean
}

const avatarSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("animal"),
    key: z.enum(ANIMAL_AVATAR_KEYS),
  }),
  z.object({
    kind: z.literal("upload"),
    path: z.string().min(1).max(500),
  }),
  z.object({
    kind: z.null(),
  }),
])

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

/**
 * Save the signed-in client's avatar selection. Profiles remain staff-write
 * under ordinary RLS; an owner-scoped SECURITY DEFINER RPC validates the same
 * key/path invariants again and can update only auth.uid()'s profile row.
 */
export async function updateProfileAvatar(input: unknown): Promise<AvatarUpdateState> {
  const { userId, profile } = await requireRole(["client"])
  const parsed = avatarSchema.safeParse(input)
  if (!parsed.success) return { error: "We couldn't save your photo. Please try again." }

  if (parsed.data.kind === "upload" && !parsed.data.path.startsWith(`${userId}/`)) {
    return { error: "We couldn't save your photo. Please try again." }
  }

  const next = parsed.data.kind === "animal"
    ? { avatar_kind: "animal", avatar_key: parsed.data.key, avatar_path: null }
    : parsed.data.kind === "upload"
      ? { avatar_kind: "upload", avatar_key: null, avatar_path: parsed.data.path }
      : { avatar_kind: null, avatar_key: null, avatar_path: null }

  const db = await createClient()
  const { data: oldPath, error } = await db.rpc("update_own_profile_avatar", {
    p_kind: next.avatar_kind,
    p_key: next.avatar_key,
    p_path: next.avatar_path,
  })
  if (error) return { error: "We couldn't save your photo. Please try again." }

  if (oldPath && oldPath !== next.avatar_path) {
    // The authenticated client can delete only inside their own folder by RLS.
    await db.storage.from("avatars").remove([oldPath])
  }

  await logActivity({
    action: "client.profile_avatar_updated",
    entity: "profile",
    detail: { by: profile.full_name, kind: parsed.data.kind ?? "removed" },
  })
  revalidatePath("/portal", "layout")
  revalidatePath("/portal/profile")
  return { ok: true }
}
