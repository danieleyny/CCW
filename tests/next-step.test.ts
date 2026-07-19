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
})
