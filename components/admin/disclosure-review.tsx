"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { ShieldAlert, MessageSquareWarning, FileText, CheckCircle2 } from "lucide-react"
import { requestBetterNarrative } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface DisclosureRow {
  id: string
  type: string
  occurredOn: string | null
  jurisdiction: string | null
  disposition: string | null
  narrative: string
  questionNo: number | null
  spawnedReqCode: string | null
  boundDocName: string | null
}

/** empty / too short / ok — the narrative-quality flag the audit demanded. */
function quality(narrative: string): { label: string; tone: string } | null {
  const len = narrative.trim().length
  if (len === 0) return { label: "EMPTY — required before filing", tone: "bg-danger/15 text-danger" }
  if (len < 20) return { label: "TOO SHORT — needs substance", tone: "bg-warn/15 text-warn" }
  return null
}

/**
 * V3-P2.2 — the most important tab in the product: every disclosure and its
 * narrative, readable by the consultant BEFORE filing. Read-only on the facts —
 * the consultant may prompt for completeness, never coach the content.
 */
export function DisclosureReview({ caseId, rows }: { caseId: string; rows: DisclosureRow[] }) {
  const [pending, start] = useTransition()

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok/8 p-6 text-sm">
        <CheckCircle2 className="mr-1 inline size-4 text-ok" /> No disclosures on this case — the
        applicant reported no arrests, orders of protection, incidents, or “yes” answers at intake.
      </div>
    )
  }

  const needing = rows.filter((r) => quality(r.narrative)).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-mid">
          {rows.length} disclosure{rows.length === 1 ? "" : "s"} ·{" "}
          {needing > 0 ? (
            <span className="text-warn">
              <ShieldAlert className="mr-0.5 inline size-3.5" /> {needing} need a fuller explanation
            </span>
          ) : (
            <span className="text-ok">all narrated</span>
          )}
        </p>
        <p className="text-[11px] text-text-low">
          Candor-maximizing: prompt for completeness only — never advise what to include or omit.
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map((d) => {
          const q = quality(d.narrative)
          return (
            <li key={d.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] capitalize">
                    {d.type.replace(/_/g, " ")}
                    {d.questionNo ? ` · Q${d.questionNo}` : ""}
                  </span>
                  {d.occurredOn && <span className="text-text-low">{formatDate(d.occurredOn)}</span>}
                  {d.jurisdiction && <span className="text-text-low">· {d.jurisdiction}</span>}
                  {d.disposition && <span className="text-text-mid">· {d.disposition}</span>}
                  {d.spawnedReqCode && (
                    <span className="rounded bg-signal-dim px-1.5 py-0.5 font-mono text-[10px] text-signal">
                      → {d.spawnedReqCode}
                    </span>
                  )}
                </div>
                {q && <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", q.tone)}>{q.label}</span>}
              </div>

              <p
                className={cn(
                  "mt-2 whitespace-pre-wrap rounded-md border border-hairline bg-surface-1 p-3 text-sm",
                  !d.narrative.trim() && "italic text-text-low"
                )}
              >
                {d.narrative.trim() || "No written explanation provided yet."}
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-text-low">
                  {d.boundDocName ? (
                    <>
                      <FileText className="mr-0.5 inline size-3.5" /> Bound document: {d.boundDocName}
                    </>
                  ) : (
                    "No supporting document bound yet."
                  )}
                </span>
                {q && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const fd = new FormData()
                        fd.set("caseId", caseId)
                        fd.set("disclosureId", d.id)
                        const res = await requestBetterNarrative(fd)
                        if (res.error) toast.error(res.error)
                        else toast.success("Client asked for a fuller explanation (message + notification sent)")
                      })
                    }
                  >
                    <MessageSquareWarning className="size-3.5" /> Request a better narrative
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
