/**
 * PORTAL_QA_ROUND1 — the pure, deterministic checks for the twelve findings. DB-backed
 * flows (reference emailed-persistence, safeguard token upload) run in their own suites /
 * were verified in the browser; these lock the logic the findings turn on.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyPresentRadio, checkHistory } from "@/lib/intake/history-check"
import { FACTS } from "@/lib/facts/registry"
import { isKnownNyCounty, NY_COUNTIES } from "@/lib/ny-counties"
import { convertApplicantPhoto } from "@/lib/files/photo-convert"
import type { WizardAnswers } from "@/lib/intake/answers"

describe("finding 1 — Present is a radio, and overlaps name the two rows", () => {
  it("ticking Present on one row closes every other started row (only one open)", () => {
    const rows = [
      { fromMonth: "2024-01", toMonth: "" }, // open
      { fromMonth: "2020-01", toMonth: "" }, // also open — the bug
    ]
    const next = applyPresentRadio(rows, 0, "", new Date("2026-09-29"))
    expect(next[0].toMonth).toBe("") // the one you ticked stays open
    expect(next[1].toMonth).toBe("2026-09") // the other gets a concrete end
  })
  it("setting a real end month touches only that row", () => {
    const rows = [{ fromMonth: "2024-01", toMonth: "" }, { fromMonth: "2020-01", toMonth: "2023-12" }]
    const next = applyPresentRadio(rows, 0, "2025-06")
    expect(next[0].toMonth).toBe("2025-06")
    expect(next[1].toMonth).toBe("2023-12")
  })
  it("a blank (unstarted) row is left alone", () => {
    const rows = [{ fromMonth: "2024-01", toMonth: "" }, {}]
    const next = applyPresentRadio(rows, 0, "", new Date("2026-09-29"))
    expect(next[1].toMonth).toBeUndefined()
  })
  it("overlapping ranges warn and NAME the two rows; a gap still warns too", () => {
    const overlap = checkHistory(
      [
        { fromMonth: "2022-01", toMonth: "2024-06" },
        { fromMonth: "2023-01", toMonth: "2025-01" },
      ],
      "lived",
      new Date("2026-09-29")
    )
    const o = overlap.find((n) => n.kind === "overlap")
    expect(o).toBeTruthy()
    expect(o!.message).toMatch(/Row 1 and Row 2/)

    const gap = checkHistory(
      [
        { fromMonth: "2020-01", toMonth: "2021-01" },
        { fromMonth: "2024-01", toMonth: "" },
      ],
      "lived",
      new Date("2026-09-29")
    )
    expect(gap.some((n) => n.kind === "gap")).toBe(true)
  })
})

describe("finding 2 — employer.employed derives from intake for an UNSPONSORED case", () => {
  const employedFact = FACTS.find((f) => f.key === "employer.employed")!
  const src = (intake: Partial<WizardAnswers>) => ({
    intake: intake as WizardAnswers,
    client: { fullName: "Test", email: null, phone: null, borough: null, zip: null },
    sponsor: null,
  })

  it("a current (open) employment row ⇒ Yes, with NO sponsor (this failed before the fix)", () => {
    expect(employedFact.from!(src({ employmentHistory: [{ fromMonth: "2023-01", employerName: "Acme" }] }))).toBe("Yes")
  })
  it("a completed history with no current row ⇒ No", () => {
    expect(employedFact.from!(src({ employmentHistory: [{ fromMonth: "2019-01", toMonth: "2021-01", employerName: "Old Co" }] }))).toBe("No")
  })
  it("no history at all ⇒ still asked (undefined)", () => {
    expect(employedFact.from!(src({}))).toBeUndefined()
  })
  it("employer.name prefills from the current row when there's no sponsor/scalar", () => {
    const nameFact = FACTS.find((f) => f.key === "employer.name")!
    expect(nameFact.from!(src({ employmentHistory: [{ fromMonth: "2023-01", employerName: "Acme Corp" }] }))).toBe("Acme Corp")
  })
})

describe("finding 7 — NY county list", () => {
  it("has all 62 counties and recognises them case-insensitively", () => {
    expect(NY_COUNTIES.length).toBe(62)
    expect(isKnownNyCounty("Nassau")).toBe(true)
    expect(isKnownNyCounty("nassau")).toBe(true)
    expect(isKnownNyCounty("")).toBe(true) // blank is not flagged
  })
  it("flags a value outside the list (allowed, but confirmed) — never a NY county", () => {
    expect(isKnownNyCounty("Bergen")).toBe(false) // a NJ county
    expect(isKnownNyCounty("Nassauu")).toBe(false) // a typo
  })
})

describe("finding 8 — photo conversion fixes FORMAT + DIMENSIONS only", () => {
  it("converts a non-square PNG to a square 1200×1200 JPEG and records what changed", async () => {
    const sharp = (await import("sharp")).default
    const png = await sharp({ create: { width: 400, height: 700, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png().toBuffer()
    const out = await convertApplicantPhoto(png, "image/png")
    expect(out).toBeTruthy()
    expect(out!.contentType).toBe("image/jpeg")
    expect(out!.width).toBe(1200)
    expect(out!.height).toBe(1200)
    expect(out!.note).toMatch(/PNG → JPEG/)
    expect(out!.note).toMatch(/cropped to a square/)
  })
  it("returns null for a PDF (kept + flagged for a person, never silently 'converted')", async () => {
    const out = await convertApplicantPhoto(Buffer.from("%PDF-1.4 fake"), "application/pdf")
    expect(out).toBeNull()
  })
})

describe("finding 9 — no reference is EVER blocked on how long they've been known", () => {
  it("the references composition rule encodes no acquaintance-length threshold", () => {
    const src = readFileSync("lib/references/composition.ts", "utf8")
    expect(src).not.toMatch(/five[- ]year|5[- ]year|acquaint|knownDuration|known_duration/i)
  })
  it("the reference form copy states any length is fine (warn, never block)", () => {
    const src = readFileSync("components/portal/collectors.tsx", "utf8")
    expect(src).toMatch(/Any length is fine/i)
    // The five-year figure appears NOWHERE in the reference collector.
    expect(src).not.toMatch(/five[- ]?year|5[- ]?year/i)
  })
})
