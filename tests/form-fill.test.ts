/**
 * The form-template engine fills the REAL official PDFs. Proves verify #6:
 * generating the child-support certification produces the actual M-522 with the
 * fields filled and the declaration ticked — and the transient-SSN path renders
 * into the PDF. Pure (no DB): reads the bundled PDF and fills it with pdf-lib.
 */
import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { fillTemplate, templateSha256 } from "@/lib/forms/fill"

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

  it("solo-occupancy: fills the official cohabitant affidavit's solo section", async () => {
    const { bytes } = await fillTemplate("nypd_cohabitant_affidavit", {
      fullName: "Chery Gimps",
      address: "123 Test St, New York, NY",
    })
    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getTextField("Text15").getText()).toBe("Chery Gimps")
    expect(form.getTextField("Text16").getText()).toBe("123 Test St, New York, NY")
  })
})
