/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { TRAINING_CONFIG } from "@/content/training/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { ageOn, TRAINING_REGISTRATION_SCHEMA } from "@/lib/training/types"
import { getTrainingClassForStaff, getTrainingStripe, TRAINING_BUCKET, trainingStripeEnabled } from "@/lib/training/server"
import { clientIpFrom, rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  if (!rateLimit(`training-register:${clientIpFrom(request.headers)}`, 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 })
  }
  const parsed = TRAINING_REGISTRATION_SCHEMA.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Please review the highlighted fields.", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  const input = parsed.data
  if (ageOn(input.dob) < 18) return NextResponse.json({ error: "You must be 18 or older to register for this class." }, { status: 400 })
  if (!input.fileKey.startsWith(`pending/${input.classId}/`)) return NextResponse.json({ error: "Please upload your ID again." }, { status: 400 })
  if (!trainingStripeEnabled()) return NextResponse.json({ error: "Registration opens soon. Payment is not configured for this environment." }, { status: 503 })
  const db = createAdminClient() as any
  const course = await getTrainingClassForStaff(input.classId)
  const first = course?.sessions?.slice().sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!course || course.status !== "open" || !first || new Date(`${first.date}T${first.start}:00-05:00`).getTime() <= Date.now() || (course.registration_closes_at && new Date(course.registration_closes_at).getTime() <= Date.now())) {
    return NextResponse.json({ error: "This class is no longer open for registration." }, { status: 409 })
  }
  const { count } = await db.from("training_registrations").select("id", { count: "exact", head: true }).eq("class_id", course.id).in("status", ["paid", "enrolled", "confirmed"])
  if (course.capacity != null && (count ?? 0) >= course.capacity) return NextResponse.json({ error: "That class has just sold out." }, { status: 409 })
  const { data: uploaded } = await db.storage.from(TRAINING_BUCKET).list(`pending/${input.classId}`, { search: input.fileKey.split("/").pop() })
  if (!uploaded?.some((file: { name: string }) => input.fileKey.endsWith(file.name))) return NextResponse.json({ error: "Please upload your ID before continuing." }, { status: 400 })
  const { data: existing } = await db.from("training_registrations").select("id, status, stripe_payment_intent_id").eq("class_id", course.id).eq("email", input.email.toLowerCase()).maybeSingle()
  if (existing?.status === "paid" || existing?.status === "enrolled" || existing?.status === "confirmed") return NextResponse.json({ error: "You're already registered for this class." }, { status: 409 })
  const values = {
    first_name: input.firstName, middle_name: input.middleName, last_name: input.lastName, dob: input.dob, gender: input.gender,
    email: input.email.toLowerCase(), mobile_phone: input.mobilePhone, home_phone: input.homePhone, address1: input.address1, address2: input.address2, city: input.city, state: input.state, zip: input.zip,
    us_citizen: input.usCitizen, experience: input.experience, background: input.background, emergency_name: input.emergencyName, emergency_phone: input.emergencyPhone,
    medical_notes: input.medicalNotes || null, id_file_path: input.fileKey, sms_opt_in: input.smsOptIn, agreed_terms_at: new Date().toISOString(), agreed_terms_version: TRAINING_CONFIG.TERMS_VERSION,
    amount_cents: course.price_cents, utm: input.utm,
  }
  let registrationId = existing?.id as string | undefined
  if (registrationId) await db.from("training_registrations").update(values).eq("id", registrationId)
  else {
    const { data, error } = await db.from("training_registrations").insert({ class_id: course.id, status: "pending_payment", ...values }).select("id").single()
    if (error || !data) return NextResponse.json({ error: "Unable to save your registration." }, { status: 500 })
    registrationId = data.id
  }
  const stripe = await getTrainingStripe()
  if (!stripe || !registrationId) return NextResponse.json({ error: "Payment is not available." }, { status: 503 })
  const intent = existing?.stripe_payment_intent_id
    ? await stripe.paymentIntents.update(existing.stripe_payment_intent_id, { receipt_email: input.email, metadata: { registrationId, classSlug: course.slug } })
    : await stripe.paymentIntents.create({ amount: course.price_cents, currency: "usd", receipt_email: input.email, metadata: { registrationId, classSlug: course.slug } })
  await db.from("training_registrations").update({ stripe_payment_intent_id: intent.id }).eq("id", registrationId)
  return NextResponse.json({ registrationId, clientSecret: intent.client_secret })
}
