import { describe, expect, it } from "vitest"
import { formatDate } from "@/lib/format"

describe("formatDate", () => {
  it("does not move a date-only database value to the previous local day", () => {
    expect(formatDate("2024-01-15")).toBe("Jan 15, 2024")
    expect(formatDate("2026-08-20")).toBe("Aug 20, 2026")
  })
})
