import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/supabase/types"
import { boroughFromLatLng } from "@/lib/geo/nyc"
import {
  BANNED_CLAIM_MESSAGE,
  VIRTUAL_COURSE_MESSAGE,
  findBannedClaim,
  findVirtualCourseClaim,
  goLiveSteps,
  instructorStatus,
  type InstructorStatus,
} from "@/lib/instructors/profile"
import { qualifyingOffersFor, type QualifyingOffer } from "@/lib/marketplace/offers"

type DB = SupabaseClient<Database>
type InstructorRow = Database["public"]["Tables"]["instructors"]["Row"]
type LocationRow = Pick<Database["public"]["Tables"]["training_locations"]["Row"], "id" | "label" | "address" | "is_range">

export interface InstructorFlag {
  kind: "virtual" | "banned"
  field: string
  sentence: string
  phrase: string
  message: string
}

export interface AdminInstructorRow extends InstructorRow {
  status: InstructorStatus
  area: string
  activeStudents: number
  locations: LocationRow[]
  flags: InstructorFlag[]
  steps: ReturnType<typeof goLiveSteps>["steps"]
  matchPreview: number
  changesRequestedAt: string | null
}

const CLAIM_FIELDS: Array<[keyof InstructorRow, string]> = [
  ["bio", "Bio"],
  ["background", "Background"],
  ["whats_to_bring", "What to bring"],
  ["scheduling_notes", "Scheduling notes"],
  ["intro_call_note", "Intro-call note"],
  ["auto_offer_note", "Automatic-offer note"],
  ["separate_range_note", "Range note"],
]

export function instructorClaimFlags(row: InstructorRow): InstructorFlag[] {
  const flags: InstructorFlag[] = []
  for (const [key, field] of CLAIM_FIELDS) {
    const value = typeof row[key] === "string" ? row[key] as string : null
    const virtual = findVirtualCourseClaim(value)
    if (virtual) {
      const phrase = virtual.match(/\b(virtual|online|remote|zoom|via video|over video)\b/i)?.[0] ?? virtual
      flags.push({ kind: "virtual", field, sentence: virtual, phrase, message: VIRTUAL_COURSE_MESSAGE })
    }
    const banned = findBannedClaim(value)
    if (banned) flags.push({ kind: "banned", field, sentence: value ?? banned, phrase: banned, message: BANNED_CLAIM_MESSAGE })
  }
  return flags
}

export const JURISDICTION_LABELS: Record<string, string> = {
  nyc: "NYC",
  special_carry: "Special",
  non_resident: "Non-Resident",
}

export function jurisdictionLabels(values: string[]) {
  return values.map((value) => JURISDICTION_LABELS[value] ?? value.replaceAll("_", " "))
}

function asDetail(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export async function loadAdminInstructors(db: DB, now = new Date()): Promise<AdminInstructorRow[]> {
  const [{ data: instructors, error }, { data: locations }, { data: engagements }, { data: changes }, { data: offers }] = await Promise.all([
    db.from("instructors").select("*").order("created_at", { ascending: true }),
    db.from("training_locations").select("id, instructor_id, label, address, is_range"),
    db.from("engagements").select("id, instructor_id, status"),
    db.from("activity_log").select("entity_id, created_at, detail").eq("entity", "instructor").eq("action", "instructor.changes_requested").order("created_at", { ascending: false }),
    db.from("case_offers").select("id, jurisdiction, lat, lng, radius_mi, expires_at").eq("status", "open"),
  ])
  if (error) throw error

  const ids = (instructors ?? []).map((row) => row.id)
  const { data: matches } = ids.length
    ? await db.from("offer_matches").select("offer_id, instructor_id").in("instructor_id", ids)
    : { data: [] }
  const matched = new Set((matches ?? []).map((row) => `${row.instructor_id}:${row.offer_id}`))

  return (instructors ?? []).map((row) => {
    const rowLocations = (locations ?? []).filter((location) => location.instructor_id === row.id)
    const liveInput = { ...row, locations: rowLocations }
    const status = instructorStatus(liveInput, now)
    const flags = instructorClaimFlags(row)
    const qualifying = status.key === "needs_verification"
      ? qualifyingOffersFor(row, (offers ?? []) as QualifyingOffer[], now).filter((offer) => !matched.has(`${row.id}:${offer.id}`))
      : []
    return {
      ...row,
      status,
      area: boroughFromLatLng(row.lat, row.lng) ?? "Area not set",
      activeStudents: (engagements ?? []).filter((engagement) => engagement.instructor_id === row.id && engagement.status === "active").length,
      locations: rowLocations,
      flags,
      steps: goLiveSteps(liveInput).steps,
      matchPreview: qualifying.length,
      changesRequestedAt: (changes ?? []).find((entry) => entry.entity_id === row.id)?.created_at ?? null,
    }
  })
}

export async function instructorCounts(db: DB, now = new Date()) {
  const rows = await loadAdminInstructors(db, now)
  const waiting = rows.filter((row) => row.status.key === "needs_verification")
  return {
    needsVerification: waiting.length,
    oldestWaitingDays: waiting.length ? Math.max(...waiting.map((row) => row.status.waitingDays)) : 0,
    oldest: [...waiting].sort((a, b) => b.status.waitingDays - a.status.waitingDays)[0] ?? null,
  }
}

export function activityDetail(value: Json) {
  return asDetail(value)
}
