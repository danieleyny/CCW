import { PORTAL_DISCLOSURES } from "@/lib/disclosures/portal-questions"
import { PORTAL_STEPS, type StepKind } from "@/config/portal-steps"
import { portalDate, portalHeight, portalWeight, splitStreet, isDayAssumed } from "@/lib/forms/format"
import { lonStatementsFor } from "@/lib/requirements/lon"
import { brand } from "@/config/brand"
import type { ApplicationValues } from "@/lib/forms/application"

/**
 * The STAFF portal-entry worksheet — every value in the NYPD ONLINE portal's own
 * ORDER and FORMAT, so staff transcribe without hunting or reformatting. Pure +
 * serializable; the page renders copy buttons and red-flags anything missing. The
 * applicant never gets a copy formatted for entry.
 *
 * ORDER AND HEADINGS COME FROM `config/portal-steps.ts` — the single source of truth.
 * This builder fills each step's fields; it never invents step order or titles.
 */
export interface WorksheetField {
  label: string
  value: string
  /** Empty and expected → flagged red so a blank never gets typed as a blank answer. */
  missing: boolean
  /** Deliberately entered at filing (SSN, the handgun list) — a labelled blank, not a flag. */
  atFiling?: boolean
  /**
   * The portal never asks this of THIS applicant (Q6 unless Q5=Yes; Q16 non-LEO). A
   * real state — greyed, and EXCLUDED from the missing count. Never the literal
   * string "N/A" typed into an answer box.
   */
  notApplicable?: boolean
}
export interface WorksheetSection {
  /** Portal step number (1–17), from PORTAL_STEPS. */
  no: number
  /** The portal's own heading, verbatim, from PORTAL_STEPS. */
  title: string
  kind: StepKind
  fields: WorksheetField[]
  /** `uploads`/`checkpoint` steps: what the screen is, since there's nothing to copy. */
  note?: string
}

const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v))
const isYes = (x: unknown) => x === "yes" || x === "Yes" || x === true
const isNo = (x: unknown) => x === "no" || x === "No" || x === false

function f(label: string, value: string, opts: { atFiling?: boolean; optional?: boolean } = {}): WorksheetField {
  const v = value.trim()
  return { label, value: v, missing: !v && !opts.atFiling && !opts.optional, atFiling: opts.atFiling }
}

/** A real not-applicable field — greyed, never counted as missing, never a typed "N/A". */
function na(label: string, reason: string): WorksheetField {
  return { label, value: `Not applicable — ${reason}`, missing: false, notApplicable: true }
}

/** A history date field: renders M/D/YYYY and flags a day we had to assume (the
 *  histories store month-only), so a guessed day on a sworn history is never silent. */
function fDate(label: string, iso: string, opts: { optional?: boolean; presentIfEmpty?: boolean } = {}): WorksheetField {
  const value = portalDate(iso) || (opts.presentIfEmpty ? "Present" : "")
  const flagged = isDayAssumed(iso) ? `${label} ⚠ day assumed — confirm` : label
  return { label: flagged, value, missing: !value && !opts.optional }
}

function addressFields(prefix: string, street: string, apt: string, city: string, state: string, zip: string, optional = false): WorksheetField[] {
  // Building/street are derived here, at render, for STAFF only. The applicant never
  // sees or confirms this split — staff correct a bad one at entry time.
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
  // Fill each portal step's fields into a map, then emit strictly in PORTAL_STEPS order.
  const byStep = new Map<number, WorksheetField[]>()
  const put = (no: number, fields: WorksheetField[]) => byStep.set(no, fields)

  // Step 1 — Verify Your Information (identity, contact, citizenship, SSN last-4, home/mailing address)
  put(1, [
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
    ...(v.mailingDifferent
      ? addressFields("Mailing Address", s(v.mailingStreet), s(v.mailingApt), s(v.mailingCity), s(v.mailingState), s(v.mailingZip))
      : []),
  ])

  // Step 2 — Residence History (past 5 years). The portal's residence table is eight columns.
  put(
    2,
    asRows(v.residenceHistory).flatMap((r, i) => {
      const { buildingNumber, streetName } = splitStreet(s(r.address))
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
    })
  )

  // Step 3 — Employment (current employer only; the portal keeps prior jobs on step 4)
  put(3, [
    f("Currently employed?", s(v.employed), { optional: true }),
    f("Name of Business", s(v.businessName), { optional: true }),
    f("Job Title", s(v.occupation), { optional: true }),
    f("Industry / type of business", s(v.businessType), { optional: true }),
    f("Current employment start date", portalDate(s(v.employmentStartDate)), { optional: true }),
    ...addressFields("Business Address", s(v.businessStreet), s(v.businessUnit), s(v.businessCity), s(v.businessState), s(v.businessZip), true),
    f("Business Phone", s(v.busPhone), { optional: true }),
  ])

  // Step 4 — Employment History (prior employers)
  const empHistory = asRows(v.employmentHistory)
  put(
    4,
    empHistory.length
      ? empHistory.flatMap((r, i) => [
          f(`History ${i + 1} — Business Name`, s(r.employerName) || s(r.employer), { optional: true }),
          f(`History ${i + 1} — Job Title`, s(r.occupation), { optional: true }),
          fDate(`History ${i + 1} — Start`, s(r.fromMonth), { optional: true }),
          fDate(`History ${i + 1} — End`, s(r.toMonth), { optional: true, presentIfEmpty: true }),
        ])
      : [f("Prior employers", "None listed", { optional: true })]
  )

  // Step 5 — Other Licenses
  const otherLicenses = asRecords(v.otherLicenses)
  put(5, [
    f("Do you have other licenses?", otherLicenses.length ? "Yes" : "No", { optional: true }),
    ...otherLicenses.flatMap((l, i) => [
      f(`Licence ${i + 1} — Number`, s(l.number), { optional: true }),
      f(`Licence ${i + 1} — Issuing Agency`, s(l.agency), { optional: true }),
      f(`Licence ${i + 1} — State & County`, s(l.stateCounty), { optional: true }),
      f(`Licence ${i + 1} — Date Issued`, portalDate(s(l.issuedOn)), { optional: true }),
      f(`Licence ${i + 1} — Expiration`, portalDate(s(l.expiresOn)), { optional: true }),
    ]),
  ])

  // Step 6 — Existing Guns
  const firearms = asRecords(v.firearms)
  put(6, [
    f("Do you currently own any handguns or rifle/shotguns?", firearms.length ? "Yes" : "No", { optional: true }),
    ...firearms.flatMap((g, i) => [
      f(`Firearm ${i + 1} — Make`, s(g.make), { optional: true }),
      f(`Firearm ${i + 1} — Model`, s(g.model), { optional: true }),
      f(`Firearm ${i + 1} — Caliber`, s(g.caliber), { optional: true }),
      f(`Firearm ${i + 1} — Serial`, s(g.serial), { optional: true }),
    ]),
    ...(ctx.isRenewal ? [f("Prior licence number (renewal)", s(v.priorLicenseNumber), { optional: true })] : []),
  ])

  // Step 7 — Safekeeping and Safeguarding (one portal screen: where it's secured + who safeguards it)
  put(7, [
    f("How will it be secured when not in use?", s(v.safeguardMethod)),
    ...addressFields("Safekeeping Location", s(v.safekeepingStreet), s(v.safekeepingApt), s(v.safekeepingCity), s(v.safekeepingState), s(v.safekeepingZip)),
    f("Safeguard — First Name", s(v.safeguardFirstName)),
    f("Safeguard — Last Name", s(v.safeguardLastName)),
    f("Safeguard — Relationship", s(v.safeguardRelation)),
    f("Safeguard — Email", s(v.safeguardEmail)),
    f("Safeguard — Phone", s(v.safeguardPhone)),
    f("Safeguard — At least 21?", s(v.safeguardIs21)),
    ...addressFields("Safeguard Address", s(v.safeguardAddress), s(v.safeguardApt), s(v.safeguardCity), s(v.safeguardState), s(v.safeguardZip), true),
  ])

  // Steps 8/9/10 — the disclosure questions, grouped by the portal's own screen ranges.
  for (const step of PORTAL_STEPS) {
    if (step.kind !== "questions" || !step.range) continue
    const [lo, hi] = step.range
    put(
      step.no,
      PORTAL_DISCLOSURES.filter((q) => q.no >= lo && q.no <= hi).flatMap((q) => {
        const raw = disclosures[`q${q.no}`]
        // A real not-applicable state — only when genuinely unanswered AND the portal
        // wouldn't ask it. An actual Yes/No always wins over N/A.
        if (raw == null) {
          if (q.conditionalOnYesOf === 5 && !isYes(disclosures.q5)) return [na(`${q.no}. ${q.text}`, "only asked if Q5 is Yes")]
          if (q.leoOnly && !ctx.leo) return [na(`${q.no}. ${q.text}`, "law-enforcement applicants only")]
        }
        const answer = isYes(raw) ? "Yes" : isNo(raw) ? "No" : ""
        const out: WorksheetField[] = [{ label: `${q.no}. ${q.text}`, value: answer, missing: !answer }]
        if (isYes(raw) && !q.isConfidentialityRequest) {
          out.push(f(`${q.no}. Explanation`, s(disclosures[`q${q.no}_explain`])))
        }
        return out
      })
    )
  }

  // Step 11 — Confidentiality (the Public-Records Exemption election). Only meaningful
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
  put(11, [
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
  ])

  // Step 12 — Letter of Necessity, SCOPED by licence type (a concealed-carry case answers
  // three of six). Render only the applicable statements so a blank never gets flagged.
  put(
    12,
    lonStatementsFor(ctx.licenseTrack).map((n) => f(`Statement ${n}`, s(v[`lop${n}`])))
  )

  // Step 14 — Counsel and Preparer
  const counselYes = v.counselRepresented === "Yes"
  put(14, [
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
  ])

  // Emit sections strictly in PORTAL_STEPS order. Uploads (13) and checkpoints (15/16/17)
  // carry a note instead of fields — step 13 is transcribed as documents in the tab.
  return PORTAL_STEPS.map((step) => ({
    no: step.no,
    title: step.title,
    kind: step.kind,
    fields: byStep.get(step.no) ?? [],
    note:
      step.kind === "uploads"
        ? "The portal's file uploads — transcribed below as documents, not fields."
        : step.checkpoint,
  }))
}

type Row = { fromMonth?: string; toMonth?: string; address?: string; employer?: string; employerName?: string; occupation?: string; buildingNumber?: string; streetName?: string; streetConfirmed?: boolean; apt?: string; city?: string; state?: string; zip?: string }
function asRows(x: unknown): Row[] {
  return Array.isArray(x) ? (x as Row[]) : []
}
function asRecords(x: unknown): Record<string, unknown>[] {
  return Array.isArray(x) ? (x as Record<string, unknown>[]) : []
}
