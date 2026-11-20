import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { loadCalendar } from "@/lib/admin/calendar"
import {
  CALENDAR_EVENT_TYPES,
  addCalendarDays,
  newYorkDateKey,
  type CalendarEventType,
  type CalendarScope,
} from "@/lib/admin/calendar-model"
import { AdminCalendarWorkspace } from "@/components/admin/admin-calendar-workspace"

export const metadata = { title: { absolute: "Calendar · Staff" } }

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function mondayFor(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const weekday = date.getUTCDay()
  return addCalendarDays(dateKey, -(weekday === 0 ? 6 : weekday - 1))
}

function validDateKey(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) ? value : fallback
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { userId } = await requireStaff()
  const sp = await searchParams
  const now = new Date()
  const today = newYorkDateKey(now)
  const view = first(sp.view) === "week" ? "week" : "agenda"
  const range = Math.min(56, Math.max(14, Number(first(sp.range)) || 14))
  const showPast = first(sp.past) === "1"
  const scope: CalendarScope = first(sp.scope) === "mine" ? "mine" : "team"
  const requestedTypes = (first(sp.types) ?? "").split(",").filter(Boolean)
  const types = requestedTypes.filter((value): value is CalendarEventType => CALENDAR_EVENT_TYPES.includes(value as CalendarEventType))
  const host = first(sp.host) || "anyone"
  const week = mondayFor(validDateKey(first(sp.week), today))
  const from = view === "week" ? week : showPast ? addCalendarDays(today, -30) : today
  // Week fetches the following week too so its side rail is real data, not a second client request.
  const to = view === "week" ? addCalendarDays(week, 13) : addCalendarDays(today, range - 1)
  const db = await createClient()
  const data = await loadCalendar(db, {
    from,
    to,
    scope,
    types,
    host,
    currentUserId: userId,
    showHidden: first(sp.hidden) === "1",
    now,
  })

  return <AdminCalendarWorkspace data={data} view={view} />
}
