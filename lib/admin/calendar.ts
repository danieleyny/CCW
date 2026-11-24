import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/supabase/types"
import type { BrandKey } from "@/config/brands"
import { stageIndex, type CaseStageKey } from "@/config/stages"
import {
  calendarEventType,
  newYorkDateKey,
  newYorkDateTime,
  type CalendarData,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarHostFilter,
  type CalendarNeed,
  type CalendarScope,
} from "@/lib/admin/calendar-model"

export type { CalendarData } from "@/lib/admin/calendar-model"

type DB = SupabaseClient<Database>

interface CalendarCase {
  id: string
  clientName: string
  ownerId: string | null
  ownerName: string | null
  isDemo: boolean
  stage: CaseStageKey
  stageEnteredAt: string
  createdAt: string
  status: string
  serviceMode: "concierge" | "self_guided" | null
  brand: BrandKey
  brandOrigin: BrandKey
}
interface TrainingClassRow {
  id: string
  title: string
  sessions: Json
  location_public: string
  instructor_name: string
  status: string
}

interface TrainingRegistrationRow {
  class_id: string
  status: string
}

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString()
}

function daysAgo(value: string, now: Date) {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000))
  if (days === 0) return "requested today"
  if (days === 1) return "requested 1 day ago"
  return `requested ${days} days ago`
}

function eventInRange(event: CalendarEvent, from: string, to: string) {
  const key = newYorkDateKey(event.startsAt)
  return key >= from && key <= to
}

function eventMatchesHost(event: CalendarEvent, host: CalendarHostFilter, currentUserId: string) {
  if (host === "anyone") return true
  if (host === "me") return event.hostId === currentUserId
  if (host === "instructors") return event.owner === "Instructor"
  if (host === "nypd") return event.owner === "NYPD"
  return event.hostId === host
}

function hasQueryError(value: unknown): value is { error: unknown } {
  return !!value && typeof value === "object" && "error" in value && !!(value as { error?: unknown }).error
}

function brandIdentity(calendarCase: CalendarCase) {
  return { brand: calendarCase.brand, brandOrigin: calendarCase.brandOrigin }
}

function isUnavailableOptionalTrainingSource(error: unknown) {
  if (!error || typeof error !== "object") return false
  const value = error as { code?: string; message?: string }
  return value.code === "PGRST205" && /training_(classes|registrations)/i.test(value.message ?? "")
}

export async function loadCalendar(
  db: DB,
  {
    from,
    to,
    scope,
    types,
    host,
    currentUserId = "",
    showHidden = false,
    now = new Date(),
  }: {
    from: string
    to: string
    scope: CalendarScope
    types: CalendarEventType[]
    host: CalendarHostFilter
    currentUserId?: string
    showHidden?: boolean
    now?: Date
  }
): Promise<CalendarData> {
  const casesResult = await db
    .from("cases")
    .select("id, stage, status, stage_entered_at, created_at, is_demo, service_mode, brand, brand_origin, clients!inner(full_name, assigned_staff, profiles:assigned_staff(full_name))")
    .neq("status", "closed")

  if (casesResult.error) throw casesResult.error

  const cases = new Map<string, CalendarCase>()
  for (const row of casesResult.data ?? []) {
    const client = row.clients as unknown as {
      full_name: string
      assigned_staff: string | null
      profiles: { full_name: string } | null
    }
    cases.set(row.id, {
      id: row.id,
      clientName: client.full_name || "Applicant",
      ownerId: client.assigned_staff,
      ownerName: client.profiles?.full_name || null,
      isDemo: row.is_demo,
      stage: row.stage as CaseStageKey,
      stageEnteredAt: row.stage_entered_at,
      createdAt: row.created_at,
      status: row.status,
      serviceMode: row.service_mode,
      brand: row.brand,
      brandOrigin: row.brand_origin,
    })
  }

  const visibleCase = (caseId: string | null) => {
    if (!caseId) return null
    const entry = cases.get(caseId)
    if (!entry) return null
    if (!showHidden && entry.isDemo) return null
    if (scope === "mine" && entry.ownerId !== currentUserId) return null
    return entry
  }

  const trainingDb = db as unknown as {
    from(table: "training_classes" | "training_registrations"): {
      select(query: string): Promise<{ data: Array<TrainingClassRow | TrainingRegistrationRow> | null; error: unknown }>
    }
  }

  const sourceNames = ["Intro calls", "NYPD appointments", "Training bookings", "Training sessions", "Payments", "Staff"] as const
  const settled = await Promise.allSettled([
    db.from("intro_calls").select("id, case_id, scheduled_at, status, join_url, rep_id, created_at, profiles:rep_id(full_name)"),
    db.from("appointments").select("id, case_id, type, scheduled_at, location"),
    db.from("bookings").select("id, case_id, type, status, starts_at, ends_at, instructors(name), training_locations(label, address)").neq("status", "cancelled"),
    Promise.all([
      trainingDb.from("training_classes").select("id, title, sessions, location_public, instructor_name, status"),
      trainingDb.from("training_registrations").select("class_id, status"),
    ]),
    db.from("payments").select("case_id").eq("status", "paid"),
    db.from("profiles").select("id, full_name, role").in("role", ["staff", "admin"]).order("full_name"),
  ])

  const errors: string[] = []
  settled.forEach((result, index) => {
    const nestedError = result.status === "fulfilled" && Array.isArray(result.value)
      ? result.value.find(hasQueryError)?.error
      : null
    const sourceError = result.status === "rejected"
      ? result.reason
      : hasQueryError(result.value)
        ? result.value.error
        : nestedError
    // The newer group-class tables are not part of every deployed schema. In
    // that case the brief explicitly says to use booking events only, so a
    // missing optional table is not a partial calendar failure.
    if (sourceError && !(index === 3 && isUnavailableOptionalTrainingSource(sourceError))) {
      const detail = typeof sourceError === "object" && sourceError
        ? JSON.stringify(sourceError, Object.getOwnPropertyNames(sourceError))
        : String(sourceError)
      console.error(`[admin-calendar] ${sourceNames[index]} failed: ${detail}`)
      errors.push(sourceNames[index])
    }
  })
  const data = <T,>(index: number): T[] => {
    const result = settled[index]
    if (result.status !== "fulfilled" || hasQueryError(result.value)) return []
    return ((result.value as { data?: T[] | null }).data ?? []) as T[]
  }

  const events: CalendarEvent[] = []
  const needsScheduling: CalendarNeed[] = []

  const introRows = data<{
    id: string
    case_id: string
    scheduled_at: string | null
    status: string
    join_url: string | null
    rep_id: string | null
    created_at: string
    profiles: { full_name: string } | null
  }>(0)
  for (const row of introRows) {
    const calendarCase = visibleCase(row.case_id)
    if (!calendarCase) continue
    if (row.status === "requested" && !row.scheduled_at) {
      needsScheduling.push({
        id: `intro-${row.id}`,
        caseId: row.case_id,
        clientName: calendarCase.clientName,
        ...brandIdentity(calendarCase),
        label: "Intro call requested",
        detail: daysAgo(row.created_at, now),
        owner: "Staff",
        action: "Schedule",
        href: `/admin/cases/${row.case_id}`,
      })
    }
    if (!row.scheduled_at || row.status === "canceled") continue
    const hostName = row.profiles?.full_name || calendarCase.ownerName || "Staff"
    events.push({
      id: `intro-${row.id}`,
      source: "intro_call",
      caseId: row.case_id,
      clientName: calendarCase.clientName,
      ...brandIdentity(calendarCase),
      type: "Intro call",
      rawType: "intro_call",
      startsAt: row.scheduled_at,
      endsAt: addMinutes(row.scheduled_at, 30),
      place: row.join_url ? "Video · join link ready" : "Video",
      hostLine: `${hostName} hosts`,
      hostId: row.rep_id ?? calendarCase.ownerId,
      owner: "Staff",
      href: `/admin/cases/${row.case_id}`,
      joinUrl: row.join_url,
      canJoin: !!row.join_url && (row.rep_id === currentUserId || (!row.rep_id && calendarCase.ownerId === currentUserId)),
      isGroup: false,
    })
  }

  const appointmentRows = data<{
    id: string
    case_id: string | null
    type: string
    scheduled_at: string
    location: string | null
  }>(1)
  for (const row of appointmentRows) {
    const calendarCase = visibleCase(row.case_id)
    if (!calendarCase || !row.case_id) continue
    const type = calendarEventType(row.type)
    const isNypd = type === "Fingerprinting" || type === "NYPD interview"
    const filed = stageIndex(calendarCase.stage) >= stageIndex("filed")
    events.push({
      id: `appointment-${row.id}`,
      source: "appointment",
      caseId: row.case_id,
      clientName: calendarCase.clientName,
      ...brandIdentity(calendarCase),
      type,
      rawType: row.type,
      startsAt: row.scheduled_at,
      endsAt: addMinutes(row.scheduled_at, type === "NYPD interview" ? 60 : 30),
      place: row.location || "Location not recorded",
      hostLine: isNypd ? `Applicant attends${filed ? " · applicant filed" : ""}` : `${calendarCase.ownerName || "Staff"} hosts`,
      hostId: isNypd ? null : calendarCase.ownerId,
      owner: isNypd ? "NYPD" : "Staff",
      href: `/admin/cases/${row.case_id}`,
      joinUrl: null,
      canJoin: false,
      isGroup: false,
    })
  }

  const bookingRows = data<{
    id: string
    case_id: string
    type: string
    status: string
    starts_at: string
    ends_at: string
    instructors: { name: string } | null
    training_locations: { label: string; address: string | null } | null
  }>(2)
  const futureBookingCases = new Set<string>()
  for (const row of bookingRows) {
    const calendarCase = visibleCase(row.case_id)
    if (!calendarCase) continue
    if (new Date(row.starts_at).getTime() >= now.getTime()) futureBookingCases.add(row.case_id)
    if (row.status === "requested") {
      needsScheduling.push({
        id: `booking-${row.id}`,
        caseId: row.case_id,
        clientName: calendarCase.clientName,
        ...brandIdentity(calendarCase),
        label: "Booking awaiting confirmation",
        detail: `${calendarEventType(row.type)} · instructor confirmation needed`,
        owner: "Instructor",
        action: "Open case",
        href: `/admin/cases/${row.case_id}?tab=training`,
      })
    }
    const type = calendarEventType(row.type)
    const instructorName = row.instructors?.name || "Instructor"
    const location = row.training_locations
      ? [row.training_locations.label, row.training_locations.address].filter(Boolean).join(" · ")
      : "Training location not recorded"
    events.push({
      id: `booking-${row.id}`,
      source: "booking",
      caseId: row.case_id,
      clientName: calendarCase.clientName,
      ...brandIdentity(calendarCase),
      type,
      rawType: row.type,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      place: location,
      hostLine: `Instructor ${instructorName}`,
      hostId: null,
      owner: "Instructor",
      href: `/admin/cases/${row.case_id}?tab=training`,
      joinUrl: null,
      canJoin: false,
      isGroup: false,
    })
  }

  const trainingResult = settled[3]
  const trainingParts = trainingResult.status === "fulfilled" && Array.isArray(trainingResult.value) && !trainingResult.value.some(hasQueryError)
    ? trainingResult.value as Array<{ data: Array<TrainingClassRow | TrainingRegistrationRow> | null }>
    : []
  const trainingClasses = (trainingParts[0]?.data ?? []) as TrainingClassRow[]
  const trainingRegistrations = (trainingParts[1]?.data ?? []) as TrainingRegistrationRow[]
  const registrationsByClass = new Map<string, number>()
  for (const registration of trainingRegistrations) {
    if (!["paid", "enrolled", "confirmed"].includes(registration.status)) continue
    registrationsByClass.set(registration.class_id, (registrationsByClass.get(registration.class_id) ?? 0) + 1)
  }
  for (const course of trainingClasses) {
    if (course.status === "draft" || !Array.isArray(course.sessions)) continue
    const studentCount = registrationsByClass.get(course.id) ?? 0
    course.sessions.forEach((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return
      const session = raw as Record<string, Json | undefined>
      const date = typeof session.date === "string" ? session.date : null
      const start = typeof session.start === "string" ? session.start : "09:00"
      const end = typeof session.end === "string" ? session.end : "17:00"
      const label = typeof session.label === "string" ? session.label : `Day ${index + 1}`
      if (!date) return
      const type: CalendarEventType = /range|fire/i.test(label) ? "Range" : "Classroom"
      events.push({
        id: `class-${course.id}-${index}`,
        source: "class_session",
        caseId: null,
        clientName: `${type} day ${index + 1} · ${studentCount} student${studentCount === 1 ? "" : "s"}`,
        brand: null,
        brandOrigin: null,
        type,
        rawType: type.toLowerCase(),
        startsAt: newYorkDateTime(date, start).toISOString(),
        endsAt: newYorkDateTime(date, end).toISOString(),
        place: course.location_public,
        hostLine: `Instructor ${course.instructor_name}`,
        hostId: null,
        owner: "Instructor",
        href: "/admin/training",
        joinUrl: null,
        canJoin: false,
        isGroup: true,
      })
    })
  }

  const paid = new Set(data<{ case_id: string | null }>(4).map((row) => row.case_id).filter((id): id is string => !!id))
  for (const calendarCase of cases.values()) {
    if (!paid.has(calendarCase.id) || !visibleCase(calendarCase.id) || futureBookingCases.has(calendarCase.id)) continue
    const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(calendarCase.stageEnteredAt || calendarCase.createdAt).getTime()) / 86_400_000))
    const due = calendarCase.stage === "training_scheduled" || (calendarCase.stage === "signed_up_paid" && ageDays > 7)
    if (!due) continue
    const concierge = calendarCase.serviceMode === "concierge"
    needsScheduling.push({
      id: `training-${calendarCase.id}`,
      caseId: calendarCase.id,
      clientName: calendarCase.clientName,
      ...brandIdentity(calendarCase),
      label: "Training not scheduled",
      detail: calendarCase.stage === "signed_up_paid" ? `${ageDays} days since enrollment` : "No upcoming booking",
      owner: concierge ? "Staff" : "Client",
      action: concierge ? "Message" : "Open case",
      href: concierge
        ? `/admin/inbox?thread=${calendarCase.id}&prefill=${encodeURIComponent("Let’s get your required training scheduled.")}`
        : `/admin/cases/${calendarCase.id}?tab=training`,
    })
  }

  const staff = data<{ id: string; full_name: string; role: string }>(5).map((person) => ({
    id: person.id,
    name: person.full_name || "Staff",
  }))

  const selectedTypes = new Set(types)
  const filteredEvents = events
    .filter((event) => eventInRange(event, from, to))
    .filter((event) => selectedTypes.size === 0 || selectedTypes.has(event.type as CalendarEventType))
    .filter((event) => eventMatchesHost(event, host, currentUserId))
    .filter((event) => scope === "team" || (!!event.caseId && cases.get(event.caseId)?.ownerId === currentUserId))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.endsAt.localeCompare(b.endsAt))

  const hiddenTestCount = [...cases.values()].filter((entry) => entry.isDemo && (scope === "team" || entry.ownerId === currentUserId)).length
  return {
    events: filteredEvents,
    needsScheduling: needsScheduling.sort((a, b) => a.clientName.localeCompare(b.clientName)),
    staff,
    errors,
    hiddenTestCount,
    showHidden,
    from,
    to,
    scope,
    types,
    host,
    currentUserId,
    asOf: now.toISOString(),
  }
}
