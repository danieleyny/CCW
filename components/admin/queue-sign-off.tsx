"use client"

import { PreFilingSignoffDialog } from "@/components/admin/pre-filing-signoff-dialog"

/**
 * Inline QA sign-off straight from the queue — the same signPreFilingQa the
 * case-page gate card calls. The gate re-checks server-side, so a stale queue
 * row can never sign off a case that quietly regressed.
 */
export function QueueSignOff({
  caseId,
  applicant,
  staffName,
  serviceMode,
  className,
}: {
  caseId: string
  applicant: string
  staffName: string
  serviceMode: "concierge" | "self_guided" | null
  className?: string
}) {
  return <PreFilingSignoffDialog caseId={caseId} applicant={applicant} staffName={staffName} serviceMode={serviceMode} className={className} />
}
