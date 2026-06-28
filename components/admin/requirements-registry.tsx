"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { ChevronDown, Plus, Archive } from "lucide-react"
import { addRequirementVersion, retireRequirement } from "@/app/admin/requirements/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface RegistryVersion {
  id: string
  req_code: string
  title: string
  description: string | null
  authority: string | null
  severity: string
  trigger_cond: string
  document_type: string | null
  effective_from: string
  effective_to: string | null
}

const SEVERITIES = ["critical", "high", "watch", "long_lead"] as const

function isInForce(v: RegistryVersion, today: string): boolean {
  return v.effective_from <= today && (v.effective_to === null || v.effective_to >= today)
}

export function RequirementsRegistry({
  jurisdictions,
  selectedKey,
  versions,
}: {
  jurisdictions: { key: string; label: string; active: boolean }[]
  selectedKey: string
  versions: RegistryVersion[]
}) {
  // Group versions by req_code (input is already sorted: req_code asc, effective_from desc).
  const groups: { reqCode: string; versions: RegistryVersion[] }[] = []
  for (const v of versions) {
    const g = groups.find((x) => x.reqCode === v.req_code)
    if (g) g.versions.push(v)
    else groups.push({ reqCode: v.req_code, versions: [v] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {jurisdictions.map((j) => (
          <Link
            key={j.key}
            href={`/admin/requirements?j=${j.key}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              j.key === selectedKey
                ? "border-brass/40 bg-brass/10 text-brass"
                : "border-hairline text-text-mid hover:bg-surface-2/60"
            )}
          >
            {j.label}
            {!j.active && <span className="ml-1 text-text-low">(future)</span>}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {groups.map((g) => (
          <ReqGroupEditor key={g.reqCode} reqCode={g.reqCode} versions={g.versions} />
        ))}
        {groups.length === 0 && (
          <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            No requirements seeded for this jurisdiction yet.
          </p>
        )}
      </div>
    </div>
  )
}

function ReqGroupEditor({
  reqCode,
  versions,
}: {
  reqCode: string
  versions: RegistryVersion[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const active = versions.find((v) => isInForce(v, today)) ?? versions[0]
  const [open, setOpen] = useState(false)

  const [retireState, retireAction, retirePending] = useActionState(retireRequirement, {})
  const [addState, addAction, addPending] = useActionState(addRequirementVersion, {})

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-mid">
              {reqCode}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-text-low">
              {active.severity.replace(/_/g, " ")} · {active.trigger_cond}
            </span>
          </div>
          <div className="mt-1 text-sm font-medium">{active.title}</div>
          {active.authority && (
            <p className="mt-0.5 font-mono text-[10px] text-text-low">{active.authority}</p>
          )}
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] text-text-low">
            {versions.length} version{versions.length > 1 ? "s" : ""}
          </span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-hairline p-4">
          {/* Version history */}
          <div>
            <div className="engraved mb-2 text-text-low">Versions</div>
            <ul className="space-y-1">
              {versions.map((v) => {
                const inForce = isInForce(v, today)
                return (
                  <li key={v.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-text-mid">
                      {v.effective_from} → {v.effective_to ?? "current"}
                    </span>
                    {inForce ? (
                      <span className="rounded bg-ok/12 px-1.5 py-0.5 text-[10px] text-ok">in force</span>
                    ) : (
                      <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-text-low">retired</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Retire the in-force version */}
          {active.effective_to === null && (
            <form action={retireAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={active.id} />
              <div>
                <Label htmlFor={`retire-${reqCode}`} className="text-xs">
                  Retire current version (effective to)
                </Label>
                <Input
                  id={`retire-${reqCode}`}
                  name="effectiveTo"
                  type="date"
                  defaultValue={today}
                  className="h-9 w-44"
                />
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={retirePending}>
                <Archive className="size-4" />
                Retire
              </Button>
              {retireState.error && <p className="text-xs text-danger">{retireState.error}</p>}
              {retireState.ok && <p className="text-xs text-ok">Retired.</p>}
            </form>
          )}

          {/* Add a new dated version */}
          <form action={addAction} className="space-y-2 rounded-md border border-hairline p-3">
            <div className="engraved text-text-low">Add new version</div>
            <input type="hidden" name="sourceId" value={active.id} />
            <div>
              <Label htmlFor={`title-${reqCode}`} className="text-xs">Title</Label>
              <Input id={`title-${reqCode}`} name="title" defaultValue={active.title} className="h-9" />
            </div>
            <div>
              <Label htmlFor={`authority-${reqCode}`} className="text-xs">Authority</Label>
              <Input id={`authority-${reqCode}`} name="authority" defaultValue={active.authority ?? ""} className="h-9" />
            </div>
            <div>
              <Label htmlFor={`desc-${reqCode}`} className="text-xs">Description</Label>
              <Textarea id={`desc-${reqCode}`} name="description" defaultValue={active.description ?? ""} rows={2} />
            </div>
            <div className="flex flex-wrap gap-2">
              <div>
                <Label htmlFor={`sev-${reqCode}`} className="text-xs">Severity</Label>
                <select
                  id={`sev-${reqCode}`}
                  name="severity"
                  defaultValue={active.severity}
                  className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`from-${reqCode}`} className="text-xs">Effective from</Label>
                <Input id={`from-${reqCode}`} name="effectiveFrom" type="date" defaultValue={today} className="h-9 w-44" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={addPending}>
                <Plus className="size-4" />
                Add version
              </Button>
              {addState.error && <p className="text-xs text-danger">{addState.error}</p>}
              {addState.ok && <p className="text-xs text-ok">New version added.</p>}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
