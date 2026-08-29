import { PORTAL_DISCLOSURES } from "@/lib/disclosures/portal-questions"
import { portalDate, portalHeight, portalWeight, splitStreet, resolveStreetSplit, isDayAssumed } from "@/lib/forms/format"
import { lonStatementsFor } from "@/lib/requirements/lon"
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

/** A history date field: renders M/D/YYYY and flags a day we had to assume (the
 *  histories store month-only), so a guessed day on a sworn history is never silent. */
function fDate(label: string, iso: string, opts: { optional?: boolean; presentIfEmpty?: boolean } = {}): WorksheetField {
  const value = portalDate(iso) || (opts.presentIfEmpty ? "Present" : "")
  const flagged = isDayAssumed(iso) ? `${label} ⚠ day assumed — confirm` : label
  return { label: flagged, value, missing: !value && !opts.optional }
}

function addressFields(
  prefix: string,
  street: string,
  apt: string,
  city: string,
  state: string,
  zip: string,
  optional = false,
  /** A confirmed portal split — preferred over the render-time parse when present. */
  override?: { buildingNumber?: string; streetName?: string }
): WorksheetField[] {
  const parsed = splitStreet(street)
  const buildingNumber = (override?.buildingNumber || "").trim() || parsed.buildingNumber
  const streetName = (override?.streetName || "").trim() || parsed.streetName
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
  ctx: {
    applicationType?: string
    isRenewal?: boolean
    phone?: string | null
    email?: string | null
    leo?: boolean
    ssnLast4?: string
    /** Scopes the Letter of Necessity — a concealed-carry case answers three of six. */
    licenseTrack?: string | null
    /** CON-01 answers (requirement_answers) — the step-11 confidentiality election. */
    confidentiality?: Record<string, unknown>
  }
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
      ...addressFields("Home Address", s(v.street), s(v.apt), s(v.city), s(v.state), s(v.zip), false, {
        buildingNumber: s(v.homeBuildingNumber),
        streetName: s(v.homeStreetName),
      }),
      f("Mailing address different from home?", v.mailingDifferent ? "Yes" : "No"),
      // Only surface the mailing block when it's actually different.
      ...(v.mailingDifferent
        ? addressFields("Mailing Address", s(v.mailingStreet), s(v.mailingApt), s(v.mailingCity), s(v.mailingState), s(v.mailingZip), false, {
            buildingNumber: s(v.mailingBuildingNumber),
            streetName: s(v.mailingStreetName),
          })
        : []),
    ],
  })

  sections.push({
    title: "Residence History (past 5 years)",
    fields: asRows(v.residenceHistory).flatMap((r, i) => {
      const { buildingNumber, streetName } = resolveStreetSplit({
        buildingNumber: r.buildingNumber,
        streetName: r.streetName,
        confirmed: !!r.streetConfirmed,
        street: s(r.address),
      })
      // The portal's residence table is eight columns.
      return [
        fDate(`Row ${i + 1} — From`, s(r.fromMonth)),
        fDate(`Row ${i + 1} — To`, s(r.toMonth), { presentIfEmpty: true }),
        f(`Row ${i + 1} — Building Number`, buildingNumber, { optional: true }),
        f(`Row ${i + 1} — Street Name`, streetName),
        f(`Row ${i + 1} — Apt/Unit/Suite`, s(r.apt), { optional: true }),
        f(`Row ${i + 1} — City`, s(r.city)),
        f(`Row ${i + 1} — State`, s(r.state)),
        f(`Row ${i + 1} — Zip`, s(r.zip)),
      ]
    }),
  })

  sections.push({
    title: "Employment",
    fields: [
      f("Currently employed?", s(v.employed), { optional: true }),
      f("Name of Business", s(v.businessName), { optional: true }),
      f("Job Title", s(v.occupation), { optional: true }),
      f("Industry / type of business", s(v.businessType), { optional: true }),
      f("Current employment start date", portalDate(s(v.employmentStartDate)), { optional: true }),
      // The unit/suite is the address's Apt/Unit field — one input, not two.
      ...addressFields("Business Address", s(v.businessStreet), s(v.businessUnit), s(v.businessCity), s(v.businessState), s(v.businessZip), true, {
        buildingNumber: s(v.businessBuildingNumber),
        streetName: s(v.businessStreetName),
      }),
      f("Business Phone", s(v.busPhone), { optional: true }),
      ...asRows(v.employmentHistory).flatMap((r, i) => [
        f(`History ${i + 1} — Business Name`, s(r.employerName) || s(r.employer), { optional: true }),
        f(`History ${i + 1} — Job Title`, s(r.occupation), { optional: true }),
        fDate(`History ${i + 1} — Start`, s(r.fromMonth), { optional: true }),
        fDate(`History ${i + 1} — End`, s(r.toMonth), { optional: true, presentIfEmpty: true }),
      ]),
    ],
  })

  const firearms = asRecords(v.firearms)
  const otherLicenses = asRecords(v.otherLicenses)
  sections.push({
    title: "Other Licenses & Existing Guns",
    fields: [
      f("Do you have other licenses?", otherLicenses.length ? "Yes" : "No", { optional: true }),
      ...otherLicenses.flatMap((l, i) => [
        f(`Licence ${i + 1} — Number`, s(l.number), { optional: true }),
        f(`Licence ${i + 1} — Issuing Agency`, s(l.agency), { optional: true }),
        f(`Licence ${i + 1} — State & County`, s(l.stateCounty), { optional: true }),
        f(`Licence ${i + 1} — Date Issued`, portalDate(s(l.issuedOn)), { optional: true }),
        f(`Licence ${i + 1} — Expiration`, portalDate(s(l.expiresOn)), { optional: true }),
      ]),
      f("Do you currently own any handguns or rifle/shotguns?", firearms.length ? "Yes" : "No", { optional: true }),
      ...firearms.flatMap((g, i) => [
        f(`Firearm ${i + 1} — Make`, s(g.make), { optional: true }),
        f(`Firearm ${i + 1} — Model`, s(g.model), { optional: true }),
        f(`Firearm ${i + 1} — Caliber`, s(g.caliber), { optional: true }),
        f(`Firearm ${i + 1} — Serial`, s(g.serial), { optional: true }),
      ]),
      ...(ctx.isRenewal ? [f("Prior licence number (renewal)", s(v.priorLicenseNumber), { optional: true })] : []),
    ],
  })

  sections.push({
    title: "Safekeeping (where the handgun is secured)",
    fields: [
      f("How will it be secured when not in use?", s(v.safeguardMethod)),
      // The safekeeping LOCATION — a distinct six-part address (not the home address).
      ...addressFields(
        "Safekeeping Location",
        s(v.safekeepingStreet),
        s(v.safekeepingApt),
        s(v.safekeepingCity),
        s(v.safekeepingState),
        s(v.safekeepingZip),
        false,
        { buildingNumber: s(v.safekeepingBuildingNumber), streetName: s(v.safekeepingStreetName) }
      ),
    ],
  })

  sections.push({
    title: "Safeguarding Person",
    fields: [
      f("Safeguard — First Name", s(v.safeguardFirstName)),
      f("Safeguard — Last Name", s(v.safeguardLastName)),
      f("Safeguard — Relationship", s(v.safeguardRelation)),
      f("Safeguard — Email", s(v.safeguardEmail)),
      f("Safeguard — Phone", s(v.safeguardPhone)),
      f("Safeguard — At least 21?", s(v.safeguardIs21)),
      ...addressFields(
        "Safeguard Address",
        s(v.safeguardAddress),
        s(v.safeguardApt),
        s(v.safeguardCity),
        s(v.safeguardState),
        s(v.safeguardZip),
        true,
        { buildingNumber: s(v.safeguardBuildingNumber), streetName: s(v.safeguardStreetName) }
      ),
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

  // The Letter of Necessity is SCOPED by licence type — a concealed-carry case answers
  // three of the six statements. Render only the applicable ones so the worksheet never
  // flags an inapplicable statement as a missing answer.
  sections.push({
    title: "Letter of Necessity",
    fields: lonStatementsFor(ctx.licenseTrack).map((n) => f(`Statement ${n}`, s(v[`lop${n}`]))),
  })

  // Step 11 — the confidentiality (public-records exemption) election. Only meaningful
  // when a request is actually being made; otherwise a single "No".
  const con = ctx.confidentiality ?? {}
  const conRequesting = isYes(con.requesting)
  const CON_GROUNDS: [string, string][] = [
    ["g1a", "Active/retired police, peace, probation, parole, corrections officer"],
    ["g1b", "Protected person under a valid order of protection"],
    ["g1c", "Witness in a criminal proceeding"],
    ["g1d", "Juror / grand juror in a criminal proceeding"],
    ["g2", "Safety may be endangered for another reason (explained)"],
    ["g3", "Spouse/partner/household member of a person above"],
    ["g4", "May be subject to unwarranted harassment on disclosure"],
  ]
  sections.push({
    title: "Confidentiality (Public-Records Exemption)",
    fields: [
      f("Requesting confidentiality?", con.requesting == null ? "" : conRequesting ? "Yes" : "No", { optional: true }),
      ...(conRequesting
        ? [
            ...CON_GROUNDS.filter(([k]) => con[k] === true || con[k] === "true" || con[k] === "on").map(([, label]) =>
              f(`Ground — ${label}`, "Checked", { optional: true })
            ),
            f("Additional supportive information", s(con.item5 as string), { optional: true }),
            f("Scope of request", con.election === "all" ? "Apply to all my applications/licences" : con.election === "withdraw" ? "Not submitting / withdraw previous" : "", { optional: true }),
          ]
        : []),
    ],
  })

  const counselYes = v.counselRepresented === "Yes"
  sections.push({
    title: "Representation & Assistance",
    fields: [
      f("Are you being represented by counsel?", s(v.counselRepresented) || "No", { optional: true }),
      ...(counselYes
        ? [
            f("Counsel — First Name", s(v.counselFirstName), { optional: true }),
            f("Counsel — Last Name", s(v.counselLastName), { optional: true }),
            f("Counsel — Firm", s(v.counselFirm), { optional: true }),
            f("Counsel — Email", s(v.counselEmail), { optional: true }),
            f("Counsel — Phone", s(v.counselPhone), { optional: true }),
          ]
        : []),
      f("Did anyone assist you in preparing the application?", "Yes"),
      f("Assistant — Organization Name", brand.name),
      f("Assistant — Email", brand.contact.email),
      f("Assistant — Phone", brand.contact.phone),
    ],
  })

  return sections
}

type Row = { fromMonth?: string; toMonth?: string; address?: string; employer?: string; employerName?: string; occupation?: string; buildingNumber?: string; streetName?: string; streetConfirmed?: boolean; apt?: string; city?: string; state?: string; zip?: string }
function asRows(x: unknown): Row[] {
  return Array.isArray(x) ? (x as Row[]) : []
}
function asRecords(x: unknown): Record<string, unknown>[] {
  return Array.isArray(x) ? (x as Record<string, unknown>[]) : []
}
