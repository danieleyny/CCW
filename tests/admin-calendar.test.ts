import { describe, expect, it } from "vitest"
import { calendarModel } from "@/lib/admin/calendar-model"
import { formatDate, formatDateTime } from "@/lib/format"

describe("admin calendar model", () => {
  it("maps every known appointment and booking enum to its display label", () => {
    expect(calendarModel.eventType("consult")).toBe("Consult")
    expect(calendarModel.eventType("fingerprinting")).toBe("Fingerprinting")
    expect(calendarModel.eventType("nypd_interview")).toBe("NYPD interview")
    expect(calendarModel.eventType("classroom_16h")).toBe("Classroom")
    expect(calendarModel.eventType("live_fire_2h")).toBe("Range")
  })

  it("title-cases an unknown source value instead of mislabelling it Consult", () => {
    expect(calendarModel.eventType("document_drop_off")).toBe("Document Drop Off")
  })

  it("uses New York boundaries when UTC is already on the following day", () => {
    expect(calendarModel.dateKey("2026-11-19T03:30:00.000Z")).toBe("2026-11-18")
    expect(calendarModel.dateKey("2026-11-19T05:01:00.000Z")).toBe("2026-11-19")
  })

  it("converts New York wall-clock sessions through standard and daylight time", () => {
    expect(calendarModel.dateTime("2026-01-15", "09:00").toISOString()).toBe("2026-01-15T14:00:00.000Z")
    expect(calendarModel.dateTime("2026-07-15", "09:00").toISOString()).toBe("2026-07-15T13:00:00.000Z")
  })

  it("adds date-key days without drifting through DST", () => {
    expect(calendarModel.addDays("2026-03-07", 2)).toBe("2026-03-09")
  })
})

describe("shared display formatters", () => {
  it("renders dates and times in America/New_York", () => {
    expect(formatDate("2026-11-19T03:16:00.000Z")).toBe("Nov 18, 2026")
    expect(formatDateTime("2026-11-19T03:16:00.000Z")).toBe("Nov 18, 10:16 PM")
  })
})
