/**
 * The template/map validator, under the test suite — the machinery whose absence
 * let the DOB-overwrite bug ship. Fails loudly if any build() emits a field that
 * isn't on the real PDF, if isFillable lies, if signable+notarize collide, or if
 * two different files are byte-identical.
 */
import { describe, expect, it } from "vitest"
import { validateFormTemplates } from "@/lib/forms/validate"
import { FORM_TEMPLATES } from "@/lib/forms/templates"

describe("form template registry", () => {
  it("every field map resolves against the real PDF, across every branch", async () => {
    const r = await validateFormTemplates()
    expect(r.errors, r.errors.join("\n")).toEqual([])
  })

  it("no template declares both signable and notarize", () => {
    for (const t of Object.values(FORM_TEMPLATES)) {
      expect(t.signable && t.notarize, `${t.key}`).toBeFalsy()
    }
  })

  it("date-of-birth is application data (never a signing-date field)", () => {
    // The signing date only ever goes to dateField/dateSplit. On the M-522 those
    // are NOT the MM/DD/YYYY boxes — DOB is, written by build().
    const csc = FORM_TEMPLATES.nypd_child_support_cert
    expect(csc.dateField).toBe("Date")
    expect(csc.dateSplit).toBeUndefined()
  })
})
