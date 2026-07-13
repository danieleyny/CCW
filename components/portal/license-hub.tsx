"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { BadgeCheck, Clock, AlertTriangle, ShieldQuestion, Plus, CheckCircle2 } from "lucide-react"
import { logAuthorization, logPurchase, markInspected, submitLicenseReport } from "@/app/portal/license/actions"
import { REPORT_KINDS, nextEligiblePurchaseOn } from "@/lib/license"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatDateTime, daysUntil } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface AuthRow {
  id: string
  authorizedOn: string
  expiresOn: string
  handgunDesc: string | null
  acquiredOn: string | null
  inspectionDue: string | null
  inspectedOn: string | null
}

export interface ReportRow {
  id: string
  kind: string
  details: string
  reportedAt: string
  acknowledged: boolean
}

export function LicenseHub({ auths, reports }: { auths: AuthRow[]; reports: ReportRow[] }) {
  const [pending, start] = useTransition()
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [reportKind, setReportKind] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [reportDone, setReportDone] = useState(false)

  const lastAcquired = auths
    .filter((a) => a.acquiredOn)
    .map((a) => a.acquiredOn as string)
    .sort()
    .at(-1)
  const nextEligible = lastAcquired ? nextEligiblePurchaseOn(lastAcquired) : null
  const eligibleNow = !nextEligible || nextEligible <= new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      {/* ── Purchase authorizations ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Purchase authorizations</h2>
            <span className={cn("text-xs", eligibleNow ? "text-ok" : "text-warn")}>
              {eligibleNow
                ? "You're eligible to purchase (one handgun per 90 days)."
                : `90-day rule: next purchase eligible ${formatDate(nextEligible!)}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-low">
            An authorization is valid for <b>30 days</b>. After you purchase, the handgun must be presented for
            inspection within <b>72 hours</b> — log each step here and we&apos;ll keep the clocks for you.
          </p>

          <ul className="mt-3 space-y-2">
            {auths.map((a) => {
              const authDaysLeft = daysUntil(a.expiresOn)
              const expired = !a.acquiredOn && authDaysLeft != null && authDaysLeft < 0
              const inspectionHoursLeft = a.inspectionDue ? (daysUntil(a.inspectionDue) ?? 0) : null
              const inspectionOverdue =
                !!a.acquiredOn && !a.inspectedOn && inspectionHoursLeft != null && inspectionHoursLeft < 0
              return (
                <li key={a.id} className="rounded-lg border bg-surface-1 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <b>Authorized {formatDate(a.authorizedOn)}</b>
                      {a.handgunDesc && <span className="text-text-low"> · {a.handgunDesc}</span>}
                    </span>
                    {a.inspectedOn ? (
                      <span className="inline-flex items-center gap-1 text-xs text-ok">
                        <BadgeCheck className="size-3.5" /> inspected {formatDate(a.inspectedOn)}
                      </span>
                    ) : inspectionOverdue ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                        <AlertTriangle className="size-3.5" /> inspection OVERDUE
                      </span>
                    ) : a.acquiredOn ? (
                      <span className="inline-flex items-center gap-1 text-xs text-warn">
                        <Clock className="size-3.5" /> inspect by {formatDateTime(a.inspectionDue!)}
                      </span>
                    ) : expired ? (
                      <span className="text-xs text-danger">expired {formatDate(a.expiresOn)}</span>
                    ) : (
                      <span className="text-xs text-signal">valid until {formatDate(a.expiresOn)} ({authDaysLeft}d)</span>
                    )}
                  </div>

                  {!a.acquiredOn && !expired && (
                    <form
                      className="mt-2 flex flex-wrap items-center gap-2"
                      action={(fd) =>
                        start(async () => {
                          fd.set("authId", a.id)
                          const res = await logPurchase(fd)
                          if (res.error) toast.error(res.error)
                          else toast.success("Purchase logged — the 72-hour inspection clock is running.")
                        })
                      }
                    >
                      <Input type="date" name="acquiredOn" required className="h-8 w-40" aria-label="Purchase date" />
                      <Button type="submit" size="sm" variant="outline" disabled={pending}>
                        Log purchase
                      </Button>
                    </form>
                  )}
                  {a.acquiredOn && !a.inspectedOn && (
                    <form
                      className="mt-2"
                      action={() =>
                        start(async () => {
                          const fd = new FormData()
                          fd.set("authId", a.id)
                          const res = await markInspected(fd)
                          if (res.error) toast.error(res.error)
                          else toast.success("Inspection recorded.")
                        })
                      }
                    >
                      <Button type="submit" size="sm" disabled={pending}>
                        <BadgeCheck className="size-3.5" /> Mark inspected
                      </Button>
                    </form>
                  )}
                </li>
              )
            })}
            {auths.length === 0 && (
              <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No authorizations logged yet.
              </li>
            )}
          </ul>

          {showAuthForm ? (
            <form
              className="mt-3 flex flex-wrap items-center gap-2"
              action={(fd) =>
                start(async () => {
                  const res = await logAuthorization(fd)
                  if (res.error) toast.error(res.error)
                  else {
                    setShowAuthForm(false)
                    toast.success("Authorization logged — valid 30 days.")
                  }
                })
              }
            >
              <Input type="date" name="authorizedOn" required className="h-9 w-40" aria-label="Authorization date" />
              <Input name="handgunDesc" placeholder="Make/model (optional)" className="h-9 w-56" />
              <Button type="submit" size="sm" disabled={pending}>Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAuthForm(false)}>Cancel</Button>
            </form>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowAuthForm(true)}>
              <Plus className="size-3.5" /> Log a new authorization
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── § 5-24 reporting duties ── */}
      <Card>
        <CardContent className="p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldQuestion className="size-4 text-signal" /> Something changed? Report it.
          </h2>
          <p className="mt-1 text-xs text-text-low">
            License holders must promptly report certain changes (38 RCNY §5-24). Filing here records it,
            alerts your consultant, and we walk you through the NYPD step. When in doubt, report — candor
            protects your license.
          </p>

          {reportDone ? (
            <p className="mt-3 flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/8 p-3 text-sm text-ok">
              <CheckCircle2 className="size-4" /> Report filed — your consultant will follow up with the exact
              NYPD reporting step.
            </p>
          ) : (
            <form
              className="mt-3 space-y-2"
              action={(fd) =>
                start(async () => {
                  const res = await submitLicenseReport(fd)
                  if (res.error) toast.error(res.error)
                  else {
                    setReportDone(true)
                    toast.success("Report filed.")
                  }
                })
              }
            >
              <select
                name="kind"
                required
                value={reportKind}
                onChange={(e) => setReportKind(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                aria-label="What changed"
              >
                <option value="">What changed?</option>
                {REPORT_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
              {reportKind && (
                <p className="text-[11px] text-text-low">{REPORT_KINDS.find((k) => k.key === reportKind)?.hint}</p>
              )}
              <Textarea
                name="details"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                placeholder="Describe what happened / what changed, with dates."
              />
              <Button type="submit" size="sm" disabled={pending || !reportKind || reportDetails.trim().length < 10}>
                File the report
              </Button>
            </form>
          )}

          {reports.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-hairline pt-3">
              {reports.map((r) => (
                <li key={r.id} className="text-xs text-text-mid">
                  <b className="capitalize">{r.kind.replace(/_/g, " ")}</b> · {formatDateTime(r.reportedAt)} ·{" "}
                  {r.acknowledged ? <span className="text-ok">acknowledged</span> : <span className="text-warn">with your consultant</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
