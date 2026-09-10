"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { trackEvent } from "@/lib/analytics"
import { FACTS } from "@/content/facts"
import { LeadForm } from "@/components/marketing/lead-form"

/**
 * A per-answer explanation shown the instant a disqualifying / needs-a-lawyer
 * answer is chosen. `factKey` renders the underlying RULE from content/facts.ts
 * (agency + primary source + date) — we explain the published rule, never a
 * verdict on someone's specific record.
 */
type Explain = { headline: string; body: string; factKey: keyof typeof FACTS }
type Answer = {
  value: string
  label: string
  flag?: "ineligible" | "review"
  track?: string
  explain?: Explain
}
type Question = { key: string; prompt: string; options: Answer[] }

const QUESTIONS: Question[] = [
  {
    key: "age",
    prompt: "Are you 21 years of age or older?",
    options: [
      { value: "yes", label: "Yes, I'm 21+" },
      {
        value: "no",
        label: "No",
        flag: "ineligible",
        explain: {
          headline: "You must be 21 to apply",
          body: "New York requires handgun-license applicants to be at least 21 years old, and there isn't a version of the application for someone younger. This one's simply a matter of time — reach back out when you're eligible and we'll be ready to help.",
          factKey: "age",
        },
      },
    ],
  },
  {
    key: "location",
    prompt: "Where are you based?",
    options: [
      { value: "resident", label: "I live in a NYC borough", track: "resident" },
      { value: "business", label: "I own/run a business in NYC", track: "business" },
      { value: "non_resident", label: "Outside NYC (Special Carry)", track: "non_resident" },
    ],
  },
  {
    key: "training",
    prompt: "Have you completed the 16+2 hour CCIA training?",
    options: [
      { value: "done", label: "Completed" },
      { value: "planning", label: "Planning to" },
      { value: "not_yet", label: "Not yet — I'll need it" },
    ],
  },
  {
    key: "convictions",
    prompt: "Do you have any felony or disqualifying convictions?",
    options: [
      { value: "none", label: "No disqualifiers" },
      {
        value: "yes",
        label: "I have a conviction",
        flag: "review",
        explain: {
          headline: "This is a question for a lawyer",
          body: "A felony or “serious offense” conviction can affect a handgun-license application — but whether a specific record actually disqualifies you is a legal judgment, and only a New York-licensed attorney can make it for your situation. This isn't a denial, and we won't guess. We can't give legal advice; we can connect you with someone who can, confidentially.",
          factKey: "disqualifyingConvictions",
        },
      },
    ],
  },
  {
    key: "history",
    prompt: "Any disqualifying mental-health or restraining-order history?",
    options: [
      { value: "none", label: "None" },
      {
        value: "yes",
        label: "I have history to discuss",
        flag: "review",
        explain: {
          headline: "Let's talk this through first",
          body: "Certain mental-health or restraining-order history can affect eligibility. Whether yours does is a legal question we aren't allowed to answer — a licensed attorney can. This isn't a decision; it's a reason to review your options confidentially before you spend a dollar.",
          factKey: "mentalHealthCriteria",
        },
      },
    ],
  },
  {
    key: "storage",
    prompt: "Do you have a gun safe for secure storage?",
    options: [
      { value: "yes", label: "Yes, I have a safe" },
      { value: "will", label: "I'll get one" },
    ],
  },
]

const STORAGE_KEY = "carry_eligibility_quiz"

export function EligibilityQuiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [done, setDone] = useState(false)
  // The choice highlighted on the current screen, committed on "Continue".
  const [selected, setSelected] = useState<Answer | null>(null)

  // V4-B5 — restore in-progress answers after a refresh so nobody loses their
  // place mid-quiz. Read once on mount (after hydration → no SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { step?: number; answers?: Record<string, Answer>; done?: boolean }
      /* eslint-disable react-hooks/set-state-in-effect */
      const restoredStep =
        typeof saved.step === "number" ? Math.min(saved.step, QUESTIONS.length - 1) : 0
      if (saved.answers) {
        setAnswers(saved.answers)
        setSelected(saved.answers[QUESTIONS[restoredStep].key] ?? null)
      }
      if (typeof saved.step === "number") setStep(restoredStep)
      if (saved.done) setDone(true)
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // ignore malformed/blocked storage
    }
  }, [])

  function persist(next: { step: number; answers: Record<string, Answer>; done: boolean }) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage may be unavailable (private mode) — persistence is best-effort
    }
  }

  const q = QUESTIONS[step]

  // Commit the highlighted choice: same scoring, early-exit, and analytics as
  // before — only the trigger moved from the option click to "Continue".
  function choose(opt: Answer) {
    // Conversion funnel: the very first answer starts the quiz.
    if (Object.keys(answers).length === 0) trackEvent("eligibility_start")
    const next = { ...answers, [q.key]: opt }

    // EARLY EXIT: the moment a disqualifying / needs-a-lawyer answer is chosen,
    // end the quiz and explain why — there's no point making someone finish a
    // form whose outcome their answer already settled. (With short-circuit, at
    // most ONE answer can ever carry a flag, so the Result can just find it.)
    if (opt.flag) {
      setAnswers(next)
      setDone(true)
      trackEvent("eligibility_complete")
      persist({ step, answers: next, done: true })
      return
    }

    const last = step >= QUESTIONS.length - 1
    const nextStep = last ? step : step + 1
    setAnswers(next)
    if (last) {
      setDone(true)
      trackEvent("eligibility_complete")
    } else {
      setStep(nextStep)
      setSelected(next[QUESTIONS[nextStep].key] ?? null)
    }
    persist({ step: nextStep, answers: next, done: last })
  }

  function goBack() {
    const prev = step - 1
    setStep(prev)
    setSelected(answers[QUESTIONS[prev].key] ?? null)
    persist({ step: prev, answers, done: false })
  }

  // Let a mis-tap be recoverable — clears saved progress and restarts the quiz.
  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore blocked storage
    }
    setAnswers({})
    setStep(0)
    setDone(false)
    setSelected(null)
  }

  if (done) {
    // With early-exit, at most one answer carries a flag — that's the trigger.
    const flagged = Object.values(answers).find((a) => a.flag)
    const track = answers.location?.track ?? "resident"
    const eligibilityJson = JSON.stringify(
      Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.value]))
    )

    return (
      <Result
        flagged={flagged}
        track={track}
        eligibilityJson={eligibilityJson}
        onReset={reset}
      />
    )
  }

  return (
    <article className="flow-screen" aria-label={`Eligibility question ${step + 1}`}>
      <div className="flow-top">
        <span>Question {String(step + 1).padStart(2, "0")}</span>
        <span>
          {step + 1} of {QUESTIONS.length}
        </span>
      </div>

      <div className="flow-progress" aria-hidden="true">
        {QUESTIONS.map((_, i) => (
          <i key={i} className={i <= step ? "is-done" : undefined} />
        ))}
      </div>

      <h4>{q.prompt}</h4>
      <p>Choose the closest answer. You can clarify it during intake.</p>

      <div className="choice-list" role="radiogroup" aria-label={q.prompt}>
        {q.options.map((opt) => {
          const isSel = selected?.value === opt.value
          return (
            <div
              key={opt.value}
              role="radio"
              aria-checked={isSel}
              tabIndex={0}
              className={`choice${isSel ? " is-selected" : ""}`}
              onClick={() => setSelected(opt)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelected(opt)
                }
              }}
            >
              <span className="choice-dot" aria-hidden="true" />
              <span>{opt.label}</span>
            </div>
          )
        })}
      </div>

      <div className="flow-actions">
        {step > 0 ? (
          <button
            type="button"
            className="flow-back"
            onClick={goBack}
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          >
            ← Back
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          className="button"
          onClick={() => selected && choose(selected)}
          disabled={!selected}
          style={!selected ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
        >
          Continue <span className="button-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  )
}

function Result({
  flagged,
  track,
  eligibilityJson,
  onReset,
}: {
  flagged: Answer | undefined
  track: string
  eligibilityJson: string
  onReset: () => void
}) {
  const status = flagged?.flag ?? "likely" // "ineligible" | "review" | "likely"
  const isIneligible = status === "ineligible"
  const isReview = status === "review"
  const explain = flagged?.explain

  const headline = explain?.headline ?? "You likely qualify"
  const body =
    explain?.body ??
    "Based on your answers, you're in good shape to apply. Tell us where to reach you and we'll map out your timeline."

  const badge = isIneligible
    ? "Not eligible yet"
    : isReview
      ? "Speak with an attorney"
      : "Within service scope"

  const fact = explain ? FACTS[explain.factKey] : null

  return (
    <article className="flow-screen result-screen" aria-label="Eligibility service-fit result">
      <div className="flow-top">
        <span>Your result</span>
        <span>Complete</span>
      </div>

      <span className="result-badge">{badge}</span>
      <h4>{headline}</h4>
      <p>{body}</p>

      {/* Clean pass: describe the service fit (mirrors the homepage's principles). */}
      {status === "likely" && (
        <ul className="result-list">
          <li>
            <strong>We map the requirements.</strong>Your checklist is generated around your license
            track and answers.
          </li>
          <li>
            <strong>We organize the file.</strong>Documents, references, training, and disclosures
            stay in one case system.
          </li>
          <li>
            <strong>You stay in control.</strong>You review and submit your own application.
          </li>
        </ul>
      )}

      {/* The published RULE behind this result — agency, primary source, date.
          We explain the rule; we never adjudicate a specific record. */}
      {fact && explain && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 26,
            paddingTop: 14,
            borderTop: "1px solid var(--dark-rule)",
          }}
        >
          <p style={{ margin: 0, color: "var(--light)", fontSize: 14, lineHeight: 1.5 }}>
            {fact.claim}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--light-soft)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: ".04em",
            }}
          >
            Set by {fact.authority} ·{" "}
            <a
              href={fact.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--cyan)" }}
            >
              source ↗
            </a>{" "}
            · we last checked {fact.verifiedOn}
          </p>
        </div>
      )}

      {/* Hard statutory bar (age): an honest dead-end, no lead form. */}
      {isIneligible && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 30,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 20,
          }}
        >
          <Link className="button button-light" href="/">
            Back to home
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="flow-back"
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--light-soft)",
            }}
          >
            Start over
          </button>
        </div>
      )}

      {/* Needs-a-lawyer OR clean pass: both route to us. Review goes to the
          attorney seam (never a denial); a clean pass starts the application. */}
      {!isIneligible && (
        <div style={{ position: "relative", zIndex: 1, marginTop: 28 }}>
          {isReview && (
            <p style={{ margin: "0 0 24px", color: "var(--light-soft)", fontSize: 14, lineHeight: 1.55 }}>
              Want to understand how this is treated in general? See{" "}
              <Link href="/do-i-need-a-lawyer" style={{ color: "var(--cyan)" }}>
                do I need a lawyer
              </Link>
              . When you&apos;re ready, request a confidential review below.
            </p>
          )}
          <LeadForm
            source="eligibility_quiz"
            showBorough={false}
            submitLabel={isReview ? "Request a confidential review" : "Start my application"}
            successTitle={isReview ? "Let's get started." : "You're all set."}
            successBody="we can reach out within one business day."
            accountCta
            hidden={{ track, eligibility: eligibilityJson }}
          />
          {isReview && (
            <button
              type="button"
              onClick={onReset}
              className="flow-back"
              style={{
                marginTop: 18,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "var(--light-soft)",
              }}
            >
              Start over
            </button>
          )}
        </div>
      )}

      <p className="result-disclaimer">
        This is a service-fit result, not legal advice or a prediction of any NYPD decision.
      </p>
    </article>
  )
}
