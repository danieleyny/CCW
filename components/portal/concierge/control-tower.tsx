import { Check, Loader2, Landmark, Video } from "lucide-react"
import { deriveMilestones, type ConciergeCaseState } from "@/config/concierge-milestones"
import { formatDateTime } from "@/lib/format"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import type { IntroCallState } from "@/lib/concierge/onboarding"

/**
 * CONCIERGE Phase 4 — the control tower. A live, human-narrated view of what WE
 * are doing, derived ENTIRELY from real case state (no cosmetic progress).
 * NYPD-controlled stages are labelled as the NYPD's clock, never ours. What the
 * applicant still needs to provide lives in the "Your application" tab, not here,
 * so the tower stays a pure progress view (no duplicated ask).
 *
 * A BOOKED intro call folds in here as the first (completed) milestone line — a
 * one-time step shouldn't hold its own dashboard section once it's done.
 */
export function ControlTower({
  state,
  nypdControlled,
  introCall,
}: {
  state: ConciergeCaseState
  nypdControlled: boolean
  introCall?: IntroCallState | null
}) {
  const milestones = deriveMilestones(state)
  const callBooked = !!introCall?.scheduledAt

  return (
    <section className="space-y-4">
      <div>
        <SectionEyebrow>Where things stand</SectionEyebrow>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">What we&apos;re doing for you</h2>
      </div>

      <ol className="rounded-lg border border-hairline bg-card p-5">
        {callBooked && (
          <li className="relative flex gap-3 pb-5">
            <span aria-hidden className="absolute left-[11px] top-6 h-full w-px bg-ok/40" />
            <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-ok/50 bg-ok/15 text-ok">
              <Check className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                Intro call — {formatDateTime(introCall!.scheduledAt!)}
                {introCall!.joinUrl && (
                  <>
                    {" · "}
                    <a
                      href={introCall!.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-ok underline underline-offset-2"
                    >
                      <Video className="size-3.5" /> Join
                    </a>
                  </>
                )}
              </div>
            </div>
          </li>
        )}
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
    </section>
  )
}
