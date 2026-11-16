import { Check, Landmark, Video } from "lucide-react"
import { deriveMilestones, type ConciergeCaseState } from "@/config/concierge-milestones"
import { formatDateTime } from "@/lib/format"
import type { IntroCallState } from "@/lib/concierge/onboarding"

function ProgressRing({ value, total, label }: { value: number; total: number; label: string }) {
  const safeTotal = Math.max(total, 1)
  const progress = Math.min(100, Math.round((value / safeTotal) * 100))

  return (
    <div
      className="concierge-hero-stat"
      aria-label={`${value} of ${total} ${label.toLowerCase()}`}
      style={{ "--concierge-progress": `${progress * 3.6}deg` } as React.CSSProperties}
    >
      <span className="concierge-hero-ring" aria-hidden>
        <span className="concierge-hero-ring-number">
          <span className="concierge-hero-ring-value">{value}</span>
          <small className="concierge-hero-ring-total">/{total}</small>
        </span>
      </span>
      <span className="concierge-hero-stat-label">{label}</span>
    </div>
  )
}

/**
 * Real case state, recast as the V2 concierge hero. This remains a view of the
 * existing milestone model rather than a second progress system.
 */
export function ControlTower({
  state,
  nypdControlled,
  introCall,
  firstName,
  agentFirst,
  detailsCaptured,
  detailsTotal,
  copy = {
    eyebrow: "Full Concierge",
    welcome: "Welcome",
    introCall: "Intro call",
    join: "Join",
    documentsIn: "Documents in",
    detailsCaptured: "Details captured",
    workInProgress: "What we're doing for you",
    step: "Step",
    of: "of",
  },
}: {
  state: ConciergeCaseState
  nypdControlled: boolean
  introCall?: IntroCallState | null
  firstName: string
  agentFirst: string | null
  detailsCaptured: number
  detailsTotal: number
  copy?: {
    eyebrow: string
    welcome: string
    introCall: string
    join: string
    documentsIn: string
    detailsCaptured: string
    workInProgress: string
    step: string
    of: string
  }
}) {
  const milestones = deriveMilestones(state)
  const progressIndex = milestones.findIndex((milestone) => milestone.status === "in_progress")
  const currentIndex = progressIndex === -1 ? milestones.length - 1 : progressIndex
  const current = milestones[currentIndex]

  return (
    <>
      <section className="concierge-hero">
        <div className="concierge-hero-top">
          <div className="concierge-hero-copy">
            <p className="concierge-hero-eyebrow">{copy.eyebrow}</p>
            <h1 className="concierge-hero-title">{copy.welcome}, {firstName}.</h1>
            <p className="concierge-hero-lede">
              You&apos;re on the done-for-you path. We prepare and quality-check everything — you review,
              approve, and submit your own NYPD application with our guidance.
              {agentFirst ? <strong> {agentFirst} is your concierge.</strong> : null}
            </p>
            {introCall?.scheduledAt ? (
              <p className="concierge-hero-call">
                <Check className="size-4" aria-hidden />
                {copy.introCall} · {formatDateTime(introCall.scheduledAt)}
                {introCall.joinUrl ? (
                  <a href={introCall.joinUrl} target="_blank" rel="noopener noreferrer">
                    <Video className="size-3.5" aria-hidden /> {copy.join}
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="concierge-hero-stats">
            <ProgressRing
              value={state.requirementsSatisfied}
              total={state.requirementsTotal}
              label={copy.documentsIn}
            />
            <ProgressRing value={detailsCaptured} total={detailsTotal} label={copy.detailsCaptured} />
          </div>
        </div>

        <div className="concierge-milestones">
          <p className="concierge-milestones-label">{copy.workInProgress}</p>
          <ol className="concierge-milestone-track">
            {milestones.map((milestone, index) => (
              <li key={milestone.key} data-status={milestone.status}>
                <span className="concierge-milestone-dot" aria-hidden>
                  {milestone.status === "done" ? <Check className="size-4" /> : index + 1}
                </span>
                <span className="concierge-milestone-copy">
                  <strong>{milestone.label}</strong>
                  <small>{milestone.detail}</small>
                </span>
              </li>
            ))}
          </ol>

          <div className="concierge-milestone-mobile" aria-label={`${copy.step} ${currentIndex + 1} ${copy.of} 5`}>
            <div className="concierge-milestone-segments" aria-hidden>
              {milestones.map((milestone) => (
                <span key={milestone.key} data-status={milestone.status} />
              ))}
            </div>
            <p>
              {copy.step} {currentIndex + 1} {copy.of} {milestones.length} · <strong>{current.label}</strong>
            </p>
            <small>{current.detail}</small>
          </div>
        </div>
      </section>

      {nypdControlled ? (
        <p className="concierge-info-bar">
          <Landmark className="size-4" aria-hidden />
          Your application is with the NYPD. This phase runs on the NYPD&apos;s timeline; we&apos;ll keep
          watch and let you know when its status changes.
        </p>
      ) : null}
    </>
  )
}
