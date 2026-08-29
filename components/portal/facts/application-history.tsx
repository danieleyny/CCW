"use client"

import { useState, useTransition } from "react"
import { Trash2, Plus, Loader2, Check, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { saveApplicationHistory } from "@/app/portal/facts/actions"
import { splitStreet } from "@/lib/forms/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AddressHistoryEntry, EmploymentHistoryEntry } from "@/lib/intake/answers"

/**
 * The five-year residence + employment history (PD 643-041 Q29) and the out-of-city
 * licence (Q9). These are REPEATABLE rows, so they can't live in the scalar fact
 * layer — they persist to intake_sessions.answers, the same store the intake wizard
 * uses and the same one the application mapper reads. This gives a CONCIERGE
 * applicant (who never sees the wizard) a door to the data. Same add/remove pattern
 * as the wizard's StepHistory.
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
        <Input type="date" className="w-[10rem]" value={fromMonth ?? ""} onChange={(e) => onFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-text-low">To</Label>
        <Input type="date" className="w-[10rem]" value={toMonth ?? ""} disabled={present} onChange={(e) => onTo(e.target.value)} />
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

/**
 * Per-residence-row building/street split — the portal wants them separate. Seeded by
 * parsing the row's address line; a checkbox confirms the guess. Values live on the
 * entry so the parent's save persists them; unconfirmed rows fall back to the
 * render-time split in the worksheet.
 */
function RowSplit({ entry, onChange }: { entry: AddressHistoryEntry; onChange: (patch: Partial<AddressHistoryEntry>) => void }) {
  if (!(entry.address ?? "").trim()) return null
  const guess = splitStreet(entry.address)
  const bn = entry.buildingNumber ?? guess.buildingNumber
  const sn = entry.streetName ?? guess.streetName
  const confirmed = !!entry.streetConfirmed
  return (
    <div className={`rounded-md border p-2 ${confirmed ? "border-hairline" : "border-warn/40 bg-warn/[0.05]"}`}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-text-low">
        {confirmed ? <Check className="size-3 text-ok" /> : <TriangleAlert className="size-3 text-warn" />}
        Portal split (building number · street name)
      </div>
      <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
        <Input className="h-8" placeholder="Bldg #" value={bn} onChange={(e) => onChange({ buildingNumber: e.target.value })} />
        <Input className="h-8" placeholder="Street name" value={sn} onChange={(e) => onChange({ streetName: e.target.value })} />
      </div>
      <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-mid">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onChange({ streetConfirmed: e.target.checked, buildingNumber: bn, streetName: sn })}
          className="size-3.5 rounded border-input"
        />
        This split is correct
      </label>
    </div>
  )
}

export function ApplicationHistory({
  caseId,
  residence,
  employment,
  outOfCity,
}: {
  caseId: string
  residence: AddressHistoryEntry[]
  employment: EmploymentHistoryEntry[]
  outOfCity: { number: string; county: string; issuedOn: string; expiresOn: string }
}) {
  const [res, setRes] = useState<AddressHistoryEntry[]>(residence.length ? residence : [{}])
  const [emp, setEmp] = useState<EmploymentHistoryEntry[]>(employment.length ? employment : [{}])
  const [ooc, setOoc] = useState(outOfCity)
  const [pending, start] = useTransition()

  function save() {
    start(async () => {
      const clean = <T extends object>(rows: T[]) => rows.filter((r) => Object.values(r).some((v) => v != null && v !== ""))
      const r = await saveApplicationHistory(caseId, {
        residenceHistory: clean(res),
        employmentHistory: clean(emp),
        outOfCity: ooc,
      })
      if (r.error) toast.error(r.error)
      else toast.success("Saved — updated on your application.")
    })
  }

  return (
    <section id="history" className="scroll-mt-20 space-y-4 rounded-lg border border-hairline bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Five-year history & out-of-city licence</h3>
        <p className="mt-0.5 text-xs text-text-mid">
          Questions 29 and 9 on the application. List newest first.
        </p>
      </div>

      {/* Residence — Q29 */}
      <div className="space-y-2">
        <Label className="text-xs">Places of residence — past 5 years</Label>
        {res.map((h, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
            <div className="flex items-start justify-between gap-2">
              <HistoryDates
                fromMonth={h.fromMonth}
                toMonth={h.toMonth}
                onFrom={(v) => setRes((c) => c.map((x, j) => (j === i ? { ...x, fromMonth: v } : x)))}
                onTo={(v) => setRes((c) => c.map((x, j) => (j === i ? { ...x, toMonth: v } : x)))}
              />
              <Button variant="ghost" size="icon" onClick={() => setRes((c) => c.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Input
              placeholder="Address (street, city, state, county, zip, apt)"
              value={h.address ?? ""}
              onChange={(e) => setRes((c) => c.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))}
            />
            <RowSplit
              entry={h}
              onChange={(patch) => setRes((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRes((c) => [...c, {}])}>
          <Plus className="size-4" /> Add residence
        </Button>
      </div>

      {/* Employment — Q29 */}
      <div className="space-y-2">
        <Label className="text-xs">Places of employment — past 5 years</Label>
        {emp.map((h, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
            <div className="flex items-start justify-between gap-2">
              <HistoryDates
                fromMonth={h.fromMonth}
                toMonth={h.toMonth}
                onFrom={(v) => setEmp((c) => c.map((x, j) => (j === i ? { ...x, fromMonth: v } : x)))}
                onTo={(v) => setEmp((c) => c.map((x, j) => (j === i ? { ...x, toMonth: v } : x)))}
              />
              <Button variant="ghost" size="icon" onClick={() => setEmp((c) => c.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Business name"
                value={h.employerName ?? h.employer ?? ""}
                onChange={(e) => setEmp((c) => c.map((x, j) => (j === i ? { ...x, employerName: e.target.value, employer: undefined } : x)))}
              />
              <Input
                placeholder="Business address"
                value={h.employerAddress ?? ""}
                onChange={(e) => setEmp((c) => c.map((x, j) => (j === i ? { ...x, employerAddress: e.target.value } : x)))}
              />
            </div>
            <Input
              placeholder="Occupation"
              value={h.occupation ?? ""}
              onChange={(e) => setEmp((c) => c.map((x, j) => (j === i ? { ...x, occupation: e.target.value } : x)))}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setEmp((c) => [...c, {}])}>
          <Plus className="size-4" /> Add employment
        </Button>
      </div>

      {/* Out-of-city licence (Q9) — only for a Special Carry (out-of-city) applicant. */}
      <div className="space-y-2">
        <Label className="text-xs">Out-of-city licence (Special Carry only, if you hold one)</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Licence number" value={ooc.number} onChange={(e) => setOoc((o) => ({ ...o, number: e.target.value }))} />
          <Input placeholder="County" value={ooc.county} onChange={(e) => setOoc((o) => ({ ...o, county: e.target.value }))} />
          <div className="space-y-1">
            <Label className="text-[11px] text-text-low">Date issued</Label>
            <Input type="date" value={ooc.issuedOn} onChange={(e) => setOoc((o) => ({ ...o, issuedOn: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-text-low">Expires</Label>
            <Input type="date" value={ooc.expiresOn} onChange={(e) => setOoc((o) => ({ ...o, expiresOn: e.target.value }))} />
          </div>
        </div>
      </div>

      <Button size="sm" disabled={pending} onClick={save} className="min-h-[36px]">
        {pending ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Check className="mr-1 size-3.5" />}
        Save history
      </Button>
    </section>
  )
}
