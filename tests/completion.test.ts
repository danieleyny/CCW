import { describe, expect, it } from "vitest"
import { computeCompletion } from "@/lib/portal/completion"
import type { WorksheetSection } from "@/lib/disclosures/worksheet-portal"
import type { PortalSlotView, HeldItem } from "@/lib/portal/application-tab"

const section = (no: number, fields: WorksheetSection["fields"]): WorksheetSection => ({ no, title: `Step ${no}`, kind: "fields", fields })
const slot = (over: Partial<PortalSlotView>): PortalSlotView => ({
  portalLabel: "Photo ID", reqCode: "IDN-01", starred: true, imageOnly: false, isCatchAll: false,
  state: "missing", fileName: null, documentId: null, rejectionNote: null, sharedFromLabel: null, ...over,
})
const held = (over: Partial<HeldItem>): HeldItem => ({
  reqCode: "REL-01", title: "Notarized release", destination: "interview", state: "missing",
  fileName: null, documentId: null, rejectionNote: null, notarizedRequired: true, notarized: false, ...over,
})

describe("completion metrics — the counting rules", () => {
  it("done ≤ total in every bucket, and pct tracks overall", () => {
    const m = computeCompletion({
      sections: [section(1, [{ label: "First name", value: "Jo", missing: false }, { label: "Last name", value: "", missing: true }])],
      slots: [slot({ state: "accepted" })],
      held: [held({ state: "missing" })],
      signedRecord: { reqCode: "DSC-01", satisfied: true },
    })
    for (const b of [m.portal, m.interview]) expect(b.done).toBeLessThanOrEqual(b.total)
    expect(m.overall.done).toBeLessThanOrEqual(m.overall.total)
    expect(m.overall.pct).toBe(Math.round((m.overall.done / m.overall.total) * 100))
  })

  it("excludes not-applicable and optional-blank fields from the denominator", () => {
    const m = computeCompletion({
      sections: [section(8, [
        { label: "Q1", value: "No", missing: false },
        { label: "Q6", value: "Not applicable — only if Q5 is Yes", missing: false, notApplicable: true },
        { label: "Middle initial", value: "", missing: false }, // optional blank
      ])],
      slots: [],
      held: [],
      signedRecord: null,
    })
    // Only Q1 counts.
    expect(m.portal.total).toBe(1)
    expect(m.portal.done).toBe(1)
  })

  it("'submitted, awaiting review' is NOT counted as done", () => {
    const m = computeCompletion({ sections: [], slots: [slot({ state: "submitted" })], held: [], signedRecord: null })
    expect(m.portal.done).toBe(0)
    expect(m.portal.submitted).toBe(1)
    expect(m.portal.total).toBe(1)
    // Not in the outstanding list (that's client-owed missing/rejected only).
    expect(m.portal.outstanding).toHaveLength(0)
  })

  it("a rejected document is outstanding and carries its reason", () => {
    const m = computeCompletion({ sections: [], slots: [slot({ state: "rejected", rejectionNote: "Blurry" })], held: [], signedRecord: null })
    expect(m.portal.done).toBe(0)
    expect(m.portal.outstanding).toEqual([{ key: "r:IDN-01", label: "Photo ID", state: "rejected", note: "Blurry", anchor: "step-13" }])
  })

  it("satisfied-then-rejected moves the count backwards", () => {
    const ok = computeCompletion({ sections: [], slots: [slot({ state: "accepted" })], held: [], signedRecord: null })
    expect(ok.portal.done).toBe(1)
    const back = computeCompletion({ sections: [], slots: [slot({ state: "rejected" })], held: [], signedRecord: null })
    expect(back.portal.done).toBe(0)
  })

  it("overall is the UNION, deduplicated — an item in both piles counts once", () => {
    // DSC-01 is the portal signed record AND an interview deliverable.
    const m = computeCompletion({
      sections: [],
      slots: [],
      held: [held({ reqCode: "DSC-01", title: "Disclosure questionnaire", state: "accepted" })],
      signedRecord: { reqCode: "DSC-01", satisfied: true },
    })
    expect(m.portal.total).toBe(1) // signed record
    expect(m.interview.total).toBe(1) // DSC-01 held
    // Union dedups DSC-01 → 1, not 2.
    expect(m.overall.total).toBe(1)
    expect(m.overall.total).toBeLessThan(m.portal.total + m.interview.total)
    expect(m.overall.done).toBe(1)
  })

  it("the catch-all and unstarred slots are excluded from the portal count", () => {
    const m = computeCompletion({
      sections: [],
      slots: [slot({ portalLabel: "Additional Documents", reqCode: null, starred: false, isCatchAll: true, state: "missing" }), slot({ portalLabel: "Training Documents", reqCode: "TRN-01", starred: false, state: "missing" })],
      held: [],
      signedRecord: null,
    })
    expect(m.portal.total).toBe(0)
  })
})
