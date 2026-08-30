"use client"

import { useRef, useState, useTransition } from "react"
import { Trash2, Plus, Loader2, Check, AlertCircle } from "lucide-react"
import { saveApplicationHistory } from "@/app/portal/facts/actions"
import { portalDate } from "@/lib/forms/format"
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

export function ApplicationHistory({
  caseId,
  residence,
  employment,
  employerSeed,
  outOfCity,
}: {
  caseId: string
  residence: AddressHistoryEntry[]
  employment: EmploymentHistoryEntry[]
  /** #9 — seed employment row 1 from the employer we already collected. */
  employerSeed?: { employed: boolean; startDate: string; name: string; occupation: string }
  outOfCity: { number: string; county: string; issuedOn: string; expiresOn: string }
}) {
  // #9 — when the case has an employer with a start date and NO employment history yet,
  // seed row 1 from it (marked _seeded so a later employer edit never clobbers an edit).
  const seededEmp = (): EmploymentHistoryEntry[] => {
    if (employment.length) return employment
    if (employerSeed?.employed && employerSeed.startDate) {
      return [{ fromMonth: employerSeed.startDate, toMonth: "", employerName: employerSeed.name, occupation: employerSeed.occupation, _seeded: true } as EmploymentHistoryEntry]
    }
    return [{}]
  }
  const [res, setRes] = useState<AddressHistoryEntry[]>(residence.length ? residence : [{}])
  const [emp, setEmp] = useState<EmploymentHistoryEntry[]>(seededEmp)
  const [ooc, setOoc] = useState(outOfCity)
  const [hasOoc, setHasOoc] = useState<"" | "no" | "yes">(
    outOfCity.number || outOfCity.county || outOfCity.issuedOn || outOfCity.expiresOn ? "yes" : ""
  )
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  function save() {
    start(async () => {
      setStatus("saving")
      const clean = <T extends object>(rows: T[]) => rows.filter((r) => Object.values(r).some((v) => v != null && v !== "" && v !== false))
      // Strip the UI-only _seeded marker before persisting.
      const empClean = clean(emp).map(({ _seeded, ...rest }) => rest) // eslint-disable-line @typescript-eslint/no-unused-vars
      const r = await saveApplicationHistory(caseId, {
        residenceHistory: clean(res),
        employmentHistory: empClean,
        outOfCity: ooc,
      })
      // #11 — a failed save keeps the typed values on screen with an inline error; never revert.
      setStatus(r.error ? "error" : "saved")
    })
  }

  // #11 — autosave on blur, so a five-year history is never lost to a stray click. A
  // section-level blur fires whenever focus leaves any field (including tabbing away or
  // navigating). Only saves once something has actually changed since the last save.
  const dirty = useRef(false)
  const markDirty = () => {
    dirty.current = true
  }
  const onSectionBlur = (e: React.FocusEvent<HTMLElement>) => {
    // Ignore focus moves that stay inside the section.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (dirty.current) {
      dirty.current = false
      save()
    }
  }

  return (
    <section
      id="history"
      className="scroll-mt-20 space-y-4 rounded-lg border border-hairline bg-card p-4"
      onChange={markDirty}
      onBlur={onSectionBlur}
    >
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
              placeholder="Street address (e.g. 123 Main St)"
              value={h.address ?? ""}
              onChange={(e) => setRes((c) => c.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))}
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr_5rem_6rem]">
              <Input placeholder="Apt/Unit" value={h.apt ?? ""} onChange={(e) => setRes((c) => c.map((x, j) => (j === i ? { ...x, apt: e.target.value } : x)))} />
              <Input placeholder="City" value={h.city ?? ""} onChange={(e) => setRes((c) => c.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} />
              <Input placeholder="State" value={h.state ?? ""} onChange={(e) => setRes((c) => c.map((x, j) => (j === i ? { ...x, state: e.target.value } : x)))} />
              <Input placeholder="ZIP" value={h.zip ?? ""} onChange={(e) => setRes((c) => c.map((x, j) => (j === i ? { ...x, zip: e.target.value } : x)))} />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRes((c) => [...c, {}])}>
          <Plus className="size-4" /> Add residence
        </Button>
      </div>

      {/* Employment — Q29 */}
      <div className="space-y-2">
        <Label className="text-xs">Places of employment — past 5 years</Label>
        <EmploymentCoverage seed={employerSeed} />
        {emp.map((h, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
            {h._seeded && (
              <p className="text-[11px] text-signal">Filled in from your employer — edit if anything&apos;s off.</p>
            )}
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

      {/* Out-of-city licence (Q9) — behind a Yes/No; the four fields render only on Yes. */}
      <div className="space-y-2">
        <Label className="text-xs">Do you hold a pistol licence from another New York county?</Label>
        <select
          className="h-9 w-full max-w-[12rem] rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm outline-none"
          value={hasOoc}
          onChange={(e) => {
            const v = e.target.value as "" | "no" | "yes"
            setHasOoc(v)
            if (v !== "yes") setOoc({ number: "", county: "", issuedOn: "", expiresOn: "" })
          }}
        >
          <option value="">Select…</option>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
        {hasOoc === "yes" && (
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
        )}
      </div>

      {/* #11 — saves happen automatically; this is a status line, not the only path. */}
      <div className="flex items-center gap-2 text-xs" aria-live="polite">
        {status === "saving" && (
          <span className="flex items-center gap-1.5 text-text-low">
            <Loader2 className="size-3.5 animate-spin" /> Saving…
          </span>
        )}
        {status === "saved" && (
          <span className="flex items-center gap-1.5 text-ok">
            <Check className="size-3.5" /> Saved — updated on your application.
          </span>
        )}
        {status === "error" && (
          <span className="flex items-center gap-1.5 text-danger">
            <AlertCircle className="size-3.5" /> Couldn&apos;t save — your entries are safe; we&apos;ll retry as you edit.
          </span>
        )}
        {status === "idle" && <span className="text-text-low">Changes save automatically.</span>}
        <Button size="sm" variant="outline" disabled={pending} onClick={save} className="ml-auto min-h-[36px]">
          {pending ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Check className="mr-1 size-3.5" />}
          Save now
        </Button>
      </div>
    </section>
  )
}

/** #9 — a one-line coverage note based on the seeded employer's start date. */
function EmploymentCoverage({ seed }: { seed?: { employed: boolean; startDate: string } }) {
  if (!seed?.employed || !seed.startDate) return null
  const start = new Date(seed.startDate)
  if (isNaN(start.getTime())) return null
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  const coversAll = start.getTime() <= fiveYearsAgo.getTime()
  return (
    <p className="rounded-md border border-signal/25 bg-signal/[0.05] p-2 text-[11px] text-text-mid">
      {coversAll
        ? "This job covers the full five years. Nothing else needed here."
        : `This covers back to ${portalDate(seed.startDate)}. Add anything before that.`}
    </p>
  )
}
