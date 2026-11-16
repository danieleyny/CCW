import Link from "next/link"
import { ExternalLink, MapPinned, MessageSquareHeart, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { LicenseHub, type AuthRow, type ReportRow } from "@/components/portal/license-hub"
import { LicenseStatusHero } from "@/components/portal/license-status-hero"
import { StartRenewalButton } from "@/components/portal/start-renewal-button"
import { DosUpgradePanel, type DosUpgrade } from "@/components/portal/dos-upgrade-panel"
import { daysUntil } from "@/lib/format"
import { RENEWAL_RUNWAY_DAYS } from "@/lib/license"
import { APPLICATION_TYPE_LABELS, type ApplicationType } from "@/lib/application-types"
import { reviewUrl } from "@/lib/review"

export const metadata = { title: "Your license" }

const DAY_MS = 86_400_000

function renewalMonth(expires: string) {
  const opens = new Date(new Date(`${expires}T00:00:00Z`).getTime() - RENEWAL_RUNWAY_DAYS * DAY_MS)
  return opens.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
}

/**
 * V3-P3.2 — the 3-year relationship. Purchase authorizations (30-day validity,
 * 90-day rule, 72-hour inspections), §5-24 reporting duties, and the renewal
 * runway — the reasons this app stays installed for the life of the license.
 */
export default async function LicensePage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const [{ data: kase }, { data: authRows }, { data: reportRows }] = await Promise.all([
    supabase
      .from("cases")
      .select("license_expires_on, county_license_expires_on, stage, clients(track)")
      .eq("id", myCase.id)
      .single(),
    supabase
      .from("purchase_authorizations")
      .select("*")
      .eq("case_id", myCase.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("license_reports")
      .select("id, kind, details, reported_at, acknowledged_at")
      .eq("case_id", myCase.id)
      .order("reported_at", { ascending: false })
      .limit(10),
  ])

  // The DOS armed-status upgrade sub-lifecycle (armed-guard cases only; opened at
  // NYPD issuance). Absent → the panel doesn't render.
  const { data: dos } = await supabase
    .from("dos_armed_upgrade")
    .select("dos_1619f_status, firearms_47hr_status, guard_card_returned, dos_fee_paid, inservice_due_on, firearms_annual_due_on, registration_expires_on")
    .eq("case_id", myCase.id)
    .maybeSingle()

  const expires = kase?.license_expires_on ?? null
  const expiresIn = daysUntil(expires)
  const inRunway = expiresIn != null && expiresIn <= RENEWAL_RUNWAY_DAYS
  const track = (kase?.clients as unknown as { track: string } | null)?.track

  // Has a renewal case already been opened for this applicant? (cron or a
  // previous click) — drives whether we show "start" or "continue".
  const { data: renewalCase } = await supabase
    .from("cases")
    .select("id")
    .eq("client_id", myCase.client_id)
    .eq("is_renewal", true)
    .maybeSingle()
  const countyExpires = kase?.county_license_expires_on ?? null
  const countyDays = daysUntil(countyExpires)

  const auths: AuthRow[] = (authRows ?? []).map((a) => ({
    id: a.id,
    authorizedOn: a.authorized_on,
    expiresOn: a.expires_on,
    handgunDesc: a.handgun_desc,
    acquiredOn: a.acquired_on,
    inspectionDue: a.inspection_due,
    inspectedOn: a.inspected_on,
  }))
  const reports: ReportRow[] = (reportRows ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    details: r.details,
    reportedAt: r.reported_at,
    acknowledged: !!r.acknowledged_at,
  }))
  const applicationType = myCase.application_type as ApplicationType | null
  const licenseType = applicationType
    ? APPLICATION_TYPE_LABELS[applicationType]
    : track === "non_resident"
      ? "Special Carry"
      : "Concealed Carry"
  const configuredReviewUrl = reviewUrl()

  return (
    <div className="license-v2-page">
      <header className="license-v2-page-header">
        <p className="portal-t-eyebrow">After you&apos;re licensed</p>
        <h1>Your license</h1>
        <p>The clocks that matter: purchase windows, inspections, reporting duties and your renewal.</p>
      </header>

      <LicenseStatusHero
        expires={expires}
        expiresIn={expiresIn}
        inRunway={inRunway}
        track={track}
        countyExpires={countyExpires}
        countyDays={countyDays}
        clientName={myCase.client.full_name || "Licensee"}
        licenseType={licenseType}
        concierge={myCase.service_mode === "concierge"}
        renewalAlreadyOpen={!!renewalCase}
      />

      {expires && dos ? <DosUpgradePanel dos={dos as DosUpgrade} /> : null}

      {/* The review ASK — only once licensed AND a real review URL is configured
          (NEXT_PUBLIC_REVIEW_URL). Never a rating display, never fabricated. */}
      {expires && configuredReviewUrl ? (
        <section className="license-v2-review" aria-labelledby="license-review-title">
          <span className="license-v2-support-icon"><MessageSquareHeart /></span>
          <div>
            <h2 id="license-review-title">Licensed — congratulations.</h2>
            <p>If the process went well for you, a short review helps other New Yorkers find us.</p>
          </div>
          <a href={configuredReviewUrl} target="_blank" rel="noopener noreferrer">
            Leave a review <ExternalLink />
          </a>
        </section>
      ) : null}

      <LicenseHub auths={auths} reports={reports} showAuthorizations={!!expires} />

      <div className={`license-v2-support-grid${expires ? "" : " is-single"}`}>
        {expires ? (
          <section className="license-v2-support-card" aria-labelledby="license-renewal-title">
            <span className="license-v2-support-icon is-gold"><RefreshCw /></span>
            <div>
              <h2 id="license-renewal-title">Renewal</h2>
              <p>
                Your renewal runway opens 9 months before expiry. We&apos;ll remind you, and you&apos;ll need a refreshed live-fire certificate within 6 months of renewing. No references needed.
              </p>
            </div>
            <div className="license-v2-support-action">
              {inRunway ? (
                <StartRenewalButton alreadyOpen={!!renewalCase} />
              ) : (
                <span className="license-v2-open-pill">Opens ~{renewalMonth(expires)}</span>
              )}
            </div>
          </section>
        ) : null}

        {/* V5b — reciprocity link-out. Concealed Knowledge owns the dataset; we
            deep-link to it rather than duplicate a legal map across two repos. */}
        <section className="license-v2-support-card" aria-labelledby="license-reciprocity-title">
          <span className="license-v2-support-icon"><MapPinned /></span>
          <div>
            <h2 id="license-reciprocity-title">Where your license is honored</h2>
            <p>Check reciprocity for your NY license, maintained by Concealed Knowledge.</p>
          </div>
          <div className="license-v2-support-action">
            <Link href="https://concealedknowledge.com/reciprocity?home=ny" target="_blank" rel="noopener noreferrer">
              View reciprocity <ExternalLink />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
