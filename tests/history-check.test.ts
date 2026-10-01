/**
 * Carry Guard task 9 — the five-year history continuity guidance is soft (never blocks)
 * but must catch the things that generate a deficiency letter: missing dates, gaps,
 * overlaps, and a most-recent entry that doesn't run to the present.
 */
import { describe, expect, it } from "vitest"
import { checkHistory } from "@/lib/intake/history-check"

const NOW = new Date("2026-09-15T00:00:00Z") // fixed "today" for deterministic tests

describe("checkHistory", () => {
  it("a clean, gap-free history that runs to present raises nothing", () => {
    const rows = [
      { fromMonth: "2024-01", toMonth: "" }, // present
      { fromMonth: "2021-06", toMonth: "2023-12" },
      { fromMonth: "2019-01", toMonth: "2021-05" },
    ]
    expect(checkHistory(rows, "lived", NOW)).toEqual([])
  })

  it("ignores entirely blank rows (an unstarted row is not a defect)", () => {
    expect(checkHistory([{}, { fromMonth: "" }], "worked", NOW)).toEqual([])
  })

  it("flags a missing end date on an older row", () => {
    const rows = [
      { fromMonth: "2024-01", toMonth: "" },
      { fromMonth: "2021-06", toMonth: "" }, // older, no end → ambiguous
    ]
    const kinds = checkHistory(rows, "lived", NOW).map((n) => n.kind)
    expect(kinds).toContain("missing-dates")
  })

  it("flags a gap between two entries", () => {
    const rows = [
      { fromMonth: "2024-06", toMonth: "" },
      { fromMonth: "2019-01", toMonth: "2021-01" }, // gap Jan 2021 → Jun 2024
    ]
    const notices = checkHistory(rows, "worked", NOW)
    expect(notices.some((n) => n.kind === "gap")).toBe(true)
  })

  it("flags an overlap between two entries", () => {
    const rows = [
      { fromMonth: "2022-01", toMonth: "" },
      { fromMonth: "2020-01", toMonth: "2023-01" }, // overlaps into the newer row
    ]
    expect(checkHistory(rows, "lived", NOW).some((n) => n.kind === "overlap")).toBe(true)
  })

  it("asks the most-recent entry to run to the present when it ends in the past", () => {
    const rows = [{ fromMonth: "2021-01", toMonth: "2023-05" }]
    const notices = checkHistory(rows, "lived", NOW)
    expect(notices.some((n) => n.kind === "not-present")).toBe(true)
  })

  it("never returns a hard error shape — only guidance notices", () => {
    const rows = [{ fromMonth: "2021-06" }, { fromMonth: "2019-01", toMonth: "2020-01" }]
    for (const n of checkHistory(rows, "worked", NOW)) {
      expect(["missing-dates", "not-present", "gap", "overlap"]).toContain(n.kind)
      expect(typeof n.message).toBe("string")
    }
  })
})
