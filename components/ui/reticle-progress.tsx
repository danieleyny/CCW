import {
  CASE_STAGES,
  stageMeta,
  stageIndex,
  stageProgress,
  type CaseStageKey,
} from "@/config/stages"
import { cn } from "@/lib/utils"

/** The active-stage reticle: a locked-on crosshair with a cyan glow. */
function Reticle() {
  return (
    <span className="relative flex size-6 items-center justify-center" aria-hidden>
      <span className="reticle-active absolute inset-0 rounded-full border border-signal/80" />
      {/* crosshair ticks */}
      <span className="absolute top-[-3px] left-1/2 h-1.5 w-px -translate-x-1/2 bg-signal/70" />
      <span className="absolute bottom-[-3px] left-1/2 h-1.5 w-px -translate-x-1/2 bg-signal/70" />
      <span className="absolute top-1/2 left-[-3px] h-px w-1.5 -translate-y-1/2 bg-signal/70" />
      <span className="absolute top-1/2 right-[-3px] h-px w-1.5 -translate-y-1/2 bg-signal/70" />
      <span className="size-1.5 rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
    </span>
  )
}

/**
 * Signature 13-stage precision rail. Completed stages = brass nodes; the current
 * stage = a cyan reticle locked on; upcoming = dim hairline nodes. Below the rail
 * a mono readout shows the stage code. Pure CSS animation (SSR-safe).
 */
export function ReticleProgress({
  currentStage,
  className,
  showLabel = true,
}: {
  currentStage: CaseStageKey
  className?: string
  showLabel?: boolean
}) {
  const here = stageIndex(currentStage)
  const meta = stageMeta(currentStage)
  const pct = stageProgress(currentStage)

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {CASE_STAGES.map((s, i) => {
          const idx = stageIndex(s.key)
          const done = idx < here
          const current = idx === here
          return (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              {/* node */}
              <span className="relative flex size-6 shrink-0 items-center justify-center">
                {current ? (
                  <Reticle />
                ) : done ? (
                  <span className="size-2.5 rounded-full bg-brass shadow-[0_0_8px_var(--brass-glow)]" />
                ) : (
                  <span className="size-2 rounded-full border border-hairline-strong bg-surface-2" />
                )}
              </span>
              {/* connector */}
              {i < CASE_STAGES.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    idx < here ? "bg-brass/50" : "bg-hairline-strong"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {showLabel && (
        <div className="mt-3 flex items-center justify-between">
          <span className="engraved text-text-mid">
            <span className="text-brass">
              STAGE {String(meta.order).padStart(2, "0")}
            </span>
            {" // "}
            {meta.label}
          </span>
          <span className="font-mono text-xs text-signal">{pct}%</span>
        </div>
      )}
    </div>
  )
}
