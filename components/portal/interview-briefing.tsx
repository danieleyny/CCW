"use client"

import Link from "next/link"
import { useRef, useState, type KeyboardEvent } from "react"
import {
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  MessageCircleQuestion,
  RefreshCw,
  Scale,
} from "lucide-react"
import type { InterviewSection, PracticeQuestion } from "@/content/interview"
import type { Messages } from "@/lib/i18n/messages"
import { interpolate } from "@/lib/i18n/interpolate"

type InterviewCopy = Messages["interview"]

interface InterviewBriefingProps {
  overview: string
  sections: InterviewSection[]
  questions: PracticeQuestion[]
  disclaimer: string
  copy: InterviewCopy
  earlyStage: boolean
  showRuleCard: boolean
}

export function InterviewBriefing({
  overview,
  sections,
  questions,
  disclaimer,
  copy,
  earlyStage,
  showRuleCard,
}: InterviewBriefingProps) {
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [packed, setPacked] = useState<Set<number>>(() => new Set())
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set())
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const allPacked = sections[0]?.points.length > 0 && packed.size === sections[0].points.length

  function chooseTab(index: number) {
    setActiveTab(index)
    tabRefs.current[index]?.focus()
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % sections.length
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + sections.length) % sections.length
    if (event.key === "Home") next = 0
    if (event.key === "End") next = sections.length - 1
    if (next === null) return
    event.preventDefault()
    chooseTab(next)
  }

  function togglePacked(index: number) {
    setPacked((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function toggleFlipped(index: number) {
    setFlipped((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="interview-page">
      <section className="interview-hero" data-rule-card={showRuleCard}>
        <div className="interview-hero-copy">
          <p className="portal-t-eyebrow interview-hero-eyebrow">{copy.eyebrow}</p>
          <h1>Your interview, without the nerves</h1>
          <p className="interview-overview" data-expanded={overviewOpen}>
            {overview}
          </p>
          {!overviewOpen ? (
            <button type="button" className="interview-read-more" onClick={() => setOverviewOpen(true)}>
              {copy.readMore}
            </button>
          ) : null}
        </div>

        {showRuleCard ? (
          <aside className="interview-rule-card" aria-label={copy.ruleTitle}>
            <p className="portal-t-label">{copy.ruleTitle}</p>
            <p className="interview-rule-summary">{copy.ruleSentence}</p>
            <ul>
              {[copy.ruleOne, copy.ruleTwo, copy.ruleThree].map((line) => (
                <li key={line}>
                  <Check aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
        <span className="interview-hero-glow" aria-hidden="true" />
      </section>

      {earlyStage ? <p className="interview-early-note">{copy.earlyStage}</p> : null}

      <div className="interview-layout">
        <section className="interview-main" aria-label={copy.eyebrow}>
          <div className="interview-tabs" role="tablist" aria-label={copy.briefingTabsLabel}>
            {sections.map((section, index) => (
              <button
                key={section.title}
                ref={(node) => { tabRefs.current[index] = node }}
                id={`interview-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                aria-controls={`interview-panel-${index}`}
                tabIndex={activeTab === index ? 0 : -1}
                onClick={() => setActiveTab(index)}
                onKeyDown={(event) => moveTab(event, index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </button>
            ))}
          </div>

          <div className="interview-panels">
            {sections.map((section, sectionIndex) => (
              <section
                key={section.title}
                id={`interview-panel-${sectionIndex}`}
                role="tabpanel"
                aria-labelledby={`interview-tab-${sectionIndex}`}
                hidden={activeTab !== sectionIndex}
                className="interview-panel"
              >
                <h2>{section.title}</h2>
                {section.intro ? <p className="interview-panel-intro">{section.intro}</p> : null}

                {sectionIndex === 0 ? (
                  <>
                    <ul className="interview-pack-list">
                      {section.points.map((point, pointIndex) => {
                        const checked = packed.has(pointIndex)
                        return (
                          <li key={point} data-checked={checked}>
                            <label>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePacked(pointIndex)}
                              />
                              <span className="interview-checkbox" aria-hidden="true">
                                {checked ? <Check /> : null}
                              </span>
                              <span>{point}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="interview-pack-hint">{copy.packHint}</p>
                    {allPacked ? (
                      <p className="interview-packed-note" role="status">
                        <CheckCircle2 aria-hidden="true" />
                        {copy.allPacked}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <ul className="interview-point-list">
                    {section.points.map((point) => (
                      <li key={point}>
                        <Check aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section className="interview-practice">
            <div className="interview-practice-heading">
              <MessageCircleQuestion aria-hidden="true" />
              <div>
                <h2>Questions you might hear</h2>
                <p>{copy.practiceIntro}</p>
              </div>
            </div>

            <div className="interview-question-grid">
              {questions.map((question, index) => {
                const isFlipped = flipped.has(index)
                return (
                  <button
                    key={question.q}
                    type="button"
                    className="interview-flip-card"
                    aria-pressed={isFlipped}
                    aria-label={`${question.q}. ${isFlipped ? copy.showQuestion : copy.howToApproach}`}
                    onClick={() => toggleFlipped(index)}
                  >
                    <span className="interview-flip-inner">
                      <span className="interview-flip-face interview-flip-front" aria-hidden={isFlipped}>
                        <span className="portal-t-label">
                          {interpolate(copy.questionCount, { current: index + 1, total: questions.length })}
                        </span>
                        <strong>{question.q}</strong>
                        <span className="interview-flip-control">
                          <RefreshCw aria-hidden="true" />
                          {copy.howToApproach}
                        </span>
                      </span>
                      <span className="interview-flip-face interview-flip-back" aria-hidden={!isFlipped}>
                        <span className="portal-t-label">{copy.howToApproach}</span>
                        <strong>{question.q}</strong>
                        <span className="interview-approach">{question.approach}</span>
                        <span className="interview-flip-control">
                          <RefreshCw aria-hidden="true" />
                          {copy.showQuestion}
                        </span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </section>

        <aside className="interview-attorney-card">
          <Scale aria-hidden="true" />
          <h2>{copy.recordTitle}</h2>
          <p>{copy.recordBody}</p>
          <Link href="/portal/messages">{copy.messageTeam}</Link>
        </aside>

        <aside className="interview-file-card">
          <FileText aria-hidden="true" />
          <div>
            <h2>{copy.fileTitle}</h2>
            <p>{copy.fileBody}</p>
          </div>
          <Link href="/portal/intake">
            {copy.reviewIntake}
            <ChevronRight aria-hidden="true" />
          </Link>
        </aside>

        <p className="interview-disclaimer">{disclaimer}</p>
      </div>
    </div>
  )
}
