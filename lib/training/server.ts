/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only"

import { TRAINING_CLASS_PRICE_CENTS, TRAINING_CONFIG, hasConfirmedRefundPolicy } from "@/content/training/config"
import { createAdminClient } from "@/lib/supabase/admin"
import type { PublicTrainingClass, TrainingSession } from "./types"

type ClassRow = {
  id: string; slug: string; title: string; sessions: TrainingSession[]; location_public: string
  hours_copy: string | null; price_cents: number; capacity: number | null; status: "draft" | "open" | "closed"
  registration_closes_at: string | null; instructor_name: string; location_private?: string | null
  vendor_company?: string; vendor_class_urls?: string[]; vendor_access_code?: string | null
}

export const TRAINING_BUCKET = "training-ids"

/** Public-only fallback lets a visual preview render before its database
 * environment is connected. Real availability always comes from Postgres. */
const previewClass: PublicTrainingClass = {
  id: "00000000-0000-4000-8000-000000000001", slug: "ccw-2026-11", title: "NYS CCW Licensing Class",
  sessions: [
    { date: "2026-11-02", start: "17:00", end: "22:00", label: "Session 1" },
    { date: "2026-11-03", start: "17:00", end: "22:00", label: "Session 2" },
    { date: "2026-11-05", start: "17:00", end: "22:00", label: "Session 3" },
  ],
  locationPublic: "Manhattan", hoursCopy: TRAINING_CONFIG.HOURS_COPY, priceCents: TRAINING_CLASS_PRICE_CENTS,
  capacity: null, seatsLeft: null, status: "open", nextAfter: null, instructorName: null,
  checkoutAvailable: process.env.VERCEL_ENV === "preview", previewCheckout: process.env.VERCEL_ENV === "preview",
}

/** Test keys are permitted on the redesign preview. Live keys remain blocked
 * until the owner supplies the refund policy in content/training/config.ts. */
export function trainingStripeEnabled() {
  const secret = process.env.TRAINING_STRIPE_SECRET_KEY
  const publishable = process.env.NEXT_PUBLIC_TRAINING_STRIPE_PUBLISHABLE_KEY
  if (!secret || !publishable) return false
  if (secret.startsWith("sk_test_") && publishable.startsWith("pk_test_")) return true
  return hasConfirmedRefundPolicy && secret.startsWith("sk_live_") && publishable.startsWith("pk_live_")
}

/** Preview permits the UI flow despite the intentionally unpublished refund
 * policy. The server still requires real Stripe test keys before it can create
 * a payment intent; production always requires the approved policy. */
export function trainingCheckoutAvailable() {
  return process.env.VERCEL_ENV === "preview" || trainingStripeEnabled()
}

export async function getTrainingStripe() {
  if (!trainingStripeEnabled()) return null
  const Stripe = (await import("stripe")).default
  return new Stripe(process.env.TRAINING_STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" })
}

function firstSession(row: ClassRow) {
  return [...row.sessions].sort((a, b) => a.date.localeCompare(b.date))[0]
}

function monthName(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "America/New_York" })
    .format(new Date(`${date}T12:00:00Z`))
}

async function paidCount(classId: string) {
  const db = createAdminClient() as any
  const { count } = await db.from("training_registrations").select("id", { count: "exact", head: true })
    .eq("class_id", classId).in("status", ["paid", "enrolled", "confirmed"])
  return count ?? 0
}

/** Only the DTO here is safe for browser use. Never add internal class fields. */
export async function getNextTrainingClass(): Promise<PublicTrainingClass | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const firstPreviewSession = [...previewClass.sessions].sort((a, b) => a.date.localeCompare(b.date))[0]
    if (!firstPreviewSession) return null
    const startsAt = new Date(`${firstPreviewSession.date}T${firstPreviewSession.start}:00-05:00`).getTime()
    return startsAt > Date.now() ? previewClass : null
  }
  const db = createAdminClient() as any
  const { data } = await db.from("training_classes")
    .select("id, slug, title, sessions, location_public, hours_copy, price_cents, capacity, status, registration_closes_at, instructor_name")
    .eq("status", "open")
  const now = Date.now()
  const rows = ((data ?? []) as ClassRow[])
    .filter((row) => {
      const session = firstSession(row)
      return Boolean(session) && new Date(`${session.date}T${session.start}:00-05:00`).getTime() > now
        && (!row.registration_closes_at || new Date(row.registration_closes_at).getTime() > now)
    })
    .sort((a, b) => firstSession(a).date.localeCompare(firstSession(b).date))
  const row = rows[0]
  if (!row) return null
  const occupied = await paidCount(row.id)
  const seatsLeft = row.capacity == null ? null : Math.max(0, row.capacity - occupied)
  const status = seatsLeft === 0 ? "sold_out" : seatsLeft != null && seatsLeft <= 3 ? "almost_full" : "open"
  return {
    id: row.id, slug: row.slug, title: row.title, sessions: row.sessions, locationPublic: row.location_public,
    hoursCopy: row.hours_copy || TRAINING_CONFIG.HOURS_COPY, priceCents: row.price_cents, capacity: row.capacity,
    seatsLeft, status, nextAfter: rows[1] ? monthName(firstSession(rows[1]).date) : null,
    instructorName: TRAINING_CONFIG.SHOW_INSTRUCTOR_NAME ? row.instructor_name : null,
    checkoutAvailable: trainingCheckoutAvailable(),
    previewCheckout: process.env.VERCEL_ENV === "preview" && !hasConfirmedRefundPolicy,
  }
}

export async function getTrainingClassForStaff(id: string): Promise<ClassRow | null> {
  const db = createAdminClient() as any
  const { data } = await db.from("training_classes").select("*").eq("id", id).maybeSingle()
  return (data as ClassRow | null) ?? null
}
