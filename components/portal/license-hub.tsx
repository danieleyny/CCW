"use client"

import { type CSSProperties, type ReactNode, type TransitionStartFunction, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  FilePlus2,
  Pencil,
  Plus,
  ScanLine,
  ShieldQuestion,
  Sparkles,
} from "lucide-react"
import { logAuthorization, logPurchase, markInspected, submitLicenseReport } from "@/app/portal/license/actions"
import { REPORT_KINDS, nextEligiblePurchaseOn } from "@/lib/license"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime, daysUntil } from "@/lib/format"

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

type RingState = "running" | "done" | "overdue" | "idle"

function hoursUntil(iso: string | null) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000)
}

function formatCalendarDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function StatusPill({ kind, children }: { kind: "gold" | "green" | "red" | "grey"; children: ReactNode }) {
  return <span className={`license-v2-state-pill is-${kind}`}>{children}</span>
}

function ClockCard({
  state,
  progress,
  value,
  ariaLabel,
  title,
  detail,
}: {
  state: RingState
  progress: number
  value: string
  ariaLabel: string
  title: string
  detail: ReactNode
}) {
  return (
    <div className={`license-v2-clock-card is-${state}`}>
      <span
        className="license-v2-clock-ring"
        style={{ "--license-ring-progress": `${Math.max(0, Math.min(1, progress)) * 360}deg` } as CSSProperties}
        role="img"
        aria-label={ariaLabel}
      >
        {state === "done" ? <Check /> : state === "overdue" ? <AlertTriangle /> : <b>{value}</b>}
      </span>
      <span className="license-v2-clock-copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  )
}

function AuthorizationBlock({
  authorization,
  pending,
  editing,
  onEdit,
  onCancelEdit,
  start,
}: {
  authorization: AuthRow
  pending: boolean
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  start: TransitionStartFunction
}) {
  const authDaysLeft = daysUntil(authorization.expiresOn)
  const expired = !authorization.acquiredOn && authDaysLeft != null && authDaysLeft < 0
  const inspectionHoursLeft = hoursUntil(authorization.inspectionDue)
  const inspectionOverdue =
    !!authorization.acquiredOn &&
    !authorization.inspectedOn &&
    inspectionHoursLeft != null &&
    inspectionHoursLeft < 0

  const status = authorization.inspectedOn
    ? <StatusPill kind="green">Inspected <Check /></StatusPill>
    : inspectionOverdue
      ? <StatusPill kind="red">Inspection overdue</StatusPill>
      : authorization.acquiredOn
        ? <StatusPill kind="green">Bought</StatusPill>
        : expired
          ? <StatusPill kind="grey">Expired</StatusPill>
          : <StatusPill kind="gold">Window open</StatusPill>

  const purchaseState: RingState = authorization.acquiredOn ? "done" : expired ? "overdue" : "running"
  const inspectionState: RingState = authorization.inspectedOn
    ? "done"
    : inspectionOverdue
      ? "overdue"
      : authorization.acquiredOn
        ? "running"
        : "idle"
  const purchaseProgress = authorization.acquiredOn ? 1 : Math.max(0, Math.min(30, authDaysLeft ?? 0)) / 30
  const inspectionProgress = authorization.inspectedOn
    ? 1
    : authorization.acquiredOn
      ? Math.max(0, Math.min(72, inspectionHoursLeft ?? 0)) / 72
      : 0

  const savePurchase = (fd: FormData) =>
    start(async () => {
      fd.set("authId", authorization.id)
      const res = await logPurchase(fd)
      if (res.error) toast.error(res.error)
      else toast.success("Purchase logged — the 72-hour inspection clock is running.")
    })

  return (
    <li className="license-v2-authorization">
      <div className="license-v2-authorization-top">
        <span className="license-v2-auth-icon"><ScanLine /></span>
        <div>
          <h3>{authorization.handgunDesc || "Handgun not entered yet"}</h3>
          <p>Authorized {formatCalendarDate(authorization.authorizedOn)}</p>
        </div>
        {status}
      </div>

      <div className="license-v2-clocks">
        <ClockCard
          state={purchaseState}
          progress={purchaseProgress}
          value={String(Math.max(0, authDaysLeft ?? 0))}
          ariaLabel={authorization.acquiredOn
            ? `Purchase authorization used on ${formatCalendarDate(authorization.acquiredOn)}`
            : expired
              ? "Purchase window expired"
              : `${Math.max(0, authDaysLeft ?? 0)} days left in purchase window`}
          title="Purchase window"
          detail={authorization.acquiredOn
            ? <>Used · bought {formatCalendarDate(authorization.acquiredOn)}</>
            : expired
              ? <>Overdue — contact your concierge</>
              : <>{Math.max(0, authDaysLeft ?? 0)} days left · until {formatCalendarDate(authorization.expiresOn)}</>}
        />
        <ClockCard
          state={inspectionState}
          progress={inspectionProgress}
          value={authorization.acquiredOn ? String(Math.max(0, inspectionHoursLeft ?? 0)) : "—"}
          ariaLabel={authorization.inspectedOn
            ? `Inspected ${formatCalendarDate(authorization.inspectedOn)}`
            : inspectionOverdue
              ? "Handgun inspection overdue"
              : authorization.acquiredOn
                ? `${Math.max(0, inspectionHoursLeft ?? 0)} hours left to present for inspection`
                : "Inspection clock starts after purchase"}
          title="Inspection"
          detail={authorization.inspectedOn
            ? <>Inspected {formatCalendarDate(authorization.inspectedOn)}</>
            : inspectionOverdue
              ? <>Overdue — contact your concierge</>
              : authorization.acquiredOn
                ? <>Present it by {formatDateTime(authorization.inspectionDue)}</>
                : <>Starts after purchase</>}
        />
      </div>

      {!authorization.acquiredOn && !expired ? (
        <form className="license-v2-auth-actions" action={savePurchase}>
          <Input
            type="date"
            name="acquiredOn"
            required
            className="license-v2-date-input"
            aria-label="Purchase date"
          />
          <Button type="submit" variant="gold" disabled={pending}>Mark bought</Button>
        </form>
      ) : null}

      {authorization.acquiredOn && !authorization.inspectedOn ? (
        <div className="license-v2-auth-actions">
          <form
            action={() =>
              start(async () => {
                const fd = new FormData()
                fd.set("authId", authorization.id)
                const res = await markInspected(fd)
                if (res.error) toast.error(res.error)
                else toast.success("Inspection recorded.")
              })
            }
          >
            <Button type="submit" variant="gold" disabled={pending}>
              <BadgeCheck /> Mark inspected
            </Button>
          </form>
          <Button type="button" variant="outline" onClick={onEdit}><Pencil /> Edit</Button>
        </div>
      ) : null}

      {authorization.inspectedOn ? (
        <div className="license-v2-auth-actions">
          <Button type="button" variant="outline" onClick={onEdit}><Pencil /> Edit</Button>
        </div>
      ) : null}

      {editing && authorization.acquiredOn ? (
        <form className="license-v2-edit-form" action={savePurchase}>
          <label>
            <span>Purchase date</span>
            <Input type="date" name="acquiredOn" defaultValue={authorization.acquiredOn} required />
          </label>
          <Button type="submit" variant="gold" disabled={pending}>Save purchase date</Button>
          <Button type="button" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
        </form>
      ) : null}
    </li>
  )
}

export function LicenseHub({
  auths,
  reports,
  showAuthorizations,
}: {
  auths: AuthRow[]
  reports: ReportRow[]
  showAuthorizations: boolean
}) {
  const [pending, start] = useTransition()
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [editingAuthId, setEditingAuthId] = useState<string | null>(null)
  const [showMoreReportKinds, setShowMoreReportKinds] = useState(false)
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
  const selectedReport = REPORT_KINDS.find((kind) => kind.key === reportKind)

  return (
    <div className="license-v2-hub">
      {showAuthorizations ? (
        <section className="license-v2-section-card" aria-labelledby="license-authorizations-title">
          <div className="license-v2-section-header">
            <span className="license-v2-section-icon"><CircleDot /></span>
            <div>
              <h2 id="license-authorizations-title">Purchase authorizations</h2>
              <p>Valid 30 days · present the handgun for inspection within 72 hours of buying.</p>
            </div>
            <span className={`license-v2-eligibility${eligibleNow ? " is-eligible" : " is-waiting"}`}>
              {eligibleNow ? <><Check /> Eligible · 1 per 90 days</> : <>Next purchase {formatCalendarDate(nextEligible!)}</>}
            </span>
          </div>

          <ul className="license-v2-authorization-list">
            {auths.map((authorization) => (
              <AuthorizationBlock
                key={authorization.id}
                authorization={authorization}
                pending={pending}
                editing={editingAuthId === authorization.id}
                onEdit={() => setEditingAuthId(authorization.id)}
                onCancelEdit={() => setEditingAuthId(null)}
                start={start}
              />
            ))}
            {auths.length === 0 ? (
              <li className="license-v2-auth-empty">
                <Clock3 />
                <p><strong>No authorizations yet</strong> — log one when the License Division issues it, and we&apos;ll keep the clocks.</p>
              </li>
            ) : null}
          </ul>

          {showAuthForm ? (
            <form
              className="license-v2-new-auth"
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
              <label>
                <span>Authorization date</span>
                <Input type="date" name="authorizedOn" required aria-label="Authorization date" />
              </label>
              <label>
                <span>Handgun</span>
                <Input name="handgunDesc" placeholder="Make/model (optional)" />
              </label>
              <Button type="submit" variant="gold" disabled={pending}>Save authorization</Button>
              <Button type="button" variant="ghost" onClick={() => setShowAuthForm(false)}>Cancel</Button>
            </form>
          ) : (
            <Button variant="outline" className="license-v2-log-auth" onClick={() => setShowAuthForm(true)}>
              <Plus /> Log a new authorization
            </Button>
          )}
        </section>
      ) : null}

      <section className="license-v2-section-card license-v2-report" aria-labelledby="license-report-title">
        <div className="license-v2-section-header">
          <span className="license-v2-section-icon is-amber"><ShieldQuestion /></span>
          <div>
            <h2 id="license-report-title">Something changed? Report it.</h2>
            <p>
              License holders must promptly report certain changes (38 RCNY §5-24). Filing here records it,
              alerts your consultant, and we walk you through the NYPD step. When in doubt, report — candor protects your license.
            </p>
          </div>
        </div>

        {reportDone ? (
          <p className="license-v2-report-done" role="status">
            <CheckCircle2 /> Report filed — your consultant will follow up with the exact NYPD reporting step.
          </p>
        ) : (
          <form
            className="license-v2-report-form"
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
            <fieldset>
              <legend>What changed?</legend>
              <div className="license-v2-report-primary">
                {REPORT_KINDS.map((kind, index) => (
                  <label
                    key={kind.key}
                    className={`${reportKind === kind.key ? "is-selected" : ""}${index >= 3 ? ` is-extra${showMoreReportKinds ? " is-mobile-visible" : ""}` : ""}`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      value={kind.key}
                      checked={reportKind === kind.key}
                      onChange={(event) => setReportKind(event.target.value)}
                      required
                    />
                    {kind.label}
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="license-v2-report-more"
                aria-expanded={showMoreReportKinds}
                onClick={() => setShowMoreReportKinds((open) => !open)}
              >
                5 more reasons <ChevronDown />
              </button>
            </fieldset>

            <div className="license-v2-report-panel">
              {selectedReport ? (
                <p className="license-v2-report-hint"><Sparkles /> {selectedReport.hint}</p>
              ) : (
                <p className="license-v2-report-hint"><Sparkles /> Choose the change that best matches what happened.</p>
              )}
              <Textarea
                name="details"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder="Describe what happened / what changed, with dates."
              />
              <Button type="submit" disabled={pending || !reportKind || reportDetails.trim().length < 10}>
                File the report <span aria-hidden>→</span>
              </Button>
            </div>
          </form>
        )}

        {reports.length > 0 ? (
          <div className="license-v2-recent-reports">
            <h3>Recent reports</h3>
            <ul>
              {reports.map((report) => {
                const kind = REPORT_KINDS.find((item) => item.key === report.kind)
                return (
                  <li key={report.id}>
                    <span className="license-v2-report-row-icon"><FilePlus2 /></span>
                    <span><strong>{kind?.label ?? report.kind.replace(/_/g, " ")}</strong><small>{formatDateTime(report.reportedAt)}</small></span>
                    <StatusPill kind={report.acknowledged ? "green" : "grey"}>
                      {report.acknowledged ? <>Acknowledged <Check /></> : "Sent"}
                    </StatusPill>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  )
}
