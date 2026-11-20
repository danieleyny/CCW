import { CASE_STAGES, type CaseStageKey } from "@/config/stages"

export const REPORT_TIME_ZONE = "America/New_York"
export type ReportRangeKey = "month" | "90" | "year" | "all"

export interface ReportRange {
  key: ReportRangeKey
  label: string
  start: Date | null
  end: Date
  priorStart: Date | null
  priorEnd: Date | null
}

export interface StageEventInput {
  caseId: string
  createdAt: string
  to: unknown
  actor?: string | null
  detail?: Record<string, unknown>
}

export interface StageCaseInput {
  id: string
  createdAt: string
}

export interface StageVisit {
  caseId: string
  stage: CaseStageKey
  startedAt: string
  endedAt: string
  days: number
  actor: string | null
  detail: Record<string, unknown>
}

const STAGE_KEYS = new Set<string>(CASE_STAGES.map((stage) => stage.key))
const DAY = 86_400_000

function parts(value: Date) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((part) => part.type === type)?.value ?? 0)
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") }
}

/** Convert a New York wall-clock value to UTC, including DST transitions. */
export function etDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const intended = Date.UTC(year, month - 1, day, hour, minute, second)
  let guess = intended
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = parts(new Date(guess))
    const shown = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    guess += intended - shown
  }
  return new Date(guess)
}

export function etDateKey(value: Date | string) {
  const p = parts(typeof value === "string" ? new Date(value) : value)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}

function keyParts(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return { year, month, day }
}

function addKeyDays(key: string, count: number) {
  const p = keyParts(key)
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + count))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`
}

function keyStart(key: string) {
  const p = keyParts(key)
  return etDate(p.year, p.month, p.day)
}

export function reportRange(key: ReportRangeKey, now = new Date()): ReportRange {
  const p = parts(now)
  let start: Date | null
  let label: string
  if (key === "month") {
    start = etDate(p.year, p.month, 1)
    label = "this month"
  } else if (key === "year") {
    start = etDate(p.year, 1, 1)
    label = "this year"
  } else if (key === "all") {
    start = null
    label = "all time"
  } else {
    start = keyStart(addKeyDays(etDateKey(now), -89))
    label = "last 90 days"
  }
  if (!start) return { key, label, start: null, end: now, priorStart: null, priorEnd: null }
  const duration = now.getTime() - start.getTime()
  return {
    key,
    label,
    start,
    end: now,
    priorStart: new Date(start.getTime() - duration),
    priorEnd: start,
  }
}

export function inRange(value: string | null | undefined, start: Date | null, end: Date) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && (!start || timestamp >= start.getTime()) && timestamp < end.getTime()
}

export function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function percentile(values: number[], percentileValue: number) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * percentileValue
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

export function distribution(values: number[]) {
  return {
    median: median(values),
    q25: percentile(values, 0.25),
    q75: percentile(values, 0.75),
    n: values.length,
  }
}

/**
 * Reconstruct only visits the audit log can prove. We start at `lead` when the
 * case is created, close it at the first valid transition, then close each
 * subsequent stage at the next transition. No intermediate stages are guessed.
 */
export function buildStageVisits(cases: StageCaseInput[], events: StageEventInput[]) {
  const byCase = new Map<string, StageEventInput[]>()
  for (const event of events) {
    if (!STAGE_KEYS.has(String(event.to))) continue
    const rows = byCase.get(event.caseId) ?? []
    rows.push(event)
    byCase.set(event.caseId, rows)
  }

  const visits: StageVisit[] = []
  for (const kase of cases) {
    let current: CaseStageKey = "lead"
    let startedAt = kase.createdAt
    const rows = (byCase.get(kase.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const event of rows) {
      const startMs = new Date(startedAt).getTime()
      const endMs = new Date(event.createdAt).getTime()
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
        visits.push({
          caseId: kase.id,
          stage: current,
          startedAt,
          endedAt: event.createdAt,
          days: (endMs - startMs) / DAY,
          actor: event.actor ?? null,
          detail: event.detail ?? {},
        })
      }
      current = event.to as CaseStageKey
      startedAt = event.createdAt
    }
  }
  return visits
}

/** Elapsed weekday time, measured against New York calendar days. */
export function businessDurationDays(startValue: string, endValue: string) {
  const start = new Date(startValue)
  const end = new Date(endValue)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return 0
  let key = etDateKey(start)
  const finalKey = etDateKey(end)
  let total = 0
  for (let guard = 0; guard < 3700; guard += 1) {
    const dayStart = keyStart(key)
    const nextKey = addKeyDays(key, 1)
    const dayEnd = keyStart(nextKey)
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay()
    if (weekday !== 0 && weekday !== 6) {
      total += Math.max(0, Math.min(end.getTime(), dayEnd.getTime()) - Math.max(start.getTime(), dayStart.getTime()))
    }
    if (key === finalKey || dayEnd >= end) break
    key = nextKey
  }
  return total / DAY
}

export function friendlyLeadSource(value: string | null) {
  if (!value) return "Unknown"
  const normalized = value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
  if (["eligibility", "eligibility_quiz", "quiz", "website", "web"].includes(normalized)) return "Eligibility quiz"
  if (["referral", "client_referral", "friend", "word_of_mouth"].includes(normalized)) return "Referral"
  if (["phone", "walk_in", "phone_walk_in", "call"].includes(normalized)) return "Phone / walk-in"
  if (normalized === "admin_manual") return "Added by staff"
  return value.trim()
}

export function formatDuration(days: number | null) {
  if (days === null) return "—"
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} hr`
  return `${Math.round(days * 10) / 10} days`
}
