"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CheckCircle2, CircleDashed, Ban, RotateCcw, FileCheck2, Filter } from "lucide-react"
import { setCaseRequirementStatus, approveRequirementsWithEvidence } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CaseReqRow {
  id: string
  reqCode: string
  status: string
  notes: string | null
  documentId: string | null
  title: string
  authority: string | null
  severity: string
  blocking: boolean
}

const SEV_TONE: Record<string, string> = {
  critical: "text-danger",
  high: "text-brass-bright",
  long_lead: "text-signal",
  watch: "text-text-low",
}

/** V3-P2.2 — the consultant's requirements surface: same rows the client sees. */
export function RequirementsReview({ caseId, rows }: { caseId: string; rows: CaseReqRow[] }) {
  const [blockingOnly, setBlockingOnly] = useState(false)
  const [pending, start] = useTransition()

  const visible = blockingOnly ? rows.filter((r) => r.blocking && r.status !== "na") : rows
  const openBlocking = rows.filter((r) => r.blocking && (r.status === "pending" || r.status === "rejected")).length
  const withEvidence = rows.filter((r) => r.status === "pending" && r.documentId).length

  function setStatus(row: CaseReqRow, status: "pending" | "satisfied" | "na") {
    start(async () => {
      try {
        const res = await setCaseRequirementStatus(row.id, caseId, status)
        if (res && !res.ok) {
          toast.error(res.error)
          return
        }
        toast.success(`${row.reqCode} → ${status}`)
      } catch {
        toast.error("Couldn't update the requirement.")
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-mid">
          <b>{openBlocking}</b> blocking requirement{openBlocking === 1 ? "" : "s"} still pending ·{" "}
          <Link href="/admin/legal" className="text-signal underline">
            registry
          </Link>
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBlockingOnly((v) => !v)}>
            <Filter className="size-3.5" /> {blockingOnly ? "All" : "Blocking only"}
          </Button>
          {withEvidence > 0 && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const { approved } = await approveRequirementsWithEvidence(caseId)
                  toast.success(`Approved ${approved} requirement(s) with evidence attached`)
                })
              }
            >
              <FileCheck2 className="size-3.5" /> Approve {withEvidence} with evidence
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        {visible.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">{r.reqCode}</span>
                <span className={cn("font-medium", r.status === "na" && "text-text-low line-through")}>{r.title}</span>
                {!r.blocking && (
                  <span className="rounded bg-signal-dim px-1.5 py-0.5 text-[10px] uppercase text-signal">advisory</span>
                )}
                <span className={cn("text-[10px] uppercase tracking-wide", SEV_TONE[r.severity] ?? "text-text-low")}>
                  {r.severity.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-low">
                {r.authority ?? "—"}
                {r.documentId && <span className="ml-2 text-signal">· evidence attached</span>}
                {r.notes && <span className="ml-2">· {r.notes}</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusIcon status={r.status} />
              {r.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(r, "satisfied")}>
                    <CheckCircle2 className="size-3.5" /> Satisfy
                  </Button>
                  {/* A blocking (legally required) row can never be waived to N/A. */}
                  {!r.blocking && (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(r, "na")}>
                      <Ban className="size-3.5" /> N/A
                    </Button>
                  )}
                </>
              )}
              {(r.status === "satisfied" || r.status === "na") && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(r, "pending")}>
                  <RotateCcw className="size-3.5" /> Reopen
                </Button>
              )}
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">Nothing to show.</li>
        )}
      </ul>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === "satisfied") return <CheckCircle2 className="size-4 text-ok" />
  if (status === "na") return <Ban className="size-4 text-text-low" />
  if (status === "rejected") return <Ban className="size-4 text-danger" />
  return <CircleDashed className="size-4 text-warn" />
}
