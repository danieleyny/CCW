import { readFileSync } from "node:fs"
import { join } from "node:path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { trimSignaturePng, MIN_SIGNATURE_PX } from "@/lib/pdf/png"

/**
 * The shared document builder. Every generated Gun License NYC document is drawn
 * through this, so design lives HERE — not in the individual generators.
 *
 * What it gives you: a real embedded typeface (Geist, the brand family, SIL OFL
 * 1.1 — see assets/fonts/OFL-Geist.txt), a proper letterhead on page 1 with slim
 * running heads after it, a type scale with consistent leading, a footer with
 * "Page X of Y" stamped once pagination is actually known, and an execution
 * block where the signature sits ON its rule next to the date it was signed.
 *
 * Font embedding degrades gracefully: if the TTFs can't be read we fall back to
 * Helvetica rather than fail to produce a document somebody needs.
 */

const INK = rgb(0.07, 0.08, 0.11)
const MUTED = rgb(0.42, 0.45, 0.5)
const BRASS = rgb(0.71, 0.54, 0.21)
const HAIR = rgb(0.84, 0.85, 0.88)
const RULE = rgb(0.25, 0.27, 0.32)
const DRAFT_BG = rgb(0.99, 0.93, 0.82)
const DRAFT_INK = rgb(0.52, 0.31, 0.03)

/** US Letter, with a measure that lands around 80 characters at body size. */
const PAGE_W = 612
const PAGE_H = 792
const M = 64
const W = PAGE_W - M * 2
const FOOTER_Y = 44
const BODY_FLOOR = 78 // never draw below this; the footer lives under it

/** One place to change the voice of the whole document set. */
const TYPE = {
  title: { size: 21, lead: 26 },
  subtitle: { size: 10.5, lead: 14 },
  section: { size: 12, lead: 16 },
  body: { size: 10.5, lead: 15.5 },
  caption: { size: 8.5, lead: 12 },
} as const

export interface DrawOpts {
  size?: number
  bold?: boolean
  medium?: boolean
  color?: "ink" | "muted" | "brass"
  gap?: number
  lead?: number
  indent?: number
}

export interface Ctx {
  heading(title: string, subtitle?: string): void
  h2(text: string): void
  para(text: string, opts?: DrawOpts): void
  bullet(text: string): void
  rule(): void
  spacer(n?: number): void
  pageBreak(): void
  /** Blank ruled execution block — for a document meant to be signed by hand. */
  signatureLine(label: string, printedName?: string): void
  /**
   * A captured signature sitting ON its rule, beside the date signed. Falls back
   * to blank rules when there's no signature. `printedName` overrides the name
   * printed beneath the rule — a cohabitant affidavit is executed by the
   * cohabitant, not by the applicant whose letterhead it carries.
   */
  signatureImage(label: string, printedName?: string): void
  notaryBlock(personName: string): void
  /** Keep the next `need` points together; page-break first if they don't fit. */
  keepTogether(need: number): void
}

function colorOf(c?: DrawOpts["color"]) {
  return c === "muted" ? MUTED : c === "brass" ? BRASS : INK
}

/** Long-form date for anything a person reads on paper. */
export const longDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

export interface BuildOpts {
  signaturePng?: Uint8Array
  /** When the applicant signed THESE bytes. Printed as the execution date — never the render date. */
  signedAt?: Date
  /** No signature yet: banner every page so an unsigned copy can't pass for a filed one. */
  draft?: boolean
  /** Letterhead + PDF metadata. */
  docTitle?: string
  applicantName?: string
  caseRef?: string
  /** Date the document was prepared (letterhead only — never the execution date). */
  preparedOn?: Date
}

/** Brand fonts, read once per process. */
let FONTS: { regular: Buffer; medium: Buffer; semibold: Buffer } | null | undefined
function brandFonts() {
  // Escape hatch: exercises the Helvetica fallback path on demand, which is both
  // how the tests read text out of a PDF (a subset-embedded font encodes glyph
  // ids, not characters) and how we prove the fallback still renders.
  if (process.env.PDF_FALLBACK_FONTS === "1") return null
  if (FONTS !== undefined) return FONTS
  try {
    const dir = join(process.cwd(), "assets", "fonts")
    FONTS = {
      regular: readFileSync(join(dir, "Geist-Regular.ttf")),
      medium: readFileSync(join(dir, "Geist-Medium.ttf")),
      semibold: readFileSync(join(dir, "Geist-SemiBold.ttf")),
    }
  } catch {
    // Bundled fonts unavailable (odd deploy, trimmed image) — Helvetica still
    // produces a correct document, just a plainer one.
    console.warn("[pdf] brand fonts unavailable; falling back to Helvetica")
    FONTS = null
  }
  return FONTS
}

export async function buildPdf(draw: (c: Ctx) => void, opts: BuildOpts = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const bundled = brandFonts()
  const font = bundled ? await pdf.embedFont(bundled.regular, { subset: true }) : await pdf.embedFont(StandardFonts.Helvetica)
  const medium = bundled ? await pdf.embedFont(bundled.medium, { subset: true }) : font
  const bold = bundled ? await pdf.embedFont(bundled.semibold, { subset: true }) : await pdf.embedFont(StandardFonts.HelveticaBold)

  // The signature is cropped to its ink before embedding, so what gets placed on
  // the rule is the strokes — not the empty canvas they were drawn on.
  let sigImg: Awaited<ReturnType<typeof pdf.embedPng>> | null = null
  if (opts.signaturePng) {
    try {
      const trimmed = trimSignaturePng(opts.signaturePng)
      // A degenerate image (blank canvas, stray dot, 1x1 placeholder) is NOT a
      // signature: scaling it to the signature box paints a solid block that
      // reads as a redaction. An honest blank rule is better.
      if (trimmed && trimmed.width >= MIN_SIGNATURE_PX && trimmed.height >= MIN_SIGNATURE_PX) {
        sigImg = await pdf.embedPng(trimmed.png)
      }
    } catch {
      sigImg = null
    }
  }

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - M
  let firstPage = true

  const fontFor = (o: DrawOpts) => (o.bold ? bold : o.medium ? medium : font)

  const wrap = (text: string, f: PDFFont, size: number, maxWidth: number): string[] => {
    const out: string[] = []
    for (const block of (text || "").split(/\n/)) {
      const words = block.split(/\s+/).filter(Boolean)
      let line = ""
      for (const w of words) {
        const t = line ? `${line} ${w}` : w
        if (f.widthOfTextAtSize(t, size) > maxWidth && line) {
          out.push(line)
          line = w
        } else line = t
      }
      out.push(line)
    }
    return out
  }

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H])
    firstPage = false
    y = PAGE_H - M
    runningHead()
  }
  const ensure = (need: number) => {
    if (y - need < BODY_FLOOR) newPage()
  }

  /** Slim running head on continuation pages — the letterhead is page 1 only. */
  function runningHead() {
    page.drawText("Gun License NYC", { x: M, y: y - 8, size: 8.5, font: medium, color: BRASS })
    if (opts.docTitle) {
      const t = opts.docTitle
      const w = font.widthOfTextAtSize(t, 8.5)
      page.drawText(t, { x: PAGE_W - M - w, y: y - 8, size: 8.5, font, color: MUTED })
    }
    page.drawLine({
      start: { x: M, y: y - 15 },
      end: { x: PAGE_W - M, y: y - 15 },
      thickness: 0.6,
      color: HAIR,
    })
    y -= 30
  }

  const drawText = (text: string, x: number, o: DrawOpts = {}) => {
    const size = o.size ?? TYPE.body.size
    const lead = o.lead ?? TYPE.body.lead
    const f = fontFor(o)
    const color = colorOf(o.color)
    for (const line of wrap(text, f, size, W - (x - M))) {
      ensure(lead)
      page.drawText(line, { x, y: y - size, size, font: f, color })
      y -= lead
    }
    y -= o.gap ?? 6
  }

  /** Page-1 letterhead: mark, wordmark, brass rule, right-aligned meta block. */
  function letterhead(title: string, subtitle?: string) {
    const top = y

    // Mark: a small brass skyline, the same idea as the site's logo.
    const bars = [6, 11, 8, 14, 9]
    bars.forEach((h, i) => {
      page.drawRectangle({ x: M + i * 4.4, y: top - 12, width: 3, height: h, color: BRASS })
    })
    page.drawText("Gun License NYC", { x: M + 30, y: top - 12, size: 13, font: bold, color: INK })

    // Right-aligned meta: what this is, whose it is, when we prepared it.
    const meta: string[] = []
    if (opts.applicantName) meta.push(opts.applicantName)
    if (opts.caseRef) meta.push(`Case ${opts.caseRef}`)
    meta.push(`Prepared ${longDate(opts.preparedOn ?? new Date())}`)
    meta.forEach((line, i) => {
      const w = font.widthOfTextAtSize(line, 8.5)
      page.drawText(line, { x: PAGE_W - M - w, y: top - 8 - i * 11, size: 8.5, font, color: MUTED })
    })

    y = top - Math.max(26, 8 + meta.length * 11 + 6)
    page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1.4, color: BRASS })
    y -= 26

    drawText(title, M, { ...TYPE.title, bold: true, gap: subtitle ? 2 : 10 })
    if (subtitle) drawText(subtitle, M, { ...TYPE.subtitle, color: "muted", gap: 10 })
  }

  /**
   * The execution block: signature over its rule with the printed name beneath,
   * and the date signed over its own rule beside it. Two columns, because that's
   * how an executed document reads.
   */
  function executionBlock(label: string, printedName: string | undefined, withImage: boolean) {
    const colW = (W - 40) / 2
    const rightX = M + colW + 40
    const inkH = 34 // room above each rule

    // Never strand the block alone at the bottom of a page.
    ensure(inkH + 46)

    const ruleY = y - inkH

    if (withImage && sigImg) {
      // Scale to a cap height that reads like handwriting, then sit the ink ON
      // the rule (a hair of overlap, the way a real pen crosses the line).
      const maxH = 30
      const maxW = colW - 6
      let h = maxH
      let w = (sigImg.width / sigImg.height) * h
      if (w > maxW) {
        w = maxW
        h = (sigImg.height / sigImg.width) * w
      }
      page.drawImage(sigImg, { x: M + 2, y: ruleY - 1.5, width: w, height: h })
    }

    page.drawLine({ start: { x: M, y: ruleY }, end: { x: M + colW, y: ruleY }, thickness: 0.9, color: RULE })
    page.drawLine({ start: { x: rightX, y: ruleY }, end: { x: rightX + colW, y: ruleY }, thickness: 0.9, color: RULE })

    // The execution date — always signed_at, never the render date, and never a
    // placeholder on a signed document.
    if (opts.signedAt) {
      page.drawText(longDate(opts.signedAt), { x: rightX + 2, y: ruleY + 6, size: 11, font: medium, color: INK })
    }

    if (printedName) {
      page.drawText(printedName, { x: M, y: ruleY - 13, size: 10, font: medium, color: INK })
    }
    page.drawText(label, { x: M, y: ruleY - (printedName ? 25 : 13), size: 8.5, font, color: MUTED })
    page.drawText("Date signed", { x: rightX, y: ruleY - 13, size: 8.5, font, color: MUTED })

    y = ruleY - (printedName ? 25 : 13) - 18
  }

  const ctx: Ctx = {
    heading(title, subtitle) {
      if (firstPage) letterhead(title, subtitle)
      else {
        drawText(title, M, { ...TYPE.title, bold: true, gap: subtitle ? 2 : 10 })
        if (subtitle) drawText(subtitle, M, { ...TYPE.subtitle, color: "muted", gap: 10 })
      }
    },
    h2(text) {
      // Keep a heading with at least a couple of lines of what follows it.
      ensure(TYPE.section.lead + TYPE.body.lead * 2)
      const size = TYPE.section.size
      page.drawRectangle({ x: M, y: y - size + 1, width: 2, height: size + 1, color: BRASS })
      drawText(text, M + 9, { ...TYPE.section, bold: true, gap: 5 })
    },
    para(text, o) {
      drawText(text, M + (o?.indent ?? 0), o)
    },
    bullet(text) {
      ensure(TYPE.body.lead)
      page.drawText("•", { x: M + 2, y: y - TYPE.body.size, size: TYPE.body.size, font, color: BRASS })
      // Hanging indent: wrapped lines align under the text, not under the bullet.
      drawText(text, M + 16, { gap: 4 })
    },
    rule() {
      ensure(14)
      page.drawLine({ start: { x: M, y: y - 4 }, end: { x: M + W, y: y - 4 }, thickness: 0.7, color: HAIR })
      y -= 18
    },
    spacer(n = 10) {
      y -= n
    },
    pageBreak() {
      newPage()
    },
    keepTogether(need) {
      ensure(need)
    },
    signatureLine(label, printedName) {
      executionBlock(label, printedName ?? opts.applicantName, false)
    },
    signatureImage(label, printedName) {
      executionBlock(label, printedName ?? opts.applicantName, true)
    },
    notaryBlock(personName) {
      ensure(150)
      this.h2("Notary Acknowledgment")
      drawText("State of New York,  County of ____________________", M, { gap: 12 })
      drawText(
        "Sworn to (or affirmed) and subscribed before me on this _______ day of ____________________, 20______,",
        M,
        { gap: 12 }
      )
      drawText(
        `by ${personName}, proved to me on the basis of satisfactory evidence to be the person who appeared before me.`,
        M,
        { gap: 22 }
      )
      // Same two-column geometry as the execution block, so the page reads as
      // one design rather than two.
      const colW = (W - 40) / 2
      const rightX = M + colW + 40
      const ruleY = y - 8
      page.drawLine({ start: { x: M, y: ruleY }, end: { x: M + colW, y: ruleY }, thickness: 0.9, color: RULE })
      page.drawLine({ start: { x: rightX, y: ruleY }, end: { x: rightX + colW, y: ruleY }, thickness: 0.9, color: RULE })
      page.drawText("Notary Public signature", { x: M, y: ruleY - 12, size: 8.5, font, color: MUTED })
      page.drawText("Commission expires", { x: rightX, y: ruleY - 12, size: 8.5, font, color: MUTED })
      y = ruleY - 30
      drawText("Printed name: ____________________________________", M, { gap: 6 })
      drawText("(affix notary stamp / seal)", M, { ...TYPE.caption, color: "muted", gap: 0 })
    },
  }

  draw(ctx)

  // ── Second pass: footers and the draft banner ─────────────────────────────
  // Page numbers can only be stamped once the total is known.
  const pages = pdf.getPages()
  const total = pages.length
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: M, y: FOOTER_Y + 14 },
      end: { x: PAGE_W - M, y: FOOTER_Y + 14 },
      thickness: 0.6,
      color: HAIR,
    })
    const note = "Prepared by Gun License NYC — not an official NYPD form"
    p.drawText(note, { x: M, y: FOOTER_Y, size: 8, font, color: MUTED })
    const num = `Page ${i + 1} of ${total}`
    const numW = font.widthOfTextAtSize(num, 8)
    p.drawText(num, { x: PAGE_W - M - numW, y: FOOTER_Y, size: 8, font, color: MUTED })

    if (opts.draft) {
      // Unmistakable, but part of the design rather than bolted on top of it.
      const banner = "DRAFT — UNSIGNED · NOT FOR FILING"
      const bw = bold.widthOfTextAtSize(banner, 8.5)
      const boxW = bw + 22
      p.drawRectangle({
        x: (PAGE_W - boxW) / 2,
        y: PAGE_H - 30,
        width: boxW,
        height: 17,
        color: DRAFT_BG,
        borderColor: DRAFT_INK,
        borderWidth: 0.7,
      })
      p.drawText(banner, { x: (PAGE_W - bw) / 2, y: PAGE_H - 25, size: 8.5, font: bold, color: DRAFT_INK })
    }
  })

  // Metadata — a downloaded file should identify itself.
  pdf.setTitle(opts.docTitle ?? "Gun License NYC document")
  pdf.setAuthor("Gun License NYC")
  pdf.setSubject(
    opts.draft
      ? "DRAFT — unsigned document prepared for the applicant. Not an official NYPD form."
      : "Document prepared for the applicant. Not an official NYPD form."
  )
  pdf.setProducer("Gun License NYC")
  pdf.setCreationDate(opts.preparedOn ?? new Date())

  return pdf.save()
}
