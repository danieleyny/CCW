"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, ShieldAlert, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Pencil, Users, ClipboardList, Check as CheckIcon, ChevronDown, LogOut } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  INTAKE_STEPS,
  QUESTIONNAIRE,
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
import { DisclosureAssistant } from "@/components/portal/intake/disclosure-assistant"
import { HeightField } from "@/components/portal/intake/height-field"
import { DateOfBirthField } from "@/components/portal/intake/dob-field"
import { SectionHeader } from "@/components/portal/section-header"
import {
  eligibilityStepIssues,
  disclosureStepIssues,
  historyStepIssues,
  requiredReferences,
} from "@/lib/intake/schema"
import {
  saveIntakeStep,
  completeIntake,
  updateDisclosureNarrative,
} from "@/app/portal/intake/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Disclosure {
  id: string
  type: string
  narrative: string
  question_no: number | null
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
}: {
  caseId: string
  isRenewal?: boolean
  initialAnswers: WizardAnswers
  initialStep: number
  completed: boolean
  disclosures: Disclosure[]
  guard: SubmissionGuard | null
  aiEnabled?: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 6))
  const [a, setAnswers] = useState<WizardAnswers>(initialAnswers)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [eligReasons, setEligReasons] = useState<string[] | null>(null)
  const [attorneyReview, setAttorneyReview] = useState(false)
  // F5 — a completed applicant re-opening their answers to review/edit. Saving a
  // step is non-destructive; only finishing (generate → completeIntake) rebuilds.
  const [editing, setEditing] = useState(false)
  const [guardOverride, setGuardOverride] = useState<SubmissionGuard | null>(null)
  const [narrativeEdits, setNarrativeEdits] = useState<Record<string, string>>({})
  const [stepErrors, setStepErrors] = useState<string[]>([])

  const patch = (p: Partial<WizardAnswers>) => setAnswers((s) => ({ ...s, ...p }))

  // V3-P0.6 — inline per-step validation (mirrors the server-side rules).
  function issuesForStep(n: number): string[] {
    if (n === 1) return eligibilityStepIssues(a)
    if (n === 4) return disclosureStepIssues(a)
    if (n === 5) return historyStepIssues(a, { isRenewal })
    return []
  }

  async function persist(next: number): Promise<boolean> {
    setSaving(true)
    try {
      const res = await saveIntakeStep(caseId, next, a)
      if (res && "error" in res && res.error) {
        toast.error(res.error)
        return false
      }
      return true
    } catch {
      toast.error("Couldn't save progress.")
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

  // ── Completed: review + pre-submission gate ────────────────────────────────
  if (completed && !attorneyReview && !editing) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-ok" />
            <h2 className="text-lg font-semibold">Requirements generated</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personalized checklist is ready. Before we can assemble and file,
            finish the items below.
          </p>
        </div>

        {/* ONE obvious next move, branched on what they just told us about
            training. Training is the long pole, so an applicant who hasn't done
            it is pointed at an instructor first; a trained applicant goes
            straight to the document checklist. */}
        <NextStepHandoff trainingCompleted={a.trainingStatus === "completed"} />

        {effGuard && (
          <div
            className={cn(
              "rounded-lg border p-4 text-sm",
              effGuard.ok
                ? "border-ok/30 bg-ok/10 text-ok"
                : "border-warn/30 bg-warn/10 text-warn"
            )}
          >
            {effGuard.ok ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4" /> Ready for staff QA — no blockers.
              </span>
            ) : (
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <ShieldAlert className="size-4" /> Submission is blocked until:
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
          <div className="rounded-lg border bg-card p-5">
            <h3 className="engraved mb-3 text-text-low">
              Written explanations (required for each disclosure)
            </h3>
            <ul className="space-y-4">
              {disclosures.map((d) => {
                const val = narrativeEdits[d.id] ?? d.narrative
                const empty = !val || val.trim() === ""
                return (
                  <li key={d.id} className="rounded-md border border-hairline p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-text-mid">
                        {d.type.replace(/_/g, " ")}
                        {d.question_no ? ` · Q${d.question_no}` : ""}
                      </span>
                      {empty && <span className="text-warn">needs explanation</span>}
                    </div>
                    <Textarea
                      rows={3}
                      defaultValue={d.narrative}
                      placeholder="Explain what happened, the outcome, and context…"
                      onChange={(e) =>
                        setNarrativeEdits((m) => ({ ...m, [d.id]: e.target.value }))
                      }
                    />
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => saveNarrative(d.id)}>
                        Save explanation
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditing(true)
              setStep(1)
            }}
          >
            <Pencil className="size-4" /> Review &amp; edit my answers
          </Button>
        </div>
      </div>
    )
  }

  // ── Attorney-review hard gate ──────────────────────────────────────────────
  if (attorneyReview) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-6">
        <div className="flex items-center gap-2 text-danger">
          <ShieldAlert className="size-5" />
          <h2 className="text-lg font-semibold">Attorney review required</h2>
        </div>
        <p className="mt-2 text-sm text-text-mid">
          Based on your answers, your application needs a firearms-attorney review
          before any further spend. Our team will reach out — we&apos;ve flagged
          your case. You can still update your answers below.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => setAttorneyReview(false)}>
          Back to my answers
        </Button>
      </div>
    )
  }

  // ── Wizard steps ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <StepHeader step={step} onJump={goToStep} />

      <div className="space-y-5 pt-4">
        {editing && (
          <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="size-4" /> You&apos;re editing answers you already submitted.
            </div>
            <p className="mt-1 text-xs">
              When you finish, we rebuild your checklist from these answers — that can reset
              household-affidavit progress and clear disclosure explanations. Change only what you need to.
            </p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(false)}>
              Cancel — keep my current answers
            </Button>
          </div>
        )}

        <div className="rounded-lg border bg-card p-5">
          {step === 1 && (
            <StepEligibility a={a} patch={patch} reasons={eligReasons} attempted={stepErrors.length > 0} />
          )}
          {step === 2 && <StepIdentity a={a} patch={patch} />}
          {step === 3 && <StepHousehold a={a} patch={patch} />}
          {step === 4 && (
            <StepDisclosures a={a} patch={patch} aiEnabled={aiEnabled} attempted={stepErrors.length > 0} />
          )}
          {step === 5 && (
            <StepHistory a={a} patch={patch} attempted={stepErrors.length > 0} isRenewal={isRenewal} />
          )}
          {step === 6 && <StepReview a={a} />}
        </div>
      </div>

      {/* Sticky action bar — sticky (not fixed) so the iOS keyboard shoves it up
          correctly. Names the next step for momentum. The error list docks here as
          a compact pill that stays announced (role=alert) and expands on tap. */}
      <div
        className="sticky bottom-0 z-10 -mx-4 mt-5 border-t border-hairline bg-surface-2 px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {stepErrors.length > 0 && (
          <details role="alert" className="mb-2.5 overflow-hidden rounded-md border border-warn/30 bg-warn/10 text-warn">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <ShieldAlert className="size-4 shrink-0" />
                {stepErrors.length} {stepErrors.length === 1 ? "thing needs" : "things need"} attention
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.preventDefault(); scrollToFirstError() }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scrollToFirstError() } }}
                className="shrink-0 rounded bg-warn/20 px-2.5 py-1 text-xs font-semibold"
              >
                Jump →
              </span>
            </summary>
            <ul className="list-disc px-2.5 pb-2.5 pl-7 text-sm">
              {stepErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={back}
            disabled={step === 1 || saving || generating}
            aria-label="Back"
            className="size-[52px] shrink-0 p-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          {step < 6 ? (
            <Button onClick={next} disabled={saving} className="h-[52px] flex-1">
              {saving ? "Saving…" : (
                <>
                  Next: {INTAKE_STEPS[step]?.label} <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={generate} disabled={generating} className="h-[52px] flex-1">
              <Sparkles className="size-4" />
              {generating ? "Generating…" : "Generate my requirements"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Post-intake hand-off ───────────────────────────────────────────────────
/**
 * The ONE thing to do next, right after generation. Training is the long pole
 * on a carry application, so someone who hasn't trained is steered to an
 * instructor first (documents proceed in parallel); a trained applicant goes
 * straight to the document checklist. Full-width and unmissable — never a row of
 * equal ghost links.
 */
function NextStepHandoff({ trainingCompleted }: { trainingCompleted: boolean }) {
  const primary = trainingCompleted
    ? {
        href: "/portal/checklist",
        label: "Start your checklist",
        Icon: ClipboardList,
        title: "Work your checklist",
        detail:
          "Your training's done. Everything left — documents, references, forms — is in one place, worst-first.",
      }
    : {
        href: "/portal/marketplace",
        label: "Get matched with an instructor",
        Icon: Users,
        title: "Get your training booked",
        detail:
          "The 16+2-hour course is the long pole. Get matched with a verified local instructor now — your documents move in parallel.",
      }
  const secondary = trainingCompleted
    ? { href: "/portal/marketplace", label: "Find an instructor" }
    : { href: "/portal/checklist", label: "Or start your checklist" }

  return (
    <div className="brass-edge rounded-lg border border-brass/40 bg-brass/8 p-5">
      <div className="engraved text-brass">Your next step</div>
      <div className="mt-2 flex items-start gap-3">
        <primary.Icon className="mt-0.5 size-5 shrink-0 text-brass" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{primary.title}</h2>
          <p className="mt-1 text-sm text-text-mid">{primary.detail}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={primary.href}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brass px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brass-bright"
        >
          {primary.label} <ArrowRight className="size-4" />
        </Link>
        <Link href={secondary.href} className="text-sm text-signal underline">
          {secondary.label}
        </Link>
      </div>
    </div>
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
function StepHeader({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  const [open, setOpen] = useState(false)
  const current = INTAKE_STEPS[step - 1]

  return (
    <>
      {/* MOBILE — sticky under the app bar (h-14 = 3.5rem + safe area). */}
      <div
        className="sticky z-10 -mx-4 border-b border-hairline bg-surface-2 px-4 py-2.5 sm:hidden"
        style={{ top: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="engraved-sm text-brass">Step {step} of 6</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-haspopup="dialog"
              className="inline-flex items-center gap-1 text-xs text-text-mid hover:text-foreground"
            >
              All steps <ChevronDown className="size-3.5" />
            </button>
            <Link href="/portal" className="inline-flex items-center gap-1 text-xs text-text-low hover:text-text-mid">
              <LogOut className="size-3.5" /> Save &amp; exit
            </Link>
          </div>
        </div>
        <div className="mt-0.5 font-display text-[17px] font-semibold tracking-tight">{current?.label}</div>
        <div aria-hidden className="mt-2 flex gap-1">
          {INTAKE_STEPS.map((s) => (
            <span
              key={s.n}
              className={cn(
                "h-[3px] flex-1 rounded-full",
                s.n < step
                  ? "bg-brass/60"
                  : s.n === step
                    ? "bg-signal shadow-[0_0_6px_var(--signal)]"
                    : "bg-hairline"
              )}
            />
          ))}
        </div>
      </div>

      {/* DESKTOP — the labeled chip rail, unchanged. */}
      <ol className="hidden flex-wrap gap-1.5 text-xs sm:flex" aria-label="Intake progress">
        {INTAKE_STEPS.map((s) => (
          <li
            key={s.n}
            aria-current={s.n === step ? "step" : undefined}
            className={cn(
              "rounded-md border px-2.5 py-1",
              s.n === step
                ? "border-brass/40 bg-brass/10 text-brass"
                : s.n < step
                  ? "border-ok/30 bg-ok/10 text-ok"
                  : "border-hairline text-text-low"
            )}
          >
            {s.n}. {s.label}
          </li>
        ))}
      </ol>

      {/* All-steps sheet (mobile). Completed steps jump; the wizard validates
          forward, so future steps are listed but not tappable. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-0 rounded-t-2xl border-hairline bg-surface-1 pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle className="engraved-sm text-left text-text-mid">All steps</SheetTitle>
          </SheetHeader>
          <ol className="px-3 pb-6" aria-label="Intake steps">
            {INTAKE_STEPS.map((s) => {
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
                    className={cn(
                      "flex min-h-[52px] w-full items-center gap-3 rounded-lg px-2 text-left transition-colors",
                      future ? "opacity-50" : "hover:bg-surface-2"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                        done
                          ? "border-ok/40 bg-ok/10 text-ok"
                          : cur
                            ? "border-brass/50 bg-brass/10 text-brass"
                            : "border-hairline text-text-low"
                      )}
                    >
                      {done ? <CheckIcon className="size-3.5" /> : s.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{s.label}</span>
                      <span className="block text-[12px] text-text-low">
                        {done ? "Completed — tap to review" : cur ? "You're here" : "Not yet"}
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
}: StepProps & { reasons: string[] | null; attempted: boolean }) {
  // Red exactly when (and only when) eligibilityStepIssues blocks on it.
  const dobBad = attempted && (!a.dob || ageFromDob(a.dob) < 21)
  const residenceBad = attempted && !a.residence
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Eligibility pre-screen</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth" required hint="Type your birth year — no scrolling back through decades.">
          <DateOfBirthField value={a.dob ?? ""} onChange={(dob) => patch({ dob })} invalid={dobBad} />
        </Field>
        <Field label="Residence" required>
          <select
            aria-label="Residence"
            value={a.residence ?? ""}
            onChange={(e) => patch({ residence: e.target.value as WizardAnswers["residence"] })}
            className={cn(SELECT_CLASS, residenceBad && "border-danger ring-2 ring-danger/30")}
            {...invalidAttrs(residenceBad)}
          >
            <option value="">Select…</option>
            <option value="nyc">NYC resident / place of business</option>
            <option value="non_resident">Non-resident (Special Carry)</option>
          </select>
        </Field>
      </div>
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
      <div className="space-y-2 rounded-md border border-hairline p-3">
        <p className="text-xs text-text-low">Check any that apply (these route to attorney review):</p>
        <Check label="Felony or serious-offense conviction" checked={!!a.prohibitorFelony} onChange={(v) => patch({ prohibitorFelony: v })} />
        <Check label="Disqualifying mental-health adjudication" checked={!!a.prohibitorMentalHealth} onChange={(v) => patch({ prohibitorMentalHealth: v })} />
        <Check label="Active order of protection against me" checked={!!a.prohibitorActiveOop} onChange={(v) => patch({ prohibitorActiveOop: v })} />
        <Check label="Current unlawful drug use" checked={!!a.prohibitorUnlawfulDrug} onChange={(v) => patch({ prohibitorUnlawfulDrug: v })} />
      </div>
      {reasons && reasons.length > 0 && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="size-4" /> This needs attorney review before continuing:
          </div>
          <ul className="mt-1 list-disc pl-6">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
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
        <div className="sm:col-span-3">
          <Field label="City / town">
            <Input value={a.legalCity ?? ""} onChange={(e) => patch({ legalCity: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="State">
            <Input value={a.legalState ?? "NY"} onChange={(e) => patch({ legalState: e.target.value })} />
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
              <Input value={a.outOfCityCounty ?? ""} onChange={(e) => patch({ outOfCityCounty: e.target.value })} />
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

function StepHousehold({ a, patch }: StepProps) {
  const cohabs = a.cohabitants ?? []
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
              placeholder="Full name"
              value={c.name}
              onChange={(e) => {
                const copy = [...cohabs]
                copy[i] = { ...copy[i], name: e.target.value }
                patch({ cohabitants: copy })
              }}
            />
            <Input
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
        <p className="text-xs text-text-low">
          Person who will safeguard the handgun if you die or become disabled (form Q31 — must be a
          N.Y. State resident). This person also signs the NYPD Acknowledgement form.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input placeholder="Full name" value={a.safeguardName ?? ""} onChange={(e) => patch({ safeguardName: e.target.value })} />
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
            <Input value={a.safeguardPhone ?? ""} onChange={(e) => patch({ safeguardPhone: e.target.value })} />
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
}: StepProps & { aiEnabled?: boolean; attempted: boolean }) {
  const arrests = a.arrests ?? []
  // Don't pre-seed every question as "No" — an unanswered question shows neither
  // button selected, so the applicant makes a conscious Yes/No choice instead of
  // inheriting an answer (and there's no checkbox to mistake for "I agree").
  const q: QuestionAnswer[] = a.questionnaire ?? []
  const answeredNos = new Set(q.filter((x) => typeof x.yes === "boolean").map((x) => x.no))
  const answeredCount = QUESTIONNAIRE.filter((i) => answeredNos.has(i.no)).length
  return (
    <div className="space-y-5">
      {/* Candor callout — the intro is doing legal work, so give it the weight. */}
      <div className="brass-edge rounded-lg border border-brass/40 bg-brass/8 p-4">
        <div className="flex items-center gap-2 text-brass">
          <ShieldAlert className="size-5 shrink-0" />
          <h2 className="font-display text-base font-semibold">Tell us everything</h2>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-mid">
          Disclose <b>every</b> matter — even sealed or dismissed. An item we didn&apos;t disclose
          that turns up in the background check is far more damaging than the event itself.
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

      {/* Section B — a card per question, a full-width segmented Yes/No, and the
          explanation revealed inline on "Yes". Separation comes from surface, not
          a 1px line, so thirteen questions read as discrete objects. */}
      <section>
        <SectionHeader label="Section B · Q10–22" count={`${answeredCount} / ${QUESTIONNAIRE.length}`} />
        <div className="mb-3 rounded-md border border-hairline bg-surface-2 p-2.5">
          <div className="text-[12px] text-text-mid">{answeredCount} of {QUESTIONNAIRE.length} answered</div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brass transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${(answeredCount / QUESTIONNAIRE.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="space-y-3">
          {QUESTIONNAIRE.map((item) => {
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
                className={cn(
                  "card-soft p-3.5 transition-opacity",
                  isYes && "border-l-[3px] border-l-brass bg-brass/[0.04] glow-neutral",
                  isNo && "opacity-[0.72]",
                  !answered && "ring-1 ring-signal/25"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex h-[22px] min-w-[30px] items-center justify-center rounded-md border font-mono text-[10.5px]",
                      isNo ? "border-hairline text-text-low" : "border-brass/25 bg-brass/10 text-brass"
                    )}
                  >
                    Q{item.no}
                  </span>
                  <p className="text-[14.5px] leading-[1.52] [text-wrap:pretty]">
                    {main} {paren && <span className="text-[13px] text-text-low">{paren}</span>}
                  </p>
                </div>

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
                        isYes ? "left-[3px] bg-brass" : "left-[calc(50%+3px)] bg-surface-1"
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
                    Yes
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
                    No
                  </button>
                </div>

                {/* The answer has a visible consequence in the moment. */}
                {isYes && (
                  <div aria-live="polite" className="mt-3 border-t border-dashed border-hairline pt-3">
                    <label htmlFor={`q-narr-${item.no}`} className="engraved-sm text-warn">
                      Your explanation · required before filing
                    </label>
                    <Textarea
                      id={`q-narr-${item.no}`}
                      rows={2}
                      className="mt-1.5"
                      placeholder="What happened, when, and how it resolved."
                      value={cur?.narrative ?? ""}
                      onChange={(e) => setQNarrative(item.no, e.target.value)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
    const others = q.filter((x) => x.no !== no)
    patch({ questionnaire: [...others, { no, yes, narrative: cur?.narrative }] })
  }

  /** Persist the explanation to the SAME place the review step reads. */
  function setQNarrative(no: number, narrative: string) {
    const cur = q.find((x) => x.no === no)
    const others = q.filter((x) => x.no !== no)
    patch({ questionnaire: [...others, { no, yes: cur?.yes ?? true, narrative }] })
  }
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
}: StepProps & { attempted: boolean; isRenewal: boolean }) {
  const refs = a.references ?? []
  // Track-aware, same source as historyStepIssues: 4 carry / 2 premises / 0 renewal.
  const refsNeeded = requiredReferences(a, { isRenewal })
  const social: SocialAccount[] = a.socialAccounts ?? []
  const resHist = a.residenceHistory ?? []
  const empHist = a.employmentHistory ?? []
  // Default the training status from the older free-text fields if present.
  const trainingStatus = a.trainingStatus ?? (a.trainingInstructor || a.trainingDate ? "completed" : undefined)
  const completed = trainingStatus === "completed"

  function updSocial(i: number, p: Partial<SocialAccount>) {
    const copy = [...social]
    copy[i] = { ...copy[i], ...p }
    patch({ socialAccounts: copy })
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Carry-specific &amp; history</h2>

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
                onTo={(v) => { const c = [...resHist]; c[i] = { ...c[i], toMonth: v }; patch({ residenceHistory: c }) }}
              />
              <Button variant="ghost" size="icon" onClick={() => patch({ residenceHistory: resHist.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Input list="known-addresses" placeholder="Address (street, city, state, county, zip, apt)" value={h.address ?? ""} onChange={(e) => {
              const c = [...resHist]; c[i] = { ...c[i], address: e.target.value }; patch({ residenceHistory: c })
            }} />
            {/* The newest row is usually where they live now — offer it, never force it. */}
            {i === 0 && (
              <UseHomeAddress
                a={a}
                current={h.address}
                onUse={(v) => {
                  const c = [...resHist]
                  c[0] = { ...c[0], address: v }
                  patch({ residenceHistory: c })
                }}
              />
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ residenceHistory: [...resHist, {}] })}>
          <Plus className="size-4" /> Add residence
        </Button>
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
                onTo={(v) => { const c = [...empHist]; c[i] = { ...c[i], toMonth: v }; patch({ employmentHistory: c }) }}
              />
              <Button variant="ghost" size="icon" onClick={() => patch({ employmentHistory: empHist.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Business name" value={h.employerName ?? h.employer ?? ""} onChange={(e) => {
                // Writing the split field retires the legacy combined `employer`.
                const c = [...empHist]; c[i] = { ...c[i], employerName: e.target.value, employer: undefined }; patch({ employmentHistory: c })
              }} />
              <Input placeholder="Business address" value={h.employerAddress ?? ""} onChange={(e) => {
                const c = [...empHist]; c[i] = { ...c[i], employerAddress: e.target.value }; patch({ employmentHistory: c })
              }} />
            </div>
            <Input placeholder="Occupation" value={h.occupation ?? ""} onChange={(e) => {
              const c = [...empHist]; c[i] = { ...c[i], occupation: e.target.value }; patch({ employmentHistory: c })
            }} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ employmentHistory: [...empHist, {}] })}>
          <Plus className="size-4" /> Add employment
        </Button>
      </div>

      {/* Training */}
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
            <Input placeholder="Full name" value={r.name} onChange={(e) => {
              const copy = [...refs]; copy[i] = { ...copy[i], name: e.target.value }; patch({ references: copy })
            }} />
            {/* Only a TYPED but malformed email is flagged — a blank one is fine
                (they can add it later); intake never blocks on references. */}
            <Input
              placeholder="name@email.com"
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

      {/* Social media */}
      <div className="space-y-2">
        <Label className="text-xs">Social-media accounts (last 3 years)</Label>
        <Hint>
          The NYPD License Division reviews applicants&apos; public social media. Listing your accounts up front shows
          good faith and avoids questions later. Add each account with its platform and username.
        </Hint>
        {(social.length ? social : [{ platform: "", handle: "" }]).map((s, i) => (
          <div key={i} className="flex gap-2">
            <select
              aria-label="Social platform"
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
              value={s.handle}
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
          <Button variant="outline" size="sm" onClick={() => patch({ socialAccounts: [...social, { platform: "", handle: "" }] })}>
            <Plus className="size-4" /> Add account
          </Button>
          <span className="text-[11px] text-text-low">No public accounts? Leave this empty.</span>
        </div>
      </div>

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
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Review &amp; generate</h2>
      <p className="text-sm text-muted-foreground">
        We&apos;ll build your personalized requirements from these answers.
        Conditional documents (cohabitant affidavits, certificates of disposition,
        narratives) are added automatically.
      </p>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
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
