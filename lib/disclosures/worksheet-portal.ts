import { PORTAL_DISCLOSURES } from "@/lib/disclosures/portal-questions"
import { portalDate, portalHeight, portalWeight, splitStreet } from "@/lib/forms/format"
import { brand } from "@/config/brand"
import type { ApplicationValues } from "@/lib/forms/application"

/**
 * The STAFF portal-entry worksheet (PORTAL_ALIGNMENT_REBUILD Part 6) — every value in
 * the NYPD ONLINE portal's own ORDER and FORMAT, so staff transcribe without hunting
 * or reformatting. Pure + serializable; the page renders copy buttons and red-flags
 * anything missing. The applicant never gets a copy formatted for entry.
 */
export interface WorksheetField {
  label: string
  value: string
  /** Empty and expected → flagged red so a blank never gets typed as a blank answer. */
  missing: boolean
  /** Deliberately entered at filing (SSN, the handgun list) — a labelled blank, not a flag. */
  atFiling?: boolean
}
export interface WorksheetSection {
  title: string
  fields: WorksheetField[]
}

const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v))
const isYes = (x: unknown) => x === "yes" || x === "Yes" || x === true
const isNo = (x: unknown) => x === "no" || x === "No" || x === false

function f(label: string, value: string, opts: { atFiling?: boolean; optional?: boolean } = {}): WorksheetField {
  const v = value.trim()
  return { label, value: v, missing: !v && !opts.atFiling && !opts.optional, atFiling: opts.atFiling }
}

function addressFields(prefix: string, street: string, apt: string, city: string, state: string, zip: string, optional = false): WorksheetField[] {
  const { buildingNumber, streetName } = splitStreet(street)
  return [
    f(`${prefix} — Building Number`, buildingNumber, { optional }),
    f(`${prefix} — Street Name`, streetName, { optional }),
    f(`${prefix} — Apt/Unit`, apt, { optional: true }),
    f(`${prefix} — City`, city, { optional }),
    f(`${prefix} — State`, state, { optional }),
    f(`${prefix} — Zip`, zip, { optional }),
  ]
}

export function buildPortalWorksheet(
  v: ApplicationValues,
  disclosures: Record<string, unknown>,
  ctx: { applicationType?: string; isRenewal?: boolean; phone?: string | null; email?: string | null; leo?: boolean; ssnLast4?: string }
): WorksheetSection[] {
  const sections: WorksheetSection[] = []

  sections.push({
    title: "Verify Your Information",
    fields: [
      f("Application Type", ctx.applicationType || "Concealed Carry"),
      f("Are you renewing an existing license/permit?", ctx.isRenewal ? "Yes" : "No"),
      f("First Name", s(v.firstName)),
      f("Last Name", s(v.lastName)),
      f("Middle Initial", s(v.mi), { optional: true }),
      f("Gender", s(v.sex)),
      f("Date of Birth", portalDate(s(v.dob))),
      f("Height", portalHeight(v.height as string)),
      f("Weight", portalWeight(v.weight as string)),
      f("Eye Color", s(v.eyeColor)),
      f("Hair Color", s(v.hairColor)),
      f("Primary Phone", s(v.cellPhone) || s(v.homePhone) || s(ctx.phone)),
      f("Other Phone", s(v.homePhone), { optional: true }),
      f("Email", s(v.email) || s(ctx.email)),
      f("Are you a U.S. Citizen?", v.citizenship === "Citizen" ? "Yes" : v.citizenship === "Alien" ? "No" : ""),
      f("SSN — Last 4 digits", s(ctx.ssnLast4)),
      ...addressFields("Home Address", s(v.street), s(v.apt), s(v.city), s(v.state), s(v.zip)),
      f("Mailing address different from home?", v.mailingDifferent ? "Yes" : "No"),
      // Only surface the mailing block when it's actually different.
      ...(v.mailingDifferent
        ? addressFields("Mailing Address", s(v.mailingStreet), s(v.mailingApt), s(v.mailingCity), s(v.mailingState), s(v.mailingZip))
        : []),
    ],
  })

  sections.push({
    title: "Residence History (past 5 years)",
    fields: asRows(v.residenceHistory).flatMap((r, i) => {
      const { buildingNumber, streetName } = splitStreet(s(r.address))
      return [
        f(`Row ${i + 1} — From`, portalDate(s(r.fromMonth))),
        f(`Row ${i + 1} — To`, portalDate(s(r.toMonth)) || "Present"),
        f(`Row ${i + 1} — Building`, buildingNumber, { optional: true }),
        f(`Row ${i + 1} — Street`, streetName),
      ]
    }),
  })

  sections.push({
    title: "Employment",
    fields: [
      f("Name of Business", s(v.businessName), { optional: true }),
      f("Job Title", s(v.occupation), { optional: true }),
      ...addressFields("Business Address", s(v.businessStreet), "", s(v.businessCity), s(v.businessState), s(v.businessZip), true),
      f("Business Phone", s(v.busPhone), { optional: true }),
      ...asRows(v.employmentHistory).flatMap((r, i) => [
        f(`History ${i + 1} — Business Name`, s(r.employerName) || s(r.employer), { optional: true }),
        f(`History ${i + 1} — Job Title`, s(r.occupation), { optional: true }),
        f(`History ${i + 1} — Start`, portalDate(s(r.fromMonth)), { optional: true }),
        f(`History ${i + 1} — End`, portalDate(s(r.toMonth)) || "Present", { optional: true }),
      ]),
    ],
  })

  sections.push({
    title: "Other Licenses & Existing Guns",
    fields: [
      f("Do you have other licenses?", "", { atFiling: true }),
      f("Do you currently own any handguns or rifle/shotguns?", "", { atFiling: true }),
    ],
  })

  sections.push({
    title: "Safekeeping and Safeguarding",
    fields: [
      f("How/where will it be secured when not in use?", s(v.safeguardMethod)),
      f("Safeguard — First/Last Name", s(v.safeguardName)),
      f("Safeguard — Relationship", s(v.safeguardRelation)),
      f("Safeguard — Email", s(v.safeguardEmail)),
      f("Safeguard — Phone", s(v.safeguardPhone)),
      ...addressFields("Safeguard Address", s(v.safeguardAddress), "", "", "", "", true),
    ],
  })

  sections.push({
    title: "Disclosure Questions",
    fields: PORTAL_DISCLOSURES.flatMap((q) => {
      const raw = disclosures[`q${q.no}`]
      const notApplicable = raw == null && ((q.conditionalOnYesOf === 5 && !isYes(disclosures.q5)) || (q.leoOnly && !ctx.leo))
      const answer = notApplicable ? "N/A" : isYes(raw) ? "Yes" : isNo(raw) ? "No" : ""
      const out = [{ label: `${q.no}. ${q.text.slice(0, 70)}…`, value: answer, missing: !answer && !notApplicable }]
      if (isYes(raw) && !q.isConfidentialityRequest) {
        out.push(f(`${q.no}. Explanation`, s(disclosures[`q${q.no}_explain`])))
      }
      return out
    }),
  })

  sections.push({
    title: "Letter of Necessity",
    fields: [1, 2, 3, 4, 5, 6].map((n) => f(`Statement ${n}`, s(v[`lop${n}`]), { optional: n === 2 || n === 4 || n === 5 || n === 6 })),
  })

  sections.push({
    title: "Representation & Assistance",
    fields: [
      f("Are you being represented by counsel?", "No", { optional: true }),
      f("Did anyone assist you in preparing the application?", "Yes"),
      f("Assistant — Organization Name", brand.name),
      f("Assistant — Email", brand.contact.email),
      f("Assistant — Phone", brand.contact.phone),
    ],
  })

  return sections
}

type Row = { fromMonth?: string; toMonth?: string; address?: string; employer?: string; employerName?: string; occupation?: string }
function asRows(x: unknown): Row[] {
  return Array.isArray(x) ? (x as Row[]) : []
}
