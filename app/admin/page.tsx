import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { loadToday, type TodayItemType, type TodayScope } from "@/lib/admin/today"
import { TodayDashboard } from "@/components/admin/today-dashboard"

export const metadata = { title: { absolute: "Today · Staff" } }

const SCOPES = new Set<TodayScope>(["mine", "team", "unassigned"])
const TYPES = new Set<TodayItemType | "all">(["all", "message", "document", "qa", "concierge", "people", "lead", "payment", "stalled", "task", "privacy"])

export default async function TodayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { userId, profile } = await requireStaff()
  const sp = await searchParams
  const scope = SCOPES.has(sp.scope as TodayScope) ? sp.scope as TodayScope : "mine"
  const filter = TYPES.has(sp.type as TodayItemType | "all") ? sp.type as TodayItemType | "all" : "all"
  const db = await createClient()
  const now = new Date()
  const data = await loadToday(db, { userId, role: profile.role, scope, now })
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(now))
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return <TodayDashboard data={data} scope={scope} filter={filter} firstName={(profile.full_name || "Staff").split(/\s+/)[0]} greeting={greeting} role={profile.role} />
}
