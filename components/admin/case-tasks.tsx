"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Plus, CheckCircle2, Circle, RotateCcw } from "lucide-react"
import { createTask, setTaskStatus } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate, isOverdue } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface StaffOption {
  id: string
  name: string
}

export interface CaseTaskRow {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: number
  status: string
  assigneeName: string | null
}

const PRIORITY_LABEL: Record<number, string> = { 1: "High", 2: "Normal", 3: "Low" }

/** V3-P2.3 — create, assign, due-date, complete, and reopen tasks on a case. */
export function CaseTasks({
  caseId,
  tasks,
  staff,
}: {
  caseId: string
  tasks: CaseTaskRow[]
  staff: StaffOption[]
}) {
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState("")
  const [due, setDue] = useState("")
  const [priority, setPriority] = useState("2")
  const [pending, start] = useTransition()

  function add() {
    if (!title.trim()) return
    start(async () => {
      const fd = new FormData()
      fd.set("title", title.trim())
      fd.set("caseId", caseId)
      fd.set("assignee", assignee)
      fd.set("dueDate", due)
      fd.set("priority", priority)
      const res = await createTask(fd)
      if (res.error) toast.error(res.error)
      else {
        setTitle("")
        setDue("")
        toast.success("Task created")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">New task</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Call client re: safe photos"'
          />
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Assignee"
          >
            <option value="">Assign to me</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Priority"
          >
            <option value="1">High</option>
            <option value="2">Normal</option>
            <option value="3">Low</option>
          </select>
        </div>
        <Button size="sm" className="mt-2" disabled={pending || !title.trim()} onClick={add}>
          <Plus className="size-3.5" /> Create task
        </Button>
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        {tasks.map((t) => {
          const done = t.status === "done"
          const overdue = !done && isOverdue(t.dueDate)
          return (
            <li key={t.id} className="flex items-start gap-3 p-3 text-sm">
              <button
                type="button"
                aria-label={done ? "Reopen task" : "Mark done"}
                disabled={pending}
                onClick={() => start(async () => void (await setTaskStatus(t.id, done ? "open" : "done")))}
                className={cn("mt-0.5", done ? "text-ok" : "text-text-low hover:text-ok")}
              >
                {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", done && "text-text-low line-through")}>{t.title}</p>
                <p className="text-xs text-text-low">
                  {t.assigneeName ?? "Unassigned"} · {PRIORITY_LABEL[t.priority] ?? "Normal"}
                  {t.dueDate && (
                    <span className={cn(overdue && "font-medium text-danger")}> · due {formatDate(t.dueDate)}</span>
                  )}
                </p>
              </div>
              {done && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-text-low"
                  disabled={pending}
                  onClick={() => start(async () => void (await setTaskStatus(t.id, "open")))}
                >
                  <RotateCcw className="size-3.5" /> Reopen
                </Button>
              )}
            </li>
          )
        })}
        {tasks.length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">No tasks on this case yet.</li>
        )}
      </ul>
    </div>
  )
}
