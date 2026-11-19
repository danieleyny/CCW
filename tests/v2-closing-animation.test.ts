import { describe, expect, it } from "vitest"
import { getV2ClosingFrame, V2_CELEBRATE, V2_CYCLE, V2_HOLD, V2_RESET, V2_TRAVEL } from "@/components/marketing/closing/closingPath"

describe("V2 closing animation loop", () => {
  it("travels to the call-to-action before celebrating", () => {
    expect(getV2ClosingFrame(0).head).toBe(0)
    expect(getV2ClosingFrame(V2_TRAVEL / 2).head).toBeGreaterThan(0.5)
    const arrival = getV2ClosingFrame(V2_TRAVEL)
    expect(arrival.head).toBe(1)
    expect(arrival.celebrating).toBe(true)
  })

  it("holds, fades, and then starts a fresh cycle", () => {
    const held = getV2ClosingFrame(V2_TRAVEL + V2_CELEBRATE + V2_HOLD - 0.01)
    expect(held.head).toBe(1)
    expect(held.pathAlpha).toBe(1)

    const fading = getV2ClosingFrame(V2_CYCLE - V2_RESET / 2)
    expect(fading.pathAlpha).toBeCloseTo(0.5)

    const restarted = getV2ClosingFrame(V2_CYCLE)
    expect(restarted.cycle).toBe(1)
    expect(restarted.head).toBe(0)
    expect(restarted.pathAlpha).toBe(1)
  })

  it("renders a calm completed route for reduced motion", () => {
    expect(getV2ClosingFrame(100, true)).toEqual({
      cycle: 0,
      localTime: V2_TRAVEL,
      head: 1,
      pathAlpha: 1,
      celebrating: false,
      celebrationTime: 0,
    })
  })
})
