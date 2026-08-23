"use client"

import { useState, useTransition } from "react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { saveCustodian } from "@/app/sponsor/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** SPN-05 — the gun custodian is structured company data, not a file upload. */
export function CustodianForm({ caseId, satisfied }: { caseId: string; satisfied: boolean }) {
  const [pending, start] = useTransition()
  const [done, setDone] = useState(satisfied)
  const [open, setOpen] = useState(!satisfied)

  function submit(formData: FormData) {
    formData.set("caseId", caseId)
    start(async () => {
      const r = await saveCustodian(formData)
      if (r.error) {
        toast.error(r.error)
        return
      }
      setDone(true)
      setOpen(false)
      toast.success("Gun custodian recorded.")
    })
  }

  if (done && !open) {
    return (
      <button className="text-sm text-signal underline" onClick={() => setOpen(true)}>
        Custodian recorded — edit
      </button>
    )
  }

  return (
    <form action={submit} className="space-y-3 rounded-md border border-hairline bg-surface-2/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cust-name" className="text-xs">Custodian name</Label>
          <Input id="cust-name" name="custodian_name" className="mt-1" required />
        </div>
        <div>
          <Label htmlFor="cust-lic" className="text-xs">NYPD licence number</Label>
          <Input id="cust-lic" name="custodian_license_number" className="mt-1" required />
        </div>
        <div>
          <Label htmlFor="cust-email" className="text-xs">Email (optional)</Label>
          <Input id="cust-email" name="custodian_email" type="email" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="cust-phone" className="text-xs">Phone (optional)</Label>
          <Input id="cust-phone" name="custodian_phone" className="mt-1" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending} className="min-h-[36px]">
        {pending ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Check className="mr-1 size-3.5" />}
        Save custodian
      </Button>
    </form>
  )
}
