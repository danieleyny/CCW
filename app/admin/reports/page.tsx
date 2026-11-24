import { ReportsWorkspace } from "@/components/admin/reports-workspace"
import { logActivity } from "@/lib/activity"
import {
  loadBottlenecksReport,
  loadOverviewReport,
  loadServiceLevelsReport,
  type ReportFilters,
  type ReportBrandFilter,
  type ReportServiceFilter,
  type ReportTab,
  type ReportTrackFilter,
} from "@/lib/admin/reports"
import type { ReportRangeKey } from "@/lib/admin/reports-model"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { resolveAdminBrandFilter } from "@/lib/admin/brand-filter"

export const metadata = { title: { absolute: "Reports · Staff" } }

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const TABS = new Set<ReportTab>(["overview", "bottlenecks", "service"])
const RANGES = new Set<ReportRangeKey>(["month", "90", "year", "all"])
const SERVICES = new Set<ReportServiceFilter>(["all", "concierge", "self_guided"])
const TRACKS = new Set<ReportTrackFilter>(["all", "resident", "business", "non_resident"])
export default async function AdminReports({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requireStaff()
  const params = await searchParams
  const requestedTab = first(params.tab) as ReportTab
  const requestedRange = first(params.range) as ReportRangeKey
  const requestedService = first(params.service) as ReportServiceFilter
  const requestedTrack = first(params.track) as ReportTrackFilter
  const requestedBrand = await resolveAdminBrandFilter(first(params.brand))
  const tab = TABS.has(requestedTab) ? requestedTab : "overview"
  const range = RANGES.has(requestedRange) ? requestedRange : "90"
  const isAdmin = profile.role === "admin"
  const filters: ReportFilters = {
    range,
    service: SERVICES.has(requestedService) ? requestedService : "all",
    track: TRACKS.has(requestedTrack) ? requestedTrack : "all",
    brand: requestedBrand as ReportBrandFilter,
    compare: range !== "all" && first(params.compare) !== "0",
    showHidden: isAdmin && first(params.showHidden) === "1",
    isAdmin,
  }

  const db = await createClient()
  const data = tab === "bottlenecks"
    ? await loadBottlenecksReport(db, filters)
    : tab === "service"
      ? await loadServiceLevelsReport(db, filters)
      : await loadOverviewReport(db, filters)

  await logActivity({
    action: "admin_reports_viewed",
    entity: "admin_report",
    detail: {
      tab,
      range,
      filters: { service: filters.service, track: filters.track, brand: filters.brand, compare: filters.compare },
      showHidden: filters.showHidden,
    },
  })

  return <ReportsWorkspace data={data} />
}
