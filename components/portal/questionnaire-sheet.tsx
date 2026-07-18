"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, ShieldAlert, Scale } from "lucide-react"
import { toast } from "sonner"
import type { Field, Questionnaire } from "@/lib/requirements/questionnaires"
import { saveRequirementAnswers, generateRequirementDocument } from "@/app/portal/requirements/actions"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
export function QuestionnaireSheet({
  open,
  onOpenChange,
  reqCode,
  questionnaire,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  reqCode: string
  questionnaire: Questionnaire
  initial: Values
}) {
  const [values, setValues] = useState<Values>(initial)
  const [pending, startTransition] = useTransition()

  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }))

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
      toast.success("Your document is ready to download.")
      onOpenChange(false)
    })
  }

  function renderField(f: Field, value: unknown, onChange: (v: unknown) => void, key: string) {
    const id = `${key}-${f.name}`
    if (f.type === "checkbox") {
      return (
        <label key={id} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0"
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
            <Button type="button" size="sm" variant={yes ? "default" : "outline"} onClick={() => onChange("yes")}>Yes</Button>
            <Button type="button" size="sm" variant={no ? "default" : "outline"} onClick={() => onChange("no")}>No</Button>
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
            className="h-10 w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm text-foreground outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40"
          >
            <option value="">Select…</option>
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <Input
            id={id}
            type={f.type === "date" ? "date" : "text"}
            maxLength={f.maxLength}
            placeholder={f.placeholder}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* `dark` is required here: Radix portals mount at document.body, OUTSIDE the
          app's .dark shell, so without it the drawer renders in the light
          marketing palette while the app around it is obsidian. */}
      <SheetContent side="right" className="dark w-full overflow-y-auto bg-background text-foreground sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{questionnaire.title}</SheetTitle>
        </SheetHeader>

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

          <Button onClick={submit} disabled={pending} className="w-full">
            {pending ? "Generating…" : questionnaire.submitLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
