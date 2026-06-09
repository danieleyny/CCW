"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { setCaseStage, setCaseStatus } from "@/app/admin/actions"
import { CASE_STAGES, type CaseStageKey } from "@/config/stages"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUSES = ["active", "blocked", "on_hold", "closed", "approved", "denied"]

export function StageControl({
  caseId,
  stage,
  status,
}: {
  caseId: string
  stage: CaseStageKey
  status: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={stage}
        disabled={pending}
        onValueChange={(v) =>
          startTransition(async () => {
            try {
              await setCaseStage(caseId, v as CaseStageKey)
              toast.success("Stage updated · client notified")
            } catch {
              toast.error("Couldn't update stage")
            }
          })
        }
      >
        <SelectTrigger className="w-[230px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CASE_STAGES.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {s.order}. {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        disabled={pending}
        onValueChange={(v) =>
          startTransition(async () => {
            try {
              await setCaseStatus(caseId, v)
              toast.success("Status updated")
            } catch {
              toast.error("Couldn't update status")
            }
          })
        }
      >
        <SelectTrigger className="w-[140px] capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
