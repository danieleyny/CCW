"use client"

import { useTransition } from "react"
import { ShieldAlert, Check, Circle, Loader2, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { setDosGuardCardReturned, setDosFeePaid } from "@/app/portal/license/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import type { Locale } from "@/config/i18n"

export interface DosUpgrade {
  dos_1619f_status: string
  firearms_47hr_status: string
  guard_card_returned: boolean
  dos_fee_paid: boolean
  inservice_due_on: string | null
  firearms_annual_due_on: string | null
  registration_expires_on: string | null
}

function fmt(d: string | null, locale: Locale) {
  if (!d) return null
  return new Date(`${d}T00:00:00Z`).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeZone: "UTC" })
}

/**
 * The NYS DOS armed-status upgrade — a SEPARATE filing from the NYPD licence, with
 * its own authority and timeline. It never implies the applicant is armed-qualified
 * on the NYPD licence alone: both approvals must be active AND the employer must
 * clear the assignment. Not part of the NYPD packet; never a filing blocker.
 */
export function DosUpgradePanel({ dos }: { dos: DosUpgrade }) {
  const { locale, messages } = usePortalI18n()
  const t = messages.license
  const statusLabel: Record<string, string> = {
    outstanding: t.outstanding,
    filed: t.filedDos,
    approved: t.approved,
  }
  const [pending, start] = useTransition()

  const toggle = (fn: (v: boolean) => Promise<{ ok?: boolean; error?: string }>, next: boolean) =>
    start(async () => {
      const r = await fn(next)
      if (r.error) toast.error(r.error)
      else toast.success(t.saved)
    })

  return (
    <section className="license-v2-dos" aria-labelledby="license-dos-title">
      <div className="license-v2-dos-header">
        <span className="license-v2-section-icon is-amber"><ShieldAlert /></span>
        <div>
          <h2 id="license-dos-title">{t.dosTitle}</h2>
          <p>
            This is a separate filing from your NYPD licence — different agency, different timeline. Your NYPD
            licence alone does not make you armed-qualified: both approvals must be active and your employer must
            clear the assignment.
          </p>
          {locale !== "en" ? <small>{messages.common.legalEnglishNotice}</small> : null}
        </div>
      </div>

      <ul className="license-v2-dos-list">
        <ReadItem label={t.dosApplication} value={statusLabel[dos.dos_1619f_status] ?? dos.dos_1619f_status} done={dos.dos_1619f_status === "approved"} />
        <ReadItem label={t.firearmsCourse} value={statusLabel[dos.firearms_47hr_status] ?? dos.firearms_47hr_status} done={dos.firearms_47hr_status === "approved"} />
        <ToggleItem
          label={t.returnGuardCard}
          hint={t.returnGuardCardHint}
          done={dos.guard_card_returned}
          disabled={pending}
          onToggle={() => toggle(setDosGuardCardReturned, !dos.guard_card_returned)}
        />
        <ToggleItem
          label={t.dosFee}
          done={dos.dos_fee_paid}
          disabled={pending}
          onToggle={() => toggle(setDosFeePaid, !dos.dos_fee_paid)}
        />
      </ul>

      {(dos.inservice_due_on || dos.firearms_annual_due_on || dos.registration_expires_on) && (
        <div className="license-v2-dos-clocks">
          <div>
            <CalendarClock /> {t.keepingArmedStatus}
          </div>
          <ul>
            {dos.inservice_due_on && <li>{t.nextInService} <b>{fmt(dos.inservice_due_on, locale)}</b></li>}
            {dos.firearms_annual_due_on && <li>{t.nextFirearms} <b>{fmt(dos.firearms_annual_due_on, locale)}</b></li>}
            {dos.registration_expires_on && <li>{interpolate(t.registrationRenews, { date: fmt(dos.registration_expires_on, locale) ?? "" })}</li>}
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
  const { messages } = usePortalI18n()
  const t = messages.license
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
        {disabled ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : done ? t.undo : t.markDone}
      </Button>
    </li>
  )
}
