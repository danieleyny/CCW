/**
 * CONCIERGE Phase 3 — the secure vault's ask list, derived from the SAME
 * requirement view the checklist and admin read. The vault is not a parallel
 * document system: it's a friendlier, shorter presentation of the applicant's
 * real, outstanding "obtain"-mode document requirements. Uploads flow through the
 * same DocumentUploader → recordDocument → documents/case_requirements, so staff
 * see them immediately.
 */
import { actionFor } from "@/lib/requirements/actions"
import { smartDocumentsForRequirement, type SmartDocument } from "@/lib/requirements/smart-documents"
import type { ReqChecklistItem } from "@/components/portal/requirements-checklist"
import type { CurrentDoc } from "@/components/portal/document-uploader"

export interface VaultItem {
  reqCode: string
  documentType: string
  /** Friendly, retail-voice ask. */
  title: string
  help: string
  status: string
  current: CurrentDoc | null
  smartKinds: SmartDocument[]
  photoSpec: boolean
}

// Warmer titles for the handful of near-universal asks; track-specific documents
// fall back to the registry's own customerTitle/title.
const FRIENDLY: Record<string, { title: string; help: string }> = {
  "IDN-01": {
    title: "A photo of your ID",
    help: "A passport, driver's license, or state ID. One clear photo — a passport covers your ID, birth date, and citizenship all at once.",
  },
  "IDN-04": {
    title: "Your license photo",
    help: "A passport-style headshot. We check it against the NYPD spec as you upload, so it can't get bounced later.",
  },
  "RES-01": {
    title: "Proof you live in NYC",
    help: "A recent utility bill, lease, or bank statement showing your name and NYC address.",
  },
  "TRN-01": {
    title: "Your training certificate",
    help: "Your certificate from the NYPD-approved firearms course. Don't have it yet? Leave this — we'll help you get trained first.",
  },
  "RNW-01": {
    title: "Your training certificate",
    help: "Your renewal training certificate. Don't have it yet? Leave this — we'll sort it out with you.",
  },
}

// The order the core asks feel natural in; anything else follows, in view order.
const ORDER = ["IDN-01", "IDN-04", "RES-01", "TRN-01", "RNW-01"]

/**
 * Build the vault ask list. Only "obtain"-mode document requirements that exist
 * and aren't N/A on this case; the ID family collapses to one card (uploading a
 * passport/ID once fans out to IDN-02/03 via the smart-document engine), so the
 * applicant is never asked for the same document twice.
 */
export function buildVaultItems(items: ReqChecklistItem[], currentByReq: Record<string, CurrentDoc>): VaultItem[] {
  const codes = new Set(items.map((i) => i.reqCode))
  const idFamilyCollapsed = codes.has("IDN-01") ? new Set(["IDN-02", "IDN-03"]) : new Set<string>()

  const vault = items
    .filter((i) => {
      if (i.status === "na") return false
      if (idFamilyCollapsed.has(i.reqCode)) return false
      const action = actionFor(i.reqCode)
      return action?.mode === "obtain" && !!action.documentType
    })
    .map((i) => {
      const action = actionFor(i.reqCode)!
      const friendly = FRIENDLY[i.reqCode]
      return {
        reqCode: i.reqCode,
        documentType: action.documentType as string,
        title: friendly?.title ?? action.customerTitle ?? i.title,
        help: friendly?.help ?? action.help,
        status: i.status,
        current: currentByReq[i.reqCode] ?? null,
        smartKinds: smartDocumentsForRequirement(i.reqCode),
        photoSpec: action.documentType === "applicant_photo",
      }
    })

  return vault.sort((a, b) => {
    const ai = ORDER.indexOf(a.reqCode)
    const bi = ORDER.indexOf(b.reqCode)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}
