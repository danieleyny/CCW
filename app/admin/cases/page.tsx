import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { CaseFilters } from "@/components/admin/case-filters"
import { StageBadge } from "@/components/shared/stage-badge"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, daysSince } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CaseStageKey } from "@/config/stages"

export const metadata = { title: "Cases" }

const PAGE_SIZE = 25

/**
 * V3-P2.5 — the cases table a multi-case consultant actually needs: paginated
 * (previously fetched every case unbounded), with days-in-stage, blocking
 * count, last activity, assigned consultant, and an "assigned to me" filter.
 */
export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireStaff()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const supabase = await createClient()

  let query = supabase
    .from("cases")
    .select(
      "id, stage, status, is_renewal, opened_at, updated_at, stage_entered_at, nypd_app_ref, clients!inner(full_name, borough, track, assigned_staff)",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (sp.stage) query = query.eq("stage", sp.stage as never)
  if (sp.status) query = query.eq("status", sp.status as never)
  if (sp.borough) query = query.eq("clients.borough", sp.borough)
  if (sp.q) query = query.ilike("clients.full_name", `%${sp.q}%`)
  if (sp.mine === "1") query = query.eq("clients.assigned_staff", userId)

  const { data, count } = await query
  const rows = data ?? []

  // Blocking-requirement counts + staff names for just this page of cases.
  const caseIds = rows.map((c) => c.id)
  const blockingByCase = new Map<string, number>()
  if (caseIds.length) {
    const { data: reqs } = await supabase
      .from("case_requirements")
      .select("case_id, status, requirements!inner(blocking)")
      .in("case_id", caseIds)
      .eq("status", "pending")
    for (const r of reqs ?? []) {
      if ((r.requirements as unknown as { blocking: boolean })?.blocking) {
        blockingByCase.set(r.case_id, (blockingByCase.get(r.case_id) ?? 0) + 1)
      }
    }
  }
  const staffIds = [...new Set(rows.map((c) => (c.clients as unknown as { assigned_staff: string | null }).assigned_staff).filter(Boolean))] as string[]
  const staffNames = new Map<string, string>()
  if (staffIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", staffIds)
    for (const p of profs ?? []) staffNames.set(p.id, p.full_name ?? "—")
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const qs = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v)
    params.set("page", String(p))
    return `/admin/cases?${params.toString()}`
  }
  const mineHref = (() => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page" && k !== "mine") params.set(k, v)
    if (sp.mine !== "1") params.set("mine", "1")
    return `/admin/cases${params.size ? `?${params.toString()}` : ""}`
  })()

  return (
    <div>
      <PageHeader
        title="Cases"
        description="All applications — days in stage, blocking count, and owner at a glance."
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <CaseFilters />
        <Link href={mineHref} className="shrink-0 text-xs text-signal underline">
          {sp.mine === "1" ? "All cases" : "Assigned to me"}
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Days in stage</TableHead>
              <TableHead>Blocking</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No cases match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => {
              const client = c.clients as unknown as {
                full_name: string
                borough: string | null
                track: string
                assigned_staff: string | null
              }
              const daysInStage = daysSince(c.stage_entered_at ?? c.updated_at) ?? 0
              const blocking = blockingByCase.get(c.id) ?? 0
              const stalled = daysInStage > 14 && c.status === "active"
              return (
                <TableRow key={c.id} className={cn("cursor-pointer", stalled && "border-l-2 border-l-danger")}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/cases/${c.id}`} className="block hover:underline">
                      {client.full_name}
                      {c.is_renewal && <span className="ml-2 text-xs text-brass">(renewal)</span>}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {client.borough ?? "—"} · <span className="capitalize">{client.track.replace(/_/g, " ")}</span>
                    </span>
                  </TableCell>
                  <TableCell><StageBadge stage={c.stage as CaseStageKey} /></TableCell>
                  <TableCell className={cn("tabular-nums", stalled ? "font-semibold text-danger" : daysInStage > 7 ? "text-warn" : "text-muted-foreground")}>
                    {daysInStage}d
                  </TableCell>
                  <TableCell className={cn("tabular-nums", blocking > 0 ? "text-warn" : "text-ok")}>{blocking}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {client.assigned_staff ? (staffNames.get(client.assigned_staff) ?? "—") : "Unassigned"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.updated_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-xs text-text-low">
            Page {page} of {totalPages} · {count} case{count === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            {page > 1 && <Link href={qs(page - 1)} className="text-signal underline">← Prev</Link>}
            {page < totalPages && <Link href={qs(page + 1)} className="text-signal underline">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
