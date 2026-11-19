import "server-only"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { newYorkDateKey } from "@/lib/admin/calendar-model"
import type { TrainingSession } from "@/lib/training/types"
import type { TrainingStripeMode } from "@/lib/training/server"

export type TrainingClassStatus = "draft" | "open" | "closed"
export type TrainingRegistrationStatus =
  | "pending_payment"
  | "paid"
  | "enrolled"
  | "confirmed"
  | "cancelled"
  | "refunded"

export interface AdminTrainingRegistration {
  id: string
  classId: string
  firstName: string
  middleName: string
  lastName: string
  fullName: string
  email: string
  mobilePhone: string
  status: TrainingRegistrationStatus
  amountCents: number
  paidAt: string | null
  createdAt: string
  hasId: boolean
  canRefund: boolean
}

export interface AdminTrainingClass {
  id: string
  slug: string
  title: string
  sessions: TrainingSession[]
  locationPublic: string
  locationPrivate: string | null
  priceCents: number
  capacity: number | null
  status: TrainingClassStatus
  instructorName: string
  vendorCompany: string
  vendorUrls: string[]
  hasVendorCode: boolean
  createdAt: string
  firstSessionDate: string | null
  lastSessionDate: string | null
  activeSeats: number
  paidNotEnrolled: number
  confirmed: number
  collectedCents: number
  registrations: AdminTrainingRegistration[]
  group: "upcoming" | "drafts" | "past"
}

export interface TrainingNeed {
  registrationId: string
  classId: string
  classTitle: string
  classMonth: string
  name: string
  email: string
  date: string
  status: TrainingRegistrationStatus
  missingId: boolean
  need: string
}

export interface AdminTrainingData {
  classes: AdminTrainingClass[]
  selectedId: string | null
  needs: TrainingNeed[]
  stripeMode: TrainingStripeMode
  refundsEnabled: boolean
  takenSlugs: string[]
}

export interface TrainingClassInput {
  slug: string
  title: string
  sessions: TrainingSession[]
  locationPublic: string
  locationPrivate: string
  priceDollars: number
  capacity: number | null
  status: TrainingClassStatus
  instructorName: string
  vendorCompany: string
  vendorUrls: string[]
  vendorAccessCode: string
}

export interface TrainingActionResult {
  ok: boolean
  error?: string
  warning?: string
  id?: string
  slug?: string
  status?: TrainingRegistrationStatus | TrainingClassStatus
}

type RawClass = {
  id: string
  slug: string
  title: string
  sessions: TrainingSession[] | null
  location_public: string
  location_private: string | null
  price_cents: number
  capacity: number | null
  status: TrainingClassStatus
  instructor_name: string
  vendor_company: string
  vendor_class_urls: string[] | null
  vendor_access_code: string | null
  created_at: string
}

type RawRegistration = {
  id: string
  class_id: string
  first_name: string
  middle_name: string
  last_name: string
  email: string
  mobile_phone: string
  status: TrainingRegistrationStatus
  amount_cents: number
  stripe_payment_intent_id: string | null
  id_file_path: string | null
  paid_at: string | null
  created_at: string
}

const ACTIVE_SEAT_STATUSES: TrainingRegistrationStatus[] = ["paid", "enrolled", "confirmed"]
const REFUNDABLE_STATUSES: TrainingRegistrationStatus[] = ["paid", "enrolled", "confirmed"]

function sessionsFor(value: TrainingSession[] | null) {
  return [...(value ?? [])].sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`))
}

function monthLabel(date: string | null) {
  if (!date) return "Unscheduled"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(`${date}T12:00:00Z`))
}

function classGroup(status: TrainingClassStatus, sessions: TrainingSession[], today: string) {
  if (status === "draft") return "drafts" as const
  const everySessionPast = sessions.length > 0 && sessions.every((session) => session.date < today)
  if (status === "closed" || everySessionPast || sessions.length === 0) return "past" as const
  return "upcoming" as const
}

function groupOrder(group: AdminTrainingClass["group"]) {
  return group === "upcoming" ? 0 : group === "drafts" ? 1 : 2
}

/** Load the admin-only training workspace. Callers authenticate before invoking
 * this helper; the passed request client still enforces RLS. */
export async function loadAdminTraining(
  db: any,
  input: { selectedId?: string; stripeMode: TrainingStripeMode; refundsEnabled: boolean; now?: Date },
): Promise<AdminTrainingData> {
  const [{ data: classRows, error: classError }, { data: registrationRows, error: registrationError }] = await Promise.all([
    db.from("training_classes").select("id,slug,title,sessions,location_public,location_private,price_cents,capacity,status,instructor_name,vendor_company,vendor_class_urls,vendor_access_code,created_at"),
    db.from("training_registrations").select("id,class_id,first_name,middle_name,last_name,email,mobile_phone,status,amount_cents,stripe_payment_intent_id,id_file_path,paid_at,created_at"),
  ])
  if (classError || registrationError) {
    console.error("[admin-training] load failed", {
      classes: classError ? { code: classError.code, message: classError.message } : null,
      registrations: registrationError ? { code: registrationError.code, message: registrationError.message } : null,
    })
    throw new Error("Classes didn't load. Nothing was changed.")
  }

  const today = newYorkDateKey(input.now ?? new Date())
  const rawRegistrations = (registrationRows ?? []) as RawRegistration[]
  const registrationsByClass = new Map<string, RawRegistration[]>()
  for (const registration of rawRegistrations) {
    const rows = registrationsByClass.get(registration.class_id) ?? []
    rows.push(registration)
    registrationsByClass.set(registration.class_id, rows)
  }

  const classes = ((classRows ?? []) as RawClass[]).map((row): AdminTrainingClass => {
    const sessions = sessionsFor(row.sessions)
    const rawRows = registrationsByClass.get(row.id) ?? []
    const registrations = rawRows
      .map((registration): AdminTrainingRegistration => ({
        id: registration.id,
        classId: registration.class_id,
        firstName: registration.first_name,
        middleName: registration.middle_name,
        lastName: registration.last_name,
        fullName: [registration.first_name, registration.middle_name, registration.last_name].filter(Boolean).join(" "),
        email: registration.email,
        mobilePhone: registration.mobile_phone,
        status: registration.status,
        amountCents: registration.amount_cents,
        paidAt: registration.paid_at,
        createdAt: registration.created_at,
        hasId: Boolean(registration.id_file_path),
        canRefund: Boolean(registration.stripe_payment_intent_id) && REFUNDABLE_STATUSES.includes(registration.status),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const firstSessionDate = sessions[0]?.date ?? null
    const lastSessionDate = sessions.at(-1)?.date ?? null
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      sessions,
      locationPublic: row.location_public,
      locationPrivate: row.location_private,
      priceCents: row.price_cents,
      capacity: row.capacity,
      status: row.status,
      instructorName: row.instructor_name,
      vendorCompany: row.vendor_company,
      vendorUrls: row.vendor_class_urls ?? [],
      hasVendorCode: Boolean(row.vendor_access_code),
      createdAt: row.created_at,
      firstSessionDate,
      lastSessionDate,
      activeSeats: registrations.filter((registration) => ACTIVE_SEAT_STATUSES.includes(registration.status)).length,
      paidNotEnrolled: registrations.filter((registration) => registration.status === "paid").length,
      confirmed: registrations.filter((registration) => registration.status === "confirmed").length,
      collectedCents: registrations
        .filter((registration) => registration.paidAt && registration.status !== "refunded")
        .reduce((sum, registration) => sum + registration.amountCents, 0),
      registrations,
      group: classGroup(row.status, sessions, today),
    }
  }).sort((a, b) => {
    const order = groupOrder(a.group) - groupOrder(b.group)
    if (order) return order
    const aDate = a.firstSessionDate ?? a.createdAt.slice(0, 10)
    const bDate = b.firstSessionDate ?? b.createdAt.slice(0, 10)
    return a.group === "past" ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate)
  })

  const selectedId = classes.some((course) => course.id === input.selectedId)
    ? input.selectedId!
    : classes.find((course) => course.group === "upcoming")?.id
      ?? classes.find((course) => course.group === "drafts")?.id
      ?? classes[0]?.id
      ?? null

  const byClass = new Map(classes.map((course) => [course.id, course]))
  const needs = rawRegistrations
    .filter((registration) => {
      const missingId = !registration.id_file_path && ACTIVE_SEAT_STATUSES.includes(registration.status)
      return registration.status === "paid" || registration.status === "enrolled" || missingId
    })
    .map((registration): TrainingNeed => {
      const course = byClass.get(registration.class_id)
      const missingId = !registration.id_file_path
      const steps = [
        registration.status === "paid" ? "Enroll with instructor" : null,
        registration.status === "enrolled" ? "Confirm seat and send details" : null,
        missingId ? "ID missing" : null,
      ].filter(Boolean)
      return {
        registrationId: registration.id,
        classId: registration.class_id,
        classTitle: course?.title ?? "Training class",
        classMonth: monthLabel(course?.firstSessionDate ?? null),
        name: [registration.first_name, registration.middle_name, registration.last_name].filter(Boolean).join(" "),
        email: registration.email,
        date: registration.paid_at ?? registration.created_at,
        status: registration.status,
        missingId,
        need: steps.join(" · "),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    classes,
    selectedId,
    needs,
    stripeMode: input.stripeMode,
    refundsEnabled: input.refundsEnabled,
    takenSlugs: classes.map((course) => course.slug),
  }
}
