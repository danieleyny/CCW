/**
 * CONCIERGE Phase 6 — the compliance guarantee. The applicant's adopted
 * signature may be applied ONLY to documents that are theirs to sign. The
 * concierge review surface's allowlist must NEVER include:
 *   • character references (REF-01/REF-02) — the reference signs + notarizes
 *   • cohabitant affidavits (COH-01) — the household member signs
 *   • the NYPD application — the applicant fills + submits it on the NYPD portal
 * and the file-it-yourself guide only appears once the packet is actually
 * assembled through the CP-5 gate.
 */
import { describe, expect, it } from "vitest"
import { buildReviewItems, conciergeSignable, readyToFile } from "@/lib/concierge/review"
import type { RequirementView } from "@/lib/portal/requirement-view"

describe("conciergeSignable — the signable-by-applicant allowlist", () => {
  it("INCLUDES the applicant's own generate-mode documents", () => {
    expect(conciergeSignable("AFF-01")).toBe(true) // affirmation of understanding
    expect(conciergeSignable("SAF-01")).toBe(true) // safe-storage statement
  })

  it("EXCLUDES references, cohabitant affidavits, and unknown/NYPD codes", () => {
    expect(conciergeSignable("REF-01")).toBe(false)
    expect(conciergeSignable("REF-02")).toBe(false)
    expect(conciergeSignable("COH-01")).toBe(false)
    expect(conciergeSignable("NYPD-APP")).toBe(false)
    expect(conciergeSignable("")).toBe(false)
  })
})

describe("buildReviewItems — never surfaces a third-party/NYPD document", () => {
  it("drops REF/COH drafts even if a generated doc exists for them", () => {
    const view = {
      items: [
        { reqCode: "AFF-01", title: "Affirmation" },
        { reqCode: "REF-01", title: "References" },
        { reqCode: "COH-01", title: "Household" },
      ],
      generated: {
        "AFF-01": { id: "d1", fileName: "aff.pdf", url: "u1", signedAt: null },
        "REF-01": { id: "d2", fileName: "ref.pdf", url: "u2", signedAt: null },
        "COH-01": { id: "d3", fileName: "coh.pdf", url: "u3", signedAt: null },
      },
    } as unknown as RequirementView

    const items = buildReviewItems(view)
    const codes = items.map((i) => i.reqCode)
    expect(codes).toEqual(["AFF-01"])
    expect(codes).not.toContain("REF-01")
    expect(codes).not.toContain("COH-01")
  })
})

describe("readyToFile — gated on real assembly", () => {
  it("is false before the packet is assembled", () => {
    expect(readyToFile("document_collection")).toBe(false)
    expect(readyToFile("notarization")).toBe(false)
  })
  it("is true once assembled/filed (the CP-5 gate already passed to get here)", () => {
    expect(readyToFile("application_assembled")).toBe(true)
    expect(readyToFile("filed")).toBe(true)
  })
})
