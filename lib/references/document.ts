import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { REFERENCE_QUESTIONS, type ReferenceAnswers } from "./questions"

export interface ReferenceLetterInput {
  applicantName: string
  referenceName: string
  relationship?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  answers: ReferenceAnswers
  dateStr: string
}

const INK = rgb(0.05, 0.06, 0.08)
const MUTED = rgb(0.42, 0.45, 0.5)
const BRASS = rgb(0.71, 0.54, 0.21)
const HAIR = rgb(0.85, 0.86, 0.88)

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of (text || "").split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ""
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        out.push(line)
        line = w
      } else {
        line = test
      }
    }
    out.push(line)
  }
  return out
}

/** Generate a notarization-ready character-reference letter (Letter size). */
export async function generateReferenceLetterPdf(input: ReferenceLetterInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  let page: PDFPage = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const M = 56
  const W = 612 - M * 2
  let y = 792 - M

  const ensure = (need: number) => {
    if (y - need < M) {
      page = pdf.addPage([612, 792])
      y = 792 - M
    }
  }
  const para = (text: string, { size = 11, f = font, color = INK, gap = 6, lead = 15 } = {}) => {
    for (const line of wrap(text, f, size, W)) {
      ensure(lead)
      page.drawText(line, { x: M, y: y - size, size, font: f, color })
      y -= lead
    }
    y -= gap
  }
  const rule = () => {
    ensure(12)
    page.drawLine({ start: { x: M, y: y - 4 }, end: { x: M + W, y: y - 4 }, thickness: 0.7, color: HAIR })
    y -= 16
  }

  // Header
  page.drawText("CARRY", { x: M, y: y - 11, size: 11, font: bold, color: BRASS })
  y -= 16
  page.drawText("Character Reference Statement", { x: M, y: y - 18, size: 18, font: bold, color: INK })
  y -= 26
  para(`NYC Concealed-Carry License Application · ${input.dateStr}`, { size: 9.5, color: MUTED, gap: 10 })
  rule()

  para(`RE: Character reference for ${input.applicantName}`, { f: bold, size: 12, gap: 10 })
  para(
    `To the NYPD License Division: My name is ${input.referenceName}` +
      `${input.relationship ? `, the applicant's ${input.relationship}` : ""}. ` +
      `I have been asked to provide a character reference for ${input.applicantName} in connection ` +
      `with their application for a New York City concealed-carry license. The following is true to the best of my knowledge.`,
    { gap: 12 }
  )

  for (const q of REFERENCE_QUESTIONS) {
    const ans = (input.answers[q.key] || "").trim()
    if (!ans) continue
    para(q.label, { f: bold, size: 10.5, gap: 2 })
    para(ans, { gap: 10 })
  }

  para(
    `I affirm that the statements above are true, and that to my knowledge ${input.applicantName} ` +
      `is a person of good moral character. I am a lawful resident of the United States and I am not ` +
      `aware of any reason they should not be licensed.`,
    { gap: 18 }
  )

  // Signature block
  rule()
  para("Reference signature: ______________________________      Date: ________________", { gap: 8 })
  para(`Printed name: ${input.referenceName}`, { gap: 2 })
  const contact = [input.contactEmail, input.contactPhone].filter(Boolean).join("  ·  ")
  if (contact) para(`Contact: ${contact}`, { size: 10, color: MUTED, gap: 16 })

  // Notary acknowledgment
  para("Notary Acknowledgment", { f: bold, size: 11, gap: 8 })
  para("State of New York,  County of ____________________", { gap: 10 })
  para(
    "Sworn to (or affirmed) and subscribed before me on this _______ day of ____________________, 20______,",
    { gap: 10 }
  )
  para(`by ${input.referenceName}, proved to me on the basis of satisfactory evidence to be the person who appeared before me.`, { gap: 18 })
  para("____________________________________", { gap: 2 })
  para("Notary Public signature", { size: 10, color: MUTED, gap: 8 })
  para("Printed name: ____________________________     My commission expires: ________________", { gap: 4 })
  para("(affix notary stamp / seal)", { size: 9, color: MUTED, gap: 0 })

  return pdf.save()
}
