"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Building2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { saveCompanyProfile } from "@/app/sponsor/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface CompanyProfile {
  agency_license_number: string | null
  agency_license_expires: string | null
  custodian_name: string | null
  custodian_email: string | null
  custodian_phone: string | null
  custodian_license_number: string | null
  business_street: string | null
  business_city: string | null
  business_state: string | null
  business_zip: string | null
  business_phone: string | null
  business_type: string | null
  dba_name: string | null
  president_owner: string | null
  qualifying_officer: string | null
  carry_business_status: string | null
  carry_business_number: string | null
  carry_business_expires: string | null
}

/**
 * The company profile — entered ONCE, then every company document (SPN-01…) is
 * pre-filled from it. This is the control the pre-fill button depends on, so it
 * renders ABOVE the documents. `complete` drives the collapsed/expanded state and
 * (via the page) whether the document pre-fill is unlocked.
 */
export function CompanyProfileForm({
  caseId,
  profile,
  complete,
}: {
  caseId: string
  profile: CompanyProfile
  complete: boolean
}) {
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(!complete)
  const [carryStatus, setCarryStatus] = useState(profile.carry_business_status ?? "")

  function submit(formData: FormData) {
    formData.set("caseId", caseId)
    start(async () => {
      const r = await saveCompanyProfile(formData)
      if (r.error) {
        toast.error(r.error)
        return
      }
      setOpen(false)
      toast.success("Company profile saved — your forms are pre-filled from it.")
    })
  }

  if (complete && !open) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-ok/30 bg-ok/[0.06] p-4">
        <span className="flex items-center gap-2 text-sm text-ok">
          <Check className="size-4" /> Company profile complete — your documents are pre-filled from it.
        </span>
        <Button size="sm" variant="ghost" className="min-h-[36px]" onClick={() => setOpen(true)}>
          <Pencil className="mr-1 size-3.5" /> Edit
        </Button>
      </div>
    )
  }

  const V = profile
  return (
    <form action={submit} className="space-y-4 rounded-lg border border-brass/30 bg-brass/[0.04] p-4">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-brass" />
        <h3 className="text-sm font-semibold">Company profile</h3>
        <span className="text-xs text-text-low">— entered once, fills every company form</span>
      </div>

      <Group title="Agency licence (Watch, Guard or Patrol)">
        <Field label="Agency licence number *" name="agency_license_number" defaultValue={V.agency_license_number} required />
        <Field label="Licence expiry" name="agency_license_expires" type="date" defaultValue={V.agency_license_expires} />
      </Group>

      <Group title="Gun custodian (38 RCNY §5-06)">
        <Field label="Custodian name *" name="custodian_name" defaultValue={V.custodian_name} required />
        <Field label="Custodian NYPD licence number *" name="custodian_license_number" defaultValue={V.custodian_license_number} required />
        <Field label="Custodian email" name="custodian_email" type="email" defaultValue={V.custodian_email} />
        <Field label="Custodian phone" name="custodian_phone" defaultValue={V.custodian_phone} />
      </Group>

      <Group title="Business details (on the company form)">
        <Field label="Street *" name="business_street" defaultValue={V.business_street} required />
        <Field label="City *" name="business_city" defaultValue={V.business_city} required />
        <Field label="State *" name="business_state" defaultValue={V.business_state} required />
        <Field label="ZIP *" name="business_zip" defaultValue={V.business_zip} required />
        <Field label="Business phone *" name="business_phone" defaultValue={V.business_phone} required />
        <Field label="Type of business *" name="business_type" defaultValue={V.business_type} required />
      </Group>

      <Group title="NYPD Carry Business licence">
        <div className="sm:col-span-2">
          <Label htmlFor="cp-carry_business_status" className="text-xs">
            Does your company hold an NYPD Carry Business licence?
          </Label>
          <select
            id="cp-carry_business_status"
            name="carry_business_status"
            value={carryStatus}
            onChange={(e) => setCarryStatus(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-hairline-strong bg-surface-1 px-2 text-sm"
          >
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="unsure">I&apos;m not sure</option>
          </select>
          {carryStatus === "unsure" && (
            <p className="mt-1 text-xs text-text-low">
              That&apos;s fine — we&apos;ll confirm it with you. An honest &ldquo;not sure&rdquo; is more useful
              than a guess.
            </p>
          )}
        </div>
        {carryStatus === "yes" && (
          <>
            <Field label="Carry Business licence number" name="carry_business_number" defaultValue={V.carry_business_number} />
            <Field label="Licence expiry" name="carry_business_expires" type="date" defaultValue={V.carry_business_expires} />
          </>
        )}
      </Group>

      <Group title="Optional">
        <Field label="Doing business as (DBA)" name="dba_name" defaultValue={V.dba_name} />
        <Field label="President / owner" name="president_owner" defaultValue={V.president_owner} />
        <Field label="Qualifying officer" name="qualifying_officer" defaultValue={V.qualifying_officer} />
      </Group>

      <Button type="submit" size="sm" disabled={pending} className="min-h-[36px]">
        {pending ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Check className="mr-1 size-3.5" />}
        Save company profile
      </Button>
    </form>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="engraved-sm mb-1.5 text-text-low">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type,
  required,
}: {
  label: string
  name: string
  defaultValue: string | null
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={`cp-${name}`} className="text-xs">{label}</Label>
      <Input id={`cp-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} className="mt-1" />
    </div>
  )
}
