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

function monthYear(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
}

function formatCalendarDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
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
  const issued = expires ? issuedFromExpiration(expires) : null

  return (
    <div className={`license-v2-illustration-wrap${locked ? " is-locked" : ""}`} aria-hidden="true">
      <div className="license-v2-license-card">
        <div className="license-v2-license-top">
          <span className="license-v2-nypd-seal">NYPD</span>
          <span>
            <strong>Handgun License</strong>
            <small>{licenseType}</small>
          </span>
          <i className="license-v2-hologram" />
        </div>
        <div className="license-v2-license-middle">
          <span className="license-v2-photo-placeholder"><UserRound /></span>
          <span>
            <small>Licensee</small>
            <strong>{clientName}</strong>
            <em>Illustration · not a credential</em>
          </span>
        </div>
        <div className="license-v2-license-dates">
          <span><small>Issued</small><b>{issued ? formatCalendarDate(toIsoDay(issued)) : "—"}</b></span>
          <span><small>Expires</small><b>{expires ? formatCalendarDate(expires) : "—"}</b></span>
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
  return (
    <section className="license-v2-before" aria-labelledby="license-before-title">
      <div className="license-v2-before-copy">
        <span className="license-v2-icon-tile"><BadgeCheck /></span>
        <p className="license-v2-card-eyebrow">Your license</p>
        <h2 id="license-before-title">This becomes your license home once you&apos;re approved</h2>
        <p className="license-v2-before-intro">
          After the NYPD issues your license, this page keeps the clocks for you:
        </p>
        <ul>
          <li><CalendarClock /><span><strong>Expiry &amp; renewal</strong> countdown</span></li>
          <li><Clock3 /><span><strong>Purchase windows</strong> and 72-hour inspections</span></li>
          <li><FileCheck2 /><span><strong>Reporting duties</strong> if something changes</span></li>
        </ul>
        <Link href={concierge ? "/portal/documents" : "/portal"}>
          See where your application stands <span aria-hidden>→</span>
        </Link>
      </div>
      <LicenseCardIllustration clientName={clientName} licenseType={licenseType} expires={null} locked />
    </section>
  )
}

export function LicenseStatusHero(props: LicenseStatusHeroProps) {
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
          {status === "active" ? "Active" : status === "renewal" ? "Renewal open" : "Expired"}
        </span>
        <h2 id="license-status-title">
          {status === "active" ? "Your license is valid" : status === "renewal" ? "Time to renew" : "Your license has expired"}
        </h2>
        <p className="license-v2-valid-line">
          Valid until <strong>{formatCalendarDate(props.expires)}</strong>
          {props.expiresIn != null ? <> · <strong>{Math.max(0, props.expiresIn)} days</strong> left</> : null}
        </p>

        {props.inRunway ? (
          <div className="license-v2-runway">
            <div>
              <strong>Renewal runway is open.</strong>
              <p>
                NYPD mails renewal instructions. Plan your refreshed live-fire certificate now; renewals need no character references.
              </p>
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
            aria-label={`${elapsedPercent}% of the three-year license term elapsed`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={elapsedPercent}
          >
            <span className="license-v2-term-fill" style={{ width: `${elapsedPercent}%` }} />
            <i className="license-v2-renewal-tick" style={{ left: `${renewalPercent}%` }}>
              <small>Renewal opens</small>
            </i>
          </div>
          <p className="license-v2-term-legend">
            <span>Issued {formatCalendarDate(toIsoDay(issuedDate))}</span>
            <span className="license-v2-term-renewal">Renewal opens ~{monthYear(renewalDate)}</span>
            <span>Expires {formatCalendarDate(props.expires)}</span>
          </p>
        </div>

        {props.track === "non_resident" && props.countyExpires ? (
          <div className={`license-v2-county-strip${props.countyDays != null && props.countyDays <= 60 ? " is-urgent" : ""}`}>
            <BadgeCheck />
            <p>
              <strong>Special Carry depends on your county license</strong> — valid until {formatCalendarDate(props.countyExpires)}
              {props.countyDays != null ? ` (${props.countyDays}d)` : ""}. If it lapses, the Special Carry voids automatically.
            </p>
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
