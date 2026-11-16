"use client"

import { useTransition } from "react"
import { ShieldAlert, Check, Circle, Loader2, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { setDosGuardCardReturned, setDosFeePaid } from "@/app/portal/license/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DosUpgrade {
  dos_1619f_status: string
  firearms_47hr_status: string
  guard_card_returned: boolean
  dos_fee_paid: boolean
  inservice_due_on: string | null
  firearms_annual_due_on: string | null
  registration_expires_on: string | null
}

const STATUS_LABEL: Record<string, string> = {
  outstanding: "Outstanding",
  filed: "Filed with DOS",
  approved: "Approved",
}

function fmt(d: string | null) {
  if (!d) return null
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })
}

/**
 * The NYS DOS armed-status upgrade — a SEPARATE filing from the NYPD licence, with
 * its own authority and timeline. It never implies the applicant is armed-qualified
 * on the NYPD licence alone: both approvals must be active AND the employer must
 * clear the assignment. Not part of the NYPD packet; never a filing blocker.
 */
export function DosUpgradePanel({ dos }: { dos: DosUpgrade }) {
  const [pending, start] = useTransition()

  const toggle = (fn: (v: boolean) => Promise<{ ok?: boolean; error?: string }>, next: boolean) =>
    start(async () => {
      const r = await fn(next)
      if (r.error) toast.error(r.error)
      else toast.success("Saved.")
    })

  return (
    <section className="license-v2-dos" aria-labelledby="license-dos-title">
      <div className="license-v2-dos-header">
        <span className="license-v2-section-icon is-amber"><ShieldAlert /></span>
        <div>
          <h2 id="license-dos-title">Armed-status upgrade (NYS DOS)</h2>
          <p>
            This is a separate filing from your NYPD licence — different agency, different timeline. Your NYPD
            licence alone does not make you armed-qualified: both approvals must be active and your employer must
            clear the assignment.
          </p>
        </div>
      </div>

      <ul className="license-v2-dos-list">
        <ReadItem label="DOS-1619-f (armed-status application)" value={STATUS_LABEL[dos.dos_1619f_status] ?? dos.dos_1619f_status} done={dos.dos_1619f_status === "approved"} />
        <ReadItem label="47-hour firearms course certificate" value={STATUS_LABEL[dos.firearms_47hr_status] ?? dos.firearms_47hr_status} done={dos.firearms_47hr_status === "approved"} />
        <ToggleItem
          label="Return your current security guard ID card"
          hint="Submitting the upgrade means surrendering your current guard card."
          done={dos.guard_card_returned}
          disabled={pending}
          onToggle={() => toggle(setDosGuardCardReturned, !dos.guard_card_returned)}
        />
        <ToggleItem
          label="$25 DOS fee paid"
          done={dos.dos_fee_paid}
          disabled={pending}
          onToggle={() => toggle(setDosFeePaid, !dos.dos_fee_paid)}
        />
      </ul>

      {(dos.inservice_due_on || dos.firearms_annual_due_on || dos.registration_expires_on) && (
        <div className="license-v2-dos-clocks">
          <div>
            <CalendarClock /> Keeping armed status
          </div>
          <ul>
            {dos.inservice_due_on && <li>Next 8-hour annual in-service due <b>{fmt(dos.inservice_due_on)}</b></li>}
            {dos.firearms_annual_due_on && <li>Next 8-hour annual firearms course due <b>{fmt(dos.firearms_annual_due_on)}</b></li>}
            {dos.registration_expires_on && <li>Registration renews by <b>{fmt(dos.registration_expires_on)}</b> (two-year cycle)</li>}
          </ul>
        </div>
      )}
    </section>
  )
}

function ReadItem({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <li className="license-v2-dos-item">
      <span>
        {done ? <Check className="mt-0.5 size-4 text-ok" /> : <Circle className="mt-0.5 size-4 text-text-low" />}
        <span>{label}</span>
      </span>
      <span className={cn("license-v2-dos-status", done ? "is-done" : "")}>{value}</span>
    </li>
  )
}

function ToggleItem({
  label,
  hint,
  done,
  disabled,
  onToggle,
}: {
  label: string
  hint?: string
  done: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <li className="license-v2-dos-item">
      <span>
        {done ? <Check className="mt-0.5 size-4 text-ok" /> : <Circle className="mt-0.5 size-4 text-text-low" />}
        <span>
          {label}
          {hint && <small>{hint}</small>}
        </span>
      </span>
      <Button size="sm" variant={done ? "ghost" : "outline"} className="min-h-11 shrink-0" disabled={disabled} onClick={onToggle}>
        {disabled ? <Loader2 className="size-3.5 animate-spin" /> : done ? "Undo" : "Mark done"}
      </Button>
    </li>
  )
}
