/**
 * The next-step engine decides what a trainer sees first across a book of 20
 * cases, so getting the priority order wrong is the difference between a useful
 * dashboard and a list.
 */
import { describe, expect, it } from "vitest"
import { computeTrainerNextStep } from "@/lib/trainer/next-steps"
import type { TrainerRequirement } from "@/lib/trainer/queries"

const req = (over: Partial<TrainerRequirement>): TrainerRequirement => ({
  caseRequirementId: crypto.randomUUID(),
  reqCode: "IDN-01",
  title: "Photo ID",
  description: null,
  authority: null,
  severity: "high",
  blocking: true,
  status: "pending",
  documentId: null,
  documentType: "id",
  scope: "full",
  ...over,
})

describe("trainer next step", () => {
  it("their own review queue outranks chasing the applicant", () => {
    const s = computeTrainerNextStep([
      req({ documentId: "doc-1", title: "Photo ID" }),
      req({ reqCode: "RES-01", title: "Proof of residence" }),
    ])
    expect(s.owner).toBe("trainer")
    expect(s.reviewCount).toBe(1)
    expect(s.headline).toMatch(/1 item needs your review/)
  })

  it("names what the applicant still owes", () => {
    const s = computeTrainerNextStep([
      req({ reqCode: "RES-01", title: "Proof of residence" }),
      req({ reqCode: "TRN-01", title: "Training certificate" }),
    ])
    expect(s.owner).toBe("applicant")
    expect(s.detail).toContain("Proof of residence")
    expect(s.detail).toContain("Training certificate")
  })

  it("summarizes rather than listing twenty things", () => {
    const s = computeTrainerNextStep(
      Array.from({ length: 6 }, (_, i) => req({ reqCode: `X-0${i}`, title: `Item ${i}` }))
    )
    expect(s.detail).toMatch(/and 3 more/)
  })

  it("hands off once everything reviewable is done", () => {
    const s = computeTrainerNextStep([
      req({ status: "satisfied", documentId: "doc-1" }),
      req({ reqCode: "RES-01", status: "satisfied", documentId: "doc-2" }),
    ])
    expect(s.owner).toBe("handoff")
    expect(s.detail).toMatch(/Gun License NYC/)
  })

  it("ignores not-applicable items entirely", () => {
    const s = computeTrainerNextStep([
      req({ status: "satisfied", documentId: "doc-1" }),
      req({ reqCode: "MIL-01", status: "na" }),
    ])
    expect(s.owner).toBe("handoff")
  })

  it("counts a progress-only item as outstanding but never as reviewable", () => {
    // The trainer chases the reference letters; they never approve them.
    const s = computeTrainerNextStep([
      req({ status: "satisfied", documentId: "doc-1" }),
      req({ reqCode: "REF-01", title: "Four references", scope: "progress" }),
    ])
    expect(s.owner).toBe("applicant")
    expect(s.reviewCount).toBe(0)
    expect(s.outstanding).toContain("Four references")
  })
})
