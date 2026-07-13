"use client"

import { useState, useTransition } from "react"
import { BadgeCheck } from "lucide-react"
import { toast } from "sonner"
import { recordLicenseIssued } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * V4-A2 — records NYPD's issuance decision. Writes the license columns the
 * whole post-issuance lifecycle depends on (portal card, renewal runway,
 * county watcher). Shown from the `filed` stage onward.
 */
export function RecordLicenseControl({
  caseId,
  isSpecialCarry,
  defaultLicenseType,
  issued,
}: {
  caseId: string
  isSpecialCarry: boolean
  defaultLicenseType: string | null
  issued: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await recordLicenseIssued(formData)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("License recorded — the client's portal lifecycle is now live.")
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-text-mid transition-colors hover:text-foreground"
        >
          <BadgeCheck className="size-3.5" /> {issued ? "Update license" : "Record license issued"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record license issued</DialogTitle>
          <DialogDescription>
            Enter the details exactly as printed on the license NYPD issued. This starts the client&apos;s
            purchase-authorization clock and renewal runway.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="caseId" value={caseId} />
          <div className="space-y-1.5">
            <Label htmlFor="licenseType">License type</Label>
            <Input
              id="licenseType"
              name="licenseType"
              defaultValue={defaultLicenseType ?? "Concealed Carry"}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="issuedOn">Issued on</Label>
              <Input id="issuedOn" name="issuedOn" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiresOn">Expires on</Label>
              <Input id="expiresOn" name="expiresOn" type="date" required />
            </div>
          </div>
          {isSpecialCarry && (
            <div className="space-y-1.5">
              <Label htmlFor="countyLicenseExpiresOn">County license expires on (optional)</Label>
              <Input id="countyLicenseExpiresOn" name="countyLicenseExpiresOn" type="date" />
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Record license"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
