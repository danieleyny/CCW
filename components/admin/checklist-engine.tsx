"use client"

import { useState, useTransition } from "react"
import { updateChecklistItem } from "@/app/admin/actions"
import { CASE_STAGES, stageMeta, type CaseStageKey } from "@/config/stages"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface ChecklistItemRow {
  id: string
  stage: CaseStageKey
  title: string
  description: string | null
  required: boolean
  owner: string
  status: string
  document_type: string | null
}

const STATUS_OPTIONS = [
  "not_started",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
] as const

const DOT: Record<string, string> = {
  not_started: "bg-muted-foreground/30",
  in_progress: "bg-primary",
  submitted: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-destructive",
}

export function ChecklistEngine({
  caseId,
  items,
}: {
  caseId: string
  items: ChecklistItemRow[]
}) {
  const [rows, setRows] = useState(items)
  const [pending, startTransition] = useTransition()

  function change(id: string, status: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    startTransition(() => {
      void updateChecklistItem(id, status, caseId)
    })
  }

  // Only render stages that actually have items, in journey order.
  const stagesWithItems = CASE_STAGES.filter((s) =>
    rows.some((r) => r.stage === s.key)
  )

  return (
    <div className="space-y-6">
      {stagesWithItems.map((stage) => {
        const stageItems = rows.filter((r) => r.stage === stage.key)
        const done = stageItems.filter((r) => r.status === "approved").length
        return (
          <div key={stage.key}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {stage.order}. {stageMeta(stage.key).label}
              </h4>
              <span className="text-xs text-muted-foreground">
                {done}/{stageItems.length} done
              </span>
            </div>
            <ul className="divide-y rounded-lg border bg-card">
              {stageItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  <span className={cn("size-2 shrink-0 rounded-full", DOT[item.status])} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.required && (
                        <span className="text-[10px] uppercase text-muted-foreground">required</span>
                      )}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
                        {item.owner}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <Select
                    value={item.status}
                    onValueChange={(v) => change(item.id, v)}
                    disabled={pending}
                  >
                    <SelectTrigger className="w-[140px] capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
