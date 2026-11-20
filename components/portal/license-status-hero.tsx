"use client"

import Link from "next/link"
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Clock3,
  FileCheck2,
  LockKeyhole,
  RefreshCw,
  UserRound,
} from "lucide-react"
import { StartRenewalButton } from "@/components/portal/start-renewal-button"
import { RENEWAL_RUNWAY_DAYS } from "@/lib/license"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import type { Locale } from "@/config/i18n"

type LicenseStatusHeroProps = {
  expires: string | null
  expiresIn: number | null
  inRunway: boolean
  track: string | undefined
  countyExpires: string | null
  countyDays: number | null
  clientName: string
  licenseType: string
  concierge: boolean
  renewalAlreadyOpen: boolean
}

const DAY_MS = 86_400_000

function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

function issuedFromExpiration(expires: string) {
  const issued = new Date(`${expires}T00:00:00Z`)
  issued.setUTCFullYear(issued.getUTCFullYear() - 3)
  return issued
}

function renewalOpenDate(expires: string) {
  return new Date(new Date(`${expires}T00:00:00Z`).getTime() - RENEWAL_RUNWAY_DAYS * DAY_MS)
}

function monthYear(date: Date, locale: Locale) {
  return date.toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" })
}

function formatCalendarDate(value: string, locale: Locale) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function LicenseCardIllustration({
  clientName,
  licenseType,
  expires,
  locked = false,
}: {
  clientName: string
  licenseType: string
  expires: string | null
  locked?: boolean
}) {
  const { locale, messages } = usePortalI18n()
  const t = messages.license
  const issued = expires ? issuedFromExpiration(expires) : null

  return (
    <div className={`license-v2-illustration-wrap${locked ? " is-locked" : ""}`} aria-hidden="true">
      <div className="license-v2-license-card">
        <div className="license-v2-license-top">
          <span className="license-v2-nypd-seal">NYPD</span>
          <span>
            <strong>{t.handgunLicense}</strong>
            <small>{licenseType}</small>
          </span>
          <i className="license-v2-hologram" />
        </div>
        <div className="license-v2-license-middle">
          <span className="license-v2-photo-placeholder"><UserRound /></span>
          <span>
            <small>{t.licensee}</small>
            <strong>{clientName}</strong>
            <em>{t.illustration}</em>
          </span>
        </div>
        <div className="license-v2-license-dates">
          <span><small>{t.issued}</small><b>{issued ? formatCalendarDate(toIsoDay(issued), locale) : "—"}</b></span>
          <span><small>{t.expires}</small><b>{expires ? formatCalendarDate(expires, locale) : "—"}</b></span>
        </div>
      </div>
      {locked ? <span className="license-v2-lock"><LockKeyhole /></span> : null}
    </div>
  )
}

function BeforeIssuance({
  clientName,
  licenseType,
  concierge,
}: Pick<LicenseStatusHeroProps, "clientName" | "licenseType" | "concierge">) {
  const { messages } = usePortalI18n()
  const t = messages.license
  return (
    <section className="license-v2-before" aria-labelledby="license-before-title">
      <div className="license-v2-before-copy">
        <span className="license-v2-icon-tile"><BadgeCheck /></span>
        <p className="license-v2-card-eyebrow">{t.beforeEyebrow}</p>
        <h2 id="license-before-title">{t.beforeTitle}</h2>
        <p className="license-v2-before-intro">
          {t.beforeIntro}
        </p>
        <ul>
          <li><CalendarClock /><span><strong>{t.expiryRenewal}</strong> {t.expiryRenewalDetail}</span></li>
          <li><Clock3 /><span><strong>{t.purchaseWindows}</strong> {t.purchaseWindowsDetail}</span></li>
          <li><FileCheck2 /><span><strong>{t.reportingDuties}</strong> {t.reportingDutiesDetail}</span></li>
        </ul>
        <Link href={concierge ? "/portal/documents" : "/portal"}>
          {t.seeApplication} <span aria-hidden>→</span>
        </Link>
      </div>
      <LicenseCardIllustration clientName={clientName} licenseType={licenseType} expires={null} locked />
    </section>
  )
}

export function LicenseStatusHero(props: LicenseStatusHeroProps) {
  const { locale, messages } = usePortalI18n()
  const t = messages.license
  if (!props.expires) {
    return (
      <BeforeIssuance
        clientName={props.clientName}
        licenseType={props.licenseType}
        concierge={props.concierge}
      />
    )
  }

  const expiresDate = new Date(`${props.expires}T00:00:00Z`)
  const issuedDate = issuedFromExpiration(props.expires)
  const renewalDate = renewalOpenDate(props.expires)
  const term = Math.max(1, expiresDate.getTime() - issuedDate.getTime())
  const termDays = term / DAY_MS
  const elapsedDays = Math.min(termDays, Math.max(0, termDays - (props.expiresIn ?? termDays)))
  const elapsedPercent = Math.round((elapsedDays / termDays) * 100)
  const renewalPercent = Math.round(((renewalDate.getTime() - issuedDate.getTime()) / term) * 100)
  const expired = props.expiresIn != null && props.expiresIn <= 0
  const status = expired ? "expired" : props.inRunway ? "renewal" : "active"

  return (
    <section className={`license-v2-status-hero is-${status}`} aria-labelledby="license-status-title">
      <div className="license-v2-status-copy">
        <span className={`license-v2-status-pill is-${status}`}>
          {status === "active" ? <Check /> : status === "renewal" ? <RefreshCw /> : <Clock3 />}
          {status === "active" ? t.active : status === "renewal" ? t.renewalOpen : t.expired}
        </span>
        <h2 id="license-status-title">
          {status === "active" ? t.validTitle : status === "renewal" ? t.renewTitle : t.expiredTitle}
        </h2>
        <p className="license-v2-valid-line">
          {t.validUntil} <strong>{formatCalendarDate(props.expires, locale)}</strong>
          {props.expiresIn != null ? <> · <strong>{interpolate(t.daysLeft, { days: Math.max(0, props.expiresIn) })}</strong></> : null}
        </p>

        {props.inRunway ? (
          <div className="license-v2-runway">
            <div>
              <strong>{t.runwayOpen}</strong>
              <p>
                NYPD mails renewal instructions. Plan your refreshed live-fire certificate now; renewals need no character references.
              </p>
              {locale !== "en" ? <small>{messages.common.legalEnglishNotice}</small> : null}
            </div>
            <span className="license-v2-renewal-action">
              <StartRenewalButton alreadyOpen={props.renewalAlreadyOpen} />
            </span>
          </div>
        ) : null}

        <div className="license-v2-term">
          <div
            className="license-v2-term-track"
            role="progressbar"
            aria-label={interpolate(t.termElapsed, { percent: elapsedPercent })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={elapsedPercent}
          >
            <span className="license-v2-term-fill" style={{ width: `${elapsedPercent}%` }} />
            <i className="license-v2-renewal-tick" style={{ left: `${renewalPercent}%` }}>
              <small>{t.renewalOpens}</small>
            </i>
          </div>
          <p className="license-v2-term-legend">
            <span>{t.issued} {formatCalendarDate(toIsoDay(issuedDate), locale)}</span>
            <span className="license-v2-term-renewal">{t.renewalOpens} ~{monthYear(renewalDate, locale)}</span>
            <span>{t.expires} {formatCalendarDate(props.expires, locale)}</span>
          </p>
        </div>

        {props.track === "non_resident" && props.countyExpires ? (
          <div className={`license-v2-county-strip${props.countyDays != null && props.countyDays <= 60 ? " is-urgent" : ""}`}>
            <BadgeCheck />
            <p>
              <strong>{t.specialCountyTitle}</strong> — {t.validUntil.toLocaleLowerCase()} {formatCalendarDate(props.countyExpires, locale)}
              {props.countyDays != null ? ` (${props.countyDays} ${t.dayShort})` : ""}. {messages.legal.countyDependencyRule}
            </p>
            {locale !== "en" ? <small>{messages.common.legalEnglishNotice}</small> : null}
          </div>
        ) : null}
      </div>

      <LicenseCardIllustration
        clientName={props.clientName}
        licenseType={props.licenseType}
        expires={props.expires}
      />
    </section>
  )
}
