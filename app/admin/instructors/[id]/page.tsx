import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadAdminInstructors } from "@/lib/admin/instructors"
import { InstructorProfileWorkspace, type InstructorActivity, type InstructorStudent, type InstructorUpcoming } from "@/components/admin/instructor-profile-workspace"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data } = await (await createClient()).from("instructors").select("name").eq("id", id).maybeSingle()
  return { title: { absolute: `${data?.name ?? "Instructor"} · Instructor · Staff` } }
}

function firstSessionDate(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const first = value.find((item) => item && typeof item === "object" && "date" in item) as { date?: unknown } | undefined
  return typeof first?.date === "string" ? `${first.date}T12:00:00-05:00` : null
}

export default async function AdminInstructorDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ return?: string }> }) {
  const [{ id }, query, { profile }] = await Promise.all([params, searchParams, requireStaff()])
  const db = await createClient()
  const rows = await loadAdminInstructors(db)
  const row = rows.find((item) => item.id === id)
  if (!row) notFound()
  const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  const [engagementRes, bookingRes, classRes, reviewRes, activityRes, sessionRes] = await Promise.all([
    db.from("engagements").select("id, case_id, status, type, created_at, cases(id, stage, license_track, clients(full_name))").eq("instructor_id", id).order("created_at", { ascending: false }),
    db.from("bookings").select("id, type, status, starts_at, case_id").eq("instructor_id", id).gte("starts_at", now.toISOString()).order("starts_at", { ascending: true }).limit(10),
    db.from("training_classes").select("id, title, instructor_name, sessions, capacity, status, training_registrations(id, status)").ilike("instructor_name", row.name).in("status", ["open", "draft"]).limit(10),
    row.profile_id ? db.from("requirement_reviews").select("decision").eq("reviewer", row.profile_id).eq("reviewer_kind", "trainer") : Promise.resolve({ data: [] as Array<{ decision: string }> }),
    db.from("activity_log").select("id, action, created_at, detail, actor").eq("entity", "instructor").eq("entity_id", id).order("created_at", { ascending: false }).limit(30),
    db.from("training_sessions").select("id").eq("instructor_id", id).gte("class_date", monthStart.slice(0, 10)).lt("class_date", monthEnd.slice(0, 10)),
  ])
  const engagements = (engagementRes.data ?? []) as unknown as Array<{ id: string; case_id: string; status: string; type: string; created_at: string; cases: { id: string; stage: string; license_track: string; clients: { full_name: string } | null } | null }>
  const caseIds = engagements.map((entry) => entry.case_id)
  const [{ data: compPayments }, { data: caseBookings }] = caseIds.length ? await Promise.all([
    db.from("payments").select("case_id, amount_cents, status").in("case_id", caseIds).eq("status", "paid"),
    db.from("bookings").select("case_id, starts_at").in("case_id", caseIds).gte("starts_at", now.toISOString()).order("starts_at", { ascending: true }),
  ]) : [{ data: [] as Array<{ case_id: string; amount_cents: number; status: string }> }, { data: [] as Array<{ case_id: string; starts_at: string }> }]
  const comped = new Set((compPayments ?? []).filter((payment) => payment.amount_cents === 0).map((payment) => payment.case_id))
  const students: InstructorStudent[] = engagements.map((entry) => ({ id: entry.id, caseId: entry.case_id, name: entry.cases?.clients?.full_name ?? "Applicant", path: entry.cases?.license_track?.replaceAll("_", " ") ?? entry.type.replaceAll("_", " "), stage: entry.cases?.stage ?? "unknown", status: entry.status, nextDate: (caseBookings ?? []).find((booking) => booking.case_id === entry.case_id)?.starts_at ?? null, comped: comped.has(entry.case_id) }))
  const upcoming: InstructorUpcoming[] = [
    ...(bookingRes.data ?? []).map((booking) => ({ id: `booking-${booking.id}`, title: booking.type.replaceAll("_", " "), date: booking.starts_at, detail: `Booking · ${booking.status.replaceAll("_", " ")}`, href: `/admin/cases/${booking.case_id}` })),
    ...((classRes.data ?? []) as unknown as Array<{ id: string; title: string; sessions: unknown; capacity: number | null; training_registrations: Array<{ id: string; status: string }> }>).map((course) => { const active = course.training_registrations.filter((registration) => !["cancelled", "refunded"].includes(registration.status)).length; return { id: `class-${course.id}`, title: course.title, date: firstSessionDate(course.sessions) ?? now.toISOString(), detail: course.capacity ? `${active} of ${course.capacity} seats` : `${active} registered`, href: `/admin/training?class=${course.id}` } }),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10)
  const actorIds = [...new Set((activityRes.data ?? []).map((activity) => activity.actor).filter(Boolean))] as string[]
  const { data: actors } = actorIds.length ? await db.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] as Array<{ id: string; full_name: string }> }
  const actorNames = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name]))
  const activities: InstructorActivity[] = (activityRes.data ?? []).map((activity) => ({ id: activity.id, action: activity.action, createdAt: activity.created_at, detail: activity.detail, actorName: activity.actor ? actorNames.get(activity.actor) ?? null : null }))
  const reviews = reviewRes.data ?? []
  const returnQuery = typeof query.return === "string" && query.return.length < 300 ? query.return : ""
  return <InstructorProfileWorkspace row={row} role={profile.role} students={students} upcoming={upcoming} activities={activities} stats={{ approved: reviews.filter((review) => review.decision === "approved").length, changes: reviews.filter((review) => review.decision === "changes_requested").length, inClassThisMonth: sessionRes.data?.length ?? 0 }} returnQuery={returnQuery} />
}
