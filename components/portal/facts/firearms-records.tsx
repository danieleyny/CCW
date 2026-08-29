"use client"

import { useState, useTransition } from "react"
import { Trash2, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveFirearmsAndLicenses } from "@/app/portal/facts/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FirearmEntry, OtherLicenseEntry } from "@/lib/intake/answers"

/**
 * The portal's two record TABLES that have no scalar home: firearms the applicant
 * already owns, and other firearms licences they hold. Both are repeatable rows, so —
 * like the five-year history — they live in intake_sessions.answers rather than the
 * scalar fact layer. Empty rows are dropped on save so a blank table stays "None".
 */
export function FirearmsRecords({
  caseId,
  firearms,
  otherLicenses,
}: {
  caseId: string
  firearms: FirearmEntry[]
  otherLicenses: OtherLicenseEntry[]
}) {
  const [guns, setGuns] = useState<FirearmEntry[]>(firearms)
  const [lics, setLics] = useState<OtherLicenseEntry[]>(otherLicenses)
  const [pending, start] = useTransition()

  function save() {
    start(async () => {
      const clean = <T extends object>(rows: T[]) => rows.filter((r) => Object.values(r).some((v) => v != null && v !== ""))
      const r = await saveFirearmsAndLicenses(caseId, { firearms: clean(guns), otherLicenses: clean(lics) })
      if (r.error) toast.error(r.error)
      else toast.success("Saved — updated on your application.")
    })
  }

  return (
    <section id="records" className="scroll-mt-20 space-y-4 rounded-lg border border-hairline bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Firearms & other licences</h3>
        <p className="mt-0.5 text-xs text-text-mid">
          Handguns or long guns you currently own, and any other firearms licences you hold. Leave blank if none.
        </p>
      </div>

      {/* Firearms owned */}
      <div className="space-y-2">
        <Label className="text-xs">Firearms you currently own</Label>
        {guns.map((g, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-hairline p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Input placeholder="Make" value={g.make ?? ""} onChange={(e) => setGuns((c) => c.map((x, j) => (j === i ? { ...x, make: e.target.value } : x)))} />
            <Input placeholder="Model" value={g.model ?? ""} onChange={(e) => setGuns((c) => c.map((x, j) => (j === i ? { ...x, model: e.target.value } : x)))} />
            <Input placeholder="Caliber" value={g.caliber ?? ""} onChange={(e) => setGuns((c) => c.map((x, j) => (j === i ? { ...x, caliber: e.target.value } : x)))} />
            <Input placeholder="Serial number" value={g.serial ?? ""} onChange={(e) => setGuns((c) => c.map((x, j) => (j === i ? { ...x, serial: e.target.value } : x)))} />
            <Button variant="ghost" size="icon" onClick={() => setGuns((c) => c.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setGuns((c) => [...c, {}])}>
          <Plus className="size-4" /> Add firearm
        </Button>
      </div>

      {/* Other licences held */}
      <div className="space-y-2">
        <Label className="text-xs">Other firearms licences you hold</Label>
        {lics.map((l, i) => (
          <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
            <div className="flex items-start justify-between gap-2">
              <Input placeholder="License / permit number" value={l.number ?? ""} onChange={(e) => setLics((c) => c.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)))} />
              <Button variant="ghost" size="icon" onClick={() => setLics((c) => c.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Issuing agency or authority" value={l.agency ?? ""} onChange={(e) => setLics((c) => c.map((x, j) => (j === i ? { ...x, agency: e.target.value } : x)))} />
              <Input placeholder="State and county of issuance" value={l.stateCounty ?? ""} onChange={(e) => setLics((c) => c.map((x, j) => (j === i ? { ...x, stateCounty: e.target.value } : x)))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-text-low">Date issued</Label>
                <Input type="date" value={l.issuedOn ?? ""} onChange={(e) => setLics((c) => c.map((x, j) => (j === i ? { ...x, issuedOn: e.target.value } : x)))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-text-low">Expiration date</Label>
                <Input type="date" value={l.expiresOn ?? ""} onChange={(e) => setLics((c) => c.map((x, j) => (j === i ? { ...x, expiresOn: e.target.value } : x)))} />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setLics((c) => [...c, {}])}>
          <Plus className="size-4" /> Add licence
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Save records
        </Button>
      </div>
    </section>
  )
}
