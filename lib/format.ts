/** Small formatting helpers used across the UI. */

export const DISPLAY_TIME_ZONE = "America/New_York"

export function money(cents: number | null | undefined, currency = "usd"): string {
  if (cents == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  // A PostgreSQL `date` is a calendar value, not a UTC instant. `new
  // Date("2024-01-15")` parses at UTC midnight and renders as Jan 14 in New York.
  // Format date-only strings in UTC so the displayed day is stable in every TZ;
  // timestamps and Date objects retain the viewer's local-time semantics.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number)
    const d = new Date(Date.UTC(year, month - 1, day))
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
  }
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(value: string | Date | null | undefined, locale = "en-US"): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleString(locale, {
    timeZone: DISPLAY_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatTime(value: string | Date, locale = "en-US"): string {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleTimeString(locale, {
    timeZone: DISPLAY_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  })
}

function displayDateParts(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { year: number("year"), month: number("month"), day: number("day") }
}

export function calendarDayKey(value: string | Date): string {
  const { year, month, day } = displayDateParts(value)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function formatCalendarDay(
  value: string | Date,
  { locale = "en-US", today = "Today", yesterday = "Yesterday" } = {}
): string {
  const target = displayDateParts(value)
  const current = displayDateParts(new Date())
  const targetIndex = Date.UTC(target.year, target.month - 1, target.day) / 86_400_000
  const currentIndex = Date.UTC(current.year, current.month - 1, current.day) / 86_400_000
  if (targetIndex === currentIndex) return today
  if (targetIndex === currentIndex - 1) return yesterday
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString(locale, {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return ""
  const d = typeof value === "string" ? new Date(value) : value
  const diff = d.getTime() - Date.now()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })
  const mins = Math.round(abs / 60000)
  if (mins < 60) return rtf.format(Math.round(diff / 60000), "minute")
  const hrs = Math.round(abs / 3600000)
  if (hrs < 24) return rtf.format(Math.round(diff / 3600000), "hour")
  return rtf.format(Math.round(diff / 86400000), "day")
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export function isOverdue(due: string | null | undefined): boolean {
  if (!due) return false
  return new Date(due).getTime() < Date.now()
}

/** Whole days since a timestamp (null when unknown). */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

/** Whole days until a date — negative when past. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}
