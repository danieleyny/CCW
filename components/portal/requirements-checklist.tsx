import Link from "next/link"
import { Upload, ShieldCheck } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ReqChecklistItem {
  id: string
  reqCode: string
  status: string // case_req_status: na | pending | satisfied | rejected
  title: string
  description: string | null
  authority: string | null
  severity: string // critical | high | watch | long_lead
  documentType: string | null
}

const SEV_TONE: Record<string, string> = {
  critical: "text-danger",
  high: "text-brass",
  watch: "text-text-low",
  long_lead: "text-signal",
}

/**
 * The client's checklist, driven by the DB requirements engine (case_requirements
 * joined to the versioned registry). Every row shows its stable req_code and the
 * authority citation it traces to — the same source of truth admin QA reads.
 */
export function RequirementsChecklist({ items }: { items: ReqChecklistItem[] }) {
  const applicable = items.filter((i) => i.status !== "na")
  const notApplicable = items.filter((i) => i.status === "na")

  const satisfied = applicable.filter((i) => i.status === "satisfied").length

  if (applicable.length === 0 && notApplicable.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your personalized requirements haven&apos;t been generated yet.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-ok" />
        <span>
          {satisfied} of {applicable.length} requirements satisfied
        </span>
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        {applicable.map((item) => (
          <li key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-text-mid">
                    {item.reqCode}
                  </span>
                  <span className={cn("text-[10px] font-medium uppercase tracking-wide", SEV_TONE[item.severity] ?? "text-text-low")}>
                    {item.severity.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium">{item.title}</div>
                {item.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                )}
                {item.authority && (
                  <p className="mt-1 font-mono text-[10px] text-text-low">{item.authority}</p>
                )}
              </div>
              <StatusBadge status={item.status} />
            </div>

            {item.documentType && item.status !== "satisfied" && (
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href="/portal/documents">
                    <Upload className="size-4" />
                    Upload
                  </Link>
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {notApplicable.length > 0 && (
        <details className="rounded-lg border bg-card/50 px-4 py-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Not applicable to your case ({notApplicable.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {notApplicable.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-xs text-text-low">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">{item.reqCode}</span>
                {item.title}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
