/**
 * CONCIERGE QA Phase 1 — which case_requirements a reviewed document resolves.
 *
 * A smart upload (e.g. a U.S. passport) binds its document_id across every
 * requirement its kind covers at UPLOAD time (IDN-01/02/03), leaving them pending
 * because satisfaction is a review decision. At REVIEW time we must act on that
 * whole set, not just the document's own req_code — otherwise the siblings strand
 * unsatisfied forever and the case can never pass the CP-5 gate.
 *
 * The set is: every requirement already BOUND to this document (the fan-out) UNION
 * the target req_code resolution (doc.req_code, else a documentType fallback — for
 * legacy docs and uploads that never went through a smart kind). Never widened
 * beyond what the upload bound; the smart-document map stays the source of truth
 * for which codes a kind may cover. 'na' rows are skipped.
 */
export interface ReviewReqRow {
  id: string
  status: string
  req_code: string
}

export function resolveReviewTargets(
  boundReqs: ReviewReqRow[],
  targetReqs: ReviewReqRow[]
): ReviewReqRow[] {
  const byId = new Map<string, ReviewReqRow>()
  for (const r of [...boundReqs, ...targetReqs]) byId.set(r.id, r)
  return [...byId.values()].filter((r) => r.status !== "na")
}
