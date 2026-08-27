/**
 * PART D · PR D2 — QUE-01 fills the OFFICIAL PD 643-041A addendum (not the facsimile).
 * The row slots hold the real NYPD question NUMBER; only "yes" answers appear.
 */
import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { fillTemplate } from "@/lib/forms/fill"

describe("Official 643-041A addendum fill", () => {
  it("keys row slots by NYPD question number and lists only the yes answers", async () => {
    const filled = await fillTemplate("nypd_disclosure_addendum", {
      q10: "no",
      q12: "yes",
      q12_explain: "Medication in 2019.",
      q23: "yes",
      q23_explain: "Dismissed 2015.",
    })
    expect(filled.missing).toEqual([])
    expect(filled.missingRequired).toEqual([])
    const form = (await PDFDocument.load(filled.bytes)).getForm()
    const get = (n: string) => form.getTextField(n).getText() ?? ""
    // Row 1 → question 12, row 2 → question 23 (in form order). No "no" rows.
    expect(get("q1")).toBe("12")
    expect(get("q1exp")).toContain("Medication")
    expect(get("q2")).toBe("23")
    expect(get("q2exp")).toContain("Dismissed")
    // A third row stays empty — only two yes answers.
    expect(get("q3")).toBe("")
    expect(get("q3exp")).toBe("")
  })

  it("an all-no answer set produces no rows (QUE-01 fires only on a yes anyway)", async () => {
    const filled = await fillTemplate("nypd_disclosure_addendum", { q10: "no", q11: "no" })
    const form = (await PDFDocument.load(filled.bytes)).getForm()
    expect(form.getTextField("q1").getText() ?? "").toBe("")
  })
})
