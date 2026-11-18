import { CASE_STAGES } from "@/config/stages"
import { getCasePreview } from "@/app/admin/cases/preview-actions"
import { CasesWorkspace } from "@/components/admin/cases-workspace"
import { TrackView } from "@/components/analytics/track-view"
import { requireStaff } from "@/lib/auth"
import {
  loadCasesOverview,
  type CasesFilters,
  type CasesSort,
  type CasesView,
} from "@/lib/admin/cases"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: { absolute: "Cases · Staff" } }

type SearchParams = Record<string, string | string[] | undefined>

const VIEWS = new Set<CasesView>(["active", "mine", "stalled", "leads", "closed", "all"])
const SORTS = new Set<CasesSort>(["urgent", "activity", "name"])
const PHASES = new Set(["getting_started", "training", "paperwork", "filing", "nypd", "licensed"])
const TRACKS = new Set(["premise", "concealed", "special"])
const SERVICES = new Set(["concierge", "self_guided", "none"])
const WHOSE = new Set(["staff", "applicant", "third_party", "nypd", "licensed"])
const STAGES: Set<string> = new Set(CASE_STAGES.map((stage) => stage.key))

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function oneOf(value: string | undefined, allowed: Set<string>, fallback = "all") {
  return value && allowed.has(value) ? value : fallback
}

function resolveView(sp: SearchParams): CasesView {
  const explicit = first(sp.view) as CasesView | undefined
  if (explicit && VIEWS.has(explicit)) return explicit
  if (first(sp.mine) === "1") return "mine"
  if (first(sp.status) === "closed") return "closed"
  if (["lead", "eligibility_screened"].includes(first(sp.stage) ?? "")) return "leads"
  return "active"
}

function resolveWhose(sp: SearchParams) {
  const explicit = first(sp.whose)
  if (explicit && WHOSE.has(explicit)) return explicit
  const waiting = first(sp.waiting)
  if (waiting === "nypd") return "nypd"
  if (waiting === "third-party") return "third_party"
  if (waiting === "applicant") return "applicant"
  return "all"
}

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { userId } = await requireStaff()
  const sp = await searchParams
  const view = resolveView(sp)
  const statusValue = first(sp.status)
  const stageValue = first(sp.stage)
  const filters: CasesFilters = {
    phase: oneOf(first(sp.phase), PHASES),
    owner: first(sp.owner) || "all",
    track: oneOf(first(sp.track), TRACKS),
    service: oneOf(first(sp.service), SERVICES),
    whose: resolveWhose(sp),
    borough: first(sp.borough) || "all",
    status: statusValue && statusValue !== "closed" ? statusValue : "all",
    stage: stageValue && STAGES.has(stageValue) ? stageValue : "all",
  }
  const sortValue = first(sp.sort) as CasesSort | undefined
  const sort = sortValue && SORTS.has(sortValue) ? sortValue : "urgent"
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1)
  const selectedCaseId = first(sp.case) ?? null
  const showHidden = view === "all" || first(sp.hidden) === "1"
  const q = first(sp.q)?.trim() ?? ""
  const db = await createClient()
  const data = await loadCasesOverview(db, {
    userId,
    view,
    showHidden,
    q,
    sort,
    page,
    selectedCaseId,
    filters,
  })

  let initialPreview = null
  if (data.selectedCaseId) {
    try {
      initialPreview = await getCasePreview(data.selectedCaseId)
    } catch {
      // The list remains useful if one preview fails; the client retry owns that state.
    }
  }

  return (
    <>
      <TrackView event="admin_cases_viewed" params={{ view, filters, q_present: q.length > 0 }} />
      <CasesWorkspace data={data} initialPreview={initialPreview} />
    </>
  )
}
