export const NEW_YORK_TIME_ZONE = "America/New_York"
export const CALENDAR_EVENT_TYPES = [
  "Intro call",
  "Consult",
  "Fingerprinting",
  "NYPD interview",
  "Classroom",
  "Range",
] as const

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number]
export type CalendarScope = "mine" | "team"
export type CalendarOwner = "Staff" | "Instructor" | "NYPD"
export type CalendarHostFilter = "anyone" | "me" | "instructors" | "nypd" | string

export interface CalendarEvent {
  id: string
  source: "intro_call" | "appointment" | "booking" | "class_session"
  caseId: string | null
  clientName: string
  type: CalendarEventType | string
  rawType: string
  startsAt: string
  endsAt: string
  place: string
  hostLine: string
  hostId: string | null
  owner: CalendarOwner
  href: string
  joinUrl: string | null
  canJoin: boolean
  isGroup: boolean
}

export interface CalendarNeed {
  id: string
  caseId: string
  clientName: string
  label: string
  detail: string
  owner: "Staff" | "Instructor" | "Client"
  action: "Schedule" | "Open case" | "Message"
  href: string
}

export interface CalendarStaffOption {
  id: string
  name: string
}

export interface CalendarData {
  events: CalendarEvent[]
  needsScheduling: CalendarNeed[]
  staff: CalendarStaffOption[]
  errors: string[]
  hiddenTestCount: number
  showHidden: boolean
  from: string
  to: string
  scope: CalendarScope
  types: CalendarEventType[]
  host: CalendarHostFilter
  currentUserId: string
  asOf: string
}

const EVENT_TYPE_BY_RAW: Record<string, CalendarEventType> = {
  intro_call: "Intro call",
  consult: "Consult",
  fingerprinting: "Fingerprinting",
  nypd_interview: "NYPD interview",
  training: "Classroom",
  classroom_16h: "Classroom",
  combined_18h: "Classroom",
  live_fire_2h: "Range",
  classroom: "Classroom",
  range: "Range",
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function calendarEventType(raw: string): CalendarEventType | string {
  const mapped = EVENT_TYPE_BY_RAW[raw.toLowerCase()]
  if (mapped) return mapped
  return titleCase(raw)
}

export function newYorkDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NEW_YORK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

export function addCalendarDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + amount, 12))
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`
}

/** Converts a wall-clock time in New York to a real UTC instant, including DST. */
export function newYorkDateTime(dateKey: string, time = "00:00") {
  const [year, month, day] = dateKey.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NEW_YORK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(guess)
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const renderedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"))
  return new Date(guess.getTime() + (guess.getTime() - renderedAsUtc))
}

export const calendarModel = {
  eventType: calendarEventType,
  dateKey: newYorkDateKey,
  addDays: addCalendarDays,
  dateTime: newYorkDateTime,
}
