import { buildPdf } from "@/lib/pdf/builder"
import { REFERENCE_QUESTIONS, type ReferenceAnswers } from "./questions"

export interface ReferenceLetterInput {
  applicantName: string
  referenceName: string
  relationship?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  answers: ReferenceAnswers
  dateStr: string
  signaturePng?: Uint8Array
}

/** Generate a notarization-ready character-reference letter. */
export async function generateReferenceLetterPdf(input: ReferenceLetterInput): Promise<Uint8Array> {
  return buildPdf((c) => {
    c.heading("Character Reference Statement", `NYC Concealed-Carry License Application · ${input.dateStr}`)
    c.rule()
    c.para(`RE: Character reference for ${input.applicantName}`, { bold: true, gap: 10 })
    c.para(
      `To the NYPD License Division: My name is ${input.referenceName}` +
        `${input.relationship ? `, the applicant's ${input.relationship}` : ""}. I have been asked to provide a ` +
        `character reference for ${input.applicantName} in connection with their application for a New York City ` +
        `concealed-carry license. The following is true to the best of my knowledge.`,
      { gap: 12 }
    )
    for (const q of REFERENCE_QUESTIONS) {
      const ans = (input.answers[q.key] || "").trim()
      if (!ans) continue
      c.para(q.label, { bold: true, size: 10.5, gap: 2 })
      c.para(ans, { gap: 10 })
    }
    c.para(
      `I affirm that the statements above are true, and that to my knowledge ${input.applicantName} is a person ` +
        `of good moral character. I am a lawful resident of the United States and I am not aware of any reason ` +
        `they should not be licensed.`,
      { gap: 16 }
    )
    c.signatureImage(`Printed name: ${input.referenceName}`)
    const contact = [input.contactEmail, input.contactPhone].filter(Boolean).join("  ·  ")
    if (contact) c.para(`Contact: ${contact}`, { size: 10, color: "muted", gap: 16 })
    c.notaryBlock(input.referenceName)
  }, { signaturePng: input.signaturePng })
}
