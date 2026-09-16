import { Building2, Landmark, Mail, IdCard } from "lucide-react"
import { sponsorItemState, SPONSOR_ITEM_COPY } from "@/lib/sponsor/status"
import { loadSponsorCase, loadSponsorRequirements, loadSponsorDocuments } from "@/lib/sponsor/queries"
import { actionFor } from "@/lib/requirements/actions"
import { brand } from "@/config/brand"
import { createAdminClient } from "@/lib/supabase/admin"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { SponsorUploader } from "@/components/sponsor/sponsor-uploader"
import { CompanyProfileForm, type CompanyProfile } from "@/components/sponsor/company-profile-form"
import { OpenDocumentButton } from "@/components/sponsor/open-document-button"
import { PrepareCompanyFormButton } from "@/components/sponsor/prepare-company-form-button"

export const metadata = { title: "Sponsored file", robots: { index: false, follow: false } }

const TRACK_LABEL: Record<string, string> = {
  carry_guard: "NYPD Carry Guard",
  special_carry_guard: "NYPD Special Carry Guard",
  sponsored_unresolved: "NYPD armed guard — category being confirmed",
  concealed_carry: "NYPD licence",
}

export default async function SponsorCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const scope = await loadSponsorCase(caseId)
  if (!scope) {
    // Neutral — neither confirms nor denies a case exists for this rep.
    return (
      <div className="rounded-lg border border-hairline bg-card p-6 text-sm text-text-mid">
        This file isn&apos;t available to you. If you were expecting access, check with your Gun License
        NYC contact — a file appears only once the applicant has consented.
      </div>
    )
  }

  const [reqs, docs] = await Promise.all([loadSponsorRequirements(caseId), loadSponsorDocuments(caseId)])

  const docByReq = new Map<string, (typeof docs)[number]>()
  for (const d of docs) if (!docByReq.has(d.req_code)) docByReq.set(d.req_code, d)

  // The company profile — entered ONCE, then every company document is pre-filled
  // from it. It's the control the SPN-01 pre-fill depends on, so it renders first
  // and the documents stay locked until it's complete. Load the current values (to
  // prefill the form) and compute readiness from the fields the official form needs.
  const admin = createAdminClient()
  const { data: sponsorRow } = await admin
    .from("sponsors")
    .select(
      "agency_license_number, agency_license_expires, custodian_name, custodian_email, custodian_phone, custodian_license_number, business_street, business_city, business_state, business_zip, business_phone, business_type, dba_name, president_owner, qualifying_officer, carry_business_status, carry_business_number, carry_business_expires",
    )
    .eq("id", scope.sponsor_id)
    .maybeSingle()
  const profile: CompanyProfile = {
    agency_license_number: sponsorRow?.agency_license_number ?? null,
    agency_license_expires: sponsorRow?.agency_license_expires ?? null,
    custodian_name: sponsorRow?.custodian_name ?? null,
    custodian_email: sponsorRow?.custodian_email ?? null,
    custodian_phone: sponsorRow?.custodian_phone ?? null,
    custodian_license_number: sponsorRow?.custodian_license_number ?? null,
    business_street: sponsorRow?.business_street ?? null,
    business_city: sponsorRow?.business_city ?? null,
    business_state: sponsorRow?.business_state ?? null,
    business_zip: sponsorRow?.business_zip ?? null,
    business_phone: sponsorRow?.business_phone ?? null,
    business_type: sponsorRow?.business_type ?? null,
    dba_name: sponsorRow?.dba_name ?? null,
    president_owner: sponsorRow?.president_owner ?? null,
    qualifying_officer: sponsorRow?.qualifying_officer ?? null,
    carry_business_status: sponsorRow?.carry_business_status ?? null,
    carry_business_number: sponsorRow?.carry_business_number ?? null,
    carry_business_expires: sponsorRow?.carry_business_expires ?? null,
  }
  const profileComplete = Boolean(
    profile.agency_license_number &&
      profile.custodian_name &&
      profile.custodian_license_number &&
      profile.business_street &&
      profile.business_city &&
      profile.business_state &&
      profile.business_zip &&
      profile.business_phone &&
      profile.business_type,
  )

  // H1 — a HARD first-load gate. Until the company profile is complete, the rep
  // sees ONLY the profile (and nothing else) — it's six fields, it unblocks their
  // own applicant, and every company form is pre-filled from it. Re-editable after
  // via the profile card; never re-gated once complete.
  if (!profileComplete) {
    return (
      <div className="space-y-6">
        <div>
          <SectionEyebrow>{scope.applicant_name}</SectionEyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Start with your company profile</h1>
          <p className="mt-1 max-w-prose text-sm text-text-mid">
            Before anything else, tell us about your company once. Every company form is pre-filled from this,
            so your applicant&apos;s packet can move. It takes a minute — the rest of this file opens as soon as
            it&apos;s complete.
          </p>
        </div>
        <CompanyProfileForm caseId={caseId} profile={profile} complete={false} />
      </div>
    )
  }

  // Hide not-applicable items entirely (e.g. REF-01 doesn't apply to the armed
  // track) so the rep never sees a "Four references" row that isn't real.
  // Only the company packet (party='sponsor') is ever the sponsor's to see or work.
  // party_scope() ensures the feed returns nothing else, at any scope; we never read
  // the applicant's requirements, documents or facts here (P0.1).
  const packet = reqs.filter((r) => r.party === "sponsor" && r.status !== "na")

  const title = (code: string, fallback: string) => actionFor(code)?.customerTitle ?? fallback

  return (
    <div className="space-y-6">
      {/* Header — whose file this is, never forgotten. */}
      <div>
        <SectionEyebrow>{scope.applicant_name}</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {scope.applicant_name} — {TRACK_LABEL[scope.license_track] ?? scope.license_track}
        </h1>
        <p className="mt-1 text-sm text-text-mid">
          You&apos;re sponsoring this applicant&apos;s licence. Complete your company packet below; the
          applicant files their own application.
        </p>
      </div>

      {/* Company profile — entered ONCE, fills every company form. It renders BEFORE
          the documents because the SPN-01 pre-fill is built from it. */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <IdCard className="size-4 text-brass" />
          <h2 className="text-lg font-semibold tracking-tight">Your company profile</h2>
        </div>
        <CompanyProfileForm caseId={caseId} profile={profile} complete={profileComplete} />
      </section>

      {/* Company packet — the work that is theirs alone. */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-brass" />
          <h2 className="text-lg font-semibold tracking-tight">Your company packet</h2>
        </div>
        {!profileComplete && (
          <p className="rounded-lg border border-brass/30 bg-brass/[0.06] px-3 py-2 text-xs text-brass">
            Complete your company profile first — the forms below are pre-filled from it.
          </p>
        )}
        <div className={profileComplete ? "space-y-2" : "space-y-2 opacity-60"}>
          {packet.map((r) => {
            const doc = docByReq.get(r.req_code)
            const satisfied = r.status === "satisfied"
            const state = r.status === "na" ? null : sponsorItemState(r.status, doc?.status, !!doc)
            return (
              <div key={r.case_requirement_id} className="rounded-lg border border-hairline bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{title(r.req_code, r.title)}</div>
                    <div className="mt-0.5 text-xs text-text-mid">
                      {r.req_code} ·{" "}
                      {state ? (
                        <span className={SPONSOR_ITEM_COPY[state].className}>{SPONSOR_ITEM_COPY[state].label}</span>
                      ) : (
                        "Not needed"
                      )}
                      {!r.blocking && " · optional"}
                    </div>
                    {actionFor(r.req_code)?.help && (
                      <p className="mt-1 text-xs text-text-low">{actionFor(r.req_code)!.help}</p>
                    )}
                    {/* Send-back reason so the rep knows what to fix + can re-upload. */}
                    {state === "changes" && doc?.review_notes && (
                      <p className="mt-1.5 rounded-md bg-warn/10 px-2 py-1.5 text-xs text-warn">
                        Sent back: {doc.review_notes}
                      </p>
                    )}
                  </div>
                  {r.req_code === "SPN-05" ? null : (
                    <div className="flex shrink-0 items-center gap-2">
                      {r.req_code === "SPN-01" && <PrepareCompanyFormButton caseId={caseId} ready={profileComplete} />}
                      {/* View what was uploaded — the rep couldn't see their own file before. */}
                      {doc?.document_id && <OpenDocumentButton documentId={doc.document_id} sensitive={false} />}
                      <SponsorUploader
                        caseId={caseId}
                        reqCode={r.req_code}
                        satisfied={satisfied}
                        fileName={doc?.file_name ?? null}
                      />
                    </div>
                  )}
                </div>
                {/* SPN-05 (gun custodian) is captured in the company profile above, not
                    as an inline form — this row shows only its resulting status. */}
                {r.req_code === "SPN-05" && !satisfied && (
                  <p className="mt-2 text-xs text-text-low">
                    Recorded in your company profile above.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* The applicant's own file — their identity, history and disclosures — is NEVER
          shown to a sponsor (P0.1). The sponsor works only their company packet above;
          the applicant files their own application. This is enforced server-side in
          party_scope() (migration 20260915000100), not by hiding UI: the sponsor feeds
          return no applicant rows and sponsor_open_document refuses an applicant
          document id. There is deliberately no "applicant's file" or "shared details"
          section here. */}

      {scope.license_track === "sponsored_unresolved" && (
        <p className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
          <Landmark className="mt-0.5 size-4 shrink-0" />
          The applicant&apos;s licence category is still being confirmed. Your packet can proceed now; the
          applicant&apos;s NYPD-specific items open once the category is set.
        </p>
      )}

      {/* Talk to us, not the applicant. */}
      <section className="rounded-lg border border-hairline bg-card p-4">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-brass" />
          <h2 className="text-sm font-medium">Questions about this file?</h2>
        </div>
        <p className="mt-1 text-sm text-text-mid">
          Reach your Gun License NYC contact at{" "}
          <a href={`mailto:${brand.contact.email}`} className="text-signal underline">
            {brand.contact.email}
          </a>
          . Please keep sponsor questions with us rather than contacting the applicant directly.
        </p>
      </section>
    </div>
  )
}
