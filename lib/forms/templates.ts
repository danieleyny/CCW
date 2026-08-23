/**
 * The NYPD/HRA form template registry. The PDF bytes live in
 * assets/form-templates/ (read like the fonts in lib/pdf/builder.ts); this
 * module maps our questionnaire answers onto each form's REAL AcroForm fields.
 * We fill the official document — never a facsimile.
 *
 * `build(v)` returns the fields to set on the real form. The child-support
 * declarations are conditional, which is exactly why the map lives in code and
 * not a flat jsonb column. `ephemeral` names fields collected only to fill the
 * PDF and NEVER persisted (the SSN — see the SSN decision in the build prompt).
 */

export interface FilledFields {
  text?: Record<string, string | undefined>
  checks?: Record<string, boolean>
  /** AcroForm signature field → where the applicant's adopted signature is drawn. */
  signatureField?: string
  /** AcroForm date field(s) filled at signing (MM/DD/YYYY split when present). */
  dateField?: string
  dateSplit?: { mm: string; dd: string; yyyy: string }
}

export interface FormTemplate {
  key: string
  file: string
  officialTitle: string
  formNumber?: string
  revision?: string
  issuingAuthority: string
  sourceUrl: string
  isFillable: boolean
  /** Collected to fill the PDF, never saved to requirement_answers. */
  ephemeral?: string[]
  /** Present ⇒ this template is a filled-and-signed sworn document (applicant adopts). */
  signable?: boolean
  build?: (v: Record<string, unknown>) => FilledFields
}

const s = (v: unknown): string => (v == null ? "" : String(v))

const BASE = "https://licensing.nypdonline.org/additional-forms"

export const FORM_TEMPLATES: Record<string, FormTemplate> = {
  // ── Child Support Certification (HRA M-522) — sworn, NOT notarised ──────────
  nypd_child_support_cert: {
    key: "nypd_child_support_cert",
    file: "forms-childsupport.pdf",
    officialTitle: "Child Support Certification",
    formNumber: "M-522",
    revision: "Rev 05/10",
    issuingAuthority: "NYC HRA",
    sourceUrl: `${BASE}/forms-childsupport`,
    isFillable: true,
    ephemeral: ["ssn"], // SSN is rendered into the PDF but never persisted as an answer
    signable: true,
    build: (v) => {
      const checks: Record<string, boolean> = {}
      const text: Record<string, string | undefined> = {
        "Last name": s(v.lastName),
        "First name": s(v.firstName),
        "Social Security Number or ITIN": s(v.ssn),
        "Street address": s(v.street),
        "Apt number": s(v.apt),
        City: s(v.city),
        State: s(v.state),
        "Zip code": s(v.zip),
        "Business name": s(v.empName),
        "Street address_2": s(v.empStreet),
        City_2: s(v.empCity),
        State_2: s(v.empState),
        "Zip code_2": s(v.empZip),
      }
      const obligated = v.obligated === "yes" || v.obligated === true
      if (!obligated) {
        checks["am not under a court or administrative order to pay child support OR 2"] = true
      } else {
        checks["under an obligation to pay child support"] = true
        text["My child support account numbers if applicable"] = s(v.acctNumbers)
        if (v.obligBranch === "a") checks["a"] = true
        else if (v.obligBranch === "b") {
          checks["b"] = true
          if (v.bCondition === "income_exec")
            checks["I am making payments by income execution or by court agreed paymentrepayment plan or by a"] = true
          else if (v.bCondition === "pending")
            checks["My child support obligation is the subject of a pending court proceeding"] = true
          else if (v.bCondition === "public_assist")
            checks["I am currently in receipt of Public Assistance or Supplemental Security Income"] = true
          text["My case number is"] = s(v.caseNumber)
        } else if (v.obligBranch === "c") {
          checks[
            "c I have arrears equal to 4 months or more of child support payments and none of the above statements in"
          ] = true
        }
      }
      return { text, checks, signatureField: "Signature", dateField: "Date" }
    },
  },

  // ── Cohabitant Affidavit — solo-resident section (COH-02) ───────────────────
  // Filled: Text15 (name), Text16 (address); Signature17 + Date18 at signing.
  nypd_cohabitant_affidavit: {
    key: "nypd_cohabitant_affidavit",
    file: "forms-cohab.pdf",
    officialTitle: "Affidavit of Co-Habitant",
    revision: "Rev 11/16/2023",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-cohab`,
    isFillable: true,
    signable: true,
    build: (v) => ({
      text: { Text15: s(v.fullName), Text16: s(v.address) },
      signatureField: "Signature17",
      dateField: "Date18_af_date",
    }),
  },

  // ── Request for License Pre-Exemption (38 RCNY §5-09) — instructor signs ────
  nypd_prelicense_exemption: {
    key: "nypd_prelicense_exemption",
    file: "request-pre-exemption.pdf",
    officialTitle: "Request for License Pre-Exemption",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/request-pre-exemption`,
    isFillable: true,
    signable: true, // the APPLICANT signs their part; the instructor signs off-platform
    build: (v) => ({
      text: {
        "Applicants Name": s(v.fullName),
        "Applicants Address": s(v.address),
        Age: s(v.age),
        "Birth Date": s(v.dob),
        "Type of License": "Carry Guard",
      },
      signatureField: "Applicants Signature",
    }),
  },

  // ── Company / Carry Guard application (SPN-01) — sponsor completes ──────────
  // 71 fields; we pre-fill the applicant identity we know and leave the rest for
  // the company to complete on the real form.
  nypd_company_application: {
    key: "nypd_company_application",
    file: "forms-company.pdf",
    officialTitle: "Pistol License Application — Company",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-company`,
    isFillable: true,
    build: (v) => ({
      text: {
        "Name of Applicant Last Name First Name MI": s(v.applicantName),
        "Date of Birth": s(v.dob),
        "Address Street City or Town Slate Zip Code": s(v.address),
      },
    }),
  },

  // ── Investigation-phase forms (Phase 4) — held; pre-prepared on request ─────
  nypd_employment_authorization: {
    key: "nypd_employment_authorization",
    file: "forms-auth-rel.pdf",
    officialTitle: "Authorization for Employment Release / Request for Employment Record",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-auth-rel`,
    isFillable: true,
    build: (v) => ({
      text: {
        Name: s(v.fullName),
        Address: s(v.address),
        "Date Of Birth": s(v.dob),
        "Social Security No": s(v.ssn),
      },
    }),
    ephemeral: ["ssn"],
  },
  nypd_hipaa_release: {
    key: "nypd_hipaa_release",
    file: "hippa-med.pdf",
    officialTitle: "H.I.P.P.A. Medical Release",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/hippa-med`,
    isFillable: true,
    build: (v) => ({
      text: { Name: s(v.fullName), Address: s(v.address), SS: s(v.ssn) },
    }),
    ephemeral: ["ssn"],
  },

  // ── Post-issuance / payment forms — held only (not packet items) ────────────
  nypd_change_address: {
    key: "nypd_change_address",
    file: "change-addr-employ.pdf",
    officialTitle: "Change of Address / Employment",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/change-addr-employ`,
    isFillable: false,
  },
  nypd_request_to_sell: {
    key: "nypd_request_to_sell",
    file: "forms-requesttosell.pdf",
    officialTitle: "Request to Sell",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-requesttosell`,
    isFillable: true,
  },
  nypd_credit_card_auth: {
    key: "nypd_credit_card_auth",
    file: "credit-card-auth.pdf",
    officialTitle: "Credit Card Authorization",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/credit-card-auth`,
    isFillable: true,
  },
  nypd_purchase_auth: {
    key: "nypd_purchase_auth",
    file: "purchase-auth.pdf",
    officialTitle: "Purchase Authorization",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/purchase-auth`,
    isFillable: false,
  },
}

export function formTemplate(key: string): FormTemplate | null {
  return FORM_TEMPLATES[key] ?? null
}
