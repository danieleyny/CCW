import { describe, it, expect } from "vitest"
import { pickUnansweredNudges } from "@/lib/reminders/engine"

// Two engagements; profiles for direction resolution.
const CLIENT_A = "client-a"
const INSTR_A = "instr-a"
const CLIENT_B = "client-b"
const INSTR_B = "instr-b"

const roleOf = (engId: string, senderId: string | null): "client" | "instructor" | null => {
  if (engId === "eng-a") {
    if (senderId === CLIENT_A) return "client"
    if (senderId === INSTR_A) return "instructor"
  }
  if (engId === "eng-b") {
    if (senderId === CLIENT_B) return "client"
    if (senderId === INSTR_B) return "instructor"
  }
  return null
}

describe("pickUnansweredNudges", () => {
  it("nudges the recipient (the party who didn't send)", () => {
    const out = pickUnansweredNudges(
      [{ id: "m1", engagement_id: "eng-a", sender_id: CLIENT_A }],
      roleOf
    )
    // A client's message → nudge the instructor.
    expect(out).toEqual([{ engagementId: "eng-a", messageId: "m1", recipient: "instructor" }])
  })

  it("keeps only the OLDEST unread per (engagement, direction)", () => {
    const out = pickUnansweredNudges(
      [
        { id: "m1", engagement_id: "eng-a", sender_id: CLIENT_A }, // oldest, → instructor
        { id: "m2", engagement_id: "eng-a", sender_id: CLIENT_A }, // newer, same direction → dropped
      ],
      roleOf
    )
    expect(out).toEqual([{ engagementId: "eng-a", messageId: "m1", recipient: "instructor" }])
  })

  it("nudges both directions when each party has an unanswered message", () => {
    const out = pickUnansweredNudges(
      [
        { id: "m1", engagement_id: "eng-a", sender_id: CLIENT_A }, // → instructor
        { id: "m2", engagement_id: "eng-a", sender_id: INSTR_A }, // → client
      ],
      roleOf
    )
    expect(out).toContainEqual({ engagementId: "eng-a", messageId: "m1", recipient: "instructor" })
    expect(out).toContainEqual({ engagementId: "eng-a", messageId: "m2", recipient: "client" })
    expect(out).toHaveLength(2)
  })

  it("separates engagements", () => {
    const out = pickUnansweredNudges(
      [
        { id: "m1", engagement_id: "eng-a", sender_id: CLIENT_A },
        { id: "m2", engagement_id: "eng-b", sender_id: INSTR_B },
      ],
      roleOf
    )
    expect(out).toHaveLength(2)
    expect(out).toContainEqual({ engagementId: "eng-a", messageId: "m1", recipient: "instructor" })
    expect(out).toContainEqual({ engagementId: "eng-b", messageId: "m2", recipient: "client" })
  })

  it("skips messages whose sender resolves to no role (e.g. staff) and null engagements", () => {
    const out = pickUnansweredNudges(
      [
        { id: "m1", engagement_id: "eng-a", sender_id: "someone-else" },
        { id: "m2", engagement_id: null, sender_id: CLIENT_A },
      ],
      roleOf
    )
    expect(out).toEqual([])
  })
})
