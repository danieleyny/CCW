"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Crosshair, ShieldCheck, ShieldAlert, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LeadForm } from "@/components/marketing/lead-form"

type Answer = { value: string; label: string; flag?: "ineligible" | "review"; track?: string }
type Question = { key: string; prompt: string; options: Answer[] }

const QUESTIONS: Question[] = [
  {
    key: "age",
    prompt: "Are you 21 years of age or older?",
    options: [
      { value: "yes", label: "Yes, I'm 21+" },
      { value: "no", label: "No", flag: "ineligible" },
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
      { value: "yes", label: "I have a conviction", flag: "review" },
    ],
  },
  {
    key: "history",
    prompt: "Any disqualifying mental-health or restraining-order history?",
    options: [
      { value: "none", label: "None" },
      { value: "yes", label: "I have history to discuss", flag: "review" },
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
    const next = { ...answers, [q.key]: opt }
    const last = step >= QUESTIONS.length - 1
    const nextStep = last ? step : step + 1
    setAnswers(next)
    if (last) setDone(true)
    else setStep(nextStep)
    persist({ step: nextStep, answers: next, done: last })
  }

  function goBack() {
    const prev = step - 1
    setStep(prev)
    persist({ step: prev, answers, done: false })
  }

  if (done) {
    const ineligible = Object.values(answers).some((a) => a.flag === "ineligible")
    const review = Object.values(answers).some((a) => a.flag === "review")
    const track = answers.location?.track ?? "resident"
    const eligibilityJson = JSON.stringify(
      Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.value]))
    )

    return (
      <Result
        ineligible={ineligible}
        review={review}
        track={track}
        eligibilityJson={eligibilityJson}
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
  ineligible,
  review,
  track,
  eligibilityJson,
}: {
  ineligible: boolean
  review: boolean
  track: string
  eligibilityJson: string
}) {
  const status = ineligible ? "ineligible" : review ? "review" : "likely"

  const headline =
    status === "ineligible"
      ? "You must be 21 to apply"
      : status === "review"
        ? "Let's review your situation"
        : "You likely qualify"

  const body =
    status === "ineligible"
      ? "NYC requires applicants to be at least 21 years old. Reach out when you're eligible and we'll be ready."
      : status === "review"
        ? "Some answers need a closer look — that's exactly what our concierge is for. Share your details and we'll assess your path, confidentially."
        : "Based on your answers, you're a strong candidate for a NYC concealed carry license. Claim your spot and we'll map your timeline."

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

      {status !== "ineligible" && (
        <div className="mt-7 border-t border-hairline pt-7">
          <LeadForm
            source="eligibility_quiz"
            showBorough={false}
            submitLabel={status === "review" ? "Request a confidential review" : "Claim your spot"}
            successTitle={status === "review" ? "Let's get started." : "You're all set."}
            successBody="your Gun License NYC concierge can reach out within one business day."
            accountCta
            hidden={{ track, eligibility: eligibilityJson }}
          />
        </div>
      )}

      {status === "ineligible" && (
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Back to home</Link>
        </Button>
      )}
    </div>
  )
}
