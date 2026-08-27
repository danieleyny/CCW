/**
 * PART D · PR D1 — the hardened fill engine on the two official NYPD forms. Locks in
 * the manifest's trap-field mappings (mapped by POSITION, not name) and the "leave
 * the notary date blank" rule, so a rename can't silently mis-place a value.
 * (Visual correctness is confirmed separately by rasterising — this guards /V.)
 */
import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { fillTemplate } from "@/lib/forms/fill"
import { FIXTURES } from "@/lib/forms/validate"

async function fields(key: string) {
  const filled = await fillTemplate(key, FIXTURES[key][0])
  expect(filled.missing).toEqual([]) // every mapped field exists on the PDF
  const form = (await PDFDocument.load(filled.bytes)).getForm()
  const get = (n: string) => {
    try {
      return form.getTextField(n).getText() ?? ""
    } catch {
      return "<absent>"
    }
  }
  return { get, missingRequired: filled.missingRequired }
}

describe("Safeguard Acknowledgement — trap fields mapped by position", () => {
  it("Print Name is the LAST name, NY is the ZIP, Telephone Numbers is the HOME phone", async () => {
    const { get, missingRequired } = await fields("nypd_safeguard_acknowledgement")
    expect(get("Print Name")).toBe("Reyes") // trap: LAST-name box
    expect(get("First")).toBe("Dana")
    expect(get("NY")).toBe("10011") // trap: ZIP box (state pre-printed NY)
    expect(get("Telephone Numbers")).toBe("(212) 555-0142") // trap: HOME-phone box
    expect(get("Cell")).toBe("(212) 555-0143")
    expect(get("name_of_person_agreeing_to_safeguard_fireams")).toBe("Dana K Reyes")
    // Witness / date blocks are ink — never filled.
    expect(get("Witness name printed")).toBe("")
    expect(get("Date")).toBe("")
    expect(missingRequired).toEqual([])
  })
})

describe("Affidavit of Familiarity 5-33 — county only, notary dates by hand", () => {
  it("fills the venue county and leaves the sworn date blank (the 200_ trap)", async () => {
    const { get, missingRequired } = await fields("nypd_affidavit_familiarity")
    expect(get("CountyOf")).toBe("New York")
    expect(get("ThisDay")).toBe("")
    expect(get("Month")).toBe("")
    expect(get("YearDigit")).toBe("") // never "26" → the pre-printed 200_ can't hold 2026
    expect(missingRequired).toEqual([])
  })
})
