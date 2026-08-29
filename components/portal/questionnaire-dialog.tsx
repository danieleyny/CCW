"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, ShieldAlert, Scale } from "lucide-react"
import { toast } from "sonner"
import type { Field, Questionnaire } from "@/lib/requirements/questionnaires"
import {
  saveRequirementAnswers,
  generateRequirementDocument,
  submitRequirementRoster,
} from "@/app/portal/requirements/actions"
import { actionFor } from "@/lib/requirements/actions"
import { SignDocument } from "@/components/portal/sign-document"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Values = Record<string, unknown>

/** The Letter-of-Necessity scope categories a licence track is asked (always incl.
 *  "all"). A Concealed Carry applicant gets {all, carry} → the three "all"/"carry"
 *  statements; a Carry Guard/Security applicant additionally gets the guard/business
 *  ones. */
function lonCategoriesFor(track?: string | null): Set<string> {
  const cats = new Set<string>(["all"])
  if (track === "carry_guard" || track === "special_carry_guard") {
    cats.add("carry").add("guard").add("business")
  } else if (track === "premises") {
    cats.add("business")
  } else {
    cats.add("carry") // concealed_carry / special_carry / default
  }
  return cats
}

/**
 * Generic renderer for any questionnaire schema — adding a document is a data
 * change, not a UI change. Handles text/date/select/textarea/checkbox, yes-no
 * with reveal-on-yes follow-ups, and repeatable groups.
 */
export function QuestionnaireDialog({
  open,
  onOpenChange,
  reqCode,
  questionnaire,
  initial,
  signatureOnFile,
  caseId,
  canAdopt = true,
  lockParty,
  isLeo,
  licenseTrack,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  reqCode: string
  questionnaire: Questionnaire
  initial: Values
  /** Base64 PNG already captured for this case — offered as "use my signature". */
  signatureOnFile: string | null
  /** Sponsor parity: the case being drafted for. Omitted by the applicant. */
  caseId?: string
  /** Whether THIS actor may adopt (sign). False for a sponsor — a drafted sworn
   *  document waits for the applicant to review and sign. */
  canAdopt?: boolean
  /** On a co-authored document (Letter of Necessity) on a SPONSORED case, the party
   *  viewing. Fields owned by the OTHER party render read-only — the save layer
   *  enforces the same split, this just shows it. Absent ⇒ no field is locked. */
  lockParty?: "applicant" | "sponsor"
  /** Whether this is a law-enforcement applicant. leoOnly fields (portal Q16) are
   *  hidden — and never validated or recorded — for everyone else. */
  isLeo?: boolean
  /** The case's licence track — scopes the Letter of Necessity statements (a Concealed
   *  Carry applicant is asked only the "all" + "carry" statements, not all six). */
  licenseTrack?: string | null
}) {
  const isLocked = (f: Field) => !!lockParty && !!f.party && f.party !== lockParty
  const otherLabel = lockParty === "applicant" ? "your employer" : "the applicant"
  const lonCats = lonCategoriesFor(licenseTrack)
  // leoOnly questions never render for a non-LEO; LON statements only for their track.
  const visibleFields = (questionnaire.fields ?? []).filter(
    (f) => (!f.leoOnly || isLeo) && (!f.lonScope || lonCats.has(f.lonScope))
  )
  const [values, setValues] = useState<Values>(initial)
  /** answers → sign. A signable document is a DRAFT until the sign step runs. */
  const [step, setStep] = useState<"answers" | "sign">("answers")
  const [pending, startTransition] = useTransition()
  /** A persistent block (e.g. a disqualifying answer) that stops generation. */
  const [blockMsg, setBlockMsg] = useState<string | null>(null)

  // Editing any answer clears a standing block so a corrected answer isn't
  // haunted by the old message.
  const set = (name: string, v: unknown) => {
    setBlockMsg(null)
    setValues((s) => ({ ...s, [name]: v }))
  }

  // Same-kind address suggestions: every address-ish value the prefill already
  // knows becomes a native datalist entry on address text fields, so an address
  // the user cleared or edited is one keystroke away — never auto-clobbered.
  const knownAddresses = [
    ...new Set(
      Object.entries(initial)
        .filter(([k, v]) => /address/i.test(k) && typeof v === "string" && (v as string).trim())
        .map(([, v]) => (v as string).trim())
    ),
  ]

  const groupRows = (name: string): Values[] => {
    const v = values[name]
    return Array.isArray(v) && v.length ? (v as Values[]) : [{}]
  }
  const setRow = (group: string, i: number, name: string, v: unknown) => {
    const rows = [...groupRows(group)]
    rows[i] = { ...rows[i], [name]: v }
    set(group, rows)
  }

  function submit() {
    startTransition(async () => {
      // ROSTER: these documents are written and notarized by other people. The
      // submission creates them and sends each their private link — there is no
      // PDF to generate, which is what used to dead-end here.
      if (actionFor(reqCode)?.mode === "roster") {
        // References: at least 2 must not be family (NYPD). Cap family at
        // (required − 2). Block with an alert before any invite goes out.
        const rosterAction = actionFor(reqCode)
        if (rosterAction?.mode === "roster" && rosterAction.roster === "references") {
          const refs = Array.isArray(values.references) ? (values.references as Values[]) : []
          const familyCount = refs.filter((r) => (r as { isFamily?: string }).isFamily === "yes").length
          const maxFamily = Math.max(0, (rosterAction.minimum ?? 4) - 2)
          if (familyCount > maxFamily) {
            toast.error(
              maxFamily === 0
                ? "None of your references can be family — all must be people not related to you."
                : `At least two references must not be family, so at most ${maxFamily} can be a family member. You've marked ${familyCount}.`,
              { duration: 8000 }
            )
            return
          }
        }
        const r = await submitRequirementRoster(reqCode, values, caseId)
        if (r.error) {
          toast.error(r.error)
          return
        }
        if (r.needsSignature) {
          if (canAdopt) {
            setStep("sign")
          } else {
            toast.success("Draft prepared — the applicant will review and sign it.", { duration: 9000 })
            onOpenChange(false)
          }
          return
        }
        toast.success(r.summary ?? "Invitations sent.", { duration: 9000 })
        onOpenChange(false)
        return
      }

      // GENERATE: every yes/no question must be answered before we produce the
      // document, and a "yes" on a per-se prohibitor blocks generation and routes
      // to an attorney instead. yesno fields are always top-level in our schemas.
      const yesNoFields = visibleFields.filter((f) => f.type === "yesno")
      const answered = (v: unknown) => v === "yes" || v === "no" || v === true || v === false
      const isYes = (v: unknown) => v === "yes" || v === true

      if (yesNoFields.some((f) => !answered(values[f.name]))) {
        toast.error("Please answer yes or no to every question before we generate your document.", {
          duration: 7000,
        })
        return
      }
      const blocker = yesNoFields.find((f) => f.blockOnYes && isYes(values[f.name]))
      if (blocker) {
        setBlockMsg(blocker.blockOnYes!)
        return
      }
      setBlockMsg(null)

      // Ephemeral fields (e.g. SSN) are filled into the PDF but NEVER saved: split
      // them out of the persisted answers and pass them transiently to generation.
      const ephemeralNames = new Set<string>()
      for (const f of visibleFields) {
        if (f.ephemeral) ephemeralNames.add(f.name)
        for (const sub of f.revealOnYes ?? []) if (sub.ephemeral) ephemeralNames.add(sub.name)
      }
      const persisted: Values = {}
      const ephemeral: Values = {}
      for (const [k, v] of Object.entries(values)) {
        if (ephemeralNames.has(k)) ephemeral[k] = v
        else persisted[k] = v
      }

      const saved = await saveRequirementAnswers(reqCode, persisted, caseId)
      if (saved.error) {
        toast.error(saved.error)
        return
      }
      const gen = await generateRequirementDocument(reqCode, caseId, ephemeral)
      if (gen.error) {
        toast.error(gen.error)
        return
      }
      if (gen.incomplete?.length) {
        toast.error(`This form isn't complete yet — it still needs: ${gen.incomplete.join(", ")}. Add those, then generate again.`, {
          duration: 9000,
        })
        return
      }
      if (gen.needsSignature) {
        if (canAdopt) {
          setStep("sign")
        } else {
          // A sponsor drafted a sworn document — it stays a draft until the
          // applicant reviews and signs. The sponsor never adopts.
          toast.success("Draft prepared — the applicant will review and sign it.", { duration: 9000 })
          onOpenChange(false)
        }
        return
      }
      toast.success("Your document is ready to download.")
      onOpenChange(false)
    })
  }

  function renderField(f: Field, value: unknown, onChange: (v: unknown) => void, key: string) {
    const id = `${key}-${f.name}`
    if (f.type === "checkbox") {
      return (
        // Touch target: on a phone the whole row is tappable and at least 44px
        // tall — a 16px checkbox is a miss waiting to happen.
        <label key={id} className="flex min-h-[44px] cursor-pointer items-start gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 max-sm:size-6"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{f.label}</span>
        </label>
      )
    }
    if (f.type === "yesno") {
      const yes = value === true || value === "yes"
      const no = value === false || value === "no"
      return (
        <div key={id} className="space-y-2">
          <Label className="text-sm">{f.label}</Label>
          {f.help && <p className="text-xs text-text-mid">{f.help}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" className="min-h-[44px] min-w-16" variant={yes ? "default" : "outline"} onClick={() => onChange("yes")}>Yes</Button>
            <Button type="button" size="sm" className="min-h-[44px] min-w-16" variant={no ? "default" : "outline"} onClick={() => onChange("no")}>No</Button>
          </div>
          {yes && f.revealOnYes && (
            <div className="mt-2 space-y-3 border-l-2 border-brass/40 pl-3">
              {f.revealOnYes.map((sub) =>
                renderField(sub, values[sub.name], (v) => set(sub.name, v), id)
              )}
            </div>
          )}
        </div>
      )
    }
    const locked = isLocked(f)
    return (
      <div key={id} className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {f.label}
          {f.required && !locked && <span className="text-danger"> *</span>}
        </Label>
        {locked ? (
          <p className="text-xs text-text-low">Provided by {otherLabel} — you can&apos;t change it here.</p>
        ) : (
          f.help && <p className="text-xs text-text-mid">{f.help}</p>
        )}
        {f.type === "textarea" ? (
          <Textarea
            id={id}
            rows={4}
            className="min-h-[96px]"
            maxLength={f.maxLength}
            placeholder={f.placeholder}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={locked}
            readOnly={locked}
          />
        ) : f.type === "select" ? (
          <select
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="h-[var(--tap)] w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-base text-foreground outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40 sm:h-11 sm:text-sm"
          >
            <option value="">Select…</option>
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <Input
            id={id}
            className="h-[var(--tap)] sm:h-11"
            type={f.type === "date" ? "date" : "text"}
            maxLength={f.maxLength}
            placeholder={f.placeholder}
            list={f.type === "text" && /address/i.test(f.name) && knownAddresses.length ? "known-addresses-q" : undefined}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CENTERED, not a right-hand drawer: this is the main task on the screen,
          and a form pinned to one edge reads like a side panel you can ignore.
          `dark` is required — Radix portals mount at document.body, OUTSIDE the
          app's .dark shell, so without it the modal renders in the light
          marketing palette while the app around it is obsidian.
          On a phone it fills the screen; on desktop it caps at ~640px and
          scrolls internally rather than pushing the page around. */}
      <DialogContent className="dark flex max-h-[90dvh] w-full flex-col overflow-hidden bg-background p-0 text-foreground sm:max-w-2xl">
        <DialogHeader className="border-b border-hairline px-4 py-3">
          <DialogTitle>{questionnaire.title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">

        {step === "sign" ? (
          <div className="space-y-4 px-4 pb-8">
            <p className="text-sm text-text-mid">
              Your draft is ready. Read it, then sign — the document only counts once it&apos;s
              signed, and the date on it is the date you sign.
            </p>
            <SignDocument
              reqCode={reqCode}
              signatureOnFile={signatureOnFile}
              onSigned={() => {
                setStep("answers")
                onOpenChange(false)
              }}
            />
            <Button variant="ghost" className="w-full" onClick={() => setStep("answers")}>
              Back to my answers
            </Button>
            <p className="text-xs text-text-low">
              You can close this and sign later — your draft is saved under Documents, marked
              “DRAFT — unsigned”.
            </p>
          </div>
        ) : (
        <div className="space-y-5 px-4 pb-8">
          <p className="text-sm text-text-mid">{questionnaire.intro}</p>

          {questionnaire.notice && (
            <div className="flex gap-2 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>{questionnaire.notice}</span>
            </div>
          )}

          {visibleFields.map((f) =>
            renderField(f, values[f.name], (v) => set(f.name, v), "f")
          )}

          {(questionnaire.groups ?? []).map((g) => (
            <div key={g.name} className="space-y-3">
              <div>
                <div className="engraved text-text-low">{g.label}</div>
                {g.help && <p className="mt-1 text-xs text-text-mid">{g.help}</p>}
              </div>
              {groupRows(g.name).map((row, i) => (
                <div key={i} className="space-y-3 rounded-md border border-hairline p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-low">#{i + 1}</span>
                    {groupRows(g.name).length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Remove"
                        onClick={() => set(g.name, groupRows(g.name).filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                  {g.fields.map((f) =>
                    renderField(f, row[f.name], (v) => setRow(g.name, i, f.name, v), `${g.name}-${i}`)
                  )}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => set(g.name, [...groupRows(g.name), {}])}
              >
                <Plus className="mr-1 size-3.5" /> {g.addLabel}
              </Button>
            </div>
          ))}

          {questionnaire.attorneySeam && (
            <div className="flex gap-2 rounded-md border border-hairline bg-surface-2/50 p-3 text-xs text-text-mid">
              <Scale className="mt-0.5 size-4 shrink-0 text-brass" />
              <span>
                We help you state the facts accurately — we can&apos;t tell you what your specific
                record means for your application. That&apos;s legal advice, and only a licensed New
                York attorney can give it. Ask us and we&apos;ll refer you.
              </span>
            </div>
          )}

          {blockMsg && (
            <div className="flex gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>{blockMsg}</span>
            </div>
          )}

          <Button onClick={submit} disabled={pending} className="min-h-[44px] w-full">
            {pending ? "Generating…" : questionnaire.submitLabel}
          </Button>

          {knownAddresses.length > 0 && (
            <datalist id="known-addresses-q">
              {knownAddresses.map((addr) => (
                <option key={addr} value={addr} />
              ))}
            </datalist>
          )}
        </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
