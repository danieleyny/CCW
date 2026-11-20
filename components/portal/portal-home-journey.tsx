"use client"

import { Check, ChevronRight } from "lucide-react"
import {
  CLIENT_PHASES,
  clientPhaseIndex,
  type CaseStageKey,
  type ClientPhaseKey,
} from "@/config/stages"
import { CaseTimeline } from "@/components/portal/case-timeline"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type PhaseCopy = Record<ClientPhaseKey, { label: string; subline: string }>

export function PortalHomeJourney({
  currentStage,
  title,
  phaseOf,
  fullTimeline,
  youAreHere,
  nypdClock,
  phases,
}: {
  currentStage: CaseStageKey
  title: string
  phaseOf: string
  fullTimeline: string
  youAreHere: string
  nypdClock: string
  phases: PhaseCopy
}) {
  const current = clientPhaseIndex(currentStage)
  const licensed = currentStage === "licensed"
  const currentCopy = phases[CLIENT_PHASES[current].key]
  const phaseLabel = phaseOf
    .replace("{current}", String(current + 1))
    .replace("{total}", String(CLIENT_PHASES.length))

  return (
    <section className="portal-home-journey">
      <div className="portal-home-journey-heading">
        <div className="portal-home-journey-title">
          <p className="portal-t-eyebrow">{title}</p>
          <h2>{currentCopy.label}</h2>
        </div>
        <span>{phaseLabel}</span>
        <div className="portal-home-phase-mobile" aria-label={title}>
          <div>
            <strong>{currentCopy.label}</strong>
            <span>{phaseLabel}</span>
          </div>
          <div className="portal-home-phase-bars" aria-hidden="true">
            {CLIENT_PHASES.map((phase, index) => (
              <i key={phase.key} className={licensed || index <= current ? "is-filled" : ""} />
            ))}
          </div>
          {CLIENT_PHASES[current].key === "nypd_review" ? <small>{nypdClock}</small> : null}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="portal-home-timeline-trigger">
              {fullTimeline} <ChevronRight aria-hidden />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="portal-home-timeline-sheet w-full max-w-none gap-0 overflow-y-auto p-0 sm:w-[520px] sm:max-w-[520px]"
          >
            <SheetHeader className="portal-home-timeline-header">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{phaseLabel}</SheetDescription>
            </SheetHeader>
            <div className="portal-home-timeline-body">
              {CLIENT_PHASES.map((phase, index) => {
                const done = licensed || index < current
                const active = !licensed && index === current
                const copy = phases[phase.key]
                return (
                  <section
                    key={phase.key}
                    className={`portal-home-timeline-phase ${active ? "is-active" : ""}`}
                  >
                    <div className="portal-home-timeline-phase-heading">
                      <span aria-hidden>{done ? <Check /> : index + 1}</span>
                      <div>
                        <h3>{copy.label}</h3>
                        {!active ? <p>{copy.subline}</p> : null}
                      </div>
                    </div>
                    {active ? (
                      <CaseTimeline
                        currentStage={currentStage}
                        stageKeys={phase.stages as readonly CaseStageKey[]}
                      />
                    ) : null}
                  </section>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <ol className="portal-home-phase-list" aria-label={title}>
        {CLIENT_PHASES.map((phase, index) => {
          const done = licensed || index < current
          const active = !licensed && index === current
          return (
            <li
              key={phase.key}
              className={done ? "is-done" : active ? "is-current" : "is-future"}
              aria-current={active ? "step" : undefined}
            >
              <div className="portal-home-phase-rail">
                <span>{done ? <Check aria-hidden /> : null}</span>
                {index < CLIENT_PHASES.length - 1 ? <i /> : null}
              </div>
              <strong>{phases[phase.key].label}</strong>
              {active ? <em>{youAreHere}</em> : null}
              {phase.key === "nypd_review" ? <small>{nypdClock}</small> : null}
            </li>
          )
        })}
      </ol>

    </section>
  )
}
