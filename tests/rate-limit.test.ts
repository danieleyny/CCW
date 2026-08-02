/**
 * SEC-05 — the rate limiter must not let one key's traffic reset another's
 * window, and must derive the client IP from a source the client can't spoof.
 */
import { describe, expect, it } from "vitest"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"

describe("rateLimit", () => {
  it("caps hits per key within the window", () => {
    const key = `unit:${process.hrtime.bigint()}`
    let allowed = 0
    for (let i = 0; i < 25; i++) if (rateLimit(key, 20)) allowed++
    expect(allowed).toBe(20)
  })

  it("one key hitting its cap does not affect a different key", () => {
    const a = `unit-a:${process.hrtime.bigint()}`
    const b = `unit-b:${process.hrtime.bigint()}`
    for (let i = 0; i < 30; i++) rateLimit(a, 5) // blow past a's cap
    // b is untouched and still has its full budget.
    let allowed = 0
    for (let i = 0; i < 5; i++) if (rateLimit(b, 5)) allowed++
    expect(allowed).toBe(5)
  })
})

describe("clientIpFrom (SEC-05 — spoof-resistant source)", () => {
  it("prefers x-real-ip over a client-supplied x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2", "x-real-ip": "9.9.9.9" })
    expect(clientIpFrom(h)).toBe("9.9.9.9")
  })

  it("falls back to the RIGHTMOST forwarded entry (proxy-appended), not the spoofable leftmost", () => {
    const h = new Headers({ "x-forwarded-for": "1.1.1.1, 8.8.8.8" })
    expect(clientIpFrom(h)).toBe("8.8.8.8")
  })

  it("returns 'unknown' with no headers", () => {
    expect(clientIpFrom(new Headers())).toBe("unknown")
  })
})
