"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CompletionMetrics, Bucket } from "@/lib/portal/completion"

/**
 * The three completion bars — Portal, Interview, Overall — from ONE metrics pass, so
 * they always agree. Used in the case header and the concierge cockpit (one component).
 * Each expands to its outstanding list, each item deep-linking into the Application tab.
 */
export function CompletionBars({ metrics, caseId, compact = false }: { metrics: CompletionMetrics; caseId: string; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <BucketBar title="Portal" bucket={metrics.portal} caseId={caseId} compact={compact} />
      <BucketBar title="Interview" bucket={metrics.interview} caseId={caseId} compact={compact} />
      <div className="flex items-center gap-2">
        <span className={`w-16 shrink-0 ${compact ? "text-[11px]" : "text-xs"} font-medium text-text-mid`}>Overall</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-brass-bright" style={{ width: `${metrics.overall.pct}%` }} />
        </div>
        <span className={`shrink-0 ${compact ? "text-[11px]" : "text-xs"} tabular-nums text-text-mid`}>
          {metrics.overall.done}/{metrics.overall.total}
        </span>
      </div>
    </div>
  )
}

function BucketBar({ title, bucket, caseId, compact }: { title: string; bucket: Bucket; caseId: string; compact: boolean }) {
  const [open, setOpen] = useState(false)
  const total = bucket.total || 1
  const donePct = (bucket.done / total) * 100
  const subPct = (bucket.submitted / total) * 100
  const outstandingCount = bucket.outstanding.length
  const canExpand = outstandingCount > 0 || bucket.submitted > 0

  return (
    <div>
      <button
        type="button"
        onClick={() => canExpand && setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 ${canExpand ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className={`flex w-16 shrink-0 items-center gap-0.5 ${compact ? "text-[11px]" : "text-xs"} font-medium text-text-mid`}>
          {canExpand ? (open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />) : <span className="w-3" />}
          {title}
        </span>
        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full bg-ok" style={{ width: `${donePct}%` }} />
          <div className="h-full bg-brass" style={{ width: `${subPct}%` }} />
        </div>
        <span className={`shrink-0 ${compact ? "text-[11px]" : "text-xs"} tabular-nums text-text-mid`}>
          {bucket.done}/{bucket.total}
        </span>
      </button>
      {open && (
        <ul className="mt-1.5 ml-16 space-y-1 text-xs">
          {bucket.submitted > 0 && (
            <li className="text-brass">{bucket.submitted} awaiting our review</li>
          )}
          {bucket.outstanding.map((item) => (
            <li key={item.key}>
              <a
                href={`/admin/cases/${caseId}?tab=application${item.anchor ? `#${item.anchor}` : ""}`}
                className={`inline-flex items-center gap-1 hover:underline ${item.state === "rejected" ? "text-danger" : "text-text-mid"}`}
              >
                <span className={`size-1.5 rounded-full ${item.state === "rejected" ? "bg-danger" : "bg-warn"}`} />
                {item.label}
                {item.state === "rejected" && item.note ? ` — ${item.note}` : item.state === "rejected" ? " — sent back" : ""}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
