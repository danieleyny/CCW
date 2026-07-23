"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, ShieldAlert, CheckCircle2, ArrowRight, ArrowLeft, Sparkles } from "lucide-react"
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

  async function next() {
    const issues = issuesForStep(step)
    if (issues.length > 0) {
      setStepErrors(issues)
      // Don't just list the problems — physically send the user back to the
      // first offending field (it renders red once stepErrors is non-empty).
      // setTimeout, not rAF: rAF is throttled in hidden tabs and can fire
      // before React commits the invalid markers.
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>("[data-intake-invalid]")
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        el?.focus({ preventScroll: true })
      }, 50)
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
  if (completed && !attorneyReview) {
    return (
      <div className="space-y-5">
        <StepRail step={6} />
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-ok" />
            <h2 className="text-lg font-semibold">Requirements generated</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personalized checklist is ready under{" "}
            <Link href="/portal/checklist" className="text-signal underline">
              Your checklist
            </Link>
            . Before we can assemble and file, finish the items below.
          </p>
        </div>

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

        <Button asChild variant="outline">
          <Link href="/portal/checklist">
            View my checklist <ArrowRight className="size-4" />
          </Link>
        </Button>
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
      <StepRail step={step} />

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

      {stepErrors.length > 0 && (
        <div role="alert" className="rounded-md border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="size-4" /> Before you continue:
          </div>
          <ul className="mt-1 list-disc pl-6">
            {stepErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={step === 1 || saving || generating}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < 6 ? (
          <Button onClick={next} disabled={saving}>
            {saving ? "Saving…" : "Next"} <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={generate} disabled={generating}>
            <Sparkles className="size-4" />
            {generating ? "Generating…" : "Generate my requirements"}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step rail ────────────────────────────────────────────────────────────────
function StepRail({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap gap-1.5 text-xs" aria-label="Intake progress">
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
        <Field label="Date of birth" required>
          <Input
            type="date"
            value={a.dob ?? ""}
            onChange={(e) => patch({ dob: e.target.value })}
            {...invalidAttrs(dobBad)}
          />
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
      <div className="grid gap-4 sm:grid-cols-5">
        <Field label="Height (in)">
          <Input type="number" inputMode="numeric" value={a.heightInches ?? ""} onChange={(e) => numPatch("heightInches")(e.target.value)} />
        </Field>
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
  const q: QuestionAnswer[] = a.questionnaire ?? QUESTIONNAIRE.map((x) => ({ no: x.no, yes: false }))
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Disclosures — the real exam</h2>
      <p className="text-sm text-muted-foreground">
        Disclose everything, even sealed or dismissed matters. A non-disclosed
        item found in the background check is far more damaging than the event.
        Every &ldquo;yes&rdquo; needs a written explanation before filing.
      </p>

      <div className="space-y-2">
        <h3 className="engraved text-text-low">Arrests / summonses</h3>
        {arrests.map((ar: ArrestEntry, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input type="date" value={ar.occurredOn ?? ""} onChange={(e) => upd(i, { occurredOn: e.target.value })} />
              {/* Court + disposition are what disclosureStepIssues blocks on. */}
              <Input
                placeholder="Court / jurisdiction *"
                value={ar.jurisdiction ?? ""}
                onChange={(e) => upd(i, { jurisdiction: e.target.value })}
                {...invalidAttrs(attempted && !ar.jurisdiction?.trim())}
              />
              <Input
                placeholder="Disposition (e.g. dismissed) *"
                value={ar.disposition ?? ""}
                onChange={(e) => upd(i, { disposition: e.target.value })}
                {...invalidAttrs(attempted && !ar.disposition?.trim())}
              />
            </div>
            <Textarea rows={2} placeholder="Written explanation (you can finish this at the review step)" value={ar.narrative ?? ""} onChange={(e) => upd(i, { narrative: e.target.value })} />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => patch({ arrests: arrests.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" /> Remove
              </Button>
              {aiEnabled && (
                <DisclosureAssistant
                  arrest={ar}
                  onDraft={(draft) => upd(i, { narrative: draft })}
                />
              )}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ arrests: [...arrests, {}] })}>
          <Plus className="size-4" /> Add arrest / summons
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="engraved text-text-low">Questionnaire (Section B, Q10–22)</h3>
        {QUESTIONNAIRE.map((item) => {
          const cur = q.find((x) => x.no === item.no) ?? { no: item.no, yes: false }
          return (
            <label key={item.no} className="flex items-start gap-2 rounded-md border border-hairline p-2.5 text-sm">
              <input
                type="checkbox"
                checked={cur.yes}
                onChange={(e) => {
                  const others = q.filter((x) => x.no !== item.no)
                  patch({ questionnaire: [...others, { no: item.no, yes: e.target.checked, narrative: cur.narrative }] })
                }}
                className="mt-0.5 size-4"
              />
              <span>
                <span className="font-mono text-[10px] text-text-low">Q{item.no}</span> {item.text}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )

  function upd(i: number, p: Partial<ArrestEntry>) {
    const copy = [...arrests]
    copy[i] = { ...copy[i], ...p }
    patch({ arrests: copy })
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

      {/* References */}
      <div className="space-y-2">
        <Label className="text-xs">
          Character references{refsNeeded > 0 ? ` (${refsNeeded} required)` : " (not required for renewals)"}
          {refsNeeded > 0 && (
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
          )}
        </Label>
        <Hint>
          NYC requires {refsNeeded === 2 ? "two" : "four"} people of good character who know you well. Add their email
          and we&apos;ll invite each one to complete and notarize their reference for you — you don&apos;t have to chase
          paperwork.
        </Hint>
        {refs.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Full name" value={r.name} onChange={(e) => {
              const copy = [...refs]; copy[i] = { ...copy[i], name: e.target.value }; patch({ references: copy })
            }} />
            {/* historyStepIssues blocks on a valid email for every named reference. */}
            <Input
              placeholder="name@email.com"
              type="email"
              value={r.email ?? ""}
              onChange={(e) => {
                const copy = [...refs]; copy[i] = { ...copy[i], email: e.target.value }; patch({ references: copy })
              }}
              {...invalidAttrs(
                attempted && refsNeeded > 0 && !!r.name?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email?.trim() ?? "")
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
