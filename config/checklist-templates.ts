/**
 * Templated checklist items, seeded onto every new case. Each item is tied to a
 * stage (CaseStageKey) and an owner (who must act). Items that correspond to an
 * uploadable document reference the `documentType` so the portal/admin can wire
 * the upload + review flow to the right checklist row.
 *
 * `key` is stable per template item (used for idempotent seeding and lookups).
 */

import type { CaseStageKey } from "@/config/stages"

export type ChecklistOwner = "client" | "staff"

export type DocumentType =
  | "id"
  | "reference_letter"
  | "cohabitant_affidavit"
  | "social_media_list"
  | "safe_photo_open"
  | "safe_photo_closed"
  | "training_cert"
  | "proof_residence"

export interface ChecklistTemplateItem {
  key: string
  stageKey: CaseStageKey
  title: string
  description?: string
  required: boolean
  owner: ChecklistOwner
  documentType?: DocumentType
}

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // Stage 2 — Eligibility
  {
    key: "eligibility_age",
    stageKey: "eligibility_screened",
    title: "Confirm applicant is 21 or older",
    required: true,
    owner: "staff",
  },
  {
    key: "eligibility_residency",
    stageKey: "eligibility_screened",
    title: "Confirm NYC borough residency or NYC place of business",
    description: "Non-residents route to the Special Carry track.",
    required: true,
    owner: "staff",
  },
  {
    key: "eligibility_disqualifiers",
    stageKey: "eligibility_screened",
    title: "Screen for disqualifying convictions / history",
    required: true,
    owner: "staff",
  },

  // Stage 3 — Signed up & paid
  {
    key: "signed_agreement",
    stageKey: "signed_up_paid",
    title: "Service agreement signed",
    required: true,
    owner: "client",
  },
  {
    key: "deposit_paid",
    stageKey: "signed_up_paid",
    title: "Deposit or full payment received",
    required: true,
    owner: "client",
  },

  // Stage 4 — Training scheduled
  {
    key: "training_class_booked",
    stageKey: "training_scheduled",
    title: "16-hour classroom session booked",
    required: true,
    owner: "staff",
  },
  {
    key: "training_range_booked",
    stageKey: "training_scheduled",
    title: "2-hour live-fire range session booked",
    required: true,
    owner: "staff",
  },

  // Stage 5 — Training complete
  {
    key: "training_attended",
    stageKey: "training_complete",
    title: "Attended 16hr classroom + 2hr live-fire",
    required: true,
    owner: "client",
  },
  {
    key: "training_test_passed",
    stageKey: "training_complete",
    title: "Written test passed (≥ 80%)",
    required: true,
    owner: "client",
  },
  {
    key: "training_cert",
    stageKey: "training_complete",
    title: "Upload training completion certificate",
    required: true,
    owner: "client",
    documentType: "training_cert",
  },

  // Stage 6 — Document collection
  {
    key: "doc_photo_id",
    stageKey: "document_collection",
    title: "Upload government photo ID",
    description: "Driver license, non-driver ID, or passport.",
    required: true,
    owner: "client",
    documentType: "id",
  },
  {
    key: "doc_proof_residence",
    stageKey: "document_collection",
    title: "Upload proof of residence / business",
    required: true,
    owner: "client",
    documentType: "proof_residence",
  },
  {
    key: "doc_references",
    stageKey: "document_collection",
    title: "Provide 4 character references",
    description: "2 may be family; 2 unrelated, non-law-enforcement; all lawful US residents.",
    required: true,
    owner: "client",
    documentType: "reference_letter",
  },
  {
    key: "doc_cohabitants",
    stageKey: "document_collection",
    title: "List all cohabitants over 18",
    description: "An affidavit is required for every adult living in the home.",
    required: true,
    owner: "client",
    documentType: "cohabitant_affidavit",
  },
  {
    key: "doc_social_media",
    stageKey: "document_collection",
    title: "Submit 3-year social media account list",
    description: "All current and former accounts for the past 3 years (CCIA requirement).",
    required: true,
    owner: "client",
    documentType: "social_media_list",
  },
  {
    key: "doc_safe_photo_closed",
    stageKey: "document_collection",
    title: "Upload safe photo — door closed",
    description: "Color photo of the actual gun safe, whole safe visible, door closed.",
    required: true,
    owner: "client",
    documentType: "safe_photo_closed",
  },
  {
    key: "doc_safe_photo_open",
    stageKey: "document_collection",
    title: "Upload safe photo — door open",
    description: "Color photo of the actual gun safe, whole safe visible, door open.",
    required: true,
    owner: "client",
    documentType: "safe_photo_open",
  },

  // Stage 7 — Notarization
  {
    key: "notarize_references",
    stageKey: "notarization",
    title: "All 4 character references notarized",
    required: true,
    owner: "client",
  },
  {
    key: "notarize_cohabitants",
    stageKey: "notarization",
    title: "All cohabitant affidavits notarized",
    required: true,
    owner: "client",
  },

  // Stage 8 — Application assembled & QA'd
  {
    key: "qa_packet_review",
    stageKey: "application_assembled",
    title: "QA full application packet for accuracy",
    required: true,
    owner: "staff",
  },
  {
    key: "qa_fees_ready",
    stageKey: "application_assembled",
    title: "Confirm ~$340 license fee + fingerprinting fee ready",
    required: true,
    owner: "staff",
  },

  // Stage 9 — Filed
  {
    key: "filed_portal",
    stageKey: "filed",
    title: "Submit application on NYPD portal",
    required: true,
    owner: "staff",
  },
  {
    key: "filed_record_ref",
    stageKey: "filed",
    title: "Record NYPD application reference #",
    required: true,
    owner: "staff",
  },

  // Stage 10 — Fingerprinting / interview
  {
    key: "fp_appointment",
    stageKey: "fingerprinting_booked",
    title: "Book fingerprinting + License Division interview",
    required: true,
    owner: "staff",
  },
  {
    key: "fp_attended",
    stageKey: "fingerprinting_booked",
    title: "Attend fingerprinting and interview",
    required: true,
    owner: "client",
  },

  // Stage 13 — Licensed
  {
    key: "license_issued",
    stageKey: "licensed",
    title: "License issued and delivered to client",
    required: true,
    owner: "staff",
  },
  {
    key: "renewal_scheduled",
    stageKey: "licensed",
    title: "Schedule 3-year renewal reminder",
    required: true,
    owner: "staff",
  },
]

/** Items grouped by stage, in stage order — handy for the case-file checklist UI. */
export function checklistByStage(): Record<CaseStageKey, ChecklistTemplateItem[]> {
  const grouped = {} as Record<CaseStageKey, ChecklistTemplateItem[]>
  for (const item of CHECKLIST_TEMPLATE) {
    ;(grouped[item.stageKey] ??= []).push(item)
  }
  return grouped
}
