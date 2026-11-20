"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ExternalLink,
  Info,
  ShieldCheck,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { LeadForm } from "@/components/marketing/lead-form"
import { FACTS } from "@/content/facts"
import { trackEvent } from "@/lib/analytics"
import { ELIGIBILITY_ART, type EligibilityArt } from "./eligibility/art"
import {
  EligibilityStage,
  useEligibilityParticles,
} from "./eligibility/stage"
import styles from "./eligibility/eligibility.module.css"

type Explain = { headline: string; body: string; factKey: keyof typeof FACTS }
type Answer = {
  value: string
  label: string
  desc: string
  flag?: "ineligible" | "review"
  track?: string
  explain?: Explain
}
type Question = {
  key: string
  rail: string
  prompt: string
  help: string
  hue: string
  whyTitle: string
  why: string
  art: EligibilityArt
  options: Answer[]
}
type QuizStatus = "likely" | "review" | "ineligible"

const QUESTIONS: Question[] = [
  {
    key: "age",
    rail: "Age",
    prompt: "Are you 21 years of age or older?",
    help: "Choose the closest answer. You can clarify anything during intake.",
    hue: "#CFDAF2",
    whyTitle: "Why we ask",
    why: "New York requires every handgun-license applicant to be at least 21.",
    art: "age",
    options: [
      { value: "yes", label: "Yes, I'm 21 or older", desc: "You meet the age requirement." },
      {
        value: "no",
        label: "No, I'm under 21",
        desc: "There isn’t a version of the application for under-21s.",
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
    rail: "Location",
    prompt: "Where are you based?",
    help: "This tells us which license track fits you.",
    hue: "#D6DCF3",
    whyTitle: "Why we ask",
    why: "Residents, NYC business owners and Special Carry applicants follow different tracks.",
    art: "location",
    options: [
      {
        value: "resident",
        label: "I live in one of the five boroughs",
        desc: "Manhattan, Brooklyn, Queens, the Bronx or Staten Island.",
        track: "resident",
      },
      {
        value: "business",
        label: "I own or run a business in NYC",
        desc: "Your business is based in the city, even if you live elsewhere.",
        track: "business",
      },
      {
        value: "non_resident",
        label: "I live outside NYC (Special Carry)",
        desc: "You live elsewhere in New York and hold a county license.",
        track: "non_resident",
      },
    ],
  },
  {
    key: "training",
    rail: "Training",
    prompt: "Have you completed the 16 + 2 hour CCIA training?",
    help: "16 hours in the classroom plus 2 hours of live-fire.",
    hue: "#DDD8F1",
    whyTitle: "Good to know",
    why: "Your training certificate must be dated within 6 months of when you file.",
    art: "training",
    options: [
      { value: "done", label: "Yes, I’ve completed it", desc: "Keep your certificate handy for the file." },
      { value: "planning", label: "I’m planning to", desc: "You already know where you’ll take it." },
      {
        value: "not_yet",
        label: "Not yet, I’ll need a class",
        desc: "We run a monthly class you can book here.",
      },
    ],
  },
  {
    key: "convictions",
    rail: "Record",
    prompt: "Do you have any felony or disqualifying convictions?",
    help: "Choose the closest answer. You can clarify anything during intake.",
    hue: "#E4D9EE",
    whyTitle: "Why we ask",
    why: "Some convictions can affect an application. Whether yours does is a legal question.",
    art: "record",
    options: [
      {
        value: "none",
        label: "No, nothing that disqualifies me",
        desc: "No felony or “serious offense” convictions.",
      },
      {
        value: "yes",
        label: "Yes, I have a conviction",
        desc: "We’ll connect you with a confidential attorney review.",
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
    rail: "History",
    prompt: "Any disqualifying mental-health or restraining-order history?",
    help: "Choose the closest answer. You can clarify anything during intake.",
    hue: "#EBDCE6",
    whyTitle: "Why we ask",
    why: "Certain history can affect eligibility. A licensed attorney can tell you if yours does.",
    art: "history",
    options: [
      { value: "none", label: "No, none that applies", desc: "No history of this kind." },
      {
        value: "yes",
        label: "Yes, I have history to discuss",
        desc: "We’ll connect you with a confidential attorney review.",
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
    rail: "Storage",
    prompt: "Do you have a gun safe for secure storage?",
    help: "Photos of your safe, door open and closed, are part of the application.",
    hue: "#F1E2CB",
    whyTitle: "Good to know",
    why: "New York sets safe-storage rules you must follow once licensed.",
    art: "storage",
    options: [
      { value: "yes", label: "Yes, I have a safe", desc: "You’re ready for the storage photos." },
      { value: "will", label: "Not yet, I’ll get one", desc: "You’ll need it before you file." },
    ],
  },
]

const STORAGE_KEY = "carry_eligibility_quiz"

function normalizeAnswers(saved: Record<string, { value?: string }>): Record<string, Answer> {
  const normalized: Record<string, Answer> = {}
  for (const question of QUESTIONS) {
    const value = saved[question.key]?.value
    const answer = question.options.find((option) => option.value === value)
    if (answer) normalized[question.key] = answer
  }
  return normalized
}

function getStatus(answers: Record<string, Answer>): QuizStatus {
  return Object.values(answers).find((answer) => answer.flag)?.flag ?? "likely"
}

export function EligibilityExperience() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [done, setDone] = useState(false)
  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const [exiting, setExiting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const busyRef = useRef(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as {
        step?: number
        answers?: Record<string, { value?: string }>
        done?: boolean
      }
      const restoredStep =
        typeof saved.step === "number" ? Math.min(Math.max(saved.step, 0), QUESTIONS.length - 1) : 0
      const restoredAnswers = saved.answers ? normalizeAnswers(saved.answers) : {}
      /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
      setStep(restoredStep)
      setAnswers(restoredAnswers)
      setDone(Boolean(saved.done))
      setSelectedValue(restoredAnswers[QUESTIONS[restoredStep].key]?.value ?? null)
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Persistence is best-effort; malformed or blocked storage starts fresh.
    }
  }, [])

  useEffect(
    () => () => {
      for (const timer of timersRef.current) window.clearTimeout(timer)
    },
    []
  )

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
  }

  function persist(next: { step: number; answers: Record<string, Answer>; done: boolean }) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage may be unavailable in a private browsing session.
    }
  }

  const question = QUESTIONS[step]
  const status = done ? getStatus(answers) : null
  const hue = status
    ? status === "likely"
      ? "#D9E8DF"
      : status === "review"
        ? "#F3E3C2"
        : "#E1E5EC"
    : question.hue

  function finishTransition(callback: () => void, selectionDelay = 0) {
    const leave = () => {
      if (reducedMotion) {
        callback()
        setExiting(false)
        busyRef.current = false
        return
      }
      setExiting(true)
      schedule(() => {
        callback()
        setExiting(false)
        busyRef.current = false
      }, 220)
    }
    if (selectionDelay > 0 && !reducedMotion) schedule(leave, selectionDelay)
    else leave()
  }

  function commitChoice(option: Answer) {
    if (Object.keys(answers).length === 0) trackEvent("eligibility_start")
    const nextAnswers = { ...answers, [question.key]: option }

    if (option.flag) {
      setAnswers(nextAnswers)
      setDone(true)
      trackEvent("eligibility_complete")
      persist({ step, answers: nextAnswers, done: true })
      return
    }

    const last = step >= QUESTIONS.length - 1
    const nextStep = last ? step : step + 1
    setAnswers(nextAnswers)
    setDone(last)
    if (last) trackEvent("eligibility_complete")
    else {
      setStep(nextStep)
      setSelectedValue(nextAnswers[QUESTIONS[nextStep].key]?.value ?? null)
    }
    persist({ step: nextStep, answers: nextAnswers, done: last })
  }

  function selectOption(index: number, element?: Element | null, burst?: (el: Element | null, n?: number) => void) {
    if (busyRef.current) return
    const option = question.options[index]
    if (!option) return
    busyRef.current = true
    setSelectedValue(option.value)
    burst?.(element ?? null, 22)
    finishTransition(() => commitChoice(option), 420)
  }

  function goToStep(nextStep: number) {
    if (busyRef.current || (nextStep === step && !done)) return
    busyRef.current = true
    finishTransition(() => {
      setStep(nextStep)
      setDone(false)
      setSelectedValue(answers[QUESTIONS[nextStep].key]?.value ?? null)
      persist({ step: nextStep, answers, done: false })
    })
  }

  function goBack() {
    if (step > 0) goToStep(step - 1)
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore blocked storage.
    }
    setAnswers({})
    setStep(0)
    setDone(false)
    setSelectedValue(null)
    busyRef.current = false
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        done ||
        (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const letterIndex = "abc".indexOf(key)
      const numberIndex = "123".indexOf(key)
      const index = letterIndex >= 0 ? letterIndex : numberIndex
      if (index >= 0 && index < question.options.length) {
        event.preventDefault()
        const option = document.querySelectorAll<HTMLButtonElement>("[data-eligibility-option]")[index]
        option?.click()
      } else if (event.key === "Backspace" && step > 0) {
        event.preventDefault()
        goBack()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <EligibilityStage hue={hue}>
      <div className={styles.wrap}>
        <Intro result={done} />
        <ProgressPath step={step} answers={answers} done={done} onChange={goToStep} />
        <section className={styles.card} aria-live="polite">
          {done ? (
            <Result
              key={`result-${status}`}
              answers={answers}
              exiting={exiting}
              onChange={goToStep}
              onReset={reset}
            />
          ) : (
            <QuestionView
              key={question.key}
              question={question}
              step={step}
              selectedValue={selectedValue}
              exiting={exiting}
              onBack={goBack}
              onSelect={selectOption}
            />
          )}
        </section>
        <TrustRow />
      </div>
    </EligibilityStage>
  )
}

/** Kept as an alias for existing imports while the route adopts the new name. */
export const EligibilityQuiz = EligibilityExperience

function Intro({ result }: { result: boolean }) {
  return (
    <header className={styles.intro}>
      <span className={styles.eyebrow}>Eligibility check</span>
      <h1>{result ? "Here’s where you stand." : "Do you qualify?"}</h1>
      <p>
        {result
          ? "Your result, based on the answers you gave."
          : "Six quick questions. A clear read on where you stand."}
      </p>
      <div className={styles.chips} aria-label="Quiz details">
        {[
          "About 2 minutes",
          "No card, no account",
          "Your answers stay on this device",
        ].map((label) => (
          <span key={label}>
            <Check aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </header>
  )
}

function ProgressPath({
  step,
  answers,
  done,
  onChange,
}: {
  step: number
  answers: Record<string, Answer>
  done: boolean
  onChange: (step: number) => void
}) {
  const lastAnswered = QUESTIONS.reduce(
    (last, question, index) => (answers[question.key] ? index : last),
    0
  )

  return (
    <ol className={styles.path} aria-label="Eligibility progress">
      <span className={styles.pathTrack} aria-hidden="true">
        <i style={{ width: `${(lastAnswered / (QUESTIONS.length - 1)) * 100}%` }} />
      </span>
      {QUESTIONS.map((question, index) => {
        const answered = Boolean(answers[question.key]) && (done || index !== step)
        const current = !done && index === step
        return (
          <li
            key={question.key}
            className={`${styles.pathItem} ${answered ? styles.pathDone : ""} ${current ? styles.pathCurrent : ""}`}
          >
            {answered ? (
              <button
                type="button"
                className={styles.pathCircle}
                onClick={() => onChange(index)}
                aria-label={`Change your ${question.rail.toLowerCase()} answer`}
              >
                <Check aria-hidden="true" />
              </button>
            ) : (
              <span className={styles.pathCircle} aria-current={current ? "step" : undefined}>
                {String(index + 1).padStart(2, "0")}
              </span>
            )}
            <span className={styles.pathLabel}>{question.rail}</span>
          </li>
        )
      })}
    </ol>
  )
}

function QuestionView({
  question,
  step,
  selectedValue,
  exiting,
  onBack,
  onSelect,
}: {
  question: Question
  step: number
  selectedValue: string | null
  exiting: boolean
  onBack: () => void
  onSelect: (
    index: number,
    element?: Element | null,
    burst?: (element: Element | null, count?: number) => void
  ) => void
}) {
  const { burst } = useEligibilityParticles()
  const percent = Math.round((step / QUESTIONS.length) * 100)

  return (
    <div className={`${styles.view} ${exiting ? styles.exiting : ""}`}>
      <div className={styles.questionGrid}>
        <div className={styles.questionMain}>
          <div className={styles.meta}>
            <span>
              Question <b>{step + 1}</b> of {QUESTIONS.length}
            </span>
            <span className={styles.percent}>
              {percent}%
              <i>
                <span style={{ width: `${percent}%` }} />
              </i>
            </span>
          </div>
          <h2 id="eligibility-question" className={styles.questionTitle}>
            {question.prompt}
          </h2>
          <p className={styles.help}>{question.help}</p>
          <div className={styles.options} role="group" aria-labelledby="eligibility-question">
            {question.options.map((option, index) => {
              const selected = selectedValue === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
                  data-eligibility-option
                  aria-pressed={selected}
                  onClick={(event) => onSelect(index, event.currentTarget, burst)}
                >
                  <span className={styles.optionKey} aria-hidden="true">
                    {"ABC"[index]}
                  </span>
                  <span className={styles.optionCopy}>
                    <strong>{option.label}</strong>
                    <small>{option.desc}</small>
                  </span>
                  <span className={styles.optionTick} aria-hidden="true">
                    <Check />
                  </span>
                </button>
              )
            })}
          </div>
          <div className={styles.questionFooter}>
            {step > 0 ? (
              <button type="button" className={styles.back} onClick={onBack}>
                <ArrowLeft aria-hidden="true" /> Back
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className={styles.hint}>
              Tip: press{" "}
              {question.options.map((option, index) => (
                <kbd key={option.value}>{"ABC"[index]}</kbd>
              ))}{" "}
              to answer
            </span>
          </div>
        </div>
        <aside className={styles.artPanel}>
          <div className={styles.artLabel}>
            <span>{question.rail}</span>
            <span>
              {String(step + 1).padStart(2, "0")} / {String(QUESTIONS.length).padStart(2, "0")}
            </span>
          </div>
          <div
            className={styles.illustration}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: ELIGIBILITY_ART[question.art] }}
          />
          <p className={styles.whyMobile}>
            <b>{question.whyTitle}</b>
            {question.why}
          </p>
          <p className={styles.why}>
            <b>{question.whyTitle}</b>
            {question.why}
          </p>
        </aside>
      </div>
    </div>
  )
}

function Result({
  answers,
  exiting,
  onChange,
  onReset,
}: {
  answers: Record<string, Answer>
  exiting: boolean
  onChange: (step: number) => void
  onReset: () => void
}) {
  const { burst } = useEligibilityParticles()
  const sealRef = useRef<HTMLDivElement>(null)
  const status = getStatus(answers)
  const flagged = Object.values(answers).find((answer) => answer.flag)
  const explain = flagged?.explain
  const fact = explain ? FACTS[explain.factKey] : null
  const track = answers.location?.track ?? "resident"
  const eligibilityJson = JSON.stringify(
    Object.fromEntries(Object.entries(answers).map(([key, answer]) => [key, answer.value]))
  )

  useEffect(() => {
    if (status === "likely") burst(sealRef.current, 70)
  }, [burst, status])

  const handleLeadSuccess = useCallback(() => {
    burst(sealRef.current, 60)
  }, [burst])

  const headline = explain?.headline ?? "You likely qualify"
  const body =
    explain?.body ??
    "Based on your answers, you're in good shape to apply. Tell us where to reach you and we'll map out your timeline."

  return (
    <div className={`${styles.view} ${exiting ? styles.exiting : ""}`}>
      <div className={styles.resultGrid}>
        <div className={styles.resultMain}>
          <div ref={sealRef} className={styles.seal}>
            <ResultSeal status={status} />
          </div>
          <div>
            <span
              className={`${styles.status} ${
                status === "likely"
                  ? styles.statusLikely
                  : status === "review"
                    ? styles.statusReview
                    : styles.statusIneligible
              }`}
            >
              <i />
              {status === "likely"
                ? "Within service scope"
                : status === "review"
                  ? "Speak with an attorney first"
                  : "Not eligible yet"}
            </span>
          </div>
          <h2 className={styles.resultTitle}>{headline}</h2>
          <p className={styles.resultLede}>{body}</p>

          {fact ? (
            <div className={styles.fact}>
              <p>{fact.claim}</p>
              <small>
                Set by {fact.authority} ·{" "}
                <a href={fact.href} target="_blank" rel="noopener noreferrer">
                  Read the source <ExternalLink aria-hidden="true" />
                </a>{" "}
                · We last checked {fact.verifiedOn}
              </small>
            </div>
          ) : null}

          {status === "review" ? (
            <p className={styles.lawyerNote}>
              Want to understand how this is treated in general? Read{" "}
              <Link href="/do-i-need-a-lawyer">Do I need a lawyer?</Link> When you’re ready,
              request a confidential review.
            </p>
          ) : null}

          {status === "likely" ? <NextSteps /> : null}
          <AnswersTable answers={answers} onChange={onChange} />
        </div>

        <aside className={styles.resultSide}>
          {status === "ineligible" ? (
            <>
              <h3>We’ll be here when you’re 21.</h3>
              <p>
                Nothing to fill in today. Bookmark the free checklist so you know what to gather
                when the time comes.
              </p>
              <Link className={styles.primaryAction} href="/">
                Back to home <ArrowRight aria-hidden="true" />
              </Link>
              <button type="button" className={styles.reset} onClick={onReset}>
                Start over
              </button>
            </>
          ) : (
            <>
              <h3>{status === "review" ? "Request a confidential review" : "Start your application"}</h3>
              <p>
                {status === "review"
                  ? "We'll connect you with a New York-licensed attorney. It's confidential."
                  : "Free to start. We reach out within one business day."}
              </p>
              <div className={styles.leadForm}>
                <LeadForm
                  source="eligibility_quiz"
                  showBorough={false}
                  submitLabel={
                    status === "review" ? "Request a confidential review" : "Start my application"
                  }
                  successTitle={status === "review" ? "Let's get started." : "You're all set."}
                  successBody="we can reach out within one business day."
                  accountCta
                  hidden={{ track, eligibility: eligibilityJson }}
                  variant="light"
                  onSuccess={handleLeadSuccess}
                />
                <p className={styles.finePrint}>No card needed. You can create your account next.</p>
              </div>
              <button type="button" className={styles.reset} onClick={onReset}>
                Start over
              </button>
            </>
          )}
        </aside>
      </div>
      <p className={styles.disclaimer}>
        This is a service-fit result, not legal advice or a prediction of any NYPD decision.
      </p>
    </div>
  )
}

function NextSteps() {
  const steps = [
    ["We map the requirements.", "Your checklist is generated around your license track and answers."],
    ["We organize the file.", "Documents, references, training and disclosures stay in one case system."],
    ["You stay in control.", "You review and submit your own application."],
  ]
  return (
    <ol className={styles.nextSteps}>
      {steps.map(([title, copy], index) => (
        <li key={title}>
          <b>{String(index + 1).padStart(2, "0")}</b>
          <div>
            <strong>{title}</strong>
            <span>{copy}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

function AnswersTable({
  answers,
  onChange,
}: {
  answers: Record<string, Answer>
  onChange: (step: number) => void
}) {
  const answered = QUESTIONS.filter((question) => answers[question.key])
  return (
    <div className={styles.answers}>
      <header>
        <span>Your answers</span>
        <span>
          {answered.length} of {QUESTIONS.length}
        </span>
      </header>
      <dl>
        {answered.map((question) => (
          <div key={question.key}>
            <dt>{question.rail}</dt>
            <dd>{answers[question.key].label}</dd>
            <dd>
              <button type="button" onClick={() => onChange(QUESTIONS.indexOf(question))}>
                Change
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ResultSeal({ status }: { status: QuizStatus }) {
  if (status === "review") {
    return (
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r="40" fill="#FBF0DC" />
        <circle className={styles.sealRing} cx="42" cy="42" r="40" />
        <circle cx="42" cy="42" r="31" fill="#14254A" />
        <path d="M42 27c-8 0-14 6-14 13v1h6v-1c0-4 3-7 8-7s8 3 8 6c0 5-9 6-9 13v2h6v-1c0-6 9-7 9-14 0-7-6-12-14-12zM39 59h6v6h-6z" fill="#D9B25A" />
      </svg>
    )
  }
  if (status === "ineligible") {
    return (
      <svg viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r="40" fill="#EEF1F6" />
        <circle cx="42" cy="42" r="40" fill="none" stroke="#CFD5DF" strokeWidth="2" />
        <circle cx="42" cy="42" r="31" fill="#14254A" />
        <circle cx="42" cy="42" r="13" fill="none" stroke="#D9B25A" strokeWidth="3" />
        <path d="M42 35v8l5 3" fill="none" stroke="#D9B25A" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 84 84" aria-hidden="true">
      <circle cx="42" cy="42" r="40" fill="#F5ECD8" />
      <circle className={styles.sealRing} cx="42" cy="42" r="40" />
      <circle cx="42" cy="42" r="31" fill="#14254A" />
      <path className={styles.sealCheck} d="M29 43l9 9 18-20" />
    </svg>
  )
}

function TrustRow() {
  return (
    <div className={styles.trust}>
      <span>
        <ShieldCheck aria-hidden="true" /> Not affiliated with the NYPD
      </span>
      <span>
        <BookOpenCheck aria-hidden="true" /> Based on published NY rules
      </span>
      <span>
        <Info aria-hidden="true" /> Not legal advice
      </span>
    </div>
  )
}
