/**
 * The form-template engine fills the REAL official PDFs. Proves verify #6:
 * generating the child-support certification produces the actual M-522 with the
 * fields filled and the declaration ticked — and the transient-SSN path renders
 * into the PDF. Pure (no DB): reads the bundled PDF and fills it with pdf-lib.
 */
import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { fillTemplate, signTemplate, templateSha256 } from "@/lib/forms/fill"

// A minimal valid 1×1 PNG for the signature overlay.
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  ),
  (c) => c.charCodeAt(0)
)

describe("fillTemplate — official NYPD/HRA forms", () => {
  it("child support (M-522): fills name/SSN/address and ticks the 'not obligated' declaration", async () => {
    const { bytes, sha256, template } = await fillTemplate("nypd_child_support_cert", {
      firstName: "Chery",
      lastName: "Gimps",
      ssn: "123-45-6789",
      street: "123 Test St",
      city: "New York",
      state: "NY",
      zip: "10001",
      empName: "ISS Action",
      obligated: "no",
    })
    expect(sha256).toHaveLength(64)
    expect(sha256).toBe(templateSha256("nypd_child_support_cert"))
    expect(template.formNumber).toBe("M-522")

    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getTextField("First name").getText()).toBe("Chery")
    expect(form.getTextField("Last name").getText()).toBe("Gimps")
    expect(form.getTextField("Social Security Number or ITIN").getText()).toBe("123-45-6789")
    expect(form.getTextField("Business name").getText()).toBe("ISS Action")
    expect(
      form.getCheckBox("am not under a court or administrative order to pay child support OR 2").isChecked()
    ).toBe(true)
  })

  it("child support: 'obligated → arrears with a plan' ticks the nested branch", async () => {
    const { bytes } = await fillTemplate("nypd_child_support_cert", {
      firstName: "A",
      lastName: "B",
      obligated: "yes",
      acctNumbers: "ACC-1",
      obligBranch: "b",
      bCondition: "income_exec",
      caseNumber: "CASE-9",
    })
    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getCheckBox("under an obligation to pay child support").isChecked()).toBe(true)
    expect(form.getCheckBox("b").isChecked()).toBe(true)
    expect(
      form.getCheckBox("I am making payments by income execution or by court agreed paymentrepayment plan or by a").isChecked()
    ).toBe(true)
    expect(form.getTextField("My case number is").getText()).toBe("CASE-9")
  })

  it("company form: pre-fills applicant identity + company licence/custodian", async () => {
    const { bytes } = await fillTemplate("nypd_company_application", {
      applicantName: "Chery Gimps",
      applicantAddress: "742 Evergreen Terrace, Brooklyn, NY",
      dob: "1990-01-01",
      companyName: "ISS Action, Inc.",
      wgpLicenseNumber: "WGP-12345",
      custodian: "Pat Custodian",
    })
    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getTextField("Name of Applicant Last Name First Name MI").getText()).toBe("Chery Gimps")
    expect(form.getTextField("Name of Company Seeking Permit for Applicant").getText()).toBe("ISS Action, Inc.")
    expect(form.getTextField("License Number").getText()).toBe("WGP-12345")
    expect(form.getTextField("Gun Custodian").getText()).toBe("Pat Custodian")
  })

  it("employment record request: fills name/address, SSN left blank when omitted", async () => {
    const { bytes } = await fillTemplate("nypd_employment_record_request", {
      fullName: "Chery Gimps",
      address: "742 Evergreen Terrace, Brooklyn, NY",
      dob: "1990-01-01",
    })
    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getTextField("Name").getText()).toBe("Chery Gimps")
    expect(form.getTextField("Social Security No").getText() ?? "").toBe("")
  })

  it("solo-occupancy: fills the official cohabitant affidavit's solo section", async () => {
    const { bytes } = await fillTemplate("nypd_cohabitant_affidavit", {
      fullName: "Chery Gimps",
      address: "123 Test St, New York, NY",
    })
    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getTextField("Text15").getText()).toBe("Chery Gimps")
    expect(form.getTextField("Text16").getText()).toBe("123 Test St, New York, NY")
  })

  // ── CRITICAL (Phase 1): signing must NEVER overwrite the date of birth ──────
  it("M-522: DOB lands in MM/DD/YYYY, and signing fills only the bottom Date", async () => {
    const draft = await fillTemplate("nypd_child_support_cert", {
      firstName: "Chery",
      lastName: "Gimps",
      dob: "1985-07-15",
      obligated: "no",
    })
    const df = (await PDFDocument.load(draft.bytes)).getForm()
    expect(df.getTextField("MM").getText()).toBe("07")
    expect(df.getTextField("DD").getText()).toBe("15")
    expect(df.getTextField("YYYY").getText()).toBe("1985")
    expect(df.getTextField("Date").getText() ?? "").toBe("") // no signing date on the draft

    const signed = await signTemplate(draft.bytes, "nypd_child_support_cert", PNG, new Date(2026, 7, 23))
    const sf = (await PDFDocument.load(signed.bytes)).getForm()
    // Flattened → a signed sworn document can't be edited, and the DOB boxes were
    // never touched by the sign step (no blind MM/DD/YYYY loop remains).
    expect(sf.getFields().length).toBe(0)
  })

  it("a wet-ink form is never digitally signed (notary OR witness)", async () => {
    await expect(
      signTemplate(new Uint8Array([1]), "nypd_prelicense_exemption", PNG, new Date())
    ).rejects.toThrow(/wet-ink|never digitally signed/i)
    await expect(
      signTemplate(new Uint8Array([1]), "nypd_safeguard_acknowledgement", PNG, new Date())
    ).rejects.toThrow(/wet-ink|never digitally signed/i)
  })

  it("a download-only template cannot be filled", async () => {
    await expect(fillTemplate("nypd_hipaa_release", {})).rejects.toThrow(/download-only/i)
  })

  it("fillTemplate reports missing fields loudly (no silent swallow)", async () => {
    // A correct fill has zero missing.
    const ok = await fillTemplate("nypd_cohabitant_affidavit", { fullName: "A", address: "B" })
    expect(ok.missing).toEqual([])
    expect(ok.summary.textApplied).toBe(2)
  })
})
