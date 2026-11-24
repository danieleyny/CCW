"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logActivity } from "@/lib/activity"
import type { TrainingActionResult, TrainingClassInput, TrainingRegistrationStatus } from "@/lib/admin/training"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"
import { sendTrainingConfirmedEmail } from "@/lib/training/email"
import { getTrainingStripe, TRAINING_BUCKET } from "@/lib/training/server"
import { SESSION_SCHEMA } from "@/lib/training/types"

const idSchema = z.string().uuid()
const registrationStatusSchema = z.enum(["enrolled", "confirmed", "cancelled"])
const classInputSchema = z.object({
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens."),
  title: z.string().trim().min(2, "Enter a class title.").max(160),
  sessions: z.array(SESSION_SCHEMA).min(1, "Add at least one session.").max(12),
  locationPublic: z.string().trim().min(2, "Enter the public area.").max(120),
  locationPrivate: z.string().trim().max(240).default(""),
  priceDollars: z.number().finite().nonnegative().max(10_000),
  capacity: z.number().int().positive().max(10_000).nullable(),
  status: z.enum(["draft", "open", "closed"]),
  instructorName: z.string().trim().min(2, "Enter the instructor name.").max(160),
  vendorCompany: z.string().trim().max(180).default(""),
  vendorUrls: z.array(z.string().trim().url("Enter a complete URL, including https://")).max(20),
  vendorAccessCode: z.string().trim().max(200).default(""),
})

type ActionDb = Awaited<ReturnType<typeof createClient>>
type TrainingClassInsert = Database["public"]["Tables"]["training_classes"]["Insert"]
type TrainingClassUpdate = Database["public"]["Tables"]["training_classes"]["Update"]

function refreshTraining(publicChanged = false) {
  revalidatePath("/admin/training")
  revalidatePath("/admin/calendar")
  if (publicChanged) revalidatePath("/")
}
function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

async function availableSlug(db: ActionDb, requested: string, excludeId?: string) {
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate = suffix === 1 ? requested : `${requested}-${suffix}`
    let query = db.from("training_classes").select("id").eq("slug", candidate)
    if (excludeId) query = query.neq("id", excludeId)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error("Couldn't check the class URL.")
    if (!data) return candidate
  }
  throw new Error("That class URL is already in use. Choose another one.")
}

function rowFor(input: z.infer<typeof classInputSchema>, slug: string): TrainingClassInsert {
  return {
    slug,
    title: input.title,
    sessions: input.sessions as never,
    location_public: input.locationPublic,
    location_private: input.locationPrivate || null,
    price_cents: Math.round(input.priceDollars * 100),
    capacity: input.capacity,
    status: input.status,
    instructor_name: input.instructorName,
    vendor_company: input.vendorCompany,
    vendor_class_urls: input.vendorUrls,
    vendor_access_code: input.vendorAccessCode || null,
    updated_at: new Date().toISOString(),
  }
}

export async function createTrainingClass(raw: TrainingClassInput | unknown): Promise<TrainingActionResult> {
  await requireAdmin()
  const parsed = classInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the class details." }
  try {
    const db = await createClient()
    const slug = await availableSlug(db, parsed.data.slug)
    const { data, error } = await db.from("training_classes")
      .insert(rowFor(parsed.data, slug))
      .select("id,slug")
      .single()
    if (error || !data) return { ok: false, error: "The class wasn't created. Nothing was changed." }
    const saved = data
    await logActivity({
      action: "training.class_created",
      entity: "training_class",
      entityId: saved.id,
      detail: { status: parsed.data.status, slug: saved.slug },
    })
    refreshTraining(parsed.data.status === "open")
    return { ok: true, id: saved.id, slug: saved.slug }
  } catch (error) {
    return { ok: false, error: message(error, "The class wasn't created. Nothing was changed.") }
  }
}

export async function updateTrainingClass(idValue: string, raw: TrainingClassInput | unknown): Promise<TrainingActionResult> {
  await requireAdmin()
  const id = idSchema.safeParse(idValue)
  const parsed = classInputSchema.safeParse(raw)
  if (!id.success || !parsed.success) return { ok: false, error: parsed.success ? "Class not found." : parsed.error.issues[0]?.message ?? "Check the class details." }
  try {
    const db = await createClient()
    const { data: current, error: currentError } = await db.from("training_classes").select("status,vendor_access_code").eq("id", id.data).maybeSingle()
    if (currentError || !current) return { ok: false, error: "Class not found." }
    const previous = current
    const previousStatus = previous.status
    const slug = await availableSlug(db, parsed.data.slug, id.data)
    const update: TrainingClassUpdate = rowFor(parsed.data, slug)
    if (!parsed.data.vendorAccessCode) update.vendor_access_code = previous.vendor_access_code
    const { error } = await db.from("training_classes").update(update).eq("id", id.data)
    if (error) return { ok: false, error: "The class wasn't updated. Nothing was changed." }
    await logActivity({
      action: "training.class_updated",
      entity: "training_class",
      entityId: id.data,
      detail: { from: previousStatus, to: parsed.data.status, slug },
    })
    if (previousStatus !== "open" && parsed.data.status === "open") {
      await logActivity({
        action: "training.class_published",
        entity: "training_class",
        entityId: id.data,
        detail: { slug },
      })
    }
    refreshTraining(previousStatus === "open" || parsed.data.status === "open")
    return { ok: true, id: id.data, slug }
  } catch (error) {
    return { ok: false, error: message(error, "The class wasn't updated. Nothing was changed.") }
  }
}

export async function duplicateTrainingClass(idValue: string): Promise<TrainingActionResult> {
  await requireAdmin()
  const id = idSchema.safeParse(idValue)
  if (!id.success) return { ok: false, error: "Class not found." }
  try {
    const db = await createClient()
    const { data: course, error: courseError } = await db.from("training_classes").select("*").eq("id", id.data).maybeSingle()
    if (courseError || !course) return { ok: false, error: "Class not found." }
    const source = course
    const slug = await availableSlug(db, `${source.slug}-copy`)
    const { id: _id, created_at: _created, updated_at: _updated, ...copy } = source
    void _id; void _created; void _updated
    const { data, error } = await db.from("training_classes")
      .insert({ ...copy, slug, status: "draft", updated_at: new Date().toISOString() })
      .select("id,slug")
      .single()
    if (error || !data) return { ok: false, error: "The class wasn't duplicated." }
    const saved = data
    await logActivity({
      action: "training.class_created",
      entity: "training_class",
      entityId: saved.id,
      detail: { via: "duplicate", source_id: id.data, slug: saved.slug },
    })
    refreshTraining()
    return { ok: true, id: saved.id, slug: saved.slug }
  } catch (error) {
    return { ok: false, error: message(error, "The class wasn't duplicated.") }
  }
}

export async function updateRegistration(raw: { id: string; status: TrainingRegistrationStatus } | unknown): Promise<TrainingActionResult> {
  await requireAdmin()
  const parsed = z.object({ id: idSchema, status: registrationStatusSchema }).safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Check the registration action." }
  try {
    const db = await createClient()
    const { data: registration, error: registrationError } = await db.from("training_registrations")
      .select("id,class_id,status,email,first_name,middle_name,last_name")
      .eq("id", parsed.data.id)
      .maybeSingle()
    if (registrationError || !registration) return { ok: false, error: "Registration not found." }
    const current = registration as {
      id: string; class_id: string; status: TrainingRegistrationStatus; email: string
      first_name: string; middle_name: string; last_name: string
    }
    const allowed: Record<z.infer<typeof registrationStatusSchema>, TrainingRegistrationStatus[]> = {
      enrolled: ["paid"],
      confirmed: ["enrolled"],
      cancelled: ["pending_payment", "paid", "enrolled", "confirmed"],
    }
    if (!allowed[parsed.data.status].includes(current.status)) {
      return { ok: false, error: `This registration can't move from ${current.status.replaceAll("_", " ")} to ${parsed.data.status}.` }
    }
    const { error } = await db.from("training_registrations")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
    if (error) return { ok: false, error: "The registration wasn't updated. Nothing was changed." }

    let warning: string | undefined
    if (parsed.data.status === "confirmed") {
      const { data: course } = await db.from("training_classes").select("title,location_private").eq("id", current.class_id).maybeSingle()
      const details = course
      if (details) {
        const emailResult = await sendTrainingConfirmedEmail({
          email: current.email,
          name: [current.first_name, current.middle_name, current.last_name].filter(Boolean).join(" "),
          title: details.title,
          locationPrivate: details.location_private,
        })
        if ("error" in emailResult) warning = "The seat was confirmed, but the confirmation email failed. Send the class details manually."
      }
    }
    await logActivity({
      action: "training.registration_updated",
      entity: "training_registration",
      entityId: parsed.data.id,
      detail: { from: current.status, to: parsed.data.status },
    })
    refreshTraining()
    return { ok: true, id: parsed.data.id, status: parsed.data.status, warning }
  } catch (error) {
    return { ok: false, error: message(error, "The registration wasn't updated. Nothing was changed.") }
  }
}

export async function refundRegistration(idValue: string): Promise<TrainingActionResult> {
  await requireAdmin()
  const id = idSchema.safeParse(idValue)
  if (!id.success) return { ok: false, error: "Registration not found." }
  try {
    const db = await createClient()
    const { data, error } = await db.from("training_registrations")
      .select("stripe_payment_intent_id,status,amount_cents")
      .eq("id", id.data)
      .maybeSingle()
    if (error || !data) return { ok: false, error: "Registration not found." }
    const registration = data as { stripe_payment_intent_id: string | null; status: TrainingRegistrationStatus; amount_cents: number }
    if (!registration.stripe_payment_intent_id || !["paid", "enrolled", "confirmed"].includes(registration.status)) {
      return { ok: false, error: "This registration cannot be refunded." }
    }
    const stripe = await getTrainingStripe()
    if (!stripe) return { ok: false, error: "Training Stripe is not configured for refunds on this deployment." }
    await stripe.refunds.create({ payment_intent: registration.stripe_payment_intent_id })
    const { error: updateError } = await db.from("training_registrations")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", id.data)
    if (updateError) return { ok: false, error: "Stripe issued the refund, but the local status did not update. Reconcile this registration before retrying." }
    await logActivity({
      action: "training.registration_refunded",
      entity: "training_registration",
      entityId: id.data,
      detail: { amount_cents: registration.amount_cents },
    })
    refreshTraining()
    return { ok: true, id: id.data, status: "refunded" }
  } catch (error) {
    return { ok: false, error: message(error, "Stripe couldn't issue the refund. Nothing was changed.") }
  }
}

export async function revealVendorAccessCode(classIdValue: string) {
  await requireAdmin()
  const classId = idSchema.safeParse(classIdValue)
  if (!classId.success) return { ok: false as const, error: "Class not found." }
  const db = await createClient()
  const { data, error } = await db.from("training_classes").select("vendor_access_code").eq("id", classId.data).maybeSingle()
  if (error || !data) return { ok: false as const, error: "Class not found." }
  const code = data.vendor_access_code
  if (!code) return { ok: false as const, error: "No vendor access code is stored for this class." }
  await logActivity({ action: "training.vendor_code_revealed", entity: "training_class", entityId: classId.data })
  return { ok: true as const, code, expiresAt: Date.now() + 60_000 }
}

export async function getRegistrationIdUrl(registrationIdValue: string) {
  await requireAdmin()
  const registrationId = idSchema.safeParse(registrationIdValue)
  if (!registrationId.success) return { ok: false as const, error: "Registration not found." }
  const db = await createClient()
  const { data, error } = await db.from("training_registrations")
    .select("id_file_path,first_name,middle_name,last_name")
    .eq("id", registrationId.data)
    .maybeSingle()
  if (error || !data) return { ok: false as const, error: "Registration not found." }
  const registration = data
  if (!registration.id_file_path) return { ok: false as const, error: "No ID file is stored for this registration." }

  // The private training bucket intentionally has no end-user storage policy.
  // A service-role client is used only to mint this 60-second, audited URL.
  const storage = createAdminClient()
  const signed = await storage.storage.from(TRAINING_BUCKET).createSignedUrl(registration.id_file_path, 60)
  if (signed.error || !signed.data?.signedUrl) return { ok: false as const, error: "The ID couldn't be opened. Try again." }
  await logActivity({ action: "training.id_viewed", entity: "training_registration", entityId: registrationId.data })
  return {
    ok: true as const,
    url: signed.data.signedUrl,
    name: [registration.first_name, registration.middle_name, registration.last_name].filter(Boolean).join(" "),
    expiresAt: Date.now() + 60_000,
  }
}
