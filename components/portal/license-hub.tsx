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
import { daysUntil } from "@/lib/format"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import type { Locale } from "@/config/i18n"

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

function formatCalendarDate(value: string, locale: Locale) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function formatInspectionDateTime(value: string | null, locale: Locale) {
  if (!value) return "—"
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatReportDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
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
  const { locale, messages } = usePortalI18n()
  const t = messages.license
  const authDaysLeft = daysUntil(authorization.expiresOn)
  const expired = !authorization.acquiredOn && authDaysLeft != null && authDaysLeft < 0
  const inspectionHoursLeft = hoursUntil(authorization.inspectionDue)
  const inspectionOverdue =
    !!authorization.acquiredOn &&
    !authorization.inspectedOn &&
    inspectionHoursLeft != null &&
    inspectionHoursLeft < 0

  const status = authorization.inspectedOn
    ? <StatusPill kind="green">{t.inspected} <Check /></StatusPill>
    : inspectionOverdue
      ? <StatusPill kind="red">{t.inspectionOverdue}</StatusPill>
      : authorization.acquiredOn
        ? <StatusPill kind="green">{t.bought}</StatusPill>
        : expired
          ? <StatusPill kind="grey">{t.windowExpired}</StatusPill>
          : <StatusPill kind="gold">{t.windowOpen}</StatusPill>

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
      else toast.success(t.purchaseSaved)
    })

  return (
    <li className="license-v2-authorization">
      <div className="license-v2-authorization-top">
        <span className="license-v2-auth-icon"><ScanLine /></span>
        <div>
          <h3>{authorization.handgunDesc || t.handgunMissing}</h3>
          <p>{interpolate(t.authorized, { date: formatCalendarDate(authorization.authorizedOn, locale) })}</p>
        </div>
        {status}
      </div>

      <div className="license-v2-clocks">
        <ClockCard
          state={purchaseState}
          progress={purchaseProgress}
          value={String(Math.max(0, authDaysLeft ?? 0))}
          ariaLabel={authorization.acquiredOn
            ? interpolate(t.usedOn, { date: formatCalendarDate(authorization.acquiredOn, locale) })
            : expired
              ? t.windowExpired
              : interpolate(t.daysPurchaseWindow, { days: Math.max(0, authDaysLeft ?? 0) })}
          title={t.purchaseWindow}
          detail={authorization.acquiredOn
            ? <>{interpolate(t.usedBought, { date: formatCalendarDate(authorization.acquiredOn, locale) })}</>
            : expired
              ? <>{t.overdueContact}</>
              : <>{interpolate(t.daysLeftUntil, { days: Math.max(0, authDaysLeft ?? 0), date: formatCalendarDate(authorization.expiresOn, locale) })}</>}
        />
        <ClockCard
          state={inspectionState}
          progress={inspectionProgress}
          value={authorization.acquiredOn ? String(Math.max(0, inspectionHoursLeft ?? 0)) : "—"}
          ariaLabel={authorization.inspectedOn
            ? interpolate(t.inspectedOn, { date: formatCalendarDate(authorization.inspectedOn, locale) })
            : inspectionOverdue
              ? t.inspectionOverdue
              : authorization.acquiredOn
                ? interpolate(t.hoursInspection, { hours: Math.max(0, inspectionHoursLeft ?? 0) })
                : t.inspectionClockStarts}
          title={t.inspection}
          detail={authorization.inspectedOn
            ? <>{interpolate(t.inspectedOn, { date: formatCalendarDate(authorization.inspectedOn, locale) })}</>
            : inspectionOverdue
              ? <>{t.overdueContact}</>
              : authorization.acquiredOn
                ? <>{interpolate(t.presentBy, { date: formatInspectionDateTime(authorization.inspectionDue, locale) })}</>
                : <>{t.startsAfterPurchase}</>}
        />
      </div>

      {!authorization.acquiredOn && !expired ? (
        <form className="license-v2-auth-actions" action={savePurchase}>
          <Input
            type="date"
            name="acquiredOn"
            required
            className="license-v2-date-input"
            aria-label={t.purchaseDate}
          />
          <Button type="submit" variant="gold" disabled={pending}>{t.markBought}</Button>
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
                else toast.success(t.inspectionSaved)
              })
            }
          >
            <Button type="submit" variant="gold" disabled={pending}>
              <BadgeCheck /> {t.markInspected}
            </Button>
          </form>
          <Button type="button" variant="outline" onClick={onEdit}><Pencil /> {t.edit}</Button>
        </div>
      ) : null}

      {authorization.inspectedOn ? (
        <div className="license-v2-auth-actions">
          <Button type="button" variant="outline" onClick={onEdit}><Pencil /> {t.edit}</Button>
        </div>
      ) : null}

      {editing && authorization.acquiredOn ? (
        <form className="license-v2-edit-form" action={savePurchase}>
          <label>
            <span>{t.purchaseDate}</span>
            <Input type="date" name="acquiredOn" defaultValue={authorization.acquiredOn} required />
          </label>
          <Button type="submit" variant="gold" disabled={pending}>{t.savePurchaseDate}</Button>
          <Button type="button" variant="ghost" onClick={onCancelEdit}>{t.cancel}</Button>
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
  const { locale, messages } = usePortalI18n()
  const t = messages.license
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
              <h2 id="license-authorizations-title">{t.purchaseAuthorizations}</h2>
              <p>{messages.legal.purchaseAuthorizationRule}</p>
              {locale !== "en" ? <small>{messages.common.legalEnglishNotice}</small> : null}
            </div>
            <span className={`license-v2-eligibility${eligibleNow ? " is-eligible" : " is-waiting"}`}>
              {eligibleNow ? <><Check /> {t.eligible}</> : <>{interpolate(t.nextPurchase, { date: formatCalendarDate(nextEligible!, locale) })}</>}
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
                <p><strong>{t.noAuthorizations}</strong> — {t.noAuthorizationDetail}</p>
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
                    toast.success(t.authorizationSaved)
                  }
                })
              }
            >
              <label>
                <span>{t.authorizationDate}</span>
                <Input type="date" name="authorizedOn" required aria-label={t.authorizationDate} />
              </label>
              <label>
                <span>{t.handgun}</span>
                <Input name="handgunDesc" placeholder={t.handgunOptional} />
              </label>
              <Button type="submit" variant="gold" disabled={pending}>{t.saveAuthorization}</Button>
              <Button type="button" variant="ghost" onClick={() => setShowAuthForm(false)}>{t.cancel}</Button>
            </form>
          ) : (
            <Button variant="outline" className="license-v2-log-auth" onClick={() => setShowAuthForm(true)}>
              <Plus /> {t.logNewAuthorization}
            </Button>
          )}
        </section>
      ) : null}

      <section className="license-v2-section-card license-v2-report" aria-labelledby="license-report-title">
        <div className="license-v2-section-header">
          <span className="license-v2-section-icon is-amber"><ShieldQuestion /></span>
          <div>
            <h2 id="license-report-title">{t.reportTitle}</h2>
            <p>{messages.legal.reportChangesRule}</p>
            {locale !== "en" ? <small>{messages.common.legalEnglishNotice}</small> : null}
          </div>
        </div>

        {reportDone ? (
          <p className="license-v2-report-done" role="status">
            <CheckCircle2 /> {t.reportFollowUp}
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
                  toast.success(t.reportFiled)
                }
              })
            }
          >
            <fieldset>
              <legend>{t.whatChanged}</legend>
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
                {interpolate(t.moreReasons, { count: 5 })} <ChevronDown />
              </button>
            </fieldset>

            <div className="license-v2-report-panel">
              {selectedReport ? (
                <p className="license-v2-report-hint"><Sparkles /> {selectedReport.hint}</p>
              ) : (
                <p className="license-v2-report-hint"><Sparkles /> {t.chooseChange}</p>
              )}
              <Textarea
                name="details"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder={t.describeChange}
              />
              <Button type="submit" disabled={pending || !reportKind || reportDetails.trim().length < 10}>
                {t.fileReport} <span aria-hidden>→</span>
              </Button>
            </div>
          </form>
        )}

        {reports.length > 0 ? (
          <div className="license-v2-recent-reports">
            <h3>{t.recentReports}</h3>
            <ul>
              {reports.map((report) => {
                const kind = REPORT_KINDS.find((item) => item.key === report.kind)
                return (
                  <li key={report.id}>
                    <span className="license-v2-report-row-icon"><FilePlus2 /></span>
                    <span><strong>{kind?.label ?? report.kind.replace(/_/g, " ")}</strong><small>{formatReportDateTime(report.reportedAt, locale)}</small></span>
                    <StatusPill kind={report.acknowledged ? "green" : "grey"}>
                      {report.acknowledged ? <>{t.acknowledged} <Check /></> : t.sent}
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
