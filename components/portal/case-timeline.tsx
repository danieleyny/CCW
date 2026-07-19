import { Check, Clock, Landmark } from "lucide-react"
import {
  CASE_STAGES,
  stageIndex,
  isNypdControlled,
  type CaseStageKey,
} from "@/config/stages"
import { cn } from "@/lib/utils"

/**
 * PART B / Phase 7 — the applicant's package tracker. Every stage, in plain
 * language, with an HONEST ETA: the parts we and the applicant drive, and the
 * parts that are the License Division's clock, not ours.
 *
 * No promises. The one number we quote — "about six months" for the NYPD review
 * — is framed as TYPICAL and explicitly attributed to NYPD. We never imply we
 * can speed up their clock, because we can't.
 */
export function CaseTimeline({ currentStage }: { currentStage: CaseStageKey }) {
  const here = stageIndex(currentStage)
  const filedIdx = stageIndex("filed")
  const afterFiling = here >= filedIdx

  return (
    <div className="space-y-4">
      <ol className="relative space-y-0">
        {CASE_STAGES.map((s, i) => {
          const idx = stageIndex(s.key)
          const done = idx < here
          const current = idx === here
          const nypd = isNypdControlled(s.key)
          const last = i === CASE_STAGES.length - 1
          return (
            <li key={s.key} className="flex gap-3">
              {/* rail */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    done && "border-brass bg-brass/20 text-brass-bright",
                    current && "border-signal bg-signal/15 text-signal",
                    !done && !current && "border-hairline-strong bg-surface-2 text-text-low"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : current ? <Clock className="size-3.5" /> : nypd ? <Landmark className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                {!last && <span className={cn("w-px flex-1", done ? "bg-brass/40" : "bg-hairline-strong")} style={{ minHeight: 28 }} />}
              </div>

              {/* content */}
              <div className={cn("pb-5", current ? "opacity-100" : done ? "opacity-90" : "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-sm font-medium", current && "text-signal")}>{s.label}</span>
                  {nypd && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-low">
                      NYPD&apos;s clock
                    </span>
                  )}
                  {current && (
                    <span className="rounded bg-signal/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-signal">
                      you are here
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-mid">{current ? s.clientHint : s.description}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {/* The one honest ETA, attributed where it belongs. */}
      <div className="rounded-md border border-hairline bg-surface-2/40 p-3 text-xs leading-relaxed text-text-mid">
        <span className="font-medium text-text-hi">How long does this take?</span>{" "}
        {afterFiling ? (
          <>
            Once an application is filed, the License Division&apos;s review <b>typically takes about
            six months</b> — sometimes more. That timeline is set by the NYPD, not by us, and no one can
            speed up their investigation. We&apos;ll keep you posted at every step we can see.{" "}
            <a href="/portal/interview" className="text-signal underline">
              Prepare for your interview →
            </a>
          </>
        ) : (
          <>
            The pace up to filing depends mostly on how quickly your documents and training come
            together — that part we can help move. After you file, the NYPD&apos;s review{" "}
            <b>typically takes about six months</b>, and that clock is theirs, not ours.
          </>
        )}
      </div>
    </div>
  )
}
