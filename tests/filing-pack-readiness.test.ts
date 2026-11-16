import { describe, expect, it } from "vitest"
import {
  computeFilingPackReadiness,
  requirementDestination,
  type FilingPackReadinessInput,
  type ReadinessUnit,
} from "@/lib/filing-pack/readiness"

const unit = (label: string, complete = false): ReadinessUnit => ({
  label,
  sub: "Required",
  href: `/target#${label.toLowerCase().replaceAll(" ", "-")}`,
  destination: "Target",
  complete,
})

const empty = (): FilingPackReadinessInput => ({
  details: [],
  documents: [],
  forms: [],
  people: [],
  history: [],
})

describe("computeFilingPackReadiness", () => {
  it("returns ready and 100% when every existing source is complete", () => {
    const input = empty()
    input.details = [unit("Legal name", true)]
    input.documents = [unit("Photo ID", true)]
    input.history = [unit("Residence history", true)]

    expect(computeFilingPackReadiness(input)).toEqual({ ready: true, groups: [], percentReady: 100 })
  })

  it("keeps a few outstanding items in approved group order", () => {
    const input = empty()
    input.details = [unit("Legal name", true), unit("Date of birth")]
    input.forms = [unit("Affirmation")]
    input.history = [unit("Residence history", true)]

    const result = computeFilingPackReadiness(input)
    expect(result.ready).toBe(false)
    expect(result.percentReady).toBe(50)
    expect(result.groups.map((group) => group.key)).toEqual(["details", "forms"])
    expect(result.groups.flatMap((group) => group.items).map((item) => item.label)).toEqual([
      "Date of birth",
      "Affirmation",
    ])
  })

  it("retains all 20+ outstanding items for the scrollable/grouped views", () => {
    const input = empty()
    input.details = Array.from({ length: 9 }, (_, index) => unit(`Detail ${index + 1}`))
    input.documents = Array.from({ length: 5 }, (_, index) => unit(`Document ${index + 1}`))
    input.forms = Array.from({ length: 4 }, (_, index) => unit(`Form ${index + 1}`))
    input.people = Array.from({ length: 4 }, (_, index) => unit(`Person ${index + 1}`))

    const result = computeFilingPackReadiness(input)
    expect(result.groups.flatMap((group) => group.items)).toHaveLength(22)
    expect(result.percentReady).toBe(0)
  })

  it("maps requirement links to the client's actual service surface", () => {
    expect(requirementDestination("self_guided", "IDN-01")).toBe("/portal/checklist#IDN-01")
    expect(requirementDestination("concierge", "IDN-01")).toBe("/portal/concierge#IDN-01")
  })
})
