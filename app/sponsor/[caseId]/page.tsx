import { Building2, FileText, Landmark, Mail, IdCard } from "lucide-react"
import { resolveFacts } from "@/lib/facts/resolve"
import { FactGroups } from "@/components/portal/facts/fact-groups"
import type { FactGroup } from "@/lib/facts/registry"
import { sponsorItemState, SPONSOR_ITEM_COPY } from "@/lib/sponsor/status"
import {
  loadSponsorCase,
  loadSponsorRequirements,
  loadSponsorDocuments,
  loadSponsorRosterProgress,
} from "@/lib/sponsor/queries"
import { actionFor, conciergeScopeFor } from "@/lib/requirements/actions"
import { brand } from "@/config/brand"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import type { MyCase } from "@/lib/portal"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { SponsorUploader } from "@/components/sponsor/sponsor-uploader"
import { CustodianForm } from "@/components/sponsor/custodian-form"
import { OpenDocumentButton } from "@/components/sponsor/open-document-button"
import { SponsorApplicantFile, type SponsorFileRow } from "@/components/sponsor/sponsor-applicant-file"
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

  const [reqs, docs, roster] = await Promise.all([
    loadSponsorRequirements(caseId),
    loadSponsorDocuments(caseId),
    loadSponsorRosterProgress(caseId),
  ])

  const docByReq = new Map<string, (typeof docs)[number]>()
  for (const d of docs) if (!docByReq.has(d.req_code)) docByReq.set(d.req_code, d)
  const rosterByReq = new Map(roster.map((r) => [r.req_code, r]))

  // Hide not-applicable items entirely (e.g. REF-01 doesn't apply to the armed
  // track) so the rep never sees a "Four references" row that isn't real.
  const packet = reqs.filter((r) => r.party === "sponsor" && r.status !== "na")
  const applicant = reqs.filter((r) => r.party === "applicant" && r.status !== "na")

  // At full scope the rep gets execution parity on the applicant's file — upload +
  // prepare drafts through the SAME actions the applicant uses. We load the
  // requirement view (admin — the rep is already authorized for full scope) only
  // for the prefills; the scoped feed above still governs what rows exist.
  let fileRows: SponsorFileRow[] | null = null
  if (scope.scope === "full") {
    const admin = createAdminClient()
    const { data: cl } = await admin
      .from("cases")
      .select("client_id, clients:client_id(full_name, borough, zip)")
      .eq("id", caseId)
      .single()
    if (cl?.client_id) {
      const client = cl.clients as unknown as { full_name: string; borough: string | null; zip: string | null } | null
      const myCase = {
        id: caseId,
        client_id: cl.client_id,
        stage: scope.stage,
        client: { full_name: client?.full_name ?? scope.applicant_name, borough: client?.borough ?? null, zip: client?.zip ?? null },
      } as unknown as MyCase
      const view = await loadRequirementView(admin, myCase)
      fileRows = applicant.map((r) => ({
        reqCode: r.req_code,
        title: r.title,
        status: r.status,
        hasDoc: !!docByReq.get(r.req_code),
        documentId: docByReq.get(r.req_code)?.document_id ?? null,
        prefill: view.prefills[r.req_code] ?? {},
      }))
    }
  }

  const title = (code: string, fallback: string) => actionFor(code)?.customerTitle ?? fallback

  // Shared details — the ONE fact layer, editable here through the same resolver
  // and setCaseFact the applicant uses (attributed as a sponsor edit). Only at full
  // scope: setCaseFact authorizes a sponsor write solely at full scope, so we show
  // the editable surface only there. The SSN is NEVER shown to a sponsor.
  const facts = scope.scope === "full" ? await resolveFacts(createAdminClient(), caseId) : null
  const detailGroups: FactGroup[] = ["sponsor", "you", "address", "contact", "physical", "employer", "safeguard"]

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

      {/* Company packet — the work that is theirs alone. */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-brass" />
          <h2 className="text-lg font-semibold tracking-tight">Your company packet</h2>
        </div>
        <div className="space-y-2">
          {packet.map((r) => {
            const doc = docByReq.get(r.req_code)
            const satisfied = r.status === "satisfied"
            const state = r.status === "na" ? null : sponsorItemState(r.status, !!doc)
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
                  </div>
                  {r.req_code === "SPN-05" ? null : (
                    <div className="flex shrink-0 items-center gap-2">
                      {r.req_code === "SPN-01" && <PrepareCompanyFormButton caseId={caseId} />}
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
                {r.req_code === "SPN-05" && (
                  <div className="mt-3">
                    <CustodianForm caseId={caseId} satisfied={satisfied} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* The applicant's file — rendered through party_scope. */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-brass" />
          <h2 className="text-lg font-semibold tracking-tight">The applicant&apos;s file</h2>
        </div>
        {scope.scope === "packet_only" ? (
          <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
            Your access covers your company packet only.
          </p>
        ) : fileRows ? (
          // Full scope → execution parity (upload + prepare drafts).
          <SponsorApplicantFile caseId={caseId} rows={fileRows} />
        ) : applicant.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
            Nothing to show yet — the applicant&apos;s documents will appear here as they&apos;re added.
          </p>
        ) : (
          // assist scope → read-only view of the non-disclosure paperwork.
          <div className="space-y-2">
            {applicant.map((r) => {
              const doc = docByReq.get(r.req_code)
              const prog = rosterByReq.get(r.req_code)
              const sensitive = conciergeScopeFor(r.req_code) === "hidden"
              return (
                <div key={r.case_requirement_id} className="flex items-start justify-between gap-3 rounded-lg border border-hairline bg-card p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{title(r.req_code, r.title)}</div>
                    <div className="mt-0.5 text-xs text-text-mid">
                      {r.req_code} ·{" "}
                      {r.status === "na" ? (
                        "Not needed"
                      ) : (
                        <span className={SPONSOR_ITEM_COPY[sponsorItemState(r.status, !!doc)].className}>
                          {SPONSOR_ITEM_COPY[sponsorItemState(r.status, !!doc)].label}
                        </span>
                      )}
                      {prog && prog.required_count != null && ` · ${prog.done_count ?? 0} of ${prog.required_count} back`}
                    </div>
                  </div>
                  {doc && r.scope === "full" ? (
                    <OpenDocumentButton documentId={doc.document_id} sensitive={sensitive} />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Shared details — entered once, reused on every form (full scope only). */}
      {facts && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <IdCard className="size-4 text-brass" />
            <h2 className="text-lg font-semibold tracking-tight">Shared details</h2>
          </div>
          <p className="text-sm text-text-mid">
            Fix any of these once and it&apos;s corrected on every form that uses it. The applicant&apos;s
            Social Security number is never shown here.
          </p>
          <FactGroups caseId={caseId} facts={facts} hasSsn={false} groups={detailGroups} />
        </section>
      )}

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
