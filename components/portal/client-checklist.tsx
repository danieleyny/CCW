"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { updateMyChecklistItem } from "@/app/portal/actions"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ClientChecklistItem {
  id: string
  title: string
  description: string | null
  status: string
  document_type: string | null
  stage: CaseStageKey
}

export function ClientChecklist({
  caseId,
  items,
}: {
  caseId: string
  items: ClientChecklistItem[]
}) {
  const [rows, setRows] = useState(items)
  const [pending, startTransition] = useTransition()

  function setStatus(id: string, status: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    startTransition(async () => {
      try {
        await updateMyChecklistItem(id, status, caseId)
      } catch {
        toast.error("Couldn't update. Try again.")
      }
    })
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Nothing needed from you right now. 🎉
      </p>
    )
  }

  // Group by stage in journey order.
  const stages = [...new Set(rows.map((r) => r.stage))].sort()
  const byStage = rows.reduce<Record<string, ClientChecklistItem[]>>((acc, r) => {
    ;(acc[r.stage] ??= []).push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {stages.map((stageKey) => (
        <div key={stageKey}>
          <h3 className="engraved mb-2">
            {stageMeta(stageKey as CaseStageKey).label}
          </h3>
          <ul className="divide-y rounded-lg border bg-card">
            {byStage[stageKey].map((item) => {
              const locked = item.status === "approved"
              return (
                <li key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.title}</div>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.document_type ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/portal/documents">
                          <Upload className="size-4" />
                          {item.status === "approved" ? "View" : "Upload"}
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant={item.status === "submitted" ? "default" : "outline"}
                          disabled={pending || locked}
                          onClick={() => setStatus(item.id, "submitted")}
                        >
                          {item.status === "submitted" ? "Marked done" : "Mark done"}
                        </Button>
                        {item.status !== "not_started" && !locked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => setStatus(item.id, "not_started")}
                            className={cn("text-muted-foreground")}
                          >
                            Undo
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
