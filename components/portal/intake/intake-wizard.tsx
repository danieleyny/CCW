"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, ShieldAlert, CheckCircle2, ArrowLeft, Sparkles, Pencil, Check as CheckIcon, ChevronDown, LogOut, Info, LockKeyhole, Scale, Clock3 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  INTAKE_STEPS,
  SOCIAL_PLATFORMS,
  eligibilityGate,
  ageFromDob,
  formatLegalAddress,
  type WizardAnswers,
  type ArrestEntry,
  type QuestionAnswer,
  type SocialAccount,
} from "@/lib/intake/answers"
import type { SubmissionGuard } from "@/lib/intake/process"
import { checkHistory, applyPresentRadio } from "@/lib/intake/history-check"
import { DisclosureAssistant } from "@/components/portal/intake/disclosure-assistant"
import { HeightField } from "@/components/portal/intake/height-field"
import { DateOfBirthField } from "@/components/portal/intake/dob-field"
import { CountyInput } from "@/components/portal/county-input"
import { SectionHeader } from "@/components/portal/section-header"
import {
  eligibilityStepIssues,
  disclosureStepIssues,
  historyStepIssues,
  requiredReferences,
  applicablePortalDisclosures,
} from "@/lib/intake/schema"
import {
  PORTAL_DISCLOSURE_RANGE,
} from "@/lib/disclosures/portal-questions"
import {
  saveIntakeStep,
  completeIntake,
  updateDisclosureNarrative,
} from "@/app/portal/intake/actions"
import {
  detectSelfDesignation,
  selfDesignationMessage,
  SAFEGUARD_NOT_YOU_NOTE,
  type SelfDesignationField,
} from "@/lib/safeguard/self-designation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  APPLICATION_TYPE_LABELS,
  applicationTypeFromLegacy,
  isPremisesApplication,
  type ApplicationType,
} from "@/lib/application-types"
import type { Messages } from "@/lib/i18n/messages"
import { interpolate } from "@/lib/i18n/interpolate"

const INTAKE_TIME_ESTIMATE_MIN: number | null = null
type IntakeCopy = Messages["portal"]["intake"]
type PortalDisclosureQuestion = ReturnType<typeof applicablePortalDisclosures>[number]

interface Disclosure {
  id: string
  type: string
  narrative: string
  question_no: number | null
}

/** The applicant's own identity, used only to flag naming yourself as the safeguard person. */
export type ApplicantIdentity = { firstName: string; lastName: string; email: string; phone: string }

/** Which safeguard fields collide with the applicant. Intake collects the safeguard NAME
 *  as one field and no email, so only name + phone apply here. */
function safeguardSelfConflicts(a: WizardAnswers, applicant: ApplicantIdentity): SelfDesignationField[] {
  const toks = (a.safeguardName ?? "").trim().split(/\s+/).filter(Boolean)
  return detectSelfDesignation({
    applicant,
    safeguard: {
      firstName: toks[0],
      lastName: toks.length > 1 ? toks[toks.length - 1] : undefined,
      phone: a.safeguardPhone,
    },
  })
}

export function IntakeWizard({
  caseId,
  isRenewal = false,
  initialAnswers,
  initialStep,
  completed,
  disclosures,
  guard,
  aiEnabled = false,
  applicant,
  licenseTrack = null,
  applicationType = null,
  copy,
}: {
  caseId: string
  isRenewal?: boolean
  initialAnswers: WizardAnswers
  initialStep: number
  completed: boolean
  disclosures: Disclosure[]
  guard: SubmissionGuard | null
  aiEnabled?: boolean
  applicant: ApplicantIdentity
  /** The case's derived license_track — so a sponsored Carry Guard case is never
   *  labelled "Concealed carry" and its track can't be re-picked here (P1.2). */
  licenseTrack?: string | null
  /** Canonical NYPD application category selected before this interview. */
  applicationType?: ApplicationType | null
  copy: IntakeCopy
}) {
  const router = useRouter()
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 6))
  const [a, setAnswers] = useState<WizardAnswers>(initialAnswers)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveClock, setSaveClock] = useState(() => Date.now())
  const [generating, setGenerating] = useState(false)
  const [eligReasons, setEligReasons] = useState<string[] | null>(null)
  const [attorneyReview, setAttorneyReview] = useState(false)
  const premisesApplication = isPremisesApplication(
    applicationType ?? applicationTypeFromLegacy(a)
  )
  const intakeSteps = useMemo(
    () =>
      INTAKE_STEPS.map((item) => ({
        ...item,
        label:
          item.n === 5 && premisesApplication
            ? copy.step5PremisesLabel
            : copy[`step${item.n}Label`],
        title: copy[`step${item.n}Title`],
        description: copy[`step${item.n}Description`],
        instruction: copy[`step${item.n}Instruction`],
      })),
    [copy, premisesApplication]
  )
  // F5 — a completed applicant re-opening their answers to review/edit. Saving a
  // step is non-destructive; only finishing (generate → completeIntake) rebuilds.
  const [editing, setEditing] = useState(false)
  const [guardOverride, setGuardOverride] = useState<SubmissionGuard | null>(null)
  const [narrativeEdits, setNarrativeEdits] = useState<Record<string, string>>({})
  const [stepErrors, setStepErrors] = useState<string[]>([])

  useEffect(() => {
    if (!savedAt) return
    const timer = window.setInterval(() => setSaveClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [savedAt])

  const patch = (p: Partial<WizardAnswers>) => setAnswers((s) => ({ ...s, ...p }))

  // V3-P0.6 — inline per-step validation (mirrors the server-side rules).
  function issuesForStep(n: number): string[] {
    if (n === 1) {
      return eligibilityStepIssues(a, {
        licenseTrack: licenseTrack as
          | "concealed_carry"
          | "carry_guard"
          | "special_carry_guard"
          | "sponsored_unresolved"
          | undefined,
      })
    }
    // Step 3 — the safeguard person cannot be the applicant. Block Next while it conflicts.
    if (n === 3) return safeguardSelfConflicts(a, applicant).map(selfDesignationMessage)
    if (n === 4) return disclosureStepIssues(a)
    if (n === 5) return historyStepIssues(a, { isRenewal, applicationType })
    return []
  }

  async function persist(next: number): Promise<boolean> {
    setSaving(true)
    setSaveState("saving")
    try {
      const res = await saveIntakeStep(caseId, next, a)
      if (res && "error" in res && res.error) {
        toast.error(res.error)
        setSaveState("error")
        return false
      }
      const saved = Date.now()
      setSavedAt(saved)
      setSaveClock(saved)
      setSaveState("saved")
      return true
    } catch {
      toast.error("Couldn't save progress.")
      setSaveState("error")
      return false
    } finally {
      setSaving(false)
    }
  }

  // Physically send the user to the first offending field (it renders red once
  // stepErrors is non-empty). setTimeout, not rAF: rAF is throttled in hidden
  // tabs and can fire before React commits the invalid markers. The field's
  // scroll-margin-top (globals.css) keeps it clear of the sticky header.
  function scrollToFirstError() {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>("[data-intake-invalid]")
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      el?.focus({ preventScroll: true })
    }, 50)
  }

  /** Jump back to an already-completed step from the "All steps" sheet. */
  function goToStep(n: number) {
    setStepErrors([])
    if (n <= step) setStep(n)
  }

  async function next() {
    const issues = issuesForStep(step)
    if (issues.length > 0) {
      setStepErrors(issues)
      scrollToFirstError()
      return
    }
    setStepErrors([])
    if (step === 1) {
      const gate = eligibilityGate(a)
      if (gate.blocked) {
        setEligReasons(gate.reasons)
        return
      }
      setEligReasons(null)
    }
    const n = Math.min(step + 1, 6)
    const ok = await persist(n)
    if (ok) setStep(n)
  }
  function back() {
    setStepErrors([])
    setStep((s) => Math.max(s - 1, 1))
  }

  async function saveAndExit() {
    const ok = await persist(step)
    if (ok) router.push("/portal")
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await completeIntake(caseId, a)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (res.blockedEligibility) {
        setAttorneyReview(true)
        return
      }
      if (res.validationErrors && res.validationErrors.length > 0) {
        setStepErrors(res.validationErrors)
        toast.error("A few answers need fixing before we can generate.")
        return
      }
      setStepErrors([])
      setGuardOverride(res.guard)
      toast.success("Your personalized requirements were generated.")
      router.refresh()
    } catch {
      toast.error("Generation failed. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  async function saveNarrative(id: string) {
    const text = narrativeEdits[id] ?? ""
    try {
      const g = await updateDisclosureNarrative(caseId, id, text)
      setGuardOverride(g)
      toast.success("Explanation saved.")
    } catch {
      toast.error("Couldn't save explanation.")
    }
  }

  const effGuard = guardOverride ?? guard
  const currentStep = intakeSteps[step - 1]
  const requiredLeft = issuesForStep(step).length
  const savedMinutes = savedAt ? Math.max(0, Math.floor((saveClock - savedAt) / 60_000)) : 0
  const saveLabel =
    saveState === "saving"
      ? copy.saving
      : saveState === "error"
        ? copy.notSaved
        : saveState === "saved"
          ? savedMinutes > 0
            ? interpolate(copy.savedMinutes, { count: savedMinutes })
            : copy.savedNow
          : copy.stopAnyTime

  // ── Completed: review + pre-submission gate ────────────────────────────────
  if (completed && !attorneyReview && !editing) {
    return (
      <div className="portal-intake-complete">
        <div className="portal-intake-complete-header">
          <div>
            <CheckCircle2 aria-hidden />
            <p className="portal-t-eyebrow">{copy.checklistReady}</p>
            <h1>{copy.checklistReady}</h1>
            <p>{copy.checklistReadyBody}</p>
          </div>
          <div className="portal-intake-complete-actions">
            <ChoosePathCta copy={copy} />
            <Button
              variant="outline"
              onClick={() => {
                setEditing(true)
                setStep(1)
              }}
            >
              <Pencil className="size-4" /> {copy.editAnswers}
            </Button>
          </div>
        </div>

        {effGuard && (
          <div
            className={cn(
              "portal-intake-guard",
              effGuard.ok ? "is-ready" : "is-blocked"
            )}
          >
            {effGuard.ok ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4" /> {copy.readyQa}
              </span>
            ) : (
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <ShieldAlert className="size-4" /> {copy.blockedUntil}
                </div>
                <ul className="mt-1 list-disc pl-6">
                  {effGuard.blockers.map((b) => (
                    <li key={b.kind}>{b.detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {disclosures.length > 0 && (
          <div className="portal-intake-explanations">
            <h2>{copy.explanations}</h2>
            <ul>
              {disclosures.map((d) => {
                const val = narrativeEdits[d.id] ?? d.narrative
                const empty = !val || val.trim() === ""
                return (
                  <li key={d.id}>
                    <div className="portal-intake-explanation-meta">
                      <span>
                        {d.type.replace(/_/g, " ")}
                        {d.question_no ? ` · Q${d.question_no}` : ""}
                      </span>
                      {empty && <em>{copy.explanationNeeded}</em>}
                    </div>
                    <Textarea
                      rows={3}
                      defaultValue={d.narrative}
                      placeholder={copy.explanationPlaceholder}
                      onChange={(e) =>
                        setNarrativeEdits((m) => ({ ...m, [d.id]: e.target.value }))
                      }
                    />
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => saveNarrative(d.id)}>
                        {copy.saveExplanation}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // ── Attorney-review hard gate ──────────────────────────────────────────────
  if (attorneyReview) {
    return (
      <div className="portal-intake-attorney">
        <div>
          <ShieldAlert className="size-5" />
          <h2>{copy.attorneyTitle}</h2>
        </div>
        <p>{copy.attorneyBody}</p>
        <p className="portal-intake-answers-saved">{copy.answersSaved}</p>
        <Button className="mt-4" variant="outline" onClick={() => setAttorneyReview(false)}>
          {copy.backAnswers}
        </Button>
      </div>
    )
  }

  // ── Wizard steps ───────────────────────────────────────────────────────────
  return (
    <div className="portal-intake-wizard">
      <IntakePageHeader
        step={step}
        currentStep={currentStep}
        copy={copy}
        saveState={saveState}
        saveLabel={saveLabel}
        saving={saving}
        onRetry={() => void persist(step)}
        onSaveExit={() => void saveAndExit()}
      />

      <StepHeader
        step={step}
        steps={intakeSteps}
        onJump={goToStep}
        saveState={saveState}
        saveLabel={saveLabel}
        saving={saving}
        onRetry={() => void persist(step)}
        onSaveExit={() => void saveAndExit()}
        copy={copy}
      />

      {editing ? (
        <div className="portal-intake-editing-banner">
          <div>
            <ShieldAlert aria-hidden />
            <div>
              <strong>{copy.editingTitle}</strong>
              <p>{copy.editingBody}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
            {copy.cancelEditing}
          </Button>
        </div>
      ) : null}

      <div className="portal-intake-layout">
        <StepRail step={step} steps={intakeSteps} onJump={goToStep} copy={copy} />

        <div className="portal-intake-main-column">
          <WhyAskDisclosure step={step} copy={copy} />
          <section className="portal-intake-form-card">
            <header className="portal-intake-form-header">
              <p className="portal-t-eyebrow">
                {interpolate(copy.stepLabel, { current: step, label: currentStep.label })}
              </p>
              <h2>{currentStep.title}</h2>
              <p>{currentStep.instruction}</p>
            </header>
            <div className="portal-intake-form-body">
          {step === 1 && (
                <StepEligibility a={a} patch={patch} reasons={eligReasons} attempted={stepErrors.length > 0} licenseTrack={licenseTrack} applicationType={applicationType} copy={copy} />
          )}
          {step === 2 && <StepIdentity a={a} patch={patch} />}
          {step === 3 && <StepHousehold a={a} patch={patch} applicant={applicant} />}
          {step === 4 && (
                <StepDisclosures a={a} patch={patch} aiEnabled={aiEnabled} attempted={stepErrors.length > 0} copy={copy} />
          )}
          {step === 5 && (
            <StepHistory a={a} patch={patch} attempted={stepErrors.length > 0} isRenewal={isRenewal} applicationType={applicationType} />
          )}
              {step === 6 && <StepReview a={a} />}
            </div>
            <div className="portal-intake-form-footer">
              <IntakeErrorSummary errors={stepErrors} onJump={scrollToFirstError} copy={copy} />
              <IntakeActions
                step={step}
                nextLabel={intakeSteps[step]?.label}
                requiredLeft={requiredLeft}
                saving={saving}
                generating={generating}
                onBack={back}
                onNext={() => void next()}
                onGenerate={() => void generate()}
                copy={copy}
              />
            </div>
          </section>
        </div>

        <WhyAskColumn step={step} copy={copy} />
      </div>

      <div className="portal-intake-mobile-actions">
        <IntakeErrorSummary errors={stepErrors} onJump={scrollToFirstError} copy={copy} />
        <IntakeActions
          step={step}
          nextLabel={intakeSteps[step]?.label}
          requiredLeft={requiredLeft}
          saving={saving}
          generating={generating}
          onBack={back}
          onNext={() => void next()}
          onGenerate={() => void generate()}
          copy={copy}
        />
      </div>
    </div>
  )
}

function IntakePageHeader({
  step,
  currentStep,
  copy,
  saveState,
  saveLabel,
  saving,
  onRetry,
  onSaveExit,
}: {
  step: number
  currentStep: IntakeStep
  copy: IntakeCopy
  saveState: "idle" | "saving" | "saved" | "error"
  saveLabel: string
  saving: boolean
  onRetry: () => void
  onSaveExit: () => void
}) {
  return (
    <header className="portal-intake-page-header">
      <div>
        <p className="portal-t-eyebrow">
          {interpolate(copy.eyebrow, { current: step, total: 6 })}
        </p>
        <h1>{currentStep.title}</h1>
        <p>{copy.pageSubline}</p>
      </div>
      <div className="portal-intake-save-cluster">
        <SaveStatus state={saveState} label={saveLabel} onRetry={onRetry} />
        <Button variant="outline" onClick={onSaveExit} disabled={saving}>
          <LogOut aria-hidden /> {copy.saveExit}
        </Button>
      </div>
    </header>
  )
}

function SaveStatus({
  state,
  label,
  onRetry,
}: {
  state: "idle" | "saving" | "saved" | "error"
  label: string
  onRetry: () => void
}) {
  const content = (
    <>
      {state === "saved" ? <CheckCircle2 aria-hidden /> : <Clock3 aria-hidden />}
      <span>{label}</span>
    </>
  )
  return (
    <div className={cn("portal-intake-save-status", `is-${state}`)} aria-live="polite">
      {state === "error" ? (
        <button type="button" onClick={onRetry}>{content}</button>
      ) : content}
    </div>
  )
}

function StepRail({
  step,
  steps,
  onJump,
  copy,
}: {
  step: number
  steps: readonly IntakeStep[]
  onJump: (n: number) => void
  copy: IntakeCopy
}) {
  return (
    <aside className="portal-intake-step-rail">
      <ol aria-label="Intake progress">
        {steps.map((item) => {
          const done = item.n < step
          const current = item.n === step
          const future = item.n > step
          return (
            <li key={item.key} aria-current={current ? "step" : undefined}>
              <button type="button" disabled={future} onClick={() => onJump(item.n)}>
                <span className={cn("portal-intake-step-dot", done && "is-done", current && "is-current")}>
                  {done ? <CheckIcon aria-hidden /> : item.n}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <p>{copy.stopAnyTime}</p>
      {INTAKE_TIME_ESTIMATE_MIN ? <small>{INTAKE_TIME_ESTIMATE_MIN} minutes</small> : null}
    </aside>
  )
}

type WhyCard = { title: string; body: string; kind: "why" | "privacy" | "guidance" }

function whyCards(step: number, copy: IntakeCopy): WhyCard[] {
  const sees =
    step === 3 ? copy.sees3 : step === 4 ? copy.sees4 : step === 5 ? copy.sees5 : copy.onlyTeam
  const cards: WhyCard[] = [
    { title: copy.whyAsk, body: copy[`why${step}`], kind: "why" },
    { title: copy.whoSees, body: sees, kind: "privacy" },
  ]
  if (step === 1) cards.push({ title: copy.unsure, body: copy.unsure1, kind: "guidance" })
  if (step === 2) cards.push({ title: copy.tip, body: copy.tip2, kind: "guidance" })
  if (step === 4) cards.push({ title: copy.unsure4Title, body: copy.unsure4, kind: "guidance" })
  return cards
}

function WhyCardIcon({ kind }: { kind: WhyCard["kind"] }) {
  if (kind === "privacy") return <LockKeyhole aria-hidden />
  if (kind === "guidance") return <Scale aria-hidden />
  return <Info aria-hidden />
}

function WhyAskColumn({ step, copy }: { step: number; copy: IntakeCopy }) {
  return (
    <aside className="portal-intake-why-column" aria-label={copy.whyAsk}>
      {whyCards(step, copy).map((card) => (
        <section key={`${card.kind}-${card.title}`} className={cn("portal-intake-why-card", `is-${card.kind}`)}>
          <WhyCardIcon kind={card.kind} />
          <div>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </div>
        </section>
      ))}
    </aside>
  )
}

function WhyAskDisclosure({ step, copy }: { step: number; copy: IntakeCopy }) {
  return (
    <details className="portal-intake-why-disclosure">
      <summary><Info aria-hidden /> {copy.whyAsk}<ChevronDown aria-hidden /></summary>
      <div>
        {whyCards(step, copy).map((card) => (
          <section key={`${card.kind}-${card.title}`}>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
          </section>
        ))}
      </div>
    </details>
  )
}

function IntakeErrorSummary({
  errors,
  onJump,
  copy,
}: {
  errors: string[]
  onJump: () => void
  copy: IntakeCopy
}) {
  if (errors.length === 0) return null
  return (
    <details role="alert" className="portal-intake-error-summary">
      <summary>
        <span><ShieldAlert aria-hidden /> {errors.length === 1 ? copy.attentionOne : interpolate(copy.attentionMany, { count: errors.length })}</span>
        <button type="button" onClick={(event) => { event.preventDefault(); onJump() }}>{copy.jump}</button>
      </summary>
      <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
    </details>
  )
}

function IntakeActions({
  step,
  nextLabel,
  requiredLeft,
  saving,
  generating,
  onBack,
  onNext,
  onGenerate,
  copy,
}: {
  step: number
  nextLabel?: string
  requiredLeft: number
  saving: boolean
  generating: boolean
  onBack: () => void
  onNext: () => void
  onGenerate: () => void
  copy: IntakeCopy
}) {
  return (
    <div className="portal-intake-action-row">
      <Button variant="outline" onClick={onBack} disabled={step === 1 || saving || generating} aria-label={copy.back}>
        <ArrowLeft aria-hidden /> <span>{copy.back}</span>
      </Button>
      {requiredLeft > 0 ? <small>{interpolate(copy.leftStep, { count: requiredLeft })}</small> : <span />}
      {step < 6 ? (
        <Button className="portal-intake-next" onClick={onNext} disabled={saving}>
          {saving ? copy.saving : interpolate(copy.next, { label: nextLabel ?? "" })}
        </Button>
      ) : (
        <Button className="portal-intake-generate" onClick={onGenerate} disabled={generating}>
          <Sparkles aria-hidden /> {generating ? copy.generating : copy.generate}
        </Button>
      )}
    </div>
  )
}

// ── Post-intake hand-off ────────────────────────────────────────────────────
/**
 * The path fork now comes BEFORE intake, so only Self-Guided applicants reach
 * this completed state — hand them straight to their personalized checklist.
 */
function ChoosePathCta({ copy }: { copy: IntakeCopy }) {
  return (
    <Link href="/portal/checklist" className="portal-intake-checklist-link">
      <Sparkles aria-hidden /> {copy.viewChecklist}
    </Link>
  )
}

// ── Step header ───────────────────────────────────────────────────────────────
/**
 * Two presentations of the same six INTAKE_STEPS. On a phone: a compact sticky
 * header that docks under the app bar (STEP n OF 6 · label · 6 progress segments)
 * with an "All steps" sheet and a "Save & exit" out — the six labeled chips
 * wrapped to three ragged rows and ate ~110px before any content. On desktop:
 * the original labeled chip rail, unchanged. The <ol> carries the meaning for a
 * screen reader; the segments are aria-hidden decoration.
 */
type IntakeStep = {
  n: number
  key: string
  label: string
  title: string
  description: string
  instruction: string
}

function StepHeader({
  step,
  steps,
  onJump,
  saveState,
  saveLabel,
  saving,
  onRetry,
  onSaveExit,
  copy,
}: {
  step: number
  steps: readonly IntakeStep[]
  onJump: (n: number) => void
  saveState: "idle" | "saving" | "saved" | "error"
  saveLabel: string
  saving: boolean
  onRetry: () => void
  onSaveExit: () => void
  copy: IntakeCopy
}) {
  const [open, setOpen] = useState(false)
  const current = steps[step - 1]

  return (
    <>
      <div className="portal-intake-mobile-step-header">
        <div>
          <span>{interpolate(copy.eyebrow, { current: step, total: 6 })}</span>
          <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog">
            {copy.allSteps} <ChevronDown aria-hidden />
          </button>
        </div>
        <strong>{current?.label}</strong>
        <div aria-hidden className="portal-intake-mobile-segments">
          {steps.map((s) => (
            <span
              key={s.n}
              className={cn(s.n < step && "is-done", s.n === step && "is-current")}
            />
          ))}
        </div>
      </div>

      <div className="portal-intake-tablet-stepbar">
        <p>{interpolate(copy.eyebrow, { current: step, total: 6 })} · <strong>{current?.label}</strong></p>
        <div aria-hidden>{steps.map((item) => <span key={item.key} className={cn(item.n < step && "is-done", item.n === step && "is-current")} />)}</div>
      </div>

      {/* All-steps sheet (mobile). Completed steps jump; the wizard validates
          forward, so future steps are listed but not tappable. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="portal-intake-steps-sheet gap-0 rounded-t-2xl border-hairline bg-surface-1 pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle className="text-left">{copy.allSteps}</SheetTitle>
          </SheetHeader>
          <div className="portal-intake-sheet-save">
            <SaveStatus state={saveState} label={saveLabel} onRetry={onRetry} />
            <Button variant="outline" size="sm" onClick={onSaveExit} disabled={saving}>
              <LogOut aria-hidden /> {copy.saveExit}
            </Button>
          </div>
          <ol aria-label="Intake steps">
            {steps.map((s) => {
              const done = s.n < step
              const cur = s.n === step
              const future = s.n > step
              return (
                <li key={s.n}>
                  <button
                    type="button"
                    disabled={future}
                    aria-current={cur ? "step" : undefined}
                    onClick={() => {
                      if (!future) {
                        onJump(s.n)
                        setOpen(false)
                      }
                    }}
                    className={cn(future && "is-future", cur && "is-current")}
                  >
                    <span className={cn("portal-intake-step-dot", done && "is-done", cur && "is-current")}>
                      {done ? <CheckIcon className="size-3.5" /> : s.n}
                    </span>
                    <span>
                      <strong>{s.label}</strong>
                      <span>
                        {done ? copy.completedReview : cur ? copy.youAreHere : copy.notYet}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </SheetContent>
      </Sheet>
    </>
  )
}

type StepProps = { a: WizardAnswers; patch: (p: Partial<WizardAnswers>) => void }

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  /**
   * Red asterisk — ONLY for fields the step validators actually block on
   * (eligibilityStepIssues / disclosureStepIssues / historyStepIssues). Marking
   * anything optional as required is worse than no marker at all.
   */
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  )
}

/**
 * a11y + styling flags for a field the validators are currently blocking on.
 * Inputs get red border/ring from their built-in `aria-invalid:` styles; the
 * `data-intake-invalid` marker is what next() scrolls/focuses to.
 */
function invalidAttrs(bad: boolean) {
  return bad ? { "aria-invalid": true as const, "data-intake-invalid": "" } : {}
}

/** Short "why we collect this" note shown under a field. */
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-text-low">{children}</p>
}

const SELECT_CLASS = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm"

/**
 * Native suggestion pop-up of addresses the intake already knows (today: the
 * applicant's legal address). Same-kind only — addresses suggest into address
 * fields, never names or anything else. Attach with `<Input list={id} …>`.
 */
function KnownAddresses({ id, a }: { id: string; a: WizardAnswers }) {
  const home = formatLegalAddress(a)
  if (!home) return null
  return (
    <datalist id={id}>
      <option value={home} />
    </datalist>
  )
}

/** One-click "fill with my home address" — only offered while the target is empty. */
function UseHomeAddress({ a, current, onUse }: { a: WizardAnswers; current?: string; onUse: (v: string) => void }) {
  const home = formatLegalAddress(a)
  if (!home || current?.trim()) return null
  return (
    <button type="button" onClick={() => onUse(home)} className="text-[11px] text-signal underline-offset-2 hover:underline">
      Use my home address
    </button>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input"
      />
      {label}
    </label>
  )
}

function StepEligibility({
  a,
  patch,
  reasons,
  attempted,
  licenseTrack,
  applicationType,
  copy,
}: StepProps & { reasons: string[] | null; attempted: boolean; licenseTrack: string | null; applicationType: ApplicationType | null; copy: IntakeCopy }) {
  // Red exactly when (and only when) eligibilityStepIssues blocks on it.
  const dobBad = attempted && (!a.dob || ageFromDob(a.dob) < 21)
  const residenceBad = attempted && !a.residence
  const intentBad = attempted && a.residence === "non_resident" && !a.nycCarryIntent
  // A sponsored armed-guard case's track is DERIVED (from the sponsorship + residence),
  // not chosen here. Never label it "Concealed carry", and never show a carry/premises
  // picker that could silently re-track it (P1.2).
  const isGuardTrack =
    licenseTrack === "carry_guard" ||
    licenseTrack === "special_carry_guard" ||
    licenseTrack === "sponsored_unresolved"
  const selectedType = applicationType ?? applicationTypeFromLegacy(a)
  const fixedResidence = selectedType
    ? selectedType === "special_carry" || selectedType === "special_carry_guard"
      ? "non_resident"
      : "nyc"
    : null
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Eligibility pre-screen</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth" required hint="Type your birth year — no scrolling back through decades.">
          <DateOfBirthField value={a.dob ?? ""} onChange={(dob) => patch({ dob })} invalid={dobBad} />
        </Field>
        <Field label="Residence" required>
          {fixedResidence ? (
            <div className={cn(SELECT_CLASS, "flex items-center bg-surface-2/40 text-text-mid")}>
              {fixedResidence === "non_resident"
                ? "Outside NYC with a NY county carry licence"
                : "New York City resident"}
            </div>
          ) : (
          <select
            aria-label="Residence"
            value={a.residence ?? ""}
            onChange={(e) => {
              const residence = e.target.value as WizardAnswers["residence"]
              patch({
                residence,
                ...(residence === "non_resident" ? { licenseType: "carry" as const } : { nycCarryIntent: undefined }),
              })
            }}
            className={cn(SELECT_CLASS, residenceBad && "border-danger ring-2 ring-danger/30")}
            {...invalidAttrs(residenceBad)}
          >
            <option value="">Select…</option>
            <option value="nyc">NYC resident / place of business</option>
            <option value="non_resident">Outside NYC with a NY county carry licence (Special Carry)</option>
          </select>
          )}
        </Field>
      </div>
      {isGuardTrack ? (
        <Field
          label="License type"
          hint="Your company sponsors this licence. The Carry Guard track is set from your sponsorship — you don't choose it here."
        >
          <div className={cn(SELECT_CLASS, "flex items-center bg-surface-2/40 text-text-mid")}>Carry Guard</div>
        </Field>
      ) : selectedType ? (
        <Field
          label="License type"
          hint="You selected this before intake so the checklist and questions stay on one legal path."
        >
          <div className={cn(SELECT_CLASS, "flex items-center justify-between bg-surface-2/40 text-text-mid")}>
            <span>{APPLICATION_TYPE_LABELS[selectedType]}</span>
            <Link href="/portal/license-path" className="text-xs text-brass underline underline-offset-4">Change</Link>
          </div>
        </Field>
      ) : (
        <Field
          label="License type"
          hint="Carry lets you carry concealed; a premises-business license keeps the firearm at your business. This changes your document set — premises needs 2 references and no range training; carry needs 4 references and the 16+2-hour course."
        >
          <select
            aria-label="License type"
            value={a.licenseType ?? "carry"}
            onChange={(e) => patch({ licenseType: e.target.value as WizardAnswers["licenseType"] })}
            className={SELECT_CLASS}
          >
            <option value="carry">Concealed carry</option>
            <option value="premises">Premises — business</option>
          </select>
        </Field>
      )}
      {a.residence === "non_resident" && !isGuardTrack && (
        <Field
          label="Where do you intend to carry in New York City?"
          hint="This decides your licence category — it is set by how you'll carry, not by who introduced you to us."
          required
        >
          <select
            aria-label="Intended use in NYC"
            value={a.nycCarryIntent ?? ""}
            onChange={(e) => patch({ nycCarryIntent: (e.target.value || undefined) as WizardAnswers["nycCarryIntent"] })}
            className={cn(SELECT_CLASS, intentBad && "border-danger ring-2 ring-danger/30")}
            {...invalidAttrs(intentBad)}
          >
            <option value="">Select…</option>
            <option value="personal">For my own personal protection — Special Carry</option>
            <option value="armed_assignment">While working an armed security assignment — Special Carry Guard</option>
          </select>
          {a.nycCarryIntent === "personal" && (
            <div className="mt-2 flex gap-2 rounded-md border-2 border-warn/50 bg-warn/10 p-3 text-sm text-text-hi">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
              <p>
                <span className="font-semibold">A personal Special Carry licence does not authorise carrying while working an armed security assignment.</span>{" "}
                That requires a separate <span className="font-medium">Special Carry Guard</span> licence, plus NY armed-guard registration and training. If you&apos;ll be armed on the job, choose the armed-assignment option above.
              </p>
            </div>
          )}
          {a.nycCarryIntent === "armed_assignment" && (
            <p className="mt-2 text-xs text-text-mid">
              An armed-assignment licence needs your employer&apos;s sponsorship and your qualifying employment. We&apos;ll connect you with the sponsored Special Carry Guard flow.
            </p>
          )}
        </Field>
      )}
      <div className="space-y-2 rounded-md border border-hairline p-3">
        <p className="text-xs text-text-low">Check any that apply (these route to attorney review):</p>
        <Check label="Felony or serious-offense conviction" checked={!!a.prohibitorFelony} onChange={(v) => patch({ prohibitorFelony: v })} />
        <Check label="Disqualifying mental-health adjudication" checked={!!a.prohibitorMentalHealth} onChange={(v) => patch({ prohibitorMentalHealth: v })} />
        <Check label="Active order of protection against me" checked={!!a.prohibitorActiveOop} onChange={(v) => patch({ prohibitorActiveOop: v })} />
        <Check label="Current unlawful drug use" checked={!!a.prohibitorUnlawfulDrug} onChange={(v) => patch({ prohibitorUnlawfulDrug: v })} />
      </div>
      {reasons && reasons.length > 0 && (
        <div className="portal-intake-eligibility-stop">
          <div>
            <ShieldAlert aria-hidden />
            <span>
              <small>{copy.beforeFurther}</small>
              <strong>{copy.eligibilityConcern}</strong>
            </span>
          </div>
          <ul>
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p>{copy.changeMistake}</p>
        </div>
      )}
    </div>
  )
}

function StepIdentity({ a, patch }: StepProps) {
  const numPatch = (key: "heightInches" | "weightLbs") => (raw: string) => {
    const n = parseInt(raw, 10)
    patch({ [key]: Number.isFinite(n) ? n : undefined } as Partial<WizardAnswers>)
  }
  const isBusiness = a.licenseType === "premises"
  const isSpecialCarry = a.residence === "non_resident"
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Identity &amp; residence</h2>
      <p className="text-sm text-muted-foreground">
        This is exactly what the NYPD application (PD 643-041, Section A) asks for. Filling it here
        means we can hand you a copy-and-paste worksheet later instead of a blank form.
      </p>

      {/* Name */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Middle initial">
          <Input maxLength={4} value={a.middleInitial ?? ""} onChange={(e) => patch({ middleInitial: e.target.value })} />
        </Field>
        <Field label="Maiden name / alias" hint="Any other name you've used (form field 1 & Q28).">
          <Input value={a.aliasName ?? ""} placeholder="If any" onChange={(e) => patch({ aliasName: e.target.value })} />
        </Field>
      </div>

      {/* Legal address */}
      <div className="grid gap-4 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <Field label="Legal address — street">
            <Input value={a.legalStreet ?? ""} placeholder="123 Main St" onChange={(e) => patch({ legalStreet: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Apt. #">
            <Input value={a.legalApt ?? ""} onChange={(e) => patch({ legalApt: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="City / town">
            <Input value={a.legalCity ?? ""} onChange={(e) => patch({ legalCity: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="State">
            <Input value={a.legalState ?? "NY"} onChange={(e) => patch({ legalState: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="ZIP code">
            <Input inputMode="numeric" value={a.legalZip ?? ""} onChange={(e) => patch({ legalZip: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Citizenship. (The old "Photo ID type" / "Proof of residence method"
          questions only described documents uploaded later in the checklist —
          they added friction with no application value, so they're gone. The
          keys stay in WizardAnswers/zod for in-progress sessions.) */}
      <Field label="Citizenship status">
        <select
          aria-label="Citizenship status"
          value={a.citizenship ?? ""}
          onChange={(e) => patch({ citizenship: e.target.value as WizardAnswers["citizenship"] })}
          className={SELECT_CLASS}
        >
          <option value="">Select…</option>
          <option value="citizen">U.S. citizen</option>
          <option value="lpr">Lawful permanent resident</option>
        </select>
      </Field>
      {a.citizenship === "lpr" && (
        <>
          <Check label="Fewer than 7 years of U.S. residence (adds Certificate of Good Conduct)" checked={!!a.lprUnder7yr} onChange={(v) => patch({ lprUnder7yr: v })} />
          <Field label="Alien Registration Number" hint="From your Alien Registration Card (form field 3).">
            <Input value={a.alienRegistrationNumber ?? ""} onChange={(e) => patch({ alienRegistrationNumber: e.target.value })} />
          </Field>
        </>
      )}
      {/* Birth + physical description (form field 4) */}
      <Field label="Place of birth" hint="City, State, Country (form field 4).">
        <Input value={a.placeOfBirth ?? ""} placeholder="Brooklyn, NY, USA" onChange={(e) => patch({ placeOfBirth: e.target.value })} />
      </Field>
      <Field label="Height">
        <HeightField value={a.heightInches} onChange={(inches) => patch({ heightInches: inches })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Weight (lb)">
          <Input type="number" inputMode="numeric" value={a.weightLbs ?? ""} onChange={(e) => numPatch("weightLbs")(e.target.value)} />
        </Field>
        <Field label="Sex">
          <select
            aria-label="Sex"
            value={a.sex ?? ""}
            onChange={(e) => patch({ sex: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="">Select…</option>
            {/* A legacy free-text value stays selectable so it isn't silently dropped. */}
            {a.sex && !["Male", "Female", "X"].includes(a.sex) && <option value={a.sex}>{a.sex}</option>}
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="X">X</option>
          </select>
        </Field>
        <Field label="Hair">
          <Input value={a.hairColor ?? ""} onChange={(e) => patch({ hairColor: e.target.value })} />
        </Field>
        <Field label="Eyes">
          <Input value={a.eyeColor ?? ""} onChange={(e) => patch({ eyeColor: e.target.value })} />
        </Field>
      </div>

      {/* Business — only when the licence is for a business/premises */}
      {isBusiness && (
        <div className="space-y-3 rounded-md border border-hairline p-3">
          <p className="text-xs text-text-low">Employment / business the license is for (form fields 5–7):</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <Input value={a.businessName ?? ""} onChange={(e) => patch({ businessName: e.target.value })} />
            </Field>
            <Field label="Type of business">
              <Input value={a.businessType ?? ""} onChange={(e) => patch({ businessType: e.target.value })} />
            </Field>
          </div>
          <Field label="Business address">
            <Input value={a.businessStreet ?? ""} placeholder="Street, City, State, Zip" onChange={(e) => patch({ businessStreet: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business phone (day)">
              <Input value={a.businessPhone ?? ""} onChange={(e) => patch({ businessPhone: e.target.value })} />
            </Field>
            <Field label="Occupation">
              <Input value={a.occupation ?? ""} placeholder="Owner / Employee / Gun Custodian" onChange={(e) => patch({ occupation: e.target.value })} />
            </Field>
          </div>
        </div>
      )}

      {/* Out-of-city license — special carry only (form field 9) */}
      {isSpecialCarry && (
        <div className="space-y-3 rounded-md border border-hairline p-3">
          <p className="text-xs text-text-low">Out-of-city license validation (Special Carry — form field 9):</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Basic license number">
              <Input value={a.outOfCityLicenseNumber ?? ""} onChange={(e) => patch({ outOfCityLicenseNumber: e.target.value })} />
            </Field>
            <Field label="Issued by">
              <Input value={a.outOfCityIssuedBy ?? ""} onChange={(e) => patch({ outOfCityIssuedBy: e.target.value })} />
            </Field>
            <Field label="County">
              <CountyInput value={a.outOfCityCounty ?? ""} onChange={(v) => patch({ outOfCityCounty: v })} />
            </Field>
            <Field label="Date issued">
              <Input type="date" value={a.outOfCityIssuedOn ?? ""} onChange={(e) => patch({ outOfCityIssuedOn: e.target.value })} />
            </Field>
            <Field label="Expiration date">
              <Input type="date" value={a.outOfCityExpiresOn ?? ""} onChange={(e) => patch({ outOfCityExpiresOn: e.target.value })} />
            </Field>
          </div>
        </div>
      )}
    </div>
  )
}

function StepHousehold({ a, patch, applicant }: StepProps & { applicant: ApplicantIdentity }) {
  const cohabs = a.cohabitants ?? []
  const conflicts = safeguardSelfConflicts(a, applicant)
  const nameConflict = conflicts.includes("name")
  const phoneConflict = conflicts.includes("phone")
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Household &amp; safeguard</h2>
      <p className="text-sm text-muted-foreground">
        List every adult (18+) who lives with you. Each needs a notarized
        cohabitant affidavit. Leave empty if you live alone.
      </p>
      <div className="space-y-2">
        {cohabs.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input
              aria-label={`Household member ${i + 1} full name`}
              placeholder="Full name"
              value={c.name}
              onChange={(e) => {
                const copy = [...cohabs]
                copy[i] = { ...copy[i], name: e.target.value }
                patch({ cohabitants: copy })
              }}
            />
            <Input
              aria-label={`Household member ${i + 1} relationship`}
              placeholder="Relationship"
              value={c.relationship ?? ""}
              onChange={(e) => {
                const copy = [...cohabs]
                copy[i] = { ...copy[i], relationship: e.target.value }
                patch({ cohabitants: copy })
              }}
            />
            <Button variant="ghost" size="icon" onClick={() => patch({ cohabitants: cohabs.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ cohabitants: [...cohabs, { name: "" }] })}>
          <Plus className="size-4" /> Add cohabitant
        </Button>
      </div>
      <Field
        label="How and where will the handgun be safeguarded when not in use?"
        hint="Form Q30 — the storage method and location. Must be within N.Y. State. Drives your safe-storage evidence (SAF-01)."
      >
        <Textarea
          rows={2}
          placeholder="e.g. In a locked steel gun safe bolted to the bedroom closet floor at my home address."
          value={a.safeguardMethod ?? ""}
          onChange={(e) => patch({ safeguardMethod: e.target.value })}
        />
      </Field>

      <div className="space-y-3 rounded-md border border-hairline p-3">
        <p className="text-xs font-medium text-foreground">Who will safeguard your handgun (form Q31)</p>
        <p className="rounded-md border border-hairline bg-surface-2/40 p-2.5 text-[12px] leading-relaxed text-text-mid">
          {SAFEGUARD_NOT_YOU_NOTE}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input
              placeholder="Full name"
              value={a.safeguardName ?? ""}
              onChange={(e) => patch({ safeguardName: e.target.value })}
              aria-invalid={nameConflict || undefined}
              data-intake-invalid={nameConflict || undefined}
              className={nameConflict ? "border-danger/60 focus-visible:ring-danger/30" : undefined}
            />
            {nameConflict && (
              <p className="mt-1 flex items-start gap-1 text-[11px] text-danger">
                <ShieldAlert className="mt-0.5 size-3 shrink-0" /> <span>{selfDesignationMessage("name")}</span>
              </p>
            )}
          </Field>
          <Field label="Relationship to you">
            <Input value={a.safeguardRelation ?? ""} placeholder="Spouse, sibling…" onChange={(e) => patch({ safeguardRelation: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address">
            <Input
              list="known-addresses"
              value={a.safeguardAddress ?? ""}
              placeholder="Street, City, State, Zip"
              onChange={(e) => patch({ safeguardAddress: e.target.value })}
            />
            <UseHomeAddress a={a} current={a.safeguardAddress} onUse={(v) => patch({ safeguardAddress: v })} />
          </Field>
          <Field label="Telephone">
            <Input
              value={a.safeguardPhone ?? ""}
              onChange={(e) => patch({ safeguardPhone: e.target.value })}
              aria-invalid={phoneConflict || undefined}
              data-intake-invalid={phoneConflict || undefined}
              className={phoneConflict ? "border-danger/60 focus-visible:ring-danger/30" : undefined}
            />
            {phoneConflict && (
              <p className="mt-1 flex items-start gap-1 text-[11px] text-danger">
                <ShieldAlert className="mt-0.5 size-3 shrink-0" /> <span>{selfDesignationMessage("phone")}</span>
              </p>
            )}
          </Field>
        </div>
      </div>
      <KnownAddresses id="known-addresses" a={a} />
    </div>
  )
}

function StepDisclosures({
  a,
  patch,
  aiEnabled,
  attempted,
  copy,
}: StepProps & { aiEnabled?: boolean; attempted: boolean; copy: IntakeCopy }) {
  const arrests = a.arrests ?? []
  // Don't pre-seed every question as "No" — an unanswered question shows neither
  // button selected, so the applicant makes a conscious Yes/No choice instead of
  // inheriting an answer (and there's no checkbox to mistake for "I agree").
  const q: QuestionAnswer[] = a.questionnaireVersion === "nypd_portal_v1" ? a.questionnaire ?? [] : []
  const visibleQuestions = applicablePortalDisclosures(a)
  const answeredNos = new Set(q.filter((x) => typeof x.yes === "boolean").map((x) => x.no))
  const answeredCount = visibleQuestions.filter((i) => answeredNos.has(i.no)).length
  const [focusedMode, setFocusedMode] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const focusedHeading = useRef<HTMLHeadingElement>(null)
  const activeIndex = Math.min(focusedIndex, Math.max(0, visibleQuestions.length - 1))
  const activeQuestion = visibleQuestions[activeIndex]

  useEffect(() => {
    if (focusedMode) focusedHeading.current?.focus()
  }, [focusedMode, activeIndex])

  useEffect(() => {
    if (!focusedMode || !activeQuestion) return
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return
      const key = event.key.toLowerCase()
      if (key === "y") {
        event.preventDefault()
        setQ(activeQuestion.no, true)
      } else if (key === "n") {
        event.preventDefault()
        setQ(activeQuestion.no, false)
      } else if (event.key === "Enter") {
        event.preventDefault()
        setFocusedIndex((index) => Math.min(index + 1, visibleQuestions.length - 1))
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        setFocusedIndex((index) => Math.max(index - 1, 0))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // setQ intentionally closes over the current answer array; every answer
    // changes activeQuestion's render and reinstalls this listener with fresh state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion, focusedMode, visibleQuestions.length])

  return (
    <div className="space-y-5">
      {/* Candor callout — the intro is doing legal work, so give it the weight. */}
      <div className="portal-intake-candor">
        <div>
          <ShieldAlert className="size-5 shrink-0" />
          <h2>Tell us everything</h2>
        </div>
        <p>
          Disclose every matter, even sealed or dismissed. An item we didn&apos;t disclose that turns up in the background check is far more damaging than the event itself.
        </p>
      </div>

      {/* Arrests & summonses — real labels above every field, not placeholder-only. */}
      <section>
        <SectionHeader label="Arrests & summonses" count={arrests.length ? String(arrests.length) : undefined} />
        <div className="space-y-3">
          {arrests.map((ar: ArrestEntry, i) => (
            <div key={i} className="card-soft p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Matter {i + 1}</span>
                <Button variant="ghost" size="sm" className="h-8 text-text-mid" onClick={() => patch({ arrests: arrests.filter((_, j) => j !== i) })}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
              <div className="mt-3 space-y-3 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
                <Field label="Date it happened">
                  <Input type="date" value={ar.occurredOn ?? ""} onChange={(e) => upd(i, { occurredOn: e.target.value })} />
                </Field>
                {/* Court + disposition are what disclosureStepIssues blocks on. */}
                <Field label="Court or jurisdiction" required>
                  <Input
                    placeholder="e.g. Kings County"
                    value={ar.jurisdiction ?? ""}
                    onChange={(e) => upd(i, { jurisdiction: e.target.value })}
                    {...invalidAttrs(attempted && !ar.jurisdiction?.trim())}
                  />
                </Field>
                <Field label="How it ended" required>
                  <Input
                    placeholder="e.g. dismissed, ACD"
                    value={ar.disposition ?? ""}
                    onChange={(e) => upd(i, { disposition: e.target.value })}
                    {...invalidAttrs(attempted && !ar.disposition?.trim())}
                  />
                </Field>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs">What happened, in your words</Label>
                <Textarea rows={2} placeholder="You can finish this at the review step." value={ar.narrative ?? ""} onChange={(e) => upd(i, { narrative: e.target.value })} />
              </div>
              {aiEnabled && (
                <div className="mt-2">
                  <DisclosureAssistant arrest={ar} onDraft={(draft) => upd(i, { narrative: draft })} />
                </div>
              )}
            </div>
          ))}
          {arrests.length === 0 ? (
            <button
              type="button"
              onClick={() => patch({ arrests: [{}] })}
              className="flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-hairline-strong px-3 text-sm text-text-mid transition-colors hover:text-foreground"
            >
              <span className="flex items-center gap-1.5"><Plus className="size-4" /> Add arrest / summons</span>
              <span className="text-[11px] text-text-low">Most people have none. If you do, sealed and dismissed matters count.</span>
            </button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => patch({ arrests: [...arrests, {}] })}>
              <Plus className="size-4" /> Add another matter
            </Button>
          )}
        </div>
      </section>

      {/* The live NYPD online-portal questions — not the retired paper Q10–28 set. */}
      <section className="portal-intake-question-section">
        <div className="portal-intake-question-section-heading">
          <SectionHeader label={`NYPD disclosures · Q${PORTAL_DISCLOSURE_RANGE}`} count={`${answeredCount} of ${visibleQuestions.length} answered`} />
          <button type="button" onClick={() => { setFocusedIndex(0); setFocusedMode((value) => !value) }}>
            {focusedMode ? copy.backList : copy.answerOne}
          </button>
        </div>
        {focusedMode && activeQuestion ? (
          <FocusedDisclosureQuestion
            item={activeQuestion}
            answer={q.find((answer) => answer.no === activeQuestion.no)}
            index={activeIndex}
            total={visibleQuestions.length}
            attempted={attempted}
            headingRef={focusedHeading}
            aiEnabled={aiEnabled}
            onAnswer={setQ}
            onNarrative={setQNarrative}
            onPrevious={() => setFocusedIndex((index) => Math.max(index - 1, 0))}
            onNext={() => setFocusedIndex((index) => Math.min(index + 1, visibleQuestions.length - 1))}
            onBack={() => setFocusedMode(false)}
            copy={copy}
          />
        ) : (
          <>
        <div className="mb-3 rounded-md border border-hairline bg-surface-2 p-2.5">
          <div className="text-[12px] text-text-mid">{answeredCount} of {visibleQuestions.length} applicable questions answered</div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brass transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${visibleQuestions.length ? (answeredCount / visibleQuestions.length) * 100 : 100}%` }}
            />
          </div>
        </div>
        <div className="portal-intake-question-list">
          {visibleQuestions.map((item) => {
            const cur = q.find((x) => x.no === item.no)
            const isYes = cur?.yes === true
            const isNo = cur?.yes === false
            const answered = isYes || isNo
            // Split the verbatim PD 643-041 wording into the question and its
            // parenthetical instruction — same words, the instruction just quieted.
            const m = /^(.*?)(\(.*\))\s*$/.exec(item.text)
            const main = m ? m[1].trim() : item.text
            const paren = m ? m[2] : ""
            return (
              <div
                key={item.no}
                role="radiogroup"
                aria-label={`Q${item.no}: ${item.text}`}
                data-intake-invalid={attempted && !answered ? "" : undefined}
                tabIndex={attempted && !answered ? -1 : undefined}
                className={cn(
                  "portal-intake-question-card",
                  // Both answers read as ANSWERED — Yes in brass (the accent), No in a
                  // neutral filled state. Never dim "No": a factual "No" is a complete
                  // answer, and dimming it reads as "not done yet" (finding 4). Disclosing
                  // is correct, so neither answer is styled as a bad outcome.
                  isYes && "is-yes",
                  isNo && "is-no",
                  !answered && "is-unanswered",
                  attempted && !answered && "is-invalid"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex h-[22px] min-w-[30px] items-center justify-center rounded-md border font-mono text-[10.5px]",
                      isYes ? "border-brass/25 bg-brass/10 text-brass" : isNo ? "border-hairline-strong bg-surface-3 text-text-mid" : "border-hairline text-text-low"
                    )}
                  >
                    Q{item.no}
                  </span>
                  <p className="text-[14.5px] leading-[1.52] [text-wrap:pretty]">
                    {main} {paren && <span className="text-[13px] text-text-low">{paren}</span>}
                  </p>
                </div>
                {item.note && (
                  <p className="mt-2 rounded-md border border-warn/25 bg-warn/[0.06] p-2 text-[11px] leading-relaxed text-text-mid">
                    {item.note}
                  </p>
                )}

                {/* Full-width segmented control — a 50/50 grid, each half IS the
                    target. No leftover track to the right of "No". */}
                <div
                  className={cn(
                    "relative mt-3 grid grid-cols-2 overflow-hidden rounded-[11px] border",
                    answered ? "border-hairline-strong bg-surface-3" : "border-dashed border-signal/30 bg-surface-3"
                  )}
                >
                  {answered && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-[3px] w-[calc(50%-6px)] rounded-lg transition-[left] duration-200 ease-out motion-reduce:transition-none",
                        // No gets a solid neutral chip (bordered) — equally clearly "selected", never faint.
                        isYes ? "left-[3px] bg-brass" : "left-[calc(50%+3px)] bg-surface-1 ring-1 ring-hairline-strong"
                      )}
                    />
                  )}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isYes}
                    onClick={() => setQ(item.no, true)}
                    className={cn(
                      "relative z-10 flex h-12 items-center justify-center text-sm font-semibold transition-colors",
                      isYes ? "text-brand-foreground" : "text-text-mid"
                    )}
                  >
                    {copy.yes}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isNo}
                    onClick={() => setQ(item.no, false)}
                    className={cn(
                      "relative z-10 flex h-12 items-center justify-center border-l border-hairline text-sm font-semibold transition-colors",
                      isNo ? "text-text-hi" : "text-text-mid"
                    )}
                  >
                    {copy.no}
                  </button>
                </div>

                {/* The answer has a visible consequence in the moment. */}
                {isYes && !item.conditionalOnYesOf && (
                  <div aria-live="polite" className="portal-intake-question-explanation">
                    <label htmlFor={`q-narr-${item.no}`}>
                      {copy.explainLabel}
                    </label>
                    <Textarea
                      id={`q-narr-${item.no}`}
                      rows={2}
                      className="mt-1.5"
                      placeholder={item.explainHelp ?? "What happened, when, and how it resolved."}
                      value={cur?.narrative ?? ""}
                      onChange={(e) => setQNarrative(item.no, e.target.value)}
                      {...invalidAttrs(attempted && !cur?.narrative?.trim())}
                    />
                    {aiEnabled ? (
                      <DisclosureAssistant
                        facts={{ kind: "other", whatHappened: cur?.narrative ?? "" }}
                        onDraft={(draft) => setQNarrative(item.no, draft)}
                        label={copy.helpWrite}
                      />
                    ) : null}
                  </div>
                )}
                {attempted && !answered ? <p className="portal-intake-question-error">{copy.chooseAnswer}</p> : null}
              </div>
            )
          })}
        </div>
          </>
        )}
      </section>
    </div>
  )

  function upd(i: number, p: Partial<ArrestEntry>) {
    const copy = [...arrests]
    copy[i] = { ...copy[i], ...p }
    patch({ arrests: copy })
  }

  function setQ(no: number, yes: boolean) {
    const cur = q.find((x) => x.no === no)
    const others = q.filter((x) => x.no !== no && !(no === 5 && !yes && x.no === 6))
    patch({ questionnaireVersion: "nypd_portal_v1", questionnaire: [...others, { no, yes, narrative: yes ? cur?.narrative : undefined }] })
  }

  /** Persist the explanation to the SAME place the review step reads. */
  function setQNarrative(no: number, narrative: string) {
    const cur = q.find((x) => x.no === no)
    const others = q.filter((x) => x.no !== no)
    patch({ questionnaireVersion: "nypd_portal_v1", questionnaire: [...others, { no, yes: cur?.yes ?? true, narrative }] })
  }
}

function FocusedDisclosureQuestion({
  item,
  answer,
  index,
  total,
  attempted,
  headingRef,
  aiEnabled,
  onAnswer,
  onNarrative,
  onPrevious,
  onNext,
  onBack,
  copy,
}: {
  item: PortalDisclosureQuestion
  answer?: QuestionAnswer
  index: number
  total: number
  attempted: boolean
  headingRef: React.RefObject<HTMLHeadingElement | null>
  aiEnabled?: boolean
  onAnswer: (no: number, yes: boolean) => void
  onNarrative: (no: number, narrative: string) => void
  onPrevious: () => void
  onNext: () => void
  onBack: () => void
  copy: IntakeCopy
}) {
  const isYes = answer?.yes === true
  const isNo = answer?.yes === false
  const answered = isYes || isNo
  return (
    <div className="portal-intake-focused-question" role="radiogroup" aria-label={`Q${item.no}: ${item.text}`}>
      <p className="portal-t-eyebrow">{interpolate(copy.questionOf, { current: index + 1, total })}</p>
      <h3 ref={headingRef} tabIndex={-1}>{item.text}</h3>
      {item.note ? <p className="portal-intake-focused-note">{item.note}</p> : null}
      <p className="sr-only">{copy.keyboardHint}</p>
      <div className="portal-intake-focused-answers">
        <button type="button" role="radio" aria-checked={isYes} className={cn(isYes && "is-selected")} onClick={() => onAnswer(item.no, true)}>
          <kbd>Y</kbd>{copy.yes}
        </button>
        <button type="button" role="radio" aria-checked={isNo} className={cn(isNo && "is-selected")} onClick={() => onAnswer(item.no, false)}>
          <kbd>N</kbd>{copy.no}
        </button>
      </div>
      {attempted && !answered ? <p className="portal-intake-question-error">{copy.chooseAnswer}</p> : null}
      {isYes && !item.conditionalOnYesOf ? (
        <div className="portal-intake-question-explanation">
          <label htmlFor={`focused-q-narr-${item.no}`}>{copy.explainLabel}</label>
          <Textarea
            id={`focused-q-narr-${item.no}`}
            rows={4}
            placeholder={item.explainHelp ?? "What happened, when, and how it resolved."}
            value={answer?.narrative ?? ""}
            onChange={(event) => onNarrative(item.no, event.target.value)}
            {...invalidAttrs(attempted && !answer?.narrative?.trim())}
          />
          {aiEnabled ? (
            <DisclosureAssistant
              facts={{ kind: "other", whatHappened: answer?.narrative ?? "" }}
              onDraft={(draft) => onNarrative(item.no, draft)}
              label={copy.helpWrite}
            />
          ) : null}
        </div>
      ) : null}
      <div className="portal-intake-focused-nav">
        <button type="button" onClick={onBack}>{copy.backList}</button>
        <div>
          <Button variant="outline" onClick={onPrevious} disabled={index === 0} aria-label={copy.back}><ArrowLeft aria-hidden /></Button>
          <Button variant="outline" onClick={onNext} disabled={index >= total - 1}>{copy.next.replace(": {label}", "")}</Button>
        </div>
      </div>
    </div>
  )
}

/**
 * From/To month range with a "Present" affordance. `type="month"` makes the
 * browser emit only valid YYYY-MM (matching the schema regex), so the old
 * free-text "2021"/"present" values that failed validation can't be entered.
 * Convention: an empty `to` means "present" (checkbox reflects and sets that).
 */
function HistoryDates({
  fromMonth,
  toMonth,
  onFrom,
  onTo,
}: {
  fromMonth?: string
  toMonth?: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  const present = !toMonth
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-text-low">From</Label>
        <Input type="month" className="w-[9rem]" value={fromMonth ?? ""} onChange={(e) => onFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-text-low">To</Label>
        <Input
          type="month"
          className="w-[9rem]"
          value={toMonth ?? ""}
          disabled={present}
          onChange={(e) => onTo(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-1.5 pb-2.5 text-xs text-text-mid">
        <input
          type="checkbox"
          checked={present}
          onChange={(e) => onTo(e.target.checked ? "" : new Date().toISOString().slice(0, 7))}
          className="size-4 rounded border-input"
        />
        Present
      </label>
    </div>
  )
}

function StepHistory({
  a,
  patch,
  attempted,
  isRenewal,
  applicationType,
}: StepProps & { attempted: boolean; isRenewal: boolean; applicationType: ApplicationType | null }) {
  const refs = a.references ?? []
  // Track-aware, same source as historyStepIssues: 4 carry / 2 premises / 0 renewal.
  const selectedType = applicationType ?? applicationTypeFromLegacy(a)
  const premisesApplication = isPremisesApplication(selectedType)
  const refsNeeded = requiredReferences(a, { isRenewal, applicationType: selectedType })
  const social: SocialAccount[] = a.socialAccounts ?? []
  const resHist = a.residenceHistory ?? []
  const empHist = a.employmentHistory ?? []
  // Default the training status from the older free-text fields if present.
  const trainingStatus = a.trainingStatus ?? (a.trainingInstructor || a.trainingDate ? "completed" : undefined)
  const completed = trainingStatus === "completed"

  function updSocial(i: number, p: Partial<SocialAccount>) {
    const copy = [...social]
    // The first row is rendered synthetically when the stored array is empty.
    // Seed both controlled fields before applying the edit so an initial platform
    // selection never creates `{ platform }` with an undefined handle.
    const current = copy[i]
    copy[i] = { ...(current ?? { platform: "", handle: "" }), ...p }
    patch({ socialAccounts: copy })
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">{premisesApplication ? "History & references" : "Carry-specific & history"}</h2>

      {/* Five-year residence + employment history (form Q29) */}
      <div className="space-y-2">
        <Label className="text-xs">Places of residence — past 5 years</Label>
        <Hint>
          The application (Q29) requires every address you&apos;ve lived at in the last five years, with
          dates. List them newest first; include state, county, zip and apartment.
        </Hint>
        {resHist.map((h, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
            <div className="flex items-start justify-between gap-2">
              <HistoryDates
                fromMonth={h.fromMonth}
                toMonth={h.toMonth}
                onFrom={(v) => { const c = [...resHist]; c[i] = { ...c[i], fromMonth: v }; patch({ residenceHistory: c }) }}
                onTo={(v) => patch({ residenceHistory: applyPresentRadio(resHist, i, v) })}
              />
              <Button variant="ghost" size="icon" onClick={() => patch({ residenceHistory: resHist.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,3fr)_minmax(5rem,1fr)]">
              <Input aria-label={`Residence ${i + 1} street address`} list="known-addresses" placeholder="Street address" value={h.address ?? ""} onChange={(e) => {
                const c = [...resHist]; c[i] = { ...c[i], address: e.target.value }; patch({ residenceHistory: c })
              }} />
              <Input aria-label={`Residence ${i + 1} apartment`} placeholder="Apt / unit" value={h.apt ?? ""} onChange={(e) => {
                const c = [...resHist]; c[i] = { ...c[i], apt: e.target.value }; patch({ residenceHistory: c })
              }} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[2fr_5rem_6rem]">
              <Input aria-label={`Residence ${i + 1} city`} placeholder="City" value={h.city ?? ""} onChange={(e) => {
                const c = [...resHist]; c[i] = { ...c[i], city: e.target.value }; patch({ residenceHistory: c })
              }} />
              <Input aria-label={`Residence ${i + 1} state`} placeholder="State" value={h.state ?? ""} onChange={(e) => {
                const c = [...resHist]; c[i] = { ...c[i], state: e.target.value }; patch({ residenceHistory: c })
              }} />
              <Input aria-label={`Residence ${i + 1} ZIP code`} placeholder="ZIP" value={h.zip ?? ""} onChange={(e) => {
                const c = [...resHist]; c[i] = { ...c[i], zip: e.target.value }; patch({ residenceHistory: c })
              }} />
            </div>
            {/* The newest row is usually where they live now — offer it, never force it. */}
            {i === 0 && (
              <UseHomeAddress
                a={a}
                current={h.address}
                onUse={(v) => {
                  const c = [...resHist]
                  c[0] = {
                    ...c[0],
                    address: a.legalStreet || v,
                    apt: a.legalApt,
                    city: a.legalCity,
                    state: a.legalState || "NY",
                    zip: a.legalZip,
                  }
                  patch({ residenceHistory: c })
                }}
              />
            )}
            {/* Country is required on the portal but defaults to the US — only ask abroad. */}
            <label className="flex items-center gap-1.5 text-xs text-text-mid">
              <input
                type="checkbox"
                checked={h.country !== undefined}
                onChange={(e) => { const c = [...resHist]; c[i] = { ...c[i], country: e.target.checked ? "" : undefined }; patch({ residenceHistory: c }) }}
                className="size-4 rounded border-input"
              />
              This address is outside the United States
            </label>
            {h.country !== undefined && (
              <Input aria-label={`Residence ${i + 1} country`} placeholder="Country" value={h.country ?? ""} onChange={(e) => { const c = [...resHist]; c[i] = { ...c[i], country: e.target.value }; patch({ residenceHistory: c }) }} />
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ residenceHistory: [...resHist, {}] })}>
          <Plus className="size-4" /> Add residence
        </Button>
        {checkHistory(resHist, "lived").map((n, i) => (
          <p key={i} className="flex items-start gap-2 rounded-md border-l-2 border-signal bg-signal/[0.06] p-2.5 text-xs text-text-mid">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-signal" /> <span>{n.message}</span>
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Places of employment — past 5 years</Label>
        <Hint>Q29 also asks for your five-year employment history — business name, address and occupation.</Hint>
        {empHist.map((h, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
            <div className="flex items-start justify-between gap-2">
              <HistoryDates
                fromMonth={h.fromMonth}
                toMonth={h.toMonth}
                onFrom={(v) => { const c = [...empHist]; c[i] = { ...c[i], fromMonth: v }; patch({ employmentHistory: c }) }}
                onTo={(v) => patch({ employmentHistory: applyPresentRadio(empHist, i, v) })}
              />
              <Button variant="ghost" size="icon" onClick={() => patch({ employmentHistory: empHist.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input aria-label={`Employment ${i + 1} business name`} placeholder="Business name" value={h.employerName ?? h.employer ?? ""} onChange={(e) => {
                // Writing the split field retires the legacy combined `employer`.
                const c = [...empHist]; c[i] = { ...c[i], employerName: e.target.value, employer: undefined }; patch({ employmentHistory: c })
              }} />
              <Input aria-label={`Employment ${i + 1} street address`} placeholder="Business street address" value={h.employerAddress ?? ""} onChange={(e) => {
                const c = [...empHist]; c[i] = { ...c[i], employerAddress: e.target.value }; patch({ employmentHistory: c })
              }} />
            </div>
            {/* The portal requires City / State / Zip for every past employer. */}
            <div className="grid gap-2 sm:grid-cols-[2fr_5rem_6rem]">
              <Input aria-label={`Employment ${i + 1} city`} placeholder="City" value={h.city ?? ""} onChange={(e) => {
                const c = [...empHist]; c[i] = { ...c[i], city: e.target.value }; patch({ employmentHistory: c })
              }} />
              <Input aria-label={`Employment ${i + 1} state`} placeholder="State" value={h.state ?? ""} onChange={(e) => {
                const c = [...empHist]; c[i] = { ...c[i], state: e.target.value }; patch({ employmentHistory: c })
              }} />
              <Input aria-label={`Employment ${i + 1} ZIP code`} placeholder="ZIP" value={h.zip ?? ""} onChange={(e) => {
                const c = [...empHist]; c[i] = { ...c[i], zip: e.target.value }; patch({ employmentHistory: c })
              }} />
            </div>
            <Input aria-label={`Employment ${i + 1} occupation`} placeholder="Occupation" value={h.occupation ?? ""} onChange={(e) => {
              const c = [...empHist]; c[i] = { ...c[i], occupation: e.target.value }; patch({ employmentHistory: c })
            }} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ employmentHistory: [...empHist, {}] })}>
          <Plus className="size-4" /> Add employment
        </Button>
        {checkHistory(empHist, "worked").map((n, i) => (
          <p key={i} className="flex items-start gap-2 rounded-md border-l-2 border-signal bg-signal/[0.06] p-2.5 text-xs text-text-mid">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-signal" /> <span>{n.message}</span>
          </p>
        ))}
      </div>

      {/* Training is carry-only. Premise Residence applicants should never be
          asked for a course that is not part of their selected path. */}
      {!premisesApplication && (
      <div className="space-y-3">
        <Field
          label="Firearms-safety training (16hr classroom + 2hr live-fire)"
          hint="NYC requires this CCIA-approved course. If you haven't taken it yet, we'll match you with a verified instructor and schedule it for you."
        >
          <select
            aria-label="Training status"
            value={trainingStatus ?? ""}
            onChange={(e) => {
              const v = (e.target.value || undefined) as WizardAnswers["trainingStatus"]
              // Clearing to "planned" drops the completed-only details.
              patch(v === "planned" ? { trainingStatus: v, trainingInstructor: "", trainingDate: "" } : { trainingStatus: v })
            }}
            className={SELECT_CLASS}
          >
            <option value="">Select…</option>
            <option value="completed">I&apos;ve completed my training</option>
            <option value="planned">Not yet — I&apos;ll need to complete it</option>
          </select>
        </Field>

        {completed && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Training instructor (DCJS-approved)" hint="The certified instructor who ran your course — listed on your training certificate.">
              <Input
                placeholder="e.g. John Smith / ABC Firearms Training"
                value={a.trainingInstructor ?? ""}
                onChange={(e) => patch({ trainingInstructor: e.target.value })}
              />
            </Field>
            <Field label="Training completion date" required>
              <Input
                type="date"
                value={a.trainingDate ?? ""}
                onChange={(e) => patch({ trainingDate: e.target.value })}
                {...invalidAttrs(attempted && !a.trainingDate)}
              />
            </Field>
          </div>
        )}
        {trainingStatus === "planned" && (
          <p className="rounded-md border border-signal/30 bg-signal/5 p-3 text-xs text-text-mid">
            No problem — this is marked <b>not yet complete</b>. It won&apos;t block your other documents, and we&apos;ll
            help you book a course from the <b>Find a verified local instructor</b> step.
          </p>
        )}
      </div>
      )}

      {/* References — optional at intake */}
      <div className="space-y-2">
        <Label className="text-xs">
          Character references{refsNeeded > 0 ? ` (${refsNeeded} needed before filing)` : " (not required for renewals)"}
        </Label>
        {refsNeeded > 0 && (
          <p className="rounded-md border border-signal/30 bg-signal/5 p-3 text-xs text-text-mid">
            <b>You can do this later.</b> Your license needs {refsNeeded === 2 ? "two" : "four"} people of good character,
            but you don&apos;t need them now — add any you already have, then finish the rest anytime from
            <b> Your checklist</b>. Leaving this empty won&apos;t stop you from completing intake.
          </p>
        )}
        <Hint>
          Add each person&apos;s email and we&apos;ll invite them to complete and notarize their reference for you —
          you don&apos;t have to chase paperwork.
        </Hint>
        {refs.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label={`Reference ${i + 1} full name`} placeholder="Full name" value={r.name} onChange={(e) => {
              const copy = [...refs]; copy[i] = { ...copy[i], name: e.target.value }; patch({ references: copy })
            }} />
            {/* Only a TYPED but malformed email is flagged — a blank one is fine
                (they can add it later); intake never blocks on references. */}
            <Input
              placeholder="name@email.com"
              aria-label={`Reference ${i + 1} email`}
              type="email"
              value={r.email ?? ""}
              onChange={(e) => {
                const copy = [...refs]; copy[i] = { ...copy[i], email: e.target.value }; patch({ references: copy })
              }}
              {...invalidAttrs(
                attempted && !!r.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())
              )}
            />
            <Button variant="ghost" size="icon" onClick={() => patch({ references: refs.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ references: [...refs, { name: "" }] })}>
          <Plus className="size-4" /> Add reference
        </Button>
      </div>

      {/* Preserve historical carry intake behavior while keeping the new
          Premise Residence path limited to its own relevant information. */}
      {!premisesApplication && (
      <div className="space-y-2">
        <Label className="text-xs">Social-media accounts (last 3 years)</Label>
        <Hint>
          The NYPD License Division reviews applicants&apos; public social media. Listing your accounts up front shows
          good faith and avoids questions later. Add each account with its platform and username.
        </Hint>
        {(social.length ? social : [{ platform: "", handle: "" }]).map((s, i) => (
          <div key={i} className="flex gap-2">
            <select
              aria-label={`Social account ${i + 1} platform`}
              value={s.platform}
              onChange={(e) => updSocial(i, { platform: e.target.value })}
              className={cn(SELECT_CLASS, "max-w-[44%]")}
            >
              <option value="">Platform…</option>
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Input
              placeholder="@username"
              aria-label={`Social account ${i + 1} username`}
              value={s.handle ?? ""}
              onChange={(e) => updSocial(i, { handle: e.target.value })}
            />
            {social.length > 0 && (
              <Button variant="ghost" size="icon" onClick={() => patch({ socialAccounts: social.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={social.some((s) => !s.platform.trim() && !s.handle.trim())}
            onClick={() =>
              patch({
                socialAccounts: social.length ? [...social, { platform: "", handle: "" }] : [{ platform: "", handle: "" }],
              })
            }
          >
            <Plus className="size-4" /> Add account
          </Button>
          <span className="text-[11px] text-text-low">No public accounts? Leave this empty.</span>
        </div>
      </div>
      )}

      {/* Conditional extras */}
      <div className="space-y-2 rounded-md border border-hairline p-3">
        <p className="text-xs text-text-low">Check any that apply — each adds the right document automatically:</p>
        <Check label="I am a military veteran (adds DD-214)" checked={!!a.isVeteran} onChange={(v) => patch({ isVeteran: v })} />
        <Check
          label="I am retired law enforcement (adds the Good Guy letter set; application fee waived)"
          checked={!!a.isRetiredLeo}
          onChange={(v) => patch({ isRetiredLeo: v })}
        />
        <Check label="I have legally changed my name (adds proof of name change)" checked={!!a.hasNameChange} onChange={(v) => patch({ hasNameChange: v })} />
        <Check label="I hold another firearms license (adds a copy of that license)" checked={!!a.hasOtherLicense} onChange={(v) => patch({ hasOtherLicense: v })} />
      </div>

      {/* Only one step renders at a time, so the shared datalist id is safe. */}
      <KnownAddresses id="known-addresses" a={a} />
    </div>
  )
}

function StepReview({ a }: { a: WizardAnswers }) {
  const counts = {
    cohabitants: a.cohabitants?.filter((c) => c.name?.trim()).length ?? 0,
    arrests: a.arrests?.length ?? 0,
    questionsYes: a.questionnaire?.filter((q) => q.yes).length ?? 0,
    references: a.references?.length ?? 0,
  }
  return (
    <div className="portal-intake-review">
      <p className="text-sm text-muted-foreground">
        We&apos;ll build your personalized requirements from these answers.
        Conditional documents (cohabitant affidavits, certificates of disposition,
        narratives) are added automatically.
      </p>
      <ul>
        <li>Application: <b>{APPLICATION_TYPE_LABELS[applicationTypeFromLegacy(a) ?? "concealed_carry"]}</b></li>
        <li>Residence: <b>{a.residence === "non_resident" ? "Special Carry" : "NYC"}</b></li>
        <li>Cohabitants: <b>{counts.cohabitants}</b></li>
        <li>Arrests / summonses: <b>{counts.arrests}</b></li>
        <li>Questionnaire &ldquo;yes&rdquo; answers: <b>{counts.questionsYes}</b></li>
        <li>References listed: <b>{counts.references}</b></li>
        <li>Veteran: <b>{a.isVeteran ? "yes" : "no"}</b></li>
      </ul>
    </div>
  )
}
