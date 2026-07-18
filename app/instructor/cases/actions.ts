"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { maybeAdvanceStage } from "@/lib/cases/advance"
import { logActivity } from "@/lib/activity"
import { sendBookingInvites } from "@/lib/calendar/invites"

/** Instructor confirms a booking → emails both parties a .ics invite. */
export async function confirmBooking(formData: FormData) {
  await requireRole(["instructor"])
  const bookingId = String(formData.get("bookingId") ?? "")
  const supabase = await createClient()

  const { data: b } = await supabase
    .from("bookings")
    .select("id, case_id, ics_uid")
    .eq("id", bookingId)
    .maybeSingle()
  if (!b) throw new Error("Booking not found")

  const uid = b.ics_uid ?? `${bookingId}@carry.app`
  const { error } = await supabase
    .from("bookings")
    .update({ status: "confirmed", ics_uid: uid })
    .eq("id", bookingId)
  if (error) throw error

  await sendBookingInvites(bookingId)
  // A confirmed booking is training scheduled — the customer shouldn't have to
  // infer that from a calendar entry.
  await maybeAdvanceStage(createAdminClient(), b.case_id, "training_scheduled", "booking.confirmed")

  await logActivity({ action: "booking.confirmed", caseId: b.case_id, entity: "booking", entityId: bookingId })
  revalidatePath(`/instructor/cases/${b.case_id}`)
}

/** Mark a session complete → write a training_sessions row (score / pass). */
export async function completeBooking(formData: FormData) {
  await requireRole(["instructor"])
  const bookingId = String(formData.get("bookingId") ?? "")
  const testScore = formData.get("testScore") ? Number(formData.get("testScore")) : null
  const passed = formData.get("passed") === "on"

  const supabase = await createClient()
  const { data: b } = await supabase
    .from("bookings")
    .select("id, case_id, instructor_id, starts_at")
    .eq("id", bookingId)
    .maybeSingle()
  if (!b) throw new Error("Booking not found")

  const { error } = await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId)
  if (error) throw error

  // The completed booking feeds the existing training_sessions table (service-role
  // write — a system effect of completion).
  const admin = createAdminClient()
  await admin.from("training_sessions").insert({
    case_id: b.case_id,
    instructor_id: b.instructor_id,
    class_date: b.starts_at,
    attended: true,
    test_score: testScore,
    passed,
  })

  // The instructor confirming attendance is the milestone — not a staffer
  // noticing later that it happened.
  await maybeAdvanceStage(admin, b.case_id, "training_complete", "booking.completed")

  await logActivity({
    action: "booking.completed",
    caseId: b.case_id,
    entity: "booking",
    entityId: bookingId,
    detail: { test_score: testScore, passed },
  })
  revalidatePath(`/instructor/cases/${b.case_id}`)
}

export async function cancelBooking(formData: FormData) {
  await requireRole(["instructor"])
  const bookingId = String(formData.get("bookingId") ?? "")
  const supabase = await createClient()
  const { data: b } = await supabase.from("bookings").select("case_id").eq("id", bookingId).maybeSingle()
  await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId)
  if (b) revalidatePath(`/instructor/cases/${b.case_id}`)
}
