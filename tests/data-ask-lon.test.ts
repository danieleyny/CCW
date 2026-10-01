/**
 * Carry Guard — the concierge "written statements" data-ask must count the RIGHT number
 * of Letter-of-Necessity statements for the case's track. It used to hardcode
 * ["lop3","lop6"] / total 2, so a Carry Guard applicant (who owes five) saw the ask read
 * "complete" while three statements were still missing. Both the key list and the total
 * are now derived from portalStep12StatementsFor(licenseTrack).
 */
import { describe, expect, it, vi } from "vitest"

// The facts layer is DB-backed and irrelevant to the LON count — stub it so buildDataAsks
// runs from a plain admin stub.
vi.mock("@/lib/facts/resolve", () => ({ resolveFacts: async () => ({}) }))
vi.mock("@/lib/facts/ssn", () => ({ hasCaseSsn: async () => false }))
vi.mock("@/lib/facts/details-view", () => ({
  buildFactGroups: () => ({ groups: [] }),
  detailsMeter: () => ({ captured: 0, total: 0 }),
}))

import { buildDataAsks } from "@/lib/concierge/data-asks"

/** Routes reads by table: `cases` → the track, everything else empty (no sponsorship). */
function fakeAdmin(licenseTrack: string | null) {
  let table = ""
  const maybeSingle = async () => ({
    data:
      table === "cases"
        ? { license_track: licenseTrack, is_renewal: false }
        : table === "intake_sessions"
          ? { answers: {} }
          : null, // case_sponsorships → unsponsored
  })
  const eqChain = {
    maybeSingle,
    in: async () => ({ data: [] }),
    // case_sponsorships: .is("revoked_at", null).limit(1).maybeSingle()
    is: () => ({ limit: () => ({ maybeSingle }) }),
  }
  return {
    from: (t: string) => {
      table = t
      return { select: () => ({ eq: () => eqChain }) }
    },
  } as never
}

describe("LON data-ask total is derived from the track", () => {
  it("a carry_guard case reports a total of 5 written statements", async () => {
    const asks = await buildDataAsks(fakeAdmin("carry_guard"), "case-1")
    expect(asks.find((a) => a.key === "lon")?.total).toBe(5)
  })

  it("a concealed-carry case reports three", async () => {
    const asks = await buildDataAsks(fakeAdmin("concealed_carry"), "case-1")
    expect(asks.find((a) => a.key === "lon")?.total).toBe(3)
  })
})
