import { Check, Loader2, Clock, Landmark } from "lucide-react"
import { deriveMilestones, type ConciergeCaseState } from "@/config/concierge-milestones"
import type { NextStep } from "@/lib/portal/next-step"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

/**
 * CONCIERGE Phase 4 — the control tower. A live, human-narrated view of what WE
 * are doing, derived ENTIRELY from real case state (no cosmetic progress). Plus
 * the ONE thing we actually need from the applicant right now — and only when
 * we're genuinely blocked on them. NYPD-controlled stages are labelled as the
 * NYPD's clock, never ours.
 */
export function ControlTower({
  state,
  nextStep,
  nypdControlled,
}: {
  state: ConciergeCaseState
  nextStep: NextStep
  nypdControlled: boolean
}) {
  const milestones = deriveMilestones(state)
  // We're truly waiting on the applicant (a real, client-actionable requirement)
  // vs. the ball being in our court. The actual "one thing we need" card now
  // lives at the top of the document vault, right where they act on it — here we
  // only use this to decide the reassuring "nothing needed" note below.
  const showAsk = !nextStep.waiting && nextStep.total > 0

  return (
    <section className="space-y-4">
      <div>
        <SectionEyebrow>Where things stand</SectionEyebrow>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">What we&apos;re doing for you</h2>
      </div>

      <ol className="rounded-lg border border-hairline bg-card p-5">
        {milestones.map((m, i) => {
          const last = i === milestones.length - 1
          return (
            <li key={m.key} className="relative flex gap-3 pb-5 last:pb-0">
              {/* connector */}
              {!last && (
                <span
                  aria-hidden
                  className={`absolute left-[11px] top-6 h-full w-px ${
                    m.status === "done" ? "bg-ok/40" : "bg-hairline"
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border ${
                  m.status === "done"
                    ? "border-ok/50 bg-ok/15 text-ok"
                    : m.status === "in_progress"
                      ? "border-brass/50 bg-brass/15 text-brass"
                      : "border-hairline bg-surface-2 text-text-low"
                }`}
              >
                {m.status === "done" ? (
                  <Check className="size-3.5" />
                ) : m.status === "in_progress" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <div className="min-w-0">
                <div
                  className={`text-sm font-medium ${
                    m.status === "upcoming" ? "text-text-low" : "text-foreground"
                  }`}
                >
                  {m.label}
                </div>
                {m.status === "in_progress" && (
                  <p className="mt-0.5 text-sm text-text-mid">{m.detail}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {nypdControlled && (
        <p className="flex items-start gap-2 rounded-lg border border-hairline bg-surface-2/40 p-4 text-sm text-text-mid">
          <Landmark className="mt-0.5 size-4 shrink-0 text-text-low" />
          Your application is with the NYPD now. This part runs on the NYPD&apos;s clock, not ours — we
          can&apos;t speed it up, but we&apos;ll keep watch and tell you the moment anything moves.
        </p>
      )}

      {!nypdControlled && !showAsk && (
        <p className="flex items-center gap-2 rounded-lg border border-ok/25 bg-ok/8 p-4 text-sm text-ok">
          <Clock className="size-4 shrink-0" /> Nothing needed from you right now — we&apos;re on it. We&apos;ll
          reach out the moment we do.
        </p>
      )}
    </section>
  )
}
