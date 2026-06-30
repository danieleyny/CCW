import { buildPdf } from "@/lib/pdf/builder"

export interface CohabitantAffidavitInput {
  applicantName: string
  cohabitantName: string
  relationship?: string | null
  liveAlone?: boolean
  dateStr: string
  signaturePng?: Uint8Array
}

/** Pre-filled cohabitant affidavit (or "sole occupant" statement), notary-ready. */
export async function generateCohabitantAffidavitPdf(input: CohabitantAffidavitInput): Promise<Uint8Array> {
  return buildPdf((c) => {
    if (input.liveAlone) {
      c.heading("Statement of Sole Occupancy", `NYC Concealed-Carry License Application · ${input.dateStr}`)
      c.rule()
      c.para(
        `I, ${input.applicantName}, affirm that I am the sole adult occupant of my residence and that ` +
          `no other person aged 18 or older resides with me. I understand any firearm will be kept ` +
          `secured in an approved safe or lock-box.`,
        { gap: 16 }
      )
      c.signatureImage(`Applicant: ${input.applicantName}`)
      c.notaryBlock(input.applicantName)
      return
    }
    c.heading("Cohabitant Affidavit", `NYC Concealed-Carry License Application · ${input.dateStr}`)
    c.rule()
    c.para(`RE: Cohabitant affidavit for the application of ${input.applicantName}`, { bold: true, gap: 10 })
    c.para(
      `I, ${input.cohabitantName}${input.relationship ? `, the applicant's ${input.relationship}` : ""}, ` +
        `reside in the same household as ${input.applicantName}. I am aware that the applicant has applied for ` +
        `a New York City concealed-carry license and intends to keep a firearm in the residence.`,
      { gap: 10 }
    )
    c.para(
      `I affirm that I understand the firearm will be kept secured in an approved safe or lock-box, ` +
        `inaccessible to anyone not authorized to possess it, and I have no objection to the applicant being ` +
        `licensed. The statements herein are true to the best of my knowledge.`,
      { gap: 16 }
    )
    c.signatureImage(`Cohabitant: ${input.cohabitantName}`)
    c.notaryBlock(input.cohabitantName)
  }, { signaturePng: input.signaturePng })
}
