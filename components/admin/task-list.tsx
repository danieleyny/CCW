"use client"

import Link from "next/link"
import { useTransition } from "react"
import { Circle, CheckCircle2 } from "lucide-react"
import { setTaskStatus } from "@/app/admin/actions"
import { cn } from "@/lib/utils"
import { formatDate, isOverdue } from "@/lib/format"

export interface TaskRow {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: number
  status: string
  caseId: string | null
  clientName: string | null
}

const PRIORITY_LABEL: Record<number, string> = { 1: "High", 2: "Normal", 3: "Low" }

export function TaskList({ tasks }: { tasks: TaskRow[] }) {
  const [pending, startTransition] = useTransition()

  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nothing in the queue. You&apos;re all caught up. 🎉
      </p>
    )
  }

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {tasks.map((t) => {
        const overdue = isOverdue(t.due_date)
        return (
          <li key={t.id} className="flex items-start gap-3 p-3">
            <button
              type="button"
              aria-label="Mark done"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setTaskStatus(t.id, "done")
                })
              }
              className="mt-0.5 text-muted-foreground transition-colors hover:text-emerald-600"
            >
              {t.status === "done" ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <Circle className="size-5" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium">{t.title}</span>
                {t.priority === 1 && (
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                )}
              </div>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {t.due_date && (
                  <span className={cn(overdue && "font-medium text-destructive")}>
                    Due {formatDate(t.due_date)}
                    {overdue && " · overdue"}
                  </span>
                )}
                {t.clientName && t.caseId && (
                  <Link
                    href={`/admin/cases/${t.caseId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {t.clientName}
                  </Link>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
