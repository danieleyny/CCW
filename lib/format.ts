/** Small formatting helpers used across the UI. */

export function money(cents: number | null | undefined, currency = "usd"): string {
  if (cents == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
