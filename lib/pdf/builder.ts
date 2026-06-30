import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

/**
 * Tiny shared document builder over pdf-lib — text wrapping, paging, and the
 * common blocks (heading, rule, signature line, notary acknowledgment) every
 * generated CARRY document needs. Keeps all generators consistent.
 */

const INK = rgb(0.05, 0.06, 0.08)
const MUTED = rgb(0.42, 0.45, 0.5)
const BRASS = rgb(0.71, 0.54, 0.21)
const HAIR = rgb(0.85, 0.86, 0.88)

export interface DrawOpts {
  size?: number
  bold?: boolean
  color?: "ink" | "muted" | "brass"
  gap?: number
  lead?: number
}

export interface Ctx {
  heading(title: string, subtitle?: string): void
  h2(text: string): void
  para(text: string, opts?: DrawOpts): void
  bullet(text: string): void
  rule(): void
  spacer(n?: number): void
  pageBreak(): void
  signatureLine(label: string): void
  /** Stamps the captured signature if one was provided; otherwise a blank line. */
  signatureImage(label: string): void
  notaryBlock(personName: string): void
}

function colorOf(c?: DrawOpts["color"]) {
  return c === "muted" ? MUTED : c === "brass" ? BRASS : INK
}

export async function buildPdf(
  draw: (c: Ctx) => void,
  opts: { signaturePng?: Uint8Array } = {}
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let sigImg: Awaited<ReturnType<typeof pdf.embedPng>> | null = null
  if (opts.signaturePng) {
    try {
      sigImg = await pdf.embedPng(opts.signaturePng)
    } catch {
      sigImg = null
    }
  }

  const M = 56
  const W = 612 - M * 2
  let page: PDFPage = pdf.addPage([612, 792])
  let y = 792 - M

  const ensure = (need: number) => {
    if (y - need < M) {
      page = pdf.addPage([612, 792])
      y = 792 - M
    }
  }
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
  const drawText = (text: string, x: number, opts: DrawOpts = {}) => {
    const size = opts.size ?? 11
    const f = opts.bold ? bold : font
    const color = colorOf(opts.color)
    for (const line of wrap(text, f, size, W - (x - M))) {
      ensure(opts.lead ?? 15)
      page.drawText(line, { x, y: y - size, size, font: f, color })
      y -= opts.lead ?? 15
    }
    y -= opts.gap ?? 6
  }

  const ctx: Ctx = {
    heading(title, subtitle) {
      page.drawText("CARRY", { x: M, y: y - 11, size: 11, font: bold, color: BRASS })
      y -= 16
      drawText(title, M, { size: 18, bold: true, gap: subtitle ? 4 : 10 })
      if (subtitle) drawText(subtitle, M, { size: 9.5, color: "muted", gap: 10 })
    },
    h2(text) {
      drawText(text, M, { size: 12, bold: true, gap: 4 })
    },
    para(text, opts) {
      drawText(text, M, opts)
    },
    bullet(text) {
      ensure(15)
      page.drawText("•", { x: M, y: y - 11, size: 11, font, color: INK })
      drawText(text, M + 14, { gap: 4 })
    },
    rule() {
      ensure(12)
      page.drawLine({ start: { x: M, y: y - 4 }, end: { x: M + W, y: y - 4 }, thickness: 0.7, color: HAIR })
      y -= 16
    },
    spacer(n = 10) {
      y -= n
    },
    pageBreak() {
      page = pdf.addPage([612, 792])
      y = 792 - M
    },
    signatureLine(label) {
      drawText(`X _______________________________________     Date: ________________`, M, { gap: 2 })
      drawText(label, M, { size: 9.5, color: "muted", gap: 14 })
    },
    signatureImage(label) {
      if (!sigImg) {
        this.signatureLine(label)
        return
      }
      const h = 34
      const w = Math.min((sigImg.width / sigImg.height) * h, 200)
      ensure(h + 24)
      page.drawImage(sigImg, { x: M, y: y - h, width: w, height: h })
      y -= h + 2
      page.drawLine({ start: { x: M, y }, end: { x: M + 240, y }, thickness: 0.7, color: HAIR })
      y -= 12
      drawText(`${label}     Date: ${new Date().toISOString().slice(0, 10)}`, M, { size: 9.5, color: "muted", gap: 14 })
    },
    notaryBlock(personName) {
      this.h2("Notary Acknowledgment")
      drawText("State of New York,  County of ____________________", M, { gap: 10 })
      drawText(
        "Sworn to (or affirmed) and subscribed before me on this _______ day of ____________________, 20______,",
        M,
        { gap: 10 }
      )
      drawText(
        `by ${personName}, proved to me on the basis of satisfactory evidence to be the person who appeared before me.`,
        M,
        { gap: 18 }
      )
      drawText("____________________________________", M, { gap: 2 })
      drawText("Notary Public signature", M, { size: 9.5, color: "muted", gap: 8 })
      drawText("Printed name: ____________________________     My commission expires: ________________", M, { gap: 4 })
      drawText("(affix notary stamp / seal)", M, { size: 9, color: "muted", gap: 0 })
    },
  }

  draw(ctx)
  return pdf.save()
}
