"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { geocodeNyc, BOROUGHS } from "@/lib/geo/nyc"
import {
  findVirtualCourseClaim,
  findBannedClaim,
  VIRTUAL_COURSE_MESSAGE,
  BANNED_CLAIM_MESSAGE,
} from "@/lib/instructors/profile"
import { myInstructorId } from "@/lib/instructor"

const boroughEnum = z.enum(BOROUGHS as unknown as [string, ...string[]])

// ── Public: instructor self-registration ─────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  phone: z.string().max(30).optional().or(z.literal("")),
  bio: z.string().max(1000).optional().or(z.literal("")),
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
    phone: formData.get("phone") ?? "",
    bio: formData.get("bio") ?? "",
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
    phone: input.phone || null,
    bio: input.bio || null,
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
// (identity comes from lib/instructor.ts myInstructorId — profile_id-bound)

const optionalText = z.string().max(2000).optional().or(z.literal(""))
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined(), z.null()])
  .transform((v) => v === "on" || v === "true")

const profileSchema = z.object({
  bio: z.string().max(4000).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  dcjsId: z.string().optional().or(z.literal("")),
  borough: boroughEnum,
  radiusMi: z.coerce.number().int().min(1).max(100),
  price18hDollars: z.coerce.number().min(0).optional(),

  // About them
  websiteUrl: z.string().url().max(300).optional().or(z.literal("")),
  instagramHandle: z.string().max(80).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional(),
  background: optionalText,
  languages: optionalText, // comma-separated in the form, text[] in the DB

  // Their course
  classFormat: z.enum(["private_1on1", "small_group", "both"]).optional().or(z.literal("")),
  typicalClassSize: z.coerce.number().int().min(1).max(60).optional(),
  providesRange: z.enum(["yes", "no", ""]).optional(),
  separateRangeNote: optionalText,
  rangeFeeIncluded: checkbox,
  ammoIncluded: checkbox,
  materialsIncluded: checkbox,
  whatsToBring: optionalText,

  // Scheduling + first contact
  schedulingNotes: optionalText,
  responseTimeNote: optionalText,
  offersIntroCall: checkbox,
  introCallNote: optionalText,

  // Auto-offer
  autoOfferEnabled: checkbox,
  autoOfferNote: optionalText,
  autoOfferPriceDollars: z.coerce.number().min(0).optional(),
})

/** Split "English, Spanish , ASL" into a clean array. */
const parseLanguages = (raw?: string | null): string[] =>
  (raw ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12)

export type ProfileState = { error?: string; ok?: boolean }

export async function updateInstructorProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  await requireRole(["instructor"])
  const get = (k: string) => formData.get(k) ?? ""
  const parsed = profileSchema.safeParse({
    bio: get("bio"),
    phone: get("phone"),
    dcjsId: get("dcjsId"),
    borough: formData.get("borough"),
    radiusMi: formData.get("radiusMi"),
    price18hDollars: formData.get("price18hDollars") || undefined,
    websiteUrl: get("websiteUrl"),
    instagramHandle: get("instagramHandle"),
    yearsExperience: formData.get("yearsExperience") || undefined,
    background: get("background"),
    languages: get("languages"),
    classFormat: get("classFormat"),
    typicalClassSize: formData.get("typicalClassSize") || undefined,
    providesRange: get("providesRange"),
    separateRangeNote: get("separateRangeNote"),
    rangeFeeIncluded: formData.get("rangeFeeIncluded"),
    ammoIncluded: formData.get("ammoIncluded"),
    materialsIncluded: formData.get("materialsIncluded"),
    whatsToBring: get("whatsToBring"),
    schedulingNotes: get("schedulingNotes"),
    responseTimeNote: get("responseTimeNote"),
    offersIntroCall: formData.get("offersIntroCall"),
    introCallNote: get("introCallNote"),
    autoOfferEnabled: formData.get("autoOfferEnabled"),
    autoOfferNote: get("autoOfferNote"),
    autoOfferPriceDollars: formData.get("autoOfferPriceDollars") || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const input = parsed.data

  // COMPLIANCE: the required 18-hour course is in person under NY's CCIA. An
  // instructor may offer a free intro call remotely — never the course itself.
  // Checked across every free-text field an applicant would read.
  const applicantFacing = [input.bio, input.background, input.whatsToBring, input.schedulingNotes, input.introCallNote, input.autoOfferNote, input.separateRangeNote]
  for (const text of applicantFacing) {
    const virtual = findVirtualCourseClaim(text)
    if (virtual) return { error: `${VIRTUAL_COURSE_MESSAGE} (found: “${virtual.slice(0, 80)}”)` }
    const banned = findBannedClaim(text)
    if (banned) return { error: `${BANNED_CLAIM_MESSAGE} (found: “${banned}”)` }
  }

  const id = await myInstructorId()
  if (!id) return { error: "Instructor profile not found" }

  const geo = geocodeNyc({ borough: input.borough })
  const supabase = await createClient()
  const { error } = await supabase
    .from("instructors")
    .update({
      bio: input.bio || null,
      phone: input.phone || null,
      dcjs_id: input.dcjsId || null,
      service_radius_mi: input.radiusMi,
      price_18h_cents: input.price18hDollars != null ? Math.round(input.price18hDollars * 100) : null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,

      website_url: input.websiteUrl || null,
      instagram_handle: input.instagramHandle || null,
      years_experience: input.yearsExperience ?? null,
      background: input.background || null,
      languages: parseLanguages(input.languages),

      class_format: input.classFormat || null,
      typical_class_size: input.typicalClassSize ?? null,
      // Tri-state on purpose: "not answered yet" is different from "no", and the
      // go-live checklist treats silence about the range as incomplete.
      provides_range: input.providesRange === "yes" ? true : input.providesRange === "no" ? false : null,
      separate_range_note: input.separateRangeNote || null,
      range_fee_included: input.rangeFeeIncluded,
      ammo_included: input.ammoIncluded,
      materials_included: input.materialsIncluded,
      whats_to_bring: input.whatsToBring || null,

      scheduling_notes: input.schedulingNotes || null,
      response_time_note: input.responseTimeNote || null,
      offers_intro_call: input.offersIntroCall,
      intro_call_note: input.introCallNote || null,

      auto_offer_enabled: input.autoOfferEnabled,
      auto_offer_note: input.autoOfferNote || null,
      auto_offer_price_cents:
        input.autoOfferPriceDollars != null ? Math.round(input.autoOfferPriceDollars * 100) : null,
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
