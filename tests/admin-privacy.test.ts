import { describe, expect, it, vi } from "vitest"
import { PRIVACY_RESPONSE_DAYS } from "@/config/service-targets"
import { privacySteps, privacyTiming } from "@/lib/admin/privacy-model"
import {
  ERASURE_DELETE_TABLES,
  ERASURE_MINIMIZE_TABLES,
  ERASURE_SURFACE_LABELS,
  previewErasure,
} from "@/lib/privacy/erase"

describe("admin privacy model", () => {
  it("uses the owner-approved 30-day target and ET calendar days", () => {
    expect(PRIVACY_RESPONSE_DAYS).toBe(30)
    const timing = privacyTiming("2026-10-31T03:30:00.000Z", new Date("2026-11-02T04:30:00.000Z"))
    expect(timing.days).toBe(2)
    expect(timing.due).toBe(28)
    expect(timing.label).toBe("2 days · due in 28")
  })

  it("marks requests late in text as well as color", () => {
    const timing = privacyTiming("2026-09-01T16:00:00.000Z", new Date("2026-10-05T16:00:00.000Z"))
    expect(timing.late).toBe(true)
    expect(timing.tone).toBe("red")
    expect(timing.label).toContain("days late")
  })

  it("does not expose mark-done progress before acknowledgment", () => {
    expect(privacySteps("access", "open").filter((step) => step.complete)).toHaveLength(0)
    expect(privacySteps("access", "acknowledged").filter((step) => step.complete)).toHaveLength(1)
    expect(privacySteps("deletion", "fulfilled").every((step) => step.complete)).toBe(true)
  })
})

describe("erasure preview", () => {
  it("has a friendly label for every erased and minimized table", () => {
    const missing = [...ERASURE_DELETE_TABLES, ...ERASURE_MINIMIZE_TABLES].filter((table) => !(table in ERASURE_SURFACE_LABELS))
    expect(missing).toEqual([])
  })

  it("counts the exact erasure scope without performing writes", async () => {
    const write = vi.fn(() => { throw new Error("preview attempted a write") })
    const from = vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: table === "documents"
            ? [{ id: "d1", file_path: "one.pdf" }, { id: "d2", file_path: null }]
            : [{ id: `${table}-1` }],
          error: null,
        })),
      })),
      insert: write,
      update: write,
      delete: write,
    }))

    const preview = await previewErasure({ from } as never, "00000000-0000-4000-8000-000000000001")

    expect(from.mock.calls.map(([table]) => table)).toEqual([...ERASURE_DELETE_TABLES, ...ERASURE_MINIMIZE_TABLES])
    expect(preview.erase.documents).toBe(2)
    expect(preview.files).toBe(1)
    expect(preview.minimize.signature_events).toBe(1)
    expect(write).not.toHaveBeenCalled()
  })
})
