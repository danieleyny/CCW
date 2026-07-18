/**
 * The requirement → action map is the backbone of the document engine: the
 * checklist UI, the questionnaire engine, and the generators all read it. If the
 * registry gains a requirement and nobody maps it, the customer gets a dead item
 * with no way to complete it. This test makes that impossible to miss.
 *
 * Runs against the live local registry (skips when Supabase isn't reachable).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { REQUIREMENT_ACTIONS, actionFor, isSignable } from "@/lib/requirements/actions"
import { renderRequirementDocument } from "@/lib/requirements/document-engine"
import { adminClient, supabaseReachable } from "./helpers/supabase"
import { pdfText } from "./helpers/pdf"

const reachable = await supabaseReachable()

describe("requirement → action map", () => {
  it("every generate action names a questionnaire", () => {
    for (const [code, a] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (a.mode === "generate") {
        expect(a.questionnaireId, `${code} is generate but has no questionnaireId`).toBeTruthy()
      }
    }
  })

  it("every obtain action gives steps AND an official source", () => {
    for (const [code, a] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (a.mode === "obtain") {
        expect(a.steps?.length, `${code} is obtain but has no steps`).toBeGreaterThan(0)
        expect(a.sourceUrl, `${code} is obtain but has no sourceUrl`).toBeTruthy()
      }
    }
  })

  it("anything notarized is also marked sensitive (affidavits/references)", () => {
    for (const [code, a] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (a.notarize) expect(a.sensitive, `${code} is notarized but not sensitive`).toBe(true)
    }
  })

  it("disclosure/arrest/affidavit/reference requirements are sensitive", () => {
    // These carry disclosure content — an instructor must never see them.
    for (const code of ["DSC-01", "QUE-01", "ARR-01", "OOP-01", "DIR-01", "COH-01", "REF-01", "REF-02"]) {
      expect(actionFor(code)?.sensitive, `${code} must be sensitive`).toBe(true)
    }
  })

  /**
   * REGRESSION: the engine shipped with `type: doc.documentType ?? "id"`, so a
   * generated disclosure addendum was stored as a Government photo ID and then
   * displayed in the ID slot. No generated document may ever file as 'id'.
   */
  it("no generated document files itself as a Government photo ID", async () => {
    const generated = Object.entries(REQUIREMENT_ACTIONS)
      .filter(([, a]) => a.mode === "generate")
      .map(([code]) => code)
      // These route through the token outreach flows, not renderRequirementDocument.
      .filter((c) => !["COH-01", "REF-01", "REF-02"].includes(c))

    for (const reqCode of [...generated, "WORKSHEET"]) {
      const doc = await renderRequirementDocument({
        reqCode,
        applicantName: "Test Applicant",
        answers: {},
      })
      expect(doc.documentType, `${reqCode} has no documentType`).toBeTruthy()
      expect(doc.documentType, `${reqCode} would land in the ID slot`).not.toBe("id")
    }
  })

  /**
   * PHASE 3: a generated document used to be produced unsigned, dated with the
   * RENDER date, and marked satisfied anyway. Signing is now the thing that
   * completes it, so the two renderings must be visibly different documents.
   */
  describe("signing", () => {
    // Text assertions need the Helvetica path: the brand font is embedded as a
    // SUBSET, so its show-text operands are glyph ids rather than characters.
    // Rendering with the fallback is also how we prove the fallback works.
    beforeAll(() => {
      process.env.PDF_FALLBACK_FONTS = "1"
    })
    afterAll(() => {
      delete process.env.PDF_FALLBACK_FONTS
    })

    // A 1x1 PNG stands in for a captured signature — the point of these tests is
    // the DRAFT/signed distinction, not what the ink looks like.
    const png = new Uint8Array(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      )
    )

    it("documents the applicant signs are signable; the ones others sign are not", () => {
      for (const code of ["AFF-01", "SAF-01", "SOC-01", "DSC-01", "QUE-01", "ARR-01", "OOP-01", "DIR-01"]) {
        expect(isSignable(actionFor(code)), `${code} must require a signature`).toBe(true)
      }
      // Signed by the reference / cohabitant through the token flow, not here.
      for (const code of ["COH-01", "REF-01", "REF-02"]) {
        expect(isSignable(actionFor(code)), `${code} must NOT be applicant-signed`).toBe(false)
      }
      // An upload is evidence, not something signed on platform.
      expect(isSignable(actionFor("IDN-01"))).toBe(false)
    })

    it("an unsigned rendering is banner-stamped DRAFT and carries no signing date", async () => {
      const doc = await renderRequirementDocument({
        reqCode: "AFF-01",
        applicantName: "Test Applicant",
        answers: {},
        signaturePng: png,
      })
      const text = await pdfText(doc.bytes)
      expect(text).toContain("DRAFT")
      // The execution rule is blank — the only date on a draft is the
      // letterhead's "Prepared" date, which is not a signing date.
      expect(text).toContain("Date signed")
      expect(text).toContain("Prepared ")
      expect(text.match(/Date signed/g)?.length).toBe(1)
    })

    it("a signed rendering prints the SIGNING date and drops the draft banner", async () => {
      const signedAt = new Date("2026-03-04T15:00:00Z")
      const doc = await renderRequirementDocument({
        reqCode: "AFF-01",
        applicantName: "Test Applicant",
        answers: {},
        signaturePng: png,
        signedAt,
      })
      const text = await pdfText(doc.bytes)
      // The date printed over the "Date signed" rule is signedAt, to the day.
      expect(text).toContain("March 4, 2026")
      expect(text).not.toContain("DRAFT")
    })
  })

  it.skipIf(!reachable)("every ACTIVE registry requirement has an action", async () => {
    const admin = adminClient()
    const { data } = await admin
      .from("requirements")
      .select("req_code")
      .is("effective_to", null)
    const codes = [...new Set((data ?? []).map((r) => r.req_code))].sort()
    expect(codes.length).toBeGreaterThan(0)

    const unmapped = codes.filter((c) => !actionFor(c))
    expect(unmapped, `unmapped req_codes: ${unmapped.join(", ")}`).toEqual([])
  })
})
