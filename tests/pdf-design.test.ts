/**
 * The document builder is the whole design system for anything we hand a
 * customer. These lock the parts that are easy to break silently: the signature
 * actually being cropped to its ink, the execution date being the SIGNING date,
 * page totals being right, and the brand font embedding — with a fallback that
 * still produces a real document.
 */
import { describe, expect, it } from "vitest"
import { deflateSync, crc32 } from "node:zlib"
import { PDFDocument } from "pdf-lib"
import { buildPdf } from "@/lib/pdf/builder"
import { trimSignaturePng, hasVisibleInk } from "@/lib/pdf/png"
import { isReasonableSignature } from "@/lib/signatures"
import { pdfText } from "./helpers/pdf"

/** An RGBA PNG with `ink` drawn in the middle and transparent padding around it. */
function canvasSignature(w = 400, h = 120) {
  const px = Buffer.alloc(w * h * 4)
  for (let y = 50; y < 70; y++) {
    for (let x = 100; x < 300; x++) {
      const i = (y * w + x) * 4
      px[i] = 14; px[i + 1] = 16; px[i + 2] = 21; px[i + 3] = 255
    }
  }
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, "ascii"), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ])
  )
}

describe("signature trimming", () => {
  it("crops a signature to its ink, not the canvas it was drawn on", () => {
    // Placement is computed from the image box, so an untrimmed canvas floats the
    // signature above its rule by however much padding the signer happened to leave.
    const t = trimSignaturePng(canvasSignature())
    expect(t).not.toBeNull()
    expect(t!.width).toBeLessThan(220) // ~200px of ink + padding, not 400
    expect(t!.height).toBeLessThan(40) // ~20px of ink + padding, not 120
  })

  it("returns null for a blank canvas rather than a zero-size crop", () => {
    const blank = canvasSignature(50, 50)
    // Nothing drawn in the 50x50 variant — the ink band is outside its bounds.
    expect(trimSignaturePng(blank)).toBeNull()
  })

  it("leaves anything it can't decode alone (caller falls back to the original)", () => {
    expect(trimSignaturePng(new Uint8Array([1, 2, 3, 4]))).toBeNull()
  })

  /**
   * REGRESSION: a 1x1 placeholder PNG passed the old size-only check, then got
   * scaled to the signature box — printing a solid block on the signature line
   * that reads like a redaction. A degenerate image is not a signature.
   */
  it("rejects a 1x1 placeholder as a signature at both ends", () => {
    const onePixel =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    expect(hasVisibleInk(new Uint8Array(Buffer.from(onePixel, "base64")))).toBe(false)
    expect(isReasonableSignature(onePixel)).toBe(false)
    // A real capture still passes.
    expect(hasVisibleInk(canvasSignature())).toBe(true)
    expect(isReasonableSignature(Buffer.from(canvasSignature()).toString("base64"))).toBe(true)
  })

  it("draws blank rules rather than a block when the signature is degenerate", async () => {
    process.env.PDF_FALLBACK_FONTS = "1"
    try {
      const onePixel = new Uint8Array(
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          "base64"
        )
      )
      const withJunk = await buildPdf((c) => c.signatureImage("Applicant signature"), {
        signaturePng: onePixel,
        signedAt: new Date("2026-05-09T12:00:00Z"),
        applicantName: "Test Applicant",
      })
      const blank = await buildPdf((c) => c.signatureImage("Applicant signature"), {
        signedAt: new Date("2026-05-09T12:00:00Z"),
        applicantName: "Test Applicant",
      })
      // No image object embedded at all — identical output to no signature.
      const imgCount = (b: Uint8Array) => (Buffer.from(b).toString("latin1").match(/\/Image/g) ?? []).length
      expect(imgCount(withJunk)).toBe(0)
      expect(imgCount(withJunk)).toBe(imgCount(blank))
    } finally {
      delete process.env.PDF_FALLBACK_FONTS
    }
  })
})

describe("document builder", () => {
  it("embeds the brand font by default", async () => {
    const bytes = await buildPdf((c) => c.heading("Test", "sub"), { docTitle: "Test" })
    const pdf = await PDFDocument.load(bytes)
    // Subsetting prefixes the BaseFont name (AAAAAA+Geist-Regular) but keeps the
    // family, so the object graph is where we can see which font actually shipped.
    const names = pdf.context
      .enumerateIndirectObjects()
      .map(([, obj]) => obj.toString())
      .join(" ")
    expect(names).toContain("Geist")
    expect(names).not.toContain("Helvetica")
  })

  it("still produces a real document when the brand font is unavailable", async () => {
    process.env.PDF_FALLBACK_FONTS = "1"
    try {
      const bytes = await buildPdf((c) => c.heading("Fallback", "sub"), { docTitle: "Fallback" })
      const pdf = await PDFDocument.load(bytes)
      expect(pdf.getPageCount()).toBe(1)
      expect(await pdfText(bytes)).toContain("Fallback")
    } finally {
      delete process.env.PDF_FALLBACK_FONTS
    }
  })

  it("numbers every page with the correct total, once pagination is known", async () => {
    process.env.PDF_FALLBACK_FONTS = "1"
    try {
      const bytes = await buildPdf(
        (c) => {
          c.heading("Long document")
          for (let i = 0; i < 120; i++) c.para(`Paragraph ${i} — ${"filler ".repeat(12)}`)
        },
        { docTitle: "Long document", applicantName: "Test Applicant" }
      )
      const pdf = await PDFDocument.load(bytes)
      const total = pdf.getPageCount()
      expect(total).toBeGreaterThan(1)

      const text = await pdfText(bytes)
      for (let p = 1; p <= total; p++) expect(text).toContain(`Page ${p} of ${total}`)
      // The "not an official NYPD form" line is on every page, not just page 1.
      expect(text.match(/not an official NYPD form/g)?.length).toBe(total)
    } finally {
      delete process.env.PDF_FALLBACK_FONTS
    }
  })

  it("prints the signing date on the execution rule and sets document metadata", async () => {
    process.env.PDF_FALLBACK_FONTS = "1"
    try {
      const signedAt = new Date("2026-05-09T12:00:00Z")
      const bytes = await buildPdf((c) => c.signatureImage("Applicant signature"), {
        signaturePng: canvasSignature(),
        signedAt,
        docTitle: "Affirmation of Understanding",
        applicantName: "Test Applicant",
      })
      const text = await pdfText(bytes)
      expect(text).toContain("May 9, 2026")
      expect(text).toContain("Test Applicant") // printed name under the rule
      expect(text).not.toContain("DRAFT")

      const pdf = await PDFDocument.load(bytes)
      expect(pdf.getTitle()).toBe("Affirmation of Understanding")
      expect(pdf.getAuthor()).toBe("Gun License NYC")
    } finally {
      delete process.env.PDF_FALLBACK_FONTS
    }
  })

  it("marks an unsigned document DRAFT on every page", async () => {
    process.env.PDF_FALLBACK_FONTS = "1"
    try {
      const bytes = await buildPdf(
        (c) => {
          c.heading("Unsigned")
          for (let i = 0; i < 80; i++) c.para(`Paragraph ${i} — ${"filler ".repeat(12)}`)
          c.signatureImage("Applicant signature")
        },
        { draft: true, docTitle: "Unsigned", applicantName: "Test Applicant" }
      )
      const pdf = await PDFDocument.load(bytes)
      const text = await pdfText(bytes)
      // (The em dash encodes differently per font, so match the word.)
      expect(text.match(/DRAFT/g)?.length).toBe(pdf.getPageCount())
      expect(pdf.getSubject()).toContain("DRAFT")
    } finally {
      delete process.env.PDF_FALLBACK_FONTS
    }
  })
})
