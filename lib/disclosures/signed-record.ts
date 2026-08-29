import "server-only"

import { buildPdf } from "@/lib/pdf/builder"
import { PORTAL_DISCLOSURES } from "@/lib/disclosures/portal-questions"
import { portalDate, portalHeight, portalWeight, usDate, splitStreet } from "@/lib/forms/format"
import type { ApplicationValues } from "@/lib/forms/application"
import type { SignOpts } from "@/lib/forms/documents"

/**
 * THE signed answers + authorization record (PORTAL_ALIGNMENT_REBUILD Part 5). One
 * document the applicant signs digitally — our record that these answers are theirs
 * and that they authorized us to enter them into the NYPD online portal on their
 * behalf. It is NOT an NYPD form and is NOT notarised. Unsigned it renders as a DRAFT
 * (the buildPdf banner); a change after signing marks the signed copy stale and
 * requires a re-signature (the generate/sign flow handles that). Replaces the old
 * internal disclosure summary — one document, not two.
 */
const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v))

function addressLine(street: string, apt: string, city: string, state: string, zip: string, override?: { buildingNumber?: string; streetName?: string }): string {
  const parsed = splitStreet(street)
  const buildingNumber = (override?.buildingNumber || "").trim() || parsed.buildingNumber
  const streetName = (override?.streetName || "").trim() || parsed.streetName
  const parts = [
    buildingNumber && `Bldg ${buildingNumber}`,
    streetName,
    apt && `Apt/Unit ${apt}`,
    city,
    state,
    zip,
  ].filter(Boolean)
  return parts.join(" · ") || "—"
}

const isYes = (x: unknown) => x === "yes" || x === "Yes" || x === true
const isNo = (x: unknown) => x === "no" || x === "No" || x === false

export async function renderSignedApplicationRecord(
  applicantName: string,
  answers: Record<string, unknown>,
  v: ApplicationValues,
  opts: { signaturePng?: Uint8Array; signedAt?: Date }
): Promise<Uint8Array> {
  const { signaturePng, signedAt } = opts
  const sign: SignOpts = { signedAt }

  return buildPdf(
    (c) => {
      c.heading(
        "Application Answers & Authorization",
        "NOT an NYPD form. Your answers as you gave them, and your authorization for us to enter them into the NYPD online portal."
      )
      c.rule()

      // 1 — Identity
      c.h2("1 · Applicant")
      c.para(`Name: ${s(v.firstName)} ${s(v.mi)} ${s(v.lastName)}`.replace(/\s+/g, " ").trim())
      c.para(`Date of birth: ${portalDate(s(v.dob)) || "—"}   ·   Gender: ${s(v.sex) || "—"}`)
      c.para(`Height: ${portalHeight(v.height as string) || "—"}   ·   Weight: ${portalWeight(v.weight as string) || "—"}   ·   Eyes: ${s(v.eyeColor) || "—"}   ·   Hair: ${s(v.hairColor) || "—"}`)
      c.para(`Place of birth: ${s(v.placeOfBirth) || "—"}   ·   Citizenship: ${s(v.citizenship) || "—"}`)
      c.para(`Home address: ${addressLine(s(v.street), s(v.apt), s(v.city), s(v.state), s(v.zip), { buildingNumber: s(v.homeBuildingNumber), streetName: s(v.homeStreetName) })}`)
      c.para(`Phone: ${s(v.cellPhone) || s(v.homePhone) || "—"}   ·   Email: ${s(v.email) || "—"}`)
      c.spacer()

      // 2 — Disclosures (verbatim, with the applicant's answer)
      c.h2("2 · Disclosure questions")
      c.para("Every question below is the NYPD online portal's own wording. A question that was not asked of you (Q6 unless you served; Q16 unless law-enforcement) is shown as “not applicable”, never as “No”.", { size: 9, color: "muted" })
      for (const q of PORTAL_DISCLOSURES) {
        // Disclosures are authoritative in the DSC-01 answer store (yes/no); the
        // assembled record is only the identity + application data.
        const raw = answers[`q${q.no}`]
        // A question is "not applicable" when it wasn't asked: Q6 unless Q5 is yes;
        // Q16 for a non-LEO applicant (filtered out, so no stored answer).
        const notApplicable = raw == null && ((q.conditionalOnYesOf === 5 && !isYes(answers.q5)) || q.leoOnly)
        const answer = notApplicable ? "Not applicable" : isYes(raw) ? "Yes" : isNo(raw) ? "No" : "Not answered"
        c.h2(`${q.no}. ${answer}`)
        c.para(q.text, { size: 9, color: "muted" })
        if (isYes(raw) && !q.isConfidentialityRequest) {
          c.para(s(answers[`q${q.no}_explain`]) || "(no explanation provided)")
        }
        c.spacer()
      }

      // 3 — Application data
      c.pageBreak()
      c.h2("3 · Application details")
      c.para(`Employer: ${s(v.businessName) || "—"}${s(v.occupation) ? ` — ${s(v.occupation)}` : ""}`)
      if (s(v.businessStreet)) c.para(`Business address: ${addressLine(s(v.businessStreet), "", s(v.businessCity), s(v.businessState), s(v.businessZip), { buildingNumber: s(v.businessBuildingNumber), streetName: s(v.businessStreetName) })}`)
      c.spacer()
      c.para("Residence history (past 5 years):", { size: 10, color: "muted" })
      for (const r of asRows(v.residenceHistory)) {
        c.para(`  ${portalDate(s(r.fromMonth)) || usDate(s(r.fromMonth)) || "?"} → ${portalDate(s(r.toMonth)) || "present"}  ·  ${s(r.address) || "—"}`)
      }
      c.spacer()
      c.para("Employment history (past 5 years):", { size: 10, color: "muted" })
      for (const r of asRows(v.employmentHistory)) {
        c.para(`  ${portalDate(s(r.fromMonth)) || "?"} → ${portalDate(s(r.toMonth)) || "present"}  ·  ${s(r.employerName) || s(r.employer) || "—"}${s(r.occupation) ? ` (${s(r.occupation)})` : ""}`)
      }
      c.spacer()
      c.para(`Safekeeping: ${s(v.safeguardMethod) || "—"}`)
      c.para(`Safeguard person: ${[s(v.safeguardName), s(v.safeguardRelation), s(v.safeguardPhone), s(v.safeguardAddress)].filter(Boolean).join(" · ") || "—"}`)
      if ([1, 2, 3, 4, 5, 6].some((n) => s(v[`lop${n}`]))) {
        c.spacer()
        c.para("Letter of Necessity statements:", { size: 10, color: "muted" })
        for (const n of [1, 2, 3, 4, 5, 6]) if (s(v[`lop${n}`])) c.para(`  ${n}. ${s(v[`lop${n}`])}`)
      }

      // 4 — The portal's four affirmations, VERBATIM. Staff will tick these on the
      // applicant's behalf, so the applicant must have made them to us first.
      c.pageBreak()
      c.h2("4 · Affirmations")
      c.para(
        "The undersigned affirms and acknowledges that he/she has knowledge of and shall be responsible for compliance with all laws, rules, regulations, standards and procedures, promulgated by federal, state, or local jurisdictions, and by federal, state, or local law enforcement agencies that are applicable to this license.",
        { size: 10 }
      )
      c.spacer()
      c.para(
        "The undersigned affirms that the statements made and answers given herein are accurate and complete, and hereby authorizes the New York City Police Department, License Division to make appropriate inquiries in connection with processing this application. False written statements in this document are punishable under Section 210.45 of the New York Penal Law.",
        { size: 10 }
      )
      c.spacer()
      c.para(
        "The undersigned affirms that he/she will provide signed and notarized Release(s) authorizing the License Division to obtain any and all information that the License Division deems relevant to its review of his/her application.",
        { size: 10 }
      )
      c.spacer()
      c.para(
        "The undersigned acknowledges the state-mandated warnings regarding the risk of a firearm in the home and the responsibility to store firearms safely (Penal Law § 400.00(18)(b)).",
        { size: 10 }
      )

      // 5 — Post-submission duties (portal step 16) — standing obligations while pending.
      c.spacer()
      c.h2("5 · Post-submission duties")
      c.para(
        "While my application is pending, I will report IMMEDIATELY to the License Division, New Applicant Section, (646) 610-5551 / DG_LIC-HandgunIntake@NYPD.ORG, any of the following:",
        { size: 10 }
      )
      for (const duty of [
        "An arrest, indictment, or conviction in any jurisdiction; a summons other than a traffic infraction; or a suspension/ineligibility order under CPL §530.14 or Family Court Act §842-a.",
        "A change of business or residence address.",
        "A change of business, occupation, or employment.",
        "Any change in the circumstances cited in this application.",
        "Receipt of psychiatric treatment, or treatment for alcoholism or drug abuse, or any disability or condition affecting my ability to safely possess a handgun.",
        "Becoming the subject or recipient of an Order of Protection, Temporary Order of Protection, or an Extreme Risk (“Red Flag”) Protection Order.",
      ]) {
        c.para(`  • ${duty}`, { size: 9.5 })
      }

      // 6 — Our authorization to enter the answers into the portal on their behalf.
      c.spacer()
      c.h2("6 · Authorization")
      c.para(
        "I confirm that the answers and information above are my own, that I have reviewed them for accuracy and completeness, and that they are true. I authorize Gun License NYC to enter these answers on my behalf into the New York City Police Department's online licensing portal, and to be identified there as the person who assisted me in preparing my application."
      )
      c.spacer()
      c.signatureImage("Applicant signature")
    },
    { signaturePng, ...sign }
  )
}

type HistoryRow = { fromMonth?: string; toMonth?: string; address?: string; employer?: string; employerName?: string; occupation?: string }
function asRows(x: unknown): HistoryRow[] {
  return Array.isArray(x) ? (x as HistoryRow[]) : []
}
