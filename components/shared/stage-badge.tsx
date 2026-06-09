import { Badge } from "@/components/ui/badge"
import { stageMeta, stageProgress, type CaseStageKey } from "@/config/stages"
import { cn } from "@/lib/utils"

/** Compact badge for a case stage, tinted by how far along the journey it is. */
export function StageBadge({
  stage,
  className,
}: {
  stage: CaseStageKey
  className?: string
}) {
  const meta = stageMeta(stage)
  const pct = stageProgress(stage)
  const tone =
    pct >= 100
      ? "bg-brass/15 text-brass-bright border-brass/40"
      : pct >= 60
        ? "bg-signal-dim text-signal border-signal/30"
        : "bg-surface-3 text-text-mid border-hairline"

  return (
    <Badge variant="outline" className={cn(tone, className)}>
      {meta.short}
    </Badge>
  )
}
