/**
 * The three-state completed treatment (R3), sponsor side. A sponsor surface reads
 * the RAW case_requirements.status, which only flips to `satisfied` on staff
 * acceptance — so on its own it shows "Outstanding" even right after a document
 * was uploaded, in BOTH directions (the applicant's upload into the rep's view,
 * and the rep's upload). Deriving from the bound document restores the honest
 * middle state:
 *
 *   outstanding → nothing in yet
 *   received    → a document is bound (server-confirmed), awaiting review — SIGNAL
 *   accepted    → staff accepted it — GREEN (earned only by a human)
 *   changes     → sent back for another version
 *
 * Green is never shown before staff acceptance; a received document is signal, not
 * brass (brass is reserved for "your turn").
 */
export type SponsorItemState = "outstanding" | "received" | "accepted" | "changes"

/**
 * A rejection is recorded on the DOCUMENT (documents.status='rejected' + a review
 * note), NOT on case_requirements.status — which stays 'pending' until staff
 * accept. So the requirement status alone never shows a send-back; we must read
 * the bound document's status too, or the sponsor sees "Received — under review"
 * forever after their file was rejected.
 */
export function sponsorItemState(
  reqStatus: string,
  docStatus: string | null | undefined,
  hasDoc: boolean
): SponsorItemState {
  if (reqStatus === "satisfied" || docStatus === "approved") return "accepted"
  if (reqStatus === "rejected" || docStatus === "rejected") return "changes"
  if (hasDoc) return "received"
  return "outstanding"
}

export const SPONSOR_ITEM_COPY: Record<SponsorItemState, { label: string; className: string }> = {
  outstanding: { label: "Outstanding", className: "text-text-mid" },
  // Received = server-confirmed, awaiting review → SIGNAL (brass is reserved for
  // "your turn"; green is reserved for staff acceptance).
  received: { label: "Received — under review", className: "text-signal" },
  accepted: { label: "Accepted", className: "text-ok" },
  changes: { label: "Needs another version", className: "text-warn" },
}
