/**
 * REGRESSION GUARD — generated documents carry NO company identity. Asserts on the
 * OUTPUT (extracted PDF text + the info dictionary), not the source, across several
 * document types, so the next edit to the builder or the document engine can't
 * silently reintroduce a brand string. The "not an official NYPD form" warning MUST
 * still appear on every generated document.
 *
 * Runs with the Helvetica fallback so the show-text operands are characters, not
 * subset glyph ids (a subset-embedded brand font encodes glyph indices).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { renderRequirementDocument } from "@/lib/requirements/document-engine"
import { buildPdf } from "@/lib/pdf/builder"
import { brand } from "@/config/brand"
import { pdfText } from "./helpers/pdf"

// Every way the company identity could leak into an artifact that leaves the platform.
const BRAND_NEEDLES = [
  brand.name,
  brand.domain,
  brand.contact.email,
  brand.contact.phone,
  brand.tagline,
  "gunlicensenyc",
].map((s) => s.toLowerCase())

function assertUnbranded(text: string, where: string) {
  const lc = text.toLowerCase()
  for (const needle of BRAND_NEEDLES) {
    expect(lc.includes(needle), `${where} leaks brand string "${needle}"`).toBe(false)
  }
}

// Narrative generate-mode documents (not official-PDF fills, not roster tokens).
const DOCS = ["AFF-01", "ARR-01", "SAF-01", "DSC-01", "OOP-01", "DIR-01", "WORKSHEET"]

describe("generated documents carry no company identity", () => {
  beforeAll(() => {
    process.env.PDF_FALLBACK_FONTS = "1"
  })
  afterAll(() => {
    delete process.env.PDF_FALLBACK_FONTS
  })

  it("no brand string in the body text of any generated document", async () => {
    for (const reqCode of DOCS) {
      const doc = await renderRequirementDocument({ reqCode, applicantName: "Test Applicant", answers: {} })
      assertUnbranded(await pdfText(doc.bytes), reqCode)
    }
  })

  it("no brand string in PDF metadata; author is the applicant, never the company", async () => {
    for (const reqCode of ["AFF-01", "ARR-01", "WORKSHEET"]) {
      const doc = await renderRequirementDocument({ reqCode, applicantName: "Test Applicant", answers: {} })
      const pdf = await PDFDocument.load(doc.bytes)
      const meta = [pdf.getTitle(), pdf.getAuthor(), pdf.getSubject(), pdf.getProducer(), pdf.getCreator()]
        .filter(Boolean)
        .join(" | ")
      assertUnbranded(meta, `${reqCode} metadata`)
      expect(pdf.getAuthor()).not.toContain(brand.name)
    }
  })

  it("keeps the 'not an official NYPD form' guardrail on every generated document", async () => {
    for (const reqCode of DOCS) {
      const doc = await renderRequirementDocument({ reqCode, applicantName: "Test Applicant", answers: {} })
      expect((await pdfText(doc.bytes)).toLowerCase(), `${reqCode} lost the warning`).toContain(
        "not an official nypd form"
      )
    }
  })

  it("the builder itself emits no brand text in header, footer, or metadata", async () => {
    const bytes = await buildPdf(
      (c) => {
        c.heading("Statement", "sub")
        c.para("body")
      },
      { docTitle: "Statement", applicantName: "Test Applicant", caseRef: "ABC" }
    )
    assertUnbranded(await pdfText(bytes), "builder body")
    const pdf = await PDFDocument.load(bytes)
    assertUnbranded(
      [pdf.getTitle(), pdf.getAuthor(), pdf.getProducer(), pdf.getCreator()].filter(Boolean).join(" | "),
      "builder metadata"
    )
  })
})
