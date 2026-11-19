import { PRIVACY_RESPONSE_DAYS } from "@/config/service-targets"
import { adminDayKey } from "@/lib/admin/business-time"

export type PrivacyKind = "access" | "correction" | "deletion"
export type PrivacyStatus = "open" | "acknowledged" | "fulfilled" | "refused"

export interface PrivacyTiming {
  days: number
  due: number
  dueAt: string
  late: boolean
  tone: "navy" | "amber" | "red"
  label: string
}

function dayNumber(value: Date) {
  const [year, month, day] = adminDayKey(value).split("-").map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

export function privacyTiming(requestedAt: string, now = new Date()): PrivacyTiming {
  const requested = new Date(requestedAt)
  const days = Math.max(0, dayNumber(now) - dayNumber(requested))
  const due = PRIVACY_RESPONSE_DAYS - days
  const dueDay = new Date(Date.UTC(
    Number(adminDayKey(requested).slice(0, 4)),
    Number(adminDayKey(requested).slice(5, 7)) - 1,
    Number(adminDayKey(requested).slice(8, 10)) + PRIVACY_RESPONSE_DAYS,
    17,
  ))
  return {
    days,
    due,
    dueAt: dueDay.toISOString(),
    late: due < 0,
    tone: due < 0 ? "red" : days > 20 ? "amber" : "navy",
    label: due < 0 ? `${days} days · ${Math.abs(due)} days late` : `${days} days · due in ${due}`,
  }
}

export function privacySteps(kind: PrivacyKind, status: PrivacyStatus) {
  const labels: Record<PrivacyKind, string[]> = {
    access: [
      "Acknowledge",
      "Gather everything on file (profile, case answers, documents, messages, payments)",
      "Send it securely from the case page",
      "Mark done with a note of what was sent",
    ],
    correction: [
      "Acknowledge",
      "Check the change against their ID or documents",
      "Edit the field on the case page",
      "Mark done with a note of what changed",
    ],
    deletion: [
      "Acknowledge and confirm it's really them (the request came from the email on file)",
      "Review what will be erased and what is kept",
      "Erase (admin only, type ERASE)",
      "The request closes itself with a receipt",
    ],
  }
  const completed = status === "open" ? 0 : status === "acknowledged" ? 1 : 4
  return labels[kind].map((label, index) => ({
    number: index + 1,
    label,
    complete: index < completed,
    current: index === completed && completed < 4,
  }))
}

export function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function etYear(value: string | Date) {
  return Number(adminDayKey(typeof value === "string" ? new Date(value) : value).slice(0, 4))
}
