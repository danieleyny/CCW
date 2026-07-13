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
  type WizardAnswers,
  type ArrestEntry,
  type QuestionAnswer,
  type SocialAccount,
} from "@/lib/intake/answers"
import type { SubmissionGuard } from "@/lib/intake/process"
import {
  eligibilityStepIssues,
  disclosureStepIssues,
  historyStepIssues,
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
}: {
  caseId: string
  isRenewal?: boolean
  initialAnswers: WizardAnswers
  initialStep: number
  completed: boolean
  disclosures: Disclosure[]
  guard: SubmissionGuard | null
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

  async function persist(next: number) {
    setSaving(true)
    try {
      await saveIntakeStep(caseId, next, a)
    } catch {
      toast.error("Couldn't save progress.")
    } finally {
      setSaving(false)
    }
  }

  async function next() {
    const issues = issuesForStep(step)
    if (issues.length > 0) {
      setStepErrors(issues)
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
    await persist(n)
    setStep(n)
  }
  function back() {
    setStepErrors([])
    setStep((s) => Math.max(s - 1, 1))
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await completeIntake(caseId, a)
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
        {step === 1 && <StepEligibility a={a} patch={patch} reasons={eligReasons} />}
        {step === 2 && <StepIdentity a={a} patch={patch} />}
        {step === 3 && <StepHousehold a={a} patch={patch} />}
        {step === 4 && <StepDisclosures a={a} patch={patch} />}
        {step === 5 && <StepHistory a={a} patch={patch} />}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  )
}

/** Short "why we collect this" note shown under a field. */
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-text-low">{children}</p>
}

const SELECT_CLASS = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm"

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

function StepEligibility({ a, patch, reasons }: StepProps & { reasons: string[] | null }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Eligibility pre-screen</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth">
          <Input type="date" value={a.dob ?? ""} onChange={(e) => patch({ dob: e.target.value })} />
        </Field>
        <Field label="Residence">
          <select
            aria-label="Residence"
            value={a.residence ?? ""}
            onChange={(e) => patch({ residence: e.target.value as WizardAnswers["residence"] })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Identity &amp; residence</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Photo ID type">
          <Input value={a.photoIdType ?? ""} placeholder="Driver license, passport…" onChange={(e) => patch({ photoIdType: e.target.value })} />
        </Field>
        <Field label="Citizenship status">
          <select
            aria-label="Citizenship status"
            value={a.citizenship ?? ""}
            onChange={(e) => patch({ citizenship: e.target.value as WizardAnswers["citizenship"] })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select…</option>
            <option value="citizen">U.S. citizen</option>
            <option value="lpr">Lawful permanent resident</option>
          </select>
        </Field>
      </div>
      {a.citizenship === "lpr" && (
        <Check label="Fewer than 7 years of U.S. residence (adds Certificate of Good Conduct)" checked={!!a.lprUnder7yr} onChange={(v) => patch({ lprUnder7yr: v })} />
      )}
      <Field label="Proof of residence method">
        <Input value={a.residenceProof ?? ""} placeholder="Utility bill, lease…" onChange={(e) => patch({ residenceProof: e.target.value })} />
      </Field>
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
        label="Designated safeguard person (holds a key / secures firearms)"
        hint="The trusted adult who can secure your firearm if you're unavailable. Often a spouse or family member — leave blank if not applicable."
      >
        <Input placeholder="Full name" value={a.safeguardName ?? ""} onChange={(e) => patch({ safeguardName: e.target.value })} />
      </Field>
    </div>
  )
}

function StepDisclosures({ a, patch }: StepProps) {
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
              <Input placeholder="Court / jurisdiction" value={ar.jurisdiction ?? ""} onChange={(e) => upd(i, { jurisdiction: e.target.value })} />
              <Input placeholder="Disposition (e.g. dismissed)" value={ar.disposition ?? ""} onChange={(e) => upd(i, { disposition: e.target.value })} />
            </div>
            <Textarea rows={2} placeholder="Written explanation (you can finish this at the review step)" value={ar.narrative ?? ""} onChange={(e) => upd(i, { narrative: e.target.value })} />
            <Button variant="ghost" size="sm" onClick={() => patch({ arrests: arrests.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" /> Remove
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => patch({ arrests: [...arrests, {}] })}>
          <Plus className="size-4" /> Add arrest / summons
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="engraved text-text-low">Questionnaire (Q10–28 mirror)</h3>
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

function StepHistory({ a, patch }: StepProps) {
  const refs = a.references ?? []
  const social: SocialAccount[] = a.socialAccounts ?? []
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
            <Field label="Training completion date">
              <Input type="date" value={a.trainingDate ?? ""} onChange={(e) => patch({ trainingDate: e.target.value })} />
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
        <Label className="text-xs">Character references (4 required)</Label>
        <Hint>
          NYC requires four people of good character who know you well. Add their email and we&apos;ll invite each one
          to complete and notarize their reference for you — you don&apos;t have to chase paperwork.
        </Hint>
        {refs.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Full name" value={r.name} onChange={(e) => {
              const copy = [...refs]; copy[i] = { ...copy[i], name: e.target.value }; patch({ references: copy })
            }} />
            <Input placeholder="name@email.com" type="email" value={r.email ?? ""} onChange={(e) => {
              const copy = [...refs]; copy[i] = { ...copy[i], email: e.target.value }; patch({ references: copy })
            }} />
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
