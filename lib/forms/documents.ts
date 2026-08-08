import { buildPdf, type BuildOpts } from "@/lib/pdf/builder"

export interface ArrestEntry {
  occurredOn?: string
  jurisdiction?: string
  disposition?: string
  narrative?: string
}

type Sig = Uint8Array | undefined

/**
 * Everything the builder needs beyond the signature image: WHEN it was signed
 * (printed as the execution date — never the render date), whether it's an
 * unsigned draft (banner on every page), and the letterhead/metadata fields.
 * Unsigned + undated is the honest default.
 */
export type SignOpts = Omit<BuildOpts, "signaturePng">

/** AFF-01 — affirmation acknowledging NYC carry rules + sensitive locations. */
export async function affirmationOfUnderstanding(applicantName: string, dateStr: string, signaturePng?: Sig, sign: SignOpts = {}): Promise<Uint8Array> {
  return buildPdf((c) => {
    c.heading("Affirmation of Understanding", "NYC concealed-carry license application")
    c.rule()
    c.para(`I, ${applicantName}, affirm that I understand and will comply with the following:`, { gap: 10 })
    c.bullet("I may not carry a firearm into any sensitive or restricted location designated under New York law, including schools, government buildings, places of worship, public transit, and other prohibited places.")
    c.bullet("I will keep any firearm secured in an approved safe or lock-box when not on my person.")
    c.bullet("I will notify the NYPD License Division of any change of address, arrest, or order of protection.")
    c.bullet("I understand that my license may be suspended or revoked for violation of these rules or applicable law.")
    c.spacer(8)
    c.para("I make this affirmation knowingly and voluntarily, and the statements above are true.", { gap: 16 })
    c.signatureImage("Applicant signature")
  }, { signaturePng, ...sign })
}

/** SAF-01 — safe-storage attestation. */
export async function safeStorageAttestation(applicantName: string, dateStr: string, signaturePng?: Sig, sign: SignOpts = {}): Promise<Uint8Array> {
  return buildPdf((c) => {
    c.heading("Safe-Storage Attestation", "NYC concealed-carry license application")
    c.rule()
    c.para(
      `I, ${applicantName}, attest that I maintain an approved gun safe or lock-box at my residence and that ` +
        `any firearm I own will be stored, unloaded and secured, in that container whenever it is not under my ` +
        `direct control. Ammunition will be stored separately where required. Photographs of the safe (door open ` +
        `and closed) are submitted with my application.`,
      { gap: 16 }
    )
    c.signatureImage("Applicant signature")
  }, { signaturePng, ...sign })
}

export interface SafeguardPerson {
  name?: string | null
  relation?: string | null
  address?: string | null
  phone?: string | null
}

/**
 * Safeguard-Person Designation (form Q31) — names the N.Y.-resident who will
 * take custody of the applicant's handgun(s) if the applicant dies or becomes
 * disabled, built from the intake answer. The DESIGNATED PERSON signs this in
 * the notary's presence, so it goes out with a BLANK signature line above the
 * jurat — never a pre-placed signature (same rule as the reference/cohabitant
 * documents). Prepared, not filing-facing until counsel confirms the exact
 * NYPD "Acknowledgement of Person Agreeing to Safeguard Firearm(s)" wording.
 */
export async function safeguardDesignation(
  applicantName: string,
  person: SafeguardPerson,
  dateStr: string,
  sign: SignOpts = {}
): Promise<Uint8Array> {
  const name = person.name?.trim() || "____________________________"
  return buildPdf((c) => {
    c.heading("Safeguard-Person Designation", `NYC concealed-carry license application · ${dateStr}`)
    c.rule()
    c.para(`RE: Person designated to safeguard the handgun(s) of ${applicantName}`, { bold: true, gap: 10 })
    c.para(
      `${applicantName} has designated the person named below to take custody of and safeguard their ` +
        `handgun(s) in the event of ${applicantName}'s death or disability. This person is a resident of New York State.`,
      { gap: 12 }
    )
    c.para(`Name: ${name}`, { gap: 2 })
    if (person.relation?.trim()) c.para(`Relationship to the applicant: ${person.relation.trim()}`, { gap: 2 })
    if (person.address?.trim()) c.para(`Address: ${person.address.trim()}`, { gap: 2 })
    if (person.phone?.trim()) c.para(`Telephone: ${person.phone.trim()}`, { gap: 12 })
    c.spacer(4)
    c.para(
      `I, ${name}, agree to take custody of and safeguard the handgun(s) of ${applicantName} if ${applicantName} ` +
        `dies or becomes unable to lawfully possess them, and to keep them stored securely in an approved safe or ` +
        `lock-box, inaccessible to anyone not authorized to possess them, until they are lawfully transferred or surrendered.`,
      { gap: 16 }
    )
    // The designated person signs in the notary's presence — blank rule + jurat.
    c.signatureLine("Signature of designated person — sign in the presence of the notary", name)
    c.notaryBlock(name)
  }, { ...sign })
}

/** SOC-01 — 3-year social-media disclosure, from collected handles. */
export async function socialMediaDisclosure(applicantName: string, handles: string, dateStr: string, signaturePng?: Sig, sign: SignOpts = {}): Promise<Uint8Array> {
  const list = (handles || "").split(/[\n,]+/).map((h) => h.trim()).filter(Boolean)
  return buildPdf((c) => {
    c.heading("Social-Media Disclosure (3 Years)", "NYC concealed-carry license application")
    c.rule()
    c.para(`Applicant: ${applicantName}`, { bold: true, gap: 4 })
    c.para("All current and former social-media accounts maintained in the past three years:", { gap: 10 })
    if (list.length === 0) c.para("(none listed — confirm and complete before filing)", { color: "muted", gap: 10 })
    for (const h of list) c.bullet(h)
    c.spacer(8)
    c.para("I affirm the list above is complete and accurate to the best of my knowledge.", { gap: 16 })
    c.signatureImage("Applicant signature")
  }, { signaturePng, ...sign })
}

/** ARR-01 — formatted written explanation for each disclosed arrest/summons. */
export async function arrestNarratives(applicantName: string, arrests: ArrestEntry[], dateStr: string, signaturePng?: Sig, sign: SignOpts = {}): Promise<Uint8Array> {
  return buildPdf((c) => {
    c.heading("Disclosure — Written Explanations", "NYC concealed-carry license application")
    c.rule()
    c.para(`Applicant: ${applicantName}`, { bold: true, gap: 10 })
    if (arrests.length === 0) c.para("No arrests or summonses disclosed.", { color: "muted" })
    arrests.forEach((a, i) => {
      c.h2(`Item ${i + 1}`)
      c.para(
        `Date: ${a.occurredOn || "____"}    Court/Jurisdiction: ${a.jurisdiction || "____"}    Disposition: ${a.disposition || "____"}`,
        { size: 10, color: "muted", gap: 6 }
      )
      c.para(a.narrative?.trim() || "(write your explanation of what happened and the outcome)", { gap: 14 })
    })
    c.spacer(4)
    c.para("The explanations above are true and complete to the best of my knowledge.", { gap: 16 })
    c.signatureImage("Applicant signature")
  }, { signaturePng, ...sign })
}

/** ARR-01 — one Certificate-of-Disposition request letter per disclosed arrest. */
export async function certOfDispositionRequests(applicantName: string, arrests: ArrestEntry[], dateStr: string, signaturePng?: Sig, sign: SignOpts = {}): Promise<Uint8Array> {
  const items = arrests.length ? arrests : [{} as ArrestEntry]
  return buildPdf((c) => {
    items.forEach((arrest, i) => {
      if (i > 0) c.pageBreak()
      c.heading("Request — Certificate of Disposition", `Dated ${dateStr}`)
      c.rule()
      c.para(`To the Clerk, ${arrest.jurisdiction || "____________________ Court"}:`, { bold: true, gap: 10 })
      c.para(
        `I, ${applicantName}, respectfully request a certified Certificate of Disposition for the matter below, ` +
          `for use with my New York City firearms-license application.`,
        { gap: 10 }
      )
      c.para(`Date of matter: ${arrest.occurredOn || "____________________"}`, { gap: 4 })
      c.para(`Disposition (if known): ${arrest.disposition || "____________________"}`, { gap: 4 })
      c.para("Defendant / name on record: ____________________________________", { gap: 4 })
      c.para("Date of birth: ____________________     Docket / case number (if known): ____________________", { gap: 14 })
      c.para("Please mail the certificate to the address below, or advise of any required fee.", { gap: 18 })
      c.signatureImage("Applicant signature")
      c.para("Mailing address: ____________________________________________________", { size: 10, color: "muted" })
    })
  }, { signaturePng, ...sign })
}
