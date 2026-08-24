"use client"

import { useState, useTransition } from "react"
import { Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { provisionSponsor } from "@/app/admin/sponsors/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Staff tool to stand up a sponsorship. Returns the invite link + a temporary
 *  password to hand the rep (dark launch — the owner conveys both by hand). */
export function ProvisionSponsorForm() {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ inviteUrl: string; tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function submit(formData: FormData) {
    start(async () => {
      const r = await provisionSponsor(formData)
      if (r.error || !r.inviteUrl) {
        toast.error(r.error ?? "Something went wrong.")
        return
      }
      setResult({ inviteUrl: r.inviteUrl, tempPassword: r.tempPassword ?? "" })
      toast.success("Sponsorship created.")
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-hairline bg-card p-5">
      <h2 className="text-lg font-semibold tracking-tight">Add a sponsorship</h2>
      <form action={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="companyName" className="text-xs">Company legal name</Label>
            <Input id="companyName" name="companyName" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="repName" className="text-xs">Representative name</Label>
            <Input id="repName" name="repName" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="repEmail" className="text-xs">Representative email</Label>
            <Input id="repEmail" name="repEmail" type="email" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="applicantEmail" className="text-xs">Applicant email (existing case)</Label>
            <Input id="applicantEmail" name="applicantEmail" type="email" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="custodianName" className="text-xs">Gun custodian name (§5-06)</Label>
            <Input id="custodianName" name="custodianName" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="custodianLicenseNumber" className="text-xs">Custodian NYPD licence #</Label>
            <Input id="custodianLicenseNumber" name="custodianLicenseNumber" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="scope" className="text-xs">Scope</Label>
            <select
              id="scope"
              name="scope"
              defaultValue="packet_only"
              className="mt-1 h-11 w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm text-foreground"
            >
              <option value="packet_only">Packet only (safest)</option>
              <option value="assist">Assist — ordinary paperwork, disclosures firewalled</option>
              <option value="full">Full — includes sealed arrests, OOP, SSN</option>
            </select>
          </div>
        </div>
        <Button type="submit" disabled={pending} className="min-h-[44px]">
          {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
          Create sponsorship
        </Button>
      </form>

      {result && (
        <div className="space-y-2 rounded-md border border-ok/30 bg-ok/8 p-3 text-sm">
          <p className="text-ok">Created. Hand these to the representative directly — the system does not email them.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface-3 px-2 py-1 text-xs">{result.inviteUrl}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(result.inviteUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-text-mid">
            Temporary password: <code className="rounded bg-surface-3 px-1.5 py-0.5">{result.tempPassword}</code> — the
            rep should change it after first sign-in.
          </p>
        </div>
      )}
    </div>
  )
}
