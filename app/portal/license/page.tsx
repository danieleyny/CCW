import { BadgeCheck, MapPin, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { LicenseHub, type AuthRow, type ReportRow } from "@/components/portal/license-hub"
import { StartRenewalButton } from "@/components/portal/start-renewal-button"
import { formatDate, daysUntil } from "@/lib/format"
import { RENEWAL_RUNWAY_DAYS } from "@/lib/license"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Your license" }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your license</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The clocks that matter after you&apos;re licensed — purchase windows, inspections, reporting
          duties, and your renewal runway.
        </p>
      </div>

      <Card className={inRunway ? "brass-edge" : ""}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <BadgeCheck className="size-4 text-ok" /> License status
            </h2>
            <p className="mt-1 text-sm text-text-mid">
              {expires ? (
                <>
                  Valid until <b>{formatDate(expires)}</b>
                  {expiresIn != null && expiresIn >= 0 && <> · {expiresIn} days left</>}
                </>
              ) : (
                "Expiration will appear here once your license is issued."
              )}
            </p>
            {track === "non_resident" && countyExpires && (
              <p className={`mt-1 text-xs ${countyDays != null && countyDays <= 60 ? "text-warn" : "text-text-low"}`}>
                Special Carry depends on your county license — county license valid until {formatDate(countyExpires)}
                {countyDays != null && ` (${countyDays}d)`}. If it lapses, the Special Carry voids automatically.
              </p>
            )}
          </div>
          {inRunway && (
            <div className="max-w-xs space-y-2">
              <p className="text-xs text-brass">
                <b>Renewal runway is open.</b> NYPD mails renewal instructions — you can&apos;t submit before
                they arrive, but your refreshed live-fire certificate must be dated within 6 months of the
                renewal, so plan it now. Renewals need no character references.
              </p>
              <StartRenewalButton alreadyOpen={!!renewalCase} />
            </div>
          )}
        </CardContent>
      </Card>

      <LicenseHub auths={auths} reports={reports} />

      {/* V5b — reciprocity link-out. Concealed Knowledge owns the dataset; we
          deep-link to it rather than duplicate a legal map across two repos. */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="size-4 text-brass" /> Where your license is honored
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check reciprocity for your NY license, maintained by Concealed Knowledge.
            </p>
          </div>
          <a
            href="https://concealedknowledge.com/reciprocity?home=ny"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-hairline px-4 text-sm font-medium text-text-mid transition-colors hover:text-foreground"
          >
            View reciprocity <ExternalLink className="size-3.5" />
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
