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
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  reqCode: string
  questionnaire: Questionnaire
  initial: Values
  /** Base64 PNG already captured for this case — offered as "use my signature". */
  signatureOnFile: string | null
}) {
  const [values, setValues] = useState<Values>(initial)
  /** answers → sign. A signable document is a DRAFT until the sign step runs. */
  const [step, setStep] = useState<"answers" | "sign">("answers")
  const [pending, startTransition] = useTransition()

  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }))

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
        const r = await submitRequirementRoster(reqCode, values)
        if (r.error) {
          toast.error(r.error)
          return
        }
        if (r.needsSignature) {
          setStep("sign")
          return
        }
        toast.success(r.summary ?? "Invitations sent.", { duration: 9000 })
        onOpenChange(false)
        return
      }

      const saved = await saveRequirementAnswers(reqCode, values)
      if (saved.error) {
        toast.error(saved.error)
        return
      }
      const gen = await generateRequirementDocument(reqCode)
      if (gen.error) {
        toast.error(gen.error)
        return
      }
      if (gen.needsSignature) {
        setStep("sign")
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
    return (
      <div key={id} className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {f.label}
          {f.required && <span className="text-danger"> *</span>}
        </Label>
        {f.help && <p className="text-xs text-text-mid">{f.help}</p>}
        {f.type === "textarea" ? (
          <Textarea
            id={id}
            rows={4}
            className="min-h-[96px]"
            maxLength={f.maxLength}
            placeholder={f.placeholder}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : f.type === "select" ? (
          <select
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm text-foreground outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40"
          >
            <option value="">Select…</option>
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <Input
            id={id}
            className="h-11"
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

          {(questionnaire.fields ?? []).map((f) =>
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
