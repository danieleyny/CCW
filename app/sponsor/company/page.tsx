import { createClient } from "@/lib/supabase/server"
import { loadSponsorCases } from "@/lib/sponsor/queries"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { CompanyProfileForm, type CompanyProfile } from "@/components/sponsor/company-profile-form"

export const metadata = { title: "Your company", robots: { index: false, follow: false } }

const PROFILE_COLS =
  "agency_license_number, agency_license_expires, custodian_name, custodian_email, custodian_phone, custodian_license_number, business_street, business_city, business_state, business_zip, business_phone, business_type, dba_name, president_owner, qualifying_officer, carry_business_status, carry_business_number, carry_business_expires"

/**
 * The company profile as a first-class nav destination (S1). Entered once, it pre-fills
 * every company form for every worker. Read through the rep's OWN client — sponsors RLS
 * lets a rep read their own company row (never the admin client here). Saving is anchored
 * to a consented case (saveCompanyProfile authorizes through the sponsor binding); the
 * company data itself is shared across all the rep's workers.
 */
export default async function SponsorCompanyPage() {
  const db = await createClient()
  const cases = await loadSponsorCases()

  const { data: prof } = await db.from("profiles").select("sponsor_id").maybeSingle()
  const sponsorId = prof?.sponsor_id ?? null
  const { data: row } = sponsorId
    ? await db.from("sponsors").select(PROFILE_COLS).eq("id", sponsorId).maybeSingle()
    : { data: null }

  const profile = (row ?? {}) as Partial<CompanyProfile>
  const complete = Boolean(
    profile.agency_license_number &&
      profile.custodian_name &&
      profile.custodian_license_number &&
      profile.business_street &&
      profile.business_city &&
      profile.business_state &&
      profile.business_zip &&
      profile.business_phone &&
      profile.business_type
  )

  const anchorCaseId = cases[0]?.case_id ?? null

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Sponsor portal</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your company</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          Entered once, then every company form for every worker is pre-filled from it.
        </p>
      </div>

      {anchorCaseId ? (
        <CompanyProfileForm
          caseId={anchorCaseId}
          profile={{
            agency_license_number: profile.agency_license_number ?? null,
            agency_license_expires: profile.agency_license_expires ?? null,
            custodian_name: profile.custodian_name ?? null,
            custodian_email: profile.custodian_email ?? null,
            custodian_phone: profile.custodian_phone ?? null,
            custodian_license_number: profile.custodian_license_number ?? null,
            business_street: profile.business_street ?? null,
            business_city: profile.business_city ?? null,
            business_state: profile.business_state ?? null,
            business_zip: profile.business_zip ?? null,
            business_phone: profile.business_phone ?? null,
            business_type: profile.business_type ?? null,
            dba_name: profile.dba_name ?? null,
            president_owner: profile.president_owner ?? null,
            qualifying_officer: profile.qualifying_officer ?? null,
            carry_business_status: profile.carry_business_status ?? null,
            carry_business_number: profile.carry_business_number ?? null,
            carry_business_expires: profile.carry_business_expires ?? null,
          }}
          complete={complete}
        />
      ) : (
        <div className="rounded-lg border border-hairline bg-card p-6 text-sm text-text-mid">
          Your company profile becomes editable once your first worker has consented to your access.
          Until then, your Gun License NYC team confirms the company details when they set you up.
        </div>
      )}
    </div>
  )
}
