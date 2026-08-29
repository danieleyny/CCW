"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, TriangleAlert, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { setCaseFact } from "@/app/portal/facts/actions"
import { splitStreet } from "@/lib/forms/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * The portal wants Building Number and Street Name as SEPARATE fields for every
 * address. We store one `street` line, so we parse it — but a parse is a GUESS, so
 * each address is flagged for confirmation until the applicant approves the split.
 * Once confirmed, the stored Building/Street becomes authoritative (the worksheet and
 * signed record prefer it over the render-time heuristic). Nothing is silently taken
 * as final.
 */
export interface AddressSplitInput {
  /** Fact-key prefix, e.g. "applicant.address" (keys: `${prefix}.buildingNumber` …). */
  prefix: string
  label: string
  street: string
  buildingNumber: string
  streetName: string
  confirmed: boolean
}

export function AddressSplits({ caseId, addresses }: { caseId: string; addresses: AddressSplitInput[] }) {
  const present = addresses.filter((a) => a.street.trim())
  if (present.length === 0) return null
  return (
    <section id="address-split" className="scroll-mt-20 space-y-4 rounded-lg border border-hairline bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Building number & street name</h3>
        <p className="mt-0.5 text-xs text-text-mid">
          The NYPD portal asks for the building number and street name separately. We split each address for
          you — please confirm we got it right.
        </p>
      </div>
      {present.map((a) => (
        <SplitRow key={a.prefix} caseId={caseId} address={a} />
      ))}
    </section>
  )
}

function SplitRow({ caseId, address }: { caseId: string; address: AddressSplitInput }) {
  const guess = splitStreet(address.street)
  const [bn, setBn] = useState(address.buildingNumber || guess.buildingNumber)
  const [sn, setSn] = useState(address.streetName || guess.streetName)
  const [confirmed, setConfirmed] = useState(address.confirmed)
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  function confirm() {
    start(async () => {
      const save = (key: string, value: string) => setCaseFact(caseId, key, value, { skipRevalidate: true })
      const results = await Promise.all([
        save(`${address.prefix}.buildingNumber`, bn.trim()),
        save(`${address.prefix}.streetName`, sn.trim()),
        save(`${address.prefix}.streetConfirmed`, "yes"),
      ])
      const err = results.find((r) => r.error)
      if (err?.error) {
        toast.error(err.error)
        return
      }
      setConfirmed(true)
      setEditing(false)
      toast.success("Confirmed — used on your application.")
      router.refresh()
    })
  }

  const settled = confirmed && !editing
  return (
    <div className={`rounded-md border p-3 ${settled ? "border-hairline" : "border-warn/40 bg-warn/[0.05]"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium">{address.label}</div>
        {settled ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-ok">
            <Check className="size-3.5" /> Confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-warn">
            <TriangleAlert className="size-3.5" /> Please confirm
          </span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-text-low">{address.street}</div>

      {settled ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-sm">
            <span className="text-text-low">Bldg</span> {bn || "—"} · <span className="text-text-low">Street</span> {sn || "—"}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Edit
          </Button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <div className="space-y-1">
              <Label className="text-[11px] text-text-low">Building number</Label>
              <Input value={bn} onChange={(e) => setBn(e.target.value)} placeholder="e.g. 123" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-text-low">Street name</Label>
              <Input value={sn} onChange={(e) => setSn(e.target.value)} placeholder="e.g. Main Street" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={confirm} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Confirm split
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
