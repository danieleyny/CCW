/**
 * The portal home's "your next step" has to pick the thing that actually
 * matters, and it has to be honest when there's nothing to pick.
 */
import { describe, expect, it } from "vitest"
import { computeNextStep } from "@/lib/portal/next-step"
import type { ReqChecklistItem } from "@/components/portal/requirements-checklist"

const item = (reqCode: string, severity: string, status = "pending"): ReqChecklistItem => ({
  id: reqCode,
  reqCode,
  status,
  title: `${reqCode} title`,
  description: null,
  authority: null,
  severity,
  documentType: null,
  ladder: status === "satisfied" ? "approved" : "pending",
  reviewNote: null,
  reviewerKind: null,
  legalStatus: "enforced",
  legalCitation: null,
})

describe("computeNextStep", () => {
  it("sends an applicant back to intake before anything else", () => {
    const s = computeNextStep({
      items: [item("IDN-01", "critical")],
      intakeDone: false,
      stage: "lead",
    })
    expect(s.href).toBe("/portal/intake")
    expect(s.waiting).toBe(false)
  })

  it("picks the worst outstanding item, not the first one alphabetically", () => {
    const s = computeNextStep({
      items: [item("TRN-01", "watch"), item("DSC-01", "critical"), item("IDN-01", "high")],
      intakeDone: true,
      stage: "document_collection",
    })
    expect(s.title).toContain("written explanations")
  })

  it("leaves optional items for last — SOC-01 is enjoined, it can wait", () => {
    const s = computeNextStep({
      items: [item("SOC-01", "critical"), item("TRN-01", "watch")],
      intakeDone: true,
      stage: "document_collection",
    })
    expect(s.title).toContain("training certificate")
  })

  it("ignores system controls and not-applicable rows in both the pick and the count", () => {
    const s = computeNextStep({
      items: [item("FMT-01", "critical"), item("ELG-03", "critical"), item("MIL-01", "high", "na")],
      intakeDone: true,
      stage: "document_collection",
    })
    expect(s.waiting).toBe(true)
    expect(s.total).toBe(0)
  })

  it("says what's being waited on rather than an ambiguous all-clear", () => {
    const s = computeNextStep({
      items: [item("IDN-01", "high", "satisfied")],
      intakeDone: true,
      stage: "under_investigation",
    })
    expect(s.waiting).toBe(true)
    expect(s.done).toBe(1)
    expect(s.total).toBe(1)
    expect(s.detail.length).toBeGreaterThan(0)
  })

  // A rule a court has stopped can never be satisfied. Counting it left the
  // home page permanently one short of its own total — an applicant who had
  // genuinely finished still saw unfinished work. It is never the next step
  // and never part of the denominator.
  it("an enjoined requirement is neither the next step nor part of the total", () => {
    const enjoined: ReqChecklistItem = {
      ...item("SOC-01", "watch"),
      legalStatus: "enjoined_not_enforced",
      legalCitation: "Antonyuk v. James",
    }
    const s = computeNextStep({
      items: [item("IDN-01", "high", "satisfied"), enjoined],
      intakeDone: true,
      stage: "document_collection",
    })
    expect(s.total).toBe(1)
    expect(s.done).toBe(1)
    expect(s.waiting).toBe(true)
    expect(s.title).not.toContain("social")
  })

  it("a repealed requirement is excluded the same way", () => {
    const repealed: ReqChecklistItem = { ...item("OLD-01", "critical"), legalStatus: "repealed" }
    const s = computeNextStep({
      items: [item("IDN-01", "high", "satisfied"), repealed],
      intakeDone: true,
      stage: "document_collection",
    })
    // Without the guard this would surface as the next step — it's `critical`.
    expect(s.waiting).toBe(true)
    expect(s.total).toBe(1)
  })
})
