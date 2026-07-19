/**
 * V3-P2.5 — the 15 things a consultant types every week. Inserted into the
 * message box for editing before send (never auto-sent). Keep candor-
 * maximizing and expectation-safe: no outcome promises, no timeline
 * commitments, no legal advice.
 *
 * V4-A4f — fee amounts come from the `fees` table via getFees(), so a fee
 * change never leaves a stale number in a canned message.
 */
import type { Fees } from "@/lib/fees"

export function buildMessageTemplates(fees: Fees): { label: string; body: string }[] {
  return [
  {
    label: "Welcome / kickoff",
    body: "Welcome aboard! Your portal is live — start with the Application intake so we can build your personalized checklist, and book your safety training early: it's the longest-lead item and must be recent when we assemble your application.",
  },
  {
    label: "Start training now (long-lead)",
    body: "A heads-up on sequencing: the 16+2-hour safety course is the longest-lead item, and the certificate must be dated within 6 months of submission. Booking it this week keeps everything else on schedule — you can find a verified instructor right in your portal.",
  },
  {
    label: "Safe photos needed",
    body: "We still need two photos of your gun safe — one with the door open and one closed, showing the full safe (phone photos are fine; they compress automatically). Upload them under Documents whenever you're ready.",
  },
  {
    label: "Reference links waiting",
    body: "A couple of your character references haven't completed their letters yet. You can resend or copy their personal links from the People page — a quick personal nudge from you usually does it.",
  },
  {
    label: "Cohabitant affidavit reminder",
    body: "Each adult in your household needs a notarized cohabitant affidavit. They each have a personal link on your People page — the whole thing, including online notarization, takes about ten minutes.",
  },
  {
    label: "Document needs a fix",
    body: "One of your uploads needs a fix — the note on the document explains what to change. Re-upload it under Documents and we'll re-review the same day.",
  },
  {
    label: "Explanation needs more detail",
    body: "One of your written explanations needs more detail before we can assemble. Describe in your own words what happened, when, how it resolved, and any context the reviewer should understand. Complete, candid explanations are exactly what the License Division looks for.",
  },
  {
    label: "Proof of residence rules",
    body: "Quick note on proof of residence: cell-phone bills are not accepted. A utility, cable, landline, or gas bill works — or a lease/deed plus a filed NYS tax return showing the same address.",
  },
  {
    label: "Ready for assembly",
    body: "Good news — every requirement on your checklist is satisfied. We're running the final pre-filing QA pass now and will assemble your packet for your review. You'll review and submit the application yourself, and we'll walk you through exactly how.",
  },
  {
    label: "Fingerprints reminder",
    body: `Don't forget the fingerprint appointment — the DCJS fee (currently ${fees.fingerprintFee}) is paid separately from the NYPD application fee. Bring your confirmation and photo ID.`,
  },
  {
    label: "Interview prep",
    body: "Your interview is coming up. Review your application copy the night before — consistency with what you filed is what matters. Answer plainly and completely; if you don't remember a detail, say so rather than guessing.",
  },
  {
    label: "Checking in",
    body: "Checking in — anything blocking you on the checklist this week? Happy to walk through any item over a quick call.",
  },
  {
    label: "Fee reminder",
    body: `A reminder on fees: the NYPD application fee (currently ${fees.applicationFee}) is due at filing, plus the DCJS fingerprint fee (currently ${fees.fingerprintFee}) paid separately. Neither is refundable, and cash/personal checks aren't accepted.`,
  },
  {
    label: "Renewal runway",
    body: "Your renewal window is approaching. Renewals skip character references but need a fresh 2-hour live-fire certificate dated within 6 months — booking that now keeps the runway comfortable.",
  },
  {
    label: "Address/status change duty",
    body: "A reminder that license holders must promptly report changes — address, email, any arrest or summons, or becoming subject to an order of protection. If anything has changed, tell us and we'll walk you through the reporting step.",
  },
  ]
}

/**
 * PART B / Phase 8 — saved replies for the TRAINER↔applicant chat. Scoped to
 * the paperwork a trainer actually helps with — completeness and format, never
 * legal sufficiency, never anything touching disclosures (the trainer can't see
 * those). Inserted into the composer for editing; never auto-sent.
 *
 * Static (no fee interpolation) — trainers don't quote fees.
 */
export const TRAINER_MESSAGE_TEMPLATES: { label: string; body: string }[] = [
  {
    label: "Re-upload — clearer photo",
    body: "Thanks for sending this over. The image is a little hard to read — could you retake it in good light with all four corners and the text clearly visible, then re-upload? Once it's crisp I'll mark it complete.",
  },
  {
    label: "Missing a page",
    body: "This looks like it's missing a page. Could you upload the complete document (front and back / all pages) so it's ready to file? Let me know if you're not sure which part is missing.",
  },
  {
    label: "Book your range session",
    body: "Next step on your end is the live-fire range session. Head to your portal to pick a time that works — booking it now keeps the rest of your timeline on track.",
  },
  {
    label: "Looks complete — moving forward",
    body: "Got it — this one looks complete and correct. I've marked it reviewed. Nice work; on to the next item.",
  },
  {
    label: "Format reminder",
    body: "Quick format note: uploads need to be a clear PDF or photo (JPG/PNG), and each document should be its own file. If anything won't upload, send it my way and I'll help sort it out.",
  },
  {
    label: "Checking in",
    body: "Just checking in on your document list — anything you're stuck on or have questions about? Happy to point you to the right example or walk through what's needed.",
  },
  {
    label: "You're all set on my end",
    body: "You're all set on everything I review. The rest of the assembly and the final quality check are handled by the Gun License NYC team — they'll take it from here. Great working with you.",
  },
]
