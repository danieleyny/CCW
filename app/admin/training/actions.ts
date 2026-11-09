"use server"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTrainingStripe } from "@/lib/training/server"
import { sendTrainingConfirmedEmail } from "@/lib/training/email"
import { TRAINING_CLASS_PRICE_CENTS } from "@/content/training/config"

const idSchema = z.string().uuid()

function refresh() { revalidatePath("/admin/training") }

export async function updateRegistration(formData: FormData) {
  await requireAdmin()
  const id = idSchema.parse(formData.get("id"))
  const status = z.enum(["enrolled", "confirmed", "cancelled"]).parse(formData.get("status"))
  const db = createAdminClient() as any
  const { data: registration, error } = await db.from("training_registrations").update({ status }).eq("id", id).select("*").single()
  if (error) throw new Error("Unable to update the registration.")
  if (status === "confirmed") {
    const { data: course } = await db.from("training_classes").select("title,sessions,location_private").eq("id", registration.class_id).single()
    if (course) await sendTrainingConfirmedEmail({
      email: registration.email,
      name: [registration.first_name, registration.middle_name, registration.last_name].filter(Boolean).join(" "),
      title: course.title,
      locationPrivate: course.location_private,
    })
  }
  refresh()
}

export async function refundRegistration(formData: FormData) {
  await requireAdmin()
  const id = idSchema.parse(formData.get("id"))
  const db = createAdminClient() as any
  const { data: registration } = await db.from("training_registrations").select("stripe_payment_intent_id,status").eq("id", id).single()
  if (!registration?.stripe_payment_intent_id || !["paid", "enrolled", "confirmed"].includes(registration.status)) throw new Error("This registration cannot be refunded.")
  const stripe = await getTrainingStripe()
  if (!stripe) throw new Error("Training Stripe test mode is not configured.")
  await stripe.refunds.create({ payment_intent: registration.stripe_payment_intent_id })
  await db.from("training_registrations").update({ status: "refunded" }).eq("id", id)
  refresh()
}

export async function duplicateTrainingClass(formData: FormData) {
  await requireAdmin()
  const id = idSchema.parse(formData.get("id")); const db = createAdminClient() as any
  const { data: course } = await db.from("training_classes").select("*").eq("id", id).single()
  if (!course) throw new Error("Class not found.")
  const slug = `${course.slug}-copy-${Date.now().toString().slice(-5)}`
  const { id: _id, created_at: _created, updated_at: _updated, ...copy } = course
  await db.from("training_classes").insert({ ...copy, slug, status: "draft" })
  refresh()
}

export async function createTrainingClass(formData: FormData) {
  await requireAdmin(); const db = createAdminClient() as any
  const slug = z.string().trim().regex(/^[a-z0-9-]+$/).parse(formData.get("slug"))
  const sessions = JSON.parse(z.string().min(2).parse(formData.get("sessions")))
  await db.from("training_classes").insert({ slug, title: z.string().min(1).parse(formData.get("title")), sessions, location_public: z.string().min(1).parse(formData.get("locationPublic")), location_private: String(formData.get("locationPrivate") || "") || null, price_cents: Number(formData.get("priceCents") || TRAINING_CLASS_PRICE_CENTS), capacity: Number(formData.get("capacity") || 0) || null, status: z.enum(["draft", "open", "closed"]).parse(formData.get("status")), instructor_name: String(formData.get("instructorName") || "Yariv Ben-Ari"), vendor_company: String(formData.get("vendorCompany") || ""), vendor_class_urls: String(formData.get("vendorUrls") || "").split("\n").filter(Boolean), vendor_access_code: String(formData.get("vendorAccessCode") || "") || null })
  refresh()
}
