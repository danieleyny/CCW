import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { PDFDocument } from "pdf-lib"
import { FORM_TEMPLATES, type FormTemplate } from "./templates"

/**
 * Every form-engine defect in the 23 Aug 2026 QA pass shared one root cause:
 * nothing checked that what build() intends to write reaches a field that exists.
 * This is that check. It runs under `pnpm test` and as a CLI (scripts/
 * verify-form-templates.ts), and asserts, for every template, that the file loads,
 * that `isFillable` matches reality, that every field build() emits (across every
 * conditional branch) plus every declared signature/date field exists on the PDF,
 * that signable and notarize are mutually exclusive, and that no two DIFFERENT
 * files are byte-identical.
 */

/** Fully-populated fixtures. Child support is run across all declaration branches. */
export const FIXTURES: Record<string, Record<string, unknown>[]> = {
  nypd_child_support_cert: [
    { firstName: "A", lastName: "B", ssn: "1", street: "S", apt: "1", city: "C", state: "NY", zip: "1", dob: "1990-02-03", empName: "E", empStreet: "ES", empCity: "EC", empState: "NY", empZip: "1", obligated: "no" },
    { obligated: "yes", acctNumbers: "1", obligBranch: "a" },
    { obligated: "yes", acctNumbers: "1", obligBranch: "b", bCondition: "income_exec", caseNumber: "1" },
    { obligated: "yes", acctNumbers: "1", obligBranch: "b", bCondition: "pending", caseNumber: "1" },
    { obligated: "yes", acctNumbers: "1", obligBranch: "b", bCondition: "public_assist", caseNumber: "1" },
    { obligated: "yes", acctNumbers: "1", obligBranch: "c" },
  ],
  nypd_cohabitant_affidavit: [{ fullName: "A", address: "B" }],
  nypd_cohabitant_affidavit_household: [
    { name: "A", dob: "1990-01-01", address: "B", applicantName: "C", relationship: "R", phoneHome: "1", phoneCell: "2", phoneWork: "3" },
  ],
  nypd_prelicense_exemption: [
    {
      fullName: "A",
      address: "B",
      age: "30",
      dob: "1990-01-01",
      instructorName: "Inst",
      instructorCredentials: "DCJS-certified",
      instructorRangeName: "Range",
      instructorAddress: "Range Addr",
      instructorPhone: "555-0100",
      trainingLocation: "Range, NY",
      metApplicant: true,
      noDanger: true,
    },
  ],
  nypd_company_application: [
    { applicantName: "A", applicantAddress: "B", dob: "1990-01-01", ssn: "1", companyName: "Co", businessAddress: "BA", businessPhone: "BP", businessType: "BT", wgpLicenseType: "W", wgpLicenseNumber: "N", wgpExpire: "2030", custodian: "Cu", custodianLicenseNo: "L", position: "P" },
  ],
  nypd_employment_record_request: [{ fullName: "A", address: "B", dob: "1990-01-01", ssn: "1" }],
  nypd_affidavit_familiarity: [{ county: "New York" }],
  nypd_disclosure_addendum: [
    { q10: "no", q12: "yes", q12_explain: "Prescribed a short course of medication by Dr. Lee in 2019; no ongoing use.", q23: "yes", q23_explain: "Arrest in 2015, New York County; charge dismissed and sealed." },
  ],
  nypd_safeguard_acknowledgement: [
    {
      applicantName: "Marcus J Powell",
      safeguardLastName: "Reyes",
      safeguardFirstName: "Dana",
      safeguardMI: "K",
      safeguardStreet: "500 Guard Ave",
      safeguardApt: "3C",
      safeguardCity: "New York",
      safeguardZip: "10011",
      safeguardHomePhone: "(212) 555-0142",
      safeguardCellPhone: "(212) 555-0143",
      safeguardBusinessPhone: "(212) 555-0144",
    },
  ],
}

export interface ValidatorRow {
  key: string
  pdfFields: number
  mapped: number
  missing: string[]
}

export interface ValidatorResult {
  ok: boolean
  rows: ValidatorRow[]
  errors: string[]
}

async function fieldsOf(t: FormTemplate): Promise<Set<string>> {
  const bytes = readFileSync(join(process.cwd(), "assets", "form-templates", t.file))
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return new Set(pdf.getForm().getFields().map((f) => f.getName()))
}

export async function validateFormTemplates(): Promise<ValidatorResult> {
  const errors: string[] = []
  const rows: ValidatorRow[] = []
  const shaByFile = new Map<string, string>()
  const shaToFiles = new Map<string, Set<string>>()

  for (const t of Object.values(FORM_TEMPLATES)) {
    const path = join(process.cwd(), "assets", "form-templates", t.file)

    // 1. File exists.
    if (!existsSync(path)) {
      errors.push(`${t.key}: file missing (${t.file})`)
      rows.push({ key: t.key, pdfFields: 0, mapped: 0, missing: [] })
      continue
    }

    // 6. Track sha per file to catch two DIFFERENT files that are byte-identical.
    let sha = shaByFile.get(t.file)
    if (!sha) {
      sha = createHash("sha256").update(readFileSync(path)).digest("hex")
      shaByFile.set(t.file, sha)
    }
    if (!shaToFiles.has(sha)) shaToFiles.set(sha, new Set())
    shaToFiles.get(sha)!.add(t.file)

    // 7. signable and notarize are mutually exclusive.
    if (t.signable && t.notarize) errors.push(`${t.key}: declares BOTH signable and notarize`)

    // 2 + 3. Loads with pdf-lib; isFillable matches reality.
    let pdfFields: Set<string>
    try {
      pdfFields = await fieldsOf(t)
    } catch (e) {
      errors.push(`${t.key}: failed to load PDF — ${e instanceof Error ? e.message : e}`)
      rows.push({ key: t.key, pdfFields: 0, mapped: 0, missing: [] })
      continue
    }
    if (t.isFillable && pdfFields.size === 0) {
      errors.push(`${t.key}: isFillable=true but the PDF exposes NO AcroForm fields`)
    }

    // 4 + 5 + 8. Every emitted / declared field must exist, across every branch.
    const emitted = new Set<string>()
    for (const fx of FIXTURES[t.key] ?? []) {
      const f = t.build ? t.build(fx) : {}
      for (const [n, v] of Object.entries(f.text ?? {})) if (v != null && v !== "") emitted.add(n)
      for (const [n, on] of Object.entries(f.checks ?? {})) if (on) emitted.add(n)
    }
    if (t.signatureField) emitted.add(t.signatureField)
    if (t.dateField) emitted.add(t.dateField)
    if (t.dateSplit) [t.dateSplit.mm, t.dateSplit.dd, t.dateSplit.yyyy].forEach((n) => emitted.add(n))

    const missing = [...emitted].filter((n) => !pdfFields.has(n))
    if (missing.length) errors.push(`${t.key}: build() emits fields absent from the PDF → ${missing.join(", ")}`)
    // A fillable template with a build() and no fixture is untested — flag it.
    if (t.build && !(FIXTURES[t.key]?.length)) errors.push(`${t.key}: has build() but no validator fixture`)

    // Completeness: every `requires` entry must exist on the PDF AND be produced
    // by build() from a full fixture — a required field with no mapping fails CI.
    for (const req of t.requires ?? []) {
      if (!pdfFields.has(req)) errors.push(`${t.key}: requires "${req}" which is not a field on the PDF`)
    }
    const full = (FIXTURES[t.key] ?? [])[0]
    if (t.requires && t.build && full) {
      const f = t.build(full)
      for (const req of t.requires) {
        const v = f.text?.[req]
        if (v == null || v === "") errors.push(`${t.key}: required field "${req}" is not produced by build() from a full fixture`)
      }
    }

    rows.push({ key: t.key, pdfFields: pdfFields.size, mapped: emitted.size, missing })
  }

  // 6. Assert no sha256 spans more than one distinct file.
  for (const [sha, files] of shaToFiles) {
    if (files.size > 1) errors.push(`duplicate: ${[...files].join(" == ")} are byte-identical (sha ${sha.slice(0, 12)})`)
  }

  return { ok: errors.length === 0, rows, errors }
}
