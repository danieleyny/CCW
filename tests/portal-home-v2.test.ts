import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { CASE_STAGES, CLIENT_PHASES, clientPhaseIndex } from "@/config/stages"

describe("V2 portal home", () => {
  it("maps every operational stage to exactly one client phase", () => {
    const grouped = CLIENT_PHASES.flatMap((phase) => phase.stages)
    expect(grouped).toHaveLength(CASE_STAGES.length)
    expect(new Set(grouped).size).toBe(CASE_STAGES.length)
    expect(new Set(grouped)).toEqual(new Set(CASE_STAGES.map((stage) => stage.key)))

    for (const stage of CASE_STAGES) {
      const phase = CLIENT_PHASES[clientPhaseIndex(stage.key)]
      expect(phase.stages).toContain(stage.key)
    }
  })

  it("keeps all thirteen stages in the approved five-phase order", () => {
    expect(CLIENT_PHASES.map((phase) => phase.key)).toEqual([
      "get_started",
      "training",
      "documents",
      "nypd_review",
      "decision",
    ])
    expect(CLIENT_PHASES[3].stages).toEqual([
      "filed",
      "fingerprinting_booked",
      "under_investigation",
    ])
  })

  it("removes the old competing home-page banners and reticle", () => {
    const source = readFileSync("app/portal/page.tsx", "utf8")
    expect(source).not.toContain("ReticleProgress")
    expect(source).not.toContain("HudCard")
    expect(source).not.toContain("Application intake — build your personalized document set")
    expect(source).not.toContain("Documents we prepared for you — download & sign")
  })

  it("does not claim that the company files an applicant's NYPD application", () => {
    const source = [
      readFileSync("app/portal/page.tsx", "utf8"),
      readFileSync("lib/i18n/messages.ts", "utf8"),
    ].join("\n")
    expect(source).not.toMatch(/we file for you/i)
  })
})
