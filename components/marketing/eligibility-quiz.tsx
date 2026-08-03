"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Crosshair, ShieldCheck, ShieldAlert, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"
import { FACTS } from "@/content/facts"
import { Button } from "@/components/ui/button"
import { LeadForm } from "@/components/marketing/lead-form"
import { FactList } from "@/components/marketing/page-blocks"

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

  // V4-B5 — restore in-progress answers after a refresh so nobody loses their
  // place mid-quiz. Read once on mount (after hydration → no SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { step?: number; answers?: Record<string, Answer>; done?: boolean }
      /* eslint-disable react-hooks/set-state-in-effect */
      if (saved.answers) setAnswers(saved.answers)
      if (typeof saved.step === "number") setStep(Math.min(saved.step, QUESTIONS.length - 1))
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
    } else setStep(nextStep)
    persist({ step: nextStep, answers: next, done: last })
  }

  function goBack() {
    const prev = step - 1
    setStep(prev)
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
    <div className="rounded-lg border border-hairline bg-card p-6 sm:p-8">
      {/* progress */}
      <div className="mb-6">
        <div className="engraved mb-2 flex items-center justify-between">
          <span>
            Question {String(step + 1).padStart(2, "0")} / {String(QUESTIONS.length).padStart(2, "0")}
          </span>
          <span className="text-signal">{Math.round((step / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-brass" : i === step ? "bg-signal" : "bg-hairline-strong"
              )}
            />
          ))}
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold sm:text-2xl">{q.prompt}</h2>

      <div className="mt-6 space-y-2.5">
        {q.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => choose(opt)}
            className="group flex w-full items-center justify-between rounded-md border border-hairline-strong bg-surface-2 px-4 py-3.5 text-left text-sm font-medium transition-colors hover:border-signal/50 hover:bg-surface-3"
          >
            {opt.label}
            <Crosshair className="size-4 text-text-low transition-colors group-hover:text-signal" />
          </button>
        ))}
      </div>

      {step > 0 && (
        <button
          type="button"
          onClick={goBack}
          className="mt-6 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-text-mid hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
      )}
    </div>
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

  return (
    <div className="rounded-lg border bg-card p-6 sm:p-8 brass-edge">
      <div className="flex items-center gap-3">
        {status === "likely" ? (
          <ShieldCheck className="size-7 text-brass" />
        ) : (
          <ShieldAlert className="size-7 text-warn" />
        )}
        <div className="engraved text-brass">Eligibility Result</div>
      </div>
      <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">{headline}</h2>
      <p className="mt-2 text-text-mid">{body}</p>

      {/* The published RULE behind this result — agency, primary source, date.
          We explain the rule; we never adjudicate a specific record. */}
      {explain && (
        <div className="mt-5">
          <FactList facts={[FACTS[explain.factKey]]} />
        </div>
      )}

      {/* Hard statutory bar (age): an honest dead-end, no lead form. */}
      {isIneligible && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
          <button
            type="button"
            onClick={onReset}
            className="font-mono text-xs uppercase tracking-wider text-text-mid hover:text-foreground"
          >
            Start over
          </button>
        </div>
      )}

      {/* Needs-a-lawyer OR clean pass: both route to us. Review goes to the
          attorney seam (never a denial); a clean pass starts the application. */}
      {!isIneligible && (
        <div className="mt-6">
          {isReview && (
            <p className="text-sm text-text-mid">
              Want to understand how this is treated in general? See{" "}
              <Link href="/do-i-need-a-lawyer" className="text-signal hover:underline">
                do I need a lawyer
              </Link>
              . When you&apos;re ready, request a confidential review below.
            </p>
          )}
          <div className="mt-6 border-t border-hairline pt-7">
            <LeadForm
              source="eligibility_quiz"
              showBorough={false}
              submitLabel={isReview ? "Request a confidential review" : "Start my application"}
              successTitle={isReview ? "Let's get started." : "You're all set."}
              successBody="we can reach out within one business day."
              accountCta
              hidden={{ track, eligibility: eligibilityJson }}
            />
          </div>
          {isReview && (
            <button
              type="button"
              onClick={onReset}
              className="mt-4 font-mono text-xs uppercase tracking-wider text-text-mid hover:text-foreground"
            >
              Start over
            </button>
          )}
        </div>
      )}
    </div>
  )
}
