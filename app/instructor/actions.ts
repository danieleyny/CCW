"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { geocodeNyc, BOROUGHS } from "@/lib/geo/nyc"

const boroughEnum = z.enum(BOROUGHS as unknown as [string, ...string[]])

// ── Public: instructor self-registration ─────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  dcjsId: z.string().optional().or(z.literal("")),
  borough: boroughEnum,
  radiusMi: z.coerce.number().int().min(1).max(100).default(25),
  price18hCents: z.coerce.number().int().min(0).optional(),
})

export type RegisterState = { error?: string }

export async function registerInstructor(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    dcjsId: formData.get("dcjsId") ?? "",
    borough: formData.get("borough"),
    radiusMi: formData.get("radiusMi") ?? 25,
    price18hCents: formData.get("price18hDollars")
      ? Math.round(Number(formData.get("price18hDollars")) * 100)
      : undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const input = parsed.data

  const admin = createAdminClient()
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name, role: "instructor" },
  })
  if (userErr || !created.user) {
    return { error: userErr?.message ?? "Could not create the account" }
  }

  const geo = geocodeNyc({ borough: input.borough })
  const { error: insErr } = await admin.from("instructors").insert({
    profile_id: created.user.id,
    name: input.name,
    email: input.email,
    dcjs_id: input.dcjsId || null,
    service_radius_mi: input.radiusMi,
    price_18h_cents: input.price18hCents ?? null,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    jurisdictions: ["nyc"],
    verified: false,
  })
  if (insErr) {
    // Roll back the auth user so the email can be reused.
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: insErr.message }
  }

  redirect("/auth/login?registered=instructor")
}

// ── Authed instructor: profile + locations ───────────────────────────────────
async function myInstructorId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.from("instructors").select("id").limit(1).maybeSingle()
  return data?.id ?? null
}

const profileSchema = z.object({
  bio: z.string().optional().or(z.literal("")),
  dcjsId: z.string().optional().or(z.literal("")),
  borough: boroughEnum,
  radiusMi: z.coerce.number().int().min(1).max(100),
  price18hDollars: z.coerce.number().min(0).optional(),
})

export type ProfileState = { error?: string; ok?: boolean }

export async function updateInstructorProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  await requireRole(["instructor"])
  const parsed = profileSchema.safeParse({
    bio: formData.get("bio") ?? "",
    dcjsId: formData.get("dcjsId") ?? "",
    borough: formData.get("borough"),
    radiusMi: formData.get("radiusMi"),
    price18hDollars: formData.get("price18hDollars") || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const input = parsed.data

  const id = await myInstructorId()
  if (!id) return { error: "Instructor profile not found" }

  const geo = geocodeNyc({ borough: input.borough })
  const supabase = await createClient()
  const { error } = await supabase
    .from("instructors")
    .update({
      bio: input.bio || null,
      dcjs_id: input.dcjsId || null,
      service_radius_mi: input.radiusMi,
      price_18h_cents: input.price18hDollars != null ? Math.round(input.price18hDollars * 100) : null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
    })
    .eq("id", id)
  if (error) return { error: error.message }

  await logActivity({ action: "instructor.profile_updated", entity: "instructor", entityId: id })
  revalidatePath("/instructor")
  revalidatePath("/instructor/profile")
  return { ok: true }
}

export async function addTrainingLocation(formData: FormData) {
  await requireRole(["instructor"])
  const id = await myInstructorId()
  if (!id) throw new Error("Instructor profile not found")

  const label = String(formData.get("label") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()
  const borough = String(formData.get("borough") ?? "")
  const isRange = formData.get("isRange") === "on"
  if (!label) throw new Error("Label is required")

  const geo = geocodeNyc({ borough })
  const supabase = await createClient()
  const { error } = await supabase.from("training_locations").insert({
    instructor_id: id,
    label,
    address: address || null,
    is_range: isRange,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
  })
  if (error) throw error
  revalidatePath("/instructor/profile")
}

export async function removeTrainingLocation(formData: FormData) {
  await requireRole(["instructor"])
  const locationId = String(formData.get("locationId") ?? "")
  const supabase = await createClient()
  const { error } = await supabase.from("training_locations").delete().eq("id", locationId)
  if (error) throw error
  revalidatePath("/instructor/profile")
}
