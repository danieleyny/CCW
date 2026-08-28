"use client"

import { useState } from "react"
import { FilePen, Users } from "lucide-react"
import { actionFor } from "@/lib/requirements/actions"
import { questionnaireFor } from "@/lib/requirements/questionnaires"
import { conciergeScopeFor } from "@/lib/requirements/actions"
import { QuestionnaireDialog } from "@/components/portal/questionnaire-dialog"
import { SponsorUploader } from "@/components/sponsor/sponsor-uploader"
import { OpenDocumentButton } from "@/components/sponsor/open-document-button"
import { sponsorItemState, SPONSOR_ITEM_COPY } from "@/lib/sponsor/status"
import { sectionFor, SECTIONS, SECTION_ORDER } from "@/lib/requirements/sections"
import { Button } from "@/components/ui/button"

export interface SponsorFileRow {
  reqCode: string
  title: string
  status: string
  hasDoc: boolean
  /** The bound document's own status (a rejection lives here, not on the requirement). */
  docStatus: string | null
  docNote: string | null
  documentId: string | null
  prefill: Record<string, unknown>
}

/**
 * The applicant's file, at scope='full', where the sponsor rep has PARITY: they
 * upload documents and PREPARE questionnaire/roster drafts through the SAME server
 * actions the applicant uses (passed the caseId). What they can never do is adopt
 * — a sworn draft waits for the applicant to review and sign. There is no sign
 * control here, by construction.
 */
export function SponsorApplicantFile({ caseId, rows }: { caseId: string; rows: SponsorFileRow[] }) {
  const [openReq, setOpenReq] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
        Nothing to show yet — the applicant&apos;s items will appear here as the case is built.
      </p>
    )
  }

  // Same registry taxonomy as the applicant's own surfaces — the file reads as a
  // handful of labelled sections, not a flat wall. (SPN-* is the company packet,
  // rendered above; it never appears in the applicant's file.)
  const groups = SECTIONS.filter((s) => !s.hidden && s.key !== "sponsor")
    .map((s) => ({ title: s.title, key: s.key, rows: rows.filter((r) => sectionFor(r.reqCode) === s.key) }))
    .filter((g) => g.rows.length > 0)
    .sort((a, b) => SECTION_ORDER[a.key] - SECTION_ORDER[b.key])

  const renderRow = (r: SponsorFileRow) => {
        const action = actionFor(r.reqCode)
        const sensitive = conciergeScopeFor(r.reqCode) === "hidden"
        const isUpload = action?.mode === "obtain" && !!action.documentType
        const isPrepare =
          action?.mode === "generate" || action?.mode === "roster"
        const questionnaireId =
          action && (action.mode === "generate" || action.mode === "roster") ? action.questionnaireId : null
        const q = questionnaireId ? questionnaireFor(questionnaireId) : null

        return (
          <div key={r.reqCode} className="flex items-start justify-between gap-3 rounded-lg border border-hairline bg-card p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">{action?.customerTitle ?? r.title}</div>
              <div className="mt-0.5 text-xs text-text-mid">
                {r.reqCode} ·{" "}
                <span className={SPONSOR_ITEM_COPY[sponsorItemState(r.status, r.docStatus, r.hasDoc)].className}>
                  {SPONSOR_ITEM_COPY[sponsorItemState(r.status, r.docStatus, r.hasDoc)].label}
                </span>
              </div>
              {sponsorItemState(r.status, r.docStatus, r.hasDoc) === "changes" && r.docNote && (
                <p className="mt-1.5 rounded-md bg-warn/10 px-2 py-1.5 text-xs text-warn">Sent back: {r.docNote}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.hasDoc && r.documentId && <OpenDocumentButton documentId={r.documentId} sensitive={sensitive} />}
              {isUpload && <SponsorUploader caseId={caseId} reqCode={r.reqCode} satisfied={r.status === "satisfied"} fileName={null} />}
              {isPrepare && q && (
                <Button size="sm" variant="outline" className="min-h-[36px]" onClick={() => setOpenReq(r.reqCode)}>
                  {action?.mode === "roster" ? <Users className="mr-1 size-3.5" /> : <FilePen className="mr-1 size-3.5" />}
                  Prepare
                </Button>
              )}
            </div>

            {isPrepare && q && (
              <QuestionnaireDialog
                open={openReq === r.reqCode}
                onOpenChange={(v) => setOpenReq(v ? r.reqCode : null)}
                reqCode={r.reqCode}
                questionnaire={q}
                initial={r.prefill}
                signatureOnFile={null}
                caseId={caseId}
                canAdopt={false}
                lockParty="sponsor"
              />
            )}
          </div>
        )
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="engraved-sm mb-1.5 text-text-mid">{g.title}</h3>
          <div className="space-y-2">{g.rows.map(renderRow)}</div>
        </div>
      ))}
    </div>
  )
}
