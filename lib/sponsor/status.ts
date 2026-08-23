/**
 * The three-state completed treatment (R3), sponsor side. A sponsor surface reads
 * the RAW case_requirements.status, which only flips to `satisfied` on staff
 * acceptance — so on its own it shows "Outstanding" even right after a document
 * was uploaded, in BOTH directions (the applicant's upload into the rep's view,
 * and the rep's upload). Deriving from the bound document restores the honest
 * middle state:
 *
 *   outstanding → nothing in yet
 *   received    → a document is bound (server-confirmed), awaiting review — BRASS
 *   accepted    → staff accepted it — GREEN (earned only by a human)
 *   changes     → sent back for another version
 *
 * Green is never shown before staff acceptance; a received document is brass.
 */
export type SponsorItemState = "outstanding" | "received" | "accepted" | "changes"

export function sponsorItemState(status: string, hasDoc: boolean): SponsorItemState {
  if (status === "satisfied") return "accepted"
  if (status === "rejected") return "changes"
  if (hasDoc) return "received"
  return "outstanding"
}

export const SPONSOR_ITEM_COPY: Record<SponsorItemState, { label: string; className: string }> = {
  outstanding: { label: "Outstanding", className: "text-text-mid" },
  received: { label: "Received — under review", className: "text-brass-bright" },
  accepted: { label: "Accepted", className: "text-ok" },
  changes: { label: "Needs another version", className: "text-warn" },
}
