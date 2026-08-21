import { Building2, FileText, Landmark, Mail } from "lucide-react"
import {
  loadSponsorCase,
  loadSponsorRequirements,
  loadSponsorDocuments,
  loadSponsorRosterProgress,
} from "@/lib/sponsor/queries"
import { actionFor, conciergeScopeFor } from "@/lib/requirements/actions"
import { brand } from "@/config/brand"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { SponsorUploader } from "@/components/sponsor/sponsor-uploader"
import { CustodianForm } from "@/components/sponsor/custodian-form"
import { OpenDocumentButton } from "@/components/sponsor/open-document-button"

export const metadata = { title: "Sponsored file", robots: { index: false, follow: false } }

const TRACK_LABEL: Record<string, string> = {
  carry_guard: "NYPD Carry Guard",
  special_carry_guard: "NYPD Special Carry Guard",
  sponsored_unresolved: "NYPD armed guard — category being confirmed",
  concealed_carry: "NYPD licence",
}
const STATUS_LABEL: Record<string, string> = {
  pending: "Outstanding",
  satisfied: "Received",
  rejected: "Needs another version",
  na: "Not needed",
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

  const packet = reqs.filter((r) => r.party === "sponsor")
  const applicant = reqs.filter((r) => r.party === "applicant")

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
            return (
              <div key={r.case_requirement_id} className="rounded-lg border border-hairline bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{title(r.req_code, r.title)}</div>
                    <div className="mt-0.5 text-xs text-text-mid">
                      {r.req_code} · {STATUS_LABEL[r.status] ?? r.status}
                      {!r.blocking && " · optional"}
                    </div>
                    {actionFor(r.req_code)?.help && (
                      <p className="mt-1 text-xs text-text-low">{actionFor(r.req_code)!.help}</p>
                    )}
                  </div>
                  {r.req_code === "SPN-05" ? null : (
                    <SponsorUploader
                      caseId={caseId}
                      reqCode={r.req_code}
                      satisfied={satisfied}
                      fileName={doc?.file_name ?? null}
                    />
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
        {applicant.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
            {scope.scope === "packet_only"
              ? "Your access covers your company packet only."
              : "Nothing to show yet — the applicant's documents will appear here as they're added."}
          </p>
        ) : (
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
                      {r.req_code} · {STATUS_LABEL[r.status] ?? r.status}
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
