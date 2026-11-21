import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  INTERVIEW_DISCLAIMER,
  INTERVIEW_OVERVIEW,
  INTERVIEW_SECTIONS,
  PRACTICE_QUESTIONS,
} from "@/content/interview"

describe("reviewed interview preparation content", () => {
  it("matches the approved content snapshot", () => {
    const content = {
      INTERVIEW_OVERVIEW,
      INTERVIEW_SECTIONS,
      PRACTICE_QUESTIONS,
      INTERVIEW_DISCLAIMER,
    }

    expect(createHash("sha256").update(JSON.stringify(content)).digest("hex")).toBe(
      "2027aa97fb4feb37b0be495b685a4652604622f6ae9fcb01420b655238566913",
    )
  })

  it("contains each approved section and practice item once", () => {
    expect(new Set(INTERVIEW_SECTIONS.map((section) => section.title)).size).toBe(INTERVIEW_SECTIONS.length)
    expect(new Set(PRACTICE_QUESTIONS.map((question) => question.q)).size).toBe(PRACTICE_QUESTIONS.length)
  })
})
