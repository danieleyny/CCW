"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"
import { CASE_STAGES, type CaseStageKey } from "@/config/stages"
import { setCaseStage } from "@/app/admin/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"

export interface PipelineCase {
  id: string
  stage: CaseStageKey
  status: string
  clientName: string
  borough: string | null
  isRenewal: boolean
  /** V3-P2.5 — stall signal on the card. */
  daysInStage: number
  blockingCount: number
}

function Card({ c }: { c: PipelineCase }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: c.id,
    data: { stage: c.stage },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none rounded-md border border-hairline border-l-2 bg-card p-3 transition-colors hover:border-hairline-strong active:cursor-grabbing",
        // Stall SLA: red edge past 14 days in stage (blocked status also reads red).
        c.status === "blocked" || c.daysInStage > 14 ? "border-l-danger" : "border-l-brass/40",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">{c.clientName}</span>
        {c.isRenewal && (
          <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brass-bright">
            Renewal
          </span>
        )}
      </div>
      <div className="engraved mt-1.5">
        {c.borough ?? "—"} ·{" "}
        <span className={cn(c.daysInStage > 14 ? "text-danger" : c.daysInStage > 7 ? "text-warn" : "")}>
          {c.daysInStage}d
        </span>
        {c.blockingCount > 0 && <span className="text-warn"> · {c.blockingCount} blocking</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <StatusBadge status={c.status} />
        <Link
          href={`/admin/cases/${c.id}`}
          className="font-mono text-[10px] uppercase tracking-wider text-signal underline-offset-2 hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          Open
        </Link>
      </div>
    </div>
  )
}

function Column({
  stage,
  cards,
}: {
  stage: (typeof CASE_STAGES)[number]
  cards: PipelineCase[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between border-b border-hairline px-1 pb-1.5">
        <span className="engraved text-text-mid">
          <span className="text-brass">S{String(stage.order).padStart(2, "0")}</span>
          {" // "}
          {stage.short}
        </span>
        <span className="font-mono text-xs text-text-low">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 rounded-md border p-2 transition-colors",
          isOver ? "border-signal bg-signal-dim" : "border-hairline bg-surface-1/40"
        )}
      >
        {cards.map((c) => (
          <Card key={c.id} c={c} />
        ))}
      </div>
    </div>
  )
}

export function PipelineBoard({ initialCases }: { initialCases: PipelineCase[] }) {
  const [cases, setCases] = useState(initialCases)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const active = cases.find((c) => c.id === activeId) ?? null

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const id = e.active.id as string
    const target = e.over?.id as CaseStageKey | undefined
    if (!target) return
    const current = cases.find((c) => c.id === id)
    if (!current || current.stage === target) return

    const prev = cases
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, stage: target } : c)))
    try {
      const res = await setCaseStage(id, target)
      if (!res.ok) {
        // V3-P2.4 — the CP-5 gate refused the move: roll back + show why.
        setCases(prev)
        toast.error(`${current.clientName} can't enter that stage yet`, {
          description: res.blockers.slice(0, 4).join(" · "),
          duration: 9000,
        })
        return
      }
      toast.success(`${current.clientName} → ${CASE_STAGES.find((s) => s.key === target)?.short}`)
    } catch {
      setCases(prev)
      toast.error("Couldn't move that case. Try again.")
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {CASE_STAGES.map((stage) => (
          <Column
            key={stage.key}
            stage={stage}
            cards={cases.filter((c) => c.stage === stage.key)}
          />
        ))}
      </div>
      <DragOverlay>
        {active && (
          <div className="w-60 rotate-2 rounded-md border bg-card p-3 shadow-lg">
            <span className="text-sm font-medium">{active.clientName}</span>
            <div className="mt-1 text-xs text-muted-foreground">{active.borough ?? "—"}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
