import { BadgeCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { LicenseHub, type AuthRow, type ReportRow } from "@/components/portal/license-hub"
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
            <p className="max-w-xs text-xs text-brass">
              <b>Renewal runway is open.</b> NYPD mails renewal instructions — you can&apos;t submit before
              they arrive, but your refreshed live-fire certificate must be dated within 6 months of the
              renewal, so plan it now. Renewals need no character references.
            </p>
          )}
        </CardContent>
      </Card>

      <LicenseHub auths={auths} reports={reports} />
    </div>
  )
}
