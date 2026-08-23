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

/**
 * B3B — instructor's reply on the private STAFF↔INSTRUCTOR lane (staff_only,
 * keyed to their engagement). RLS lets an instructor write only their own
 * engagement's rows; the client can never read this lane.
 */
export async function sendStaffMessage(caseId: string, engagementId: string, body: string) {
  const { userId } = await requireRole(["instructor"])
  const trimmed = body.trim()
  if (!trimmed || !engagementId) return
  const supabase = await createClient()
  const { error } = await supabase.from("messages").insert({
    case_id: caseId,
    engagement_id: engagementId,
    sender_id: userId,
    body: trimmed,
    staff_only: true,
  })
  if (error) throw error
  revalidatePath(`/instructor/cases/${caseId}`)
}

/**
 * §5-09 — the instructor's pre-licence exemption verified statement, collected
 * in-platform. RLS (instructor_engaged) lets only the ASSIGNED instructor write
 * it. This is not a signature: the official form (PLE-01) is still filled +
 * printed + notarised on paper. Saving with submit=1 marks the statement ready
 * so the applicant's PLE-01 fill carries it.
 */
export async function saveInstructorStatement(formData: FormData) {
  const { userId } = await requireRole(["instructor"])
  const caseId = String(formData.get("caseId") ?? "")
  if (!caseId) return
  const str = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim()
    return s || null
  }
  const supabase = await createClient()
  const { data: instr } = await supabase.from("instructors").select("id").eq("profile_id", userId).maybeSingle()
  const submitted = formData.get("submit") === "1"
  const { error } = await supabase.from("prelicense_instructor_statements").upsert(
    {
      case_id: caseId,
      instructor_id: instr?.id ?? null,
      met_applicant: formData.get("metApplicant") === "on",
      no_danger: formData.get("noDanger") === "on",
      credentials: str(formData.get("credentials")),
      instructor_name: str(formData.get("instructorName")),
      instructor_address: str(formData.get("instructorAddress")),
      instructor_phone: str(formData.get("instructorPhone")),
      range_name: str(formData.get("rangeName")),
      training_location: str(formData.get("trainingLocation")),
      notes: str(formData.get("notes")),
      submitted_at: submitted ? new Date().toISOString() : null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id" }
  )
  if (error) throw error
  await logActivity({
    action: "instructor.prelicense_statement_saved",
    caseId,
    entity: "case",
    entityId: caseId,
    detail: { submitted },
  })
  revalidatePath(`/instructor/cases/${caseId}`)
}
