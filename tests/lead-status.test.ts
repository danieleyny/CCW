import { describe, expect, it } from "vitest"
import {
  interestedUnconvertedLead,
  INTERESTED_LEAD_LAST_STEP,
  INTERESTED_LEAD_NEXT_STEP,
} from "@/lib/admin/lead-status"

describe("high-intent lead call outcomes", () => {
  it("requires a completed call, expressed interest and no conversion", () => {
    expect(interestedUnconvertedLead({
      call_completed: true,
      expressed_interest: true,
      conversion_status: "not_signed_up",
    })).toBe(true)
    expect(interestedUnconvertedLead({
      call_completed: true,
      expressed_interest: false,
      conversion_status: "not_signed_up",
    })).toBe(false)
    expect(interestedUnconvertedLead(null)).toBe(false)
  })

  it("uses concise copy for the lead list", () => {
    expect(INTERESTED_LEAD_LAST_STEP).toBe("Intro call completed · interested")
    expect(INTERESTED_LEAD_NEXT_STEP).toBe("Complete enrollment/payment")
  })
})
