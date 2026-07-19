/**
 * PART B / Phase 5 — RON must ship OFF and fail closed. These guard the two
 * things that matter: it can't be "live" without an explicit counsel-confirmed
 * provider, and it never claims notarization on its own.
 */
import { afterEach, describe, expect, it } from "vitest"
import { ronStatus, isRonLive } from "@/lib/notarization/ron"

const KEYS = ["RON_ENABLED", "RON_PROVIDER", "RON_PROVIDER_API_KEY", "RON_PROVIDER_NY_CONFIRMED"]

afterEach(() => {
  for (const k of KEYS) delete process.env[k]
})

describe("RON notarization gating", () => {
  it("is disabled by default", () => {
    expect(ronStatus()).toBe("disabled")
    expect(isRonLive()).toBe(false)
  })

  it("the flag alone does not enable it", () => {
    process.env.RON_ENABLED = "true"
    expect(ronStatus()).toBe("disabled")
  })

  it("a configured provider without counsel confirmation is only pending, never live", () => {
    process.env.RON_ENABLED = "true"
    process.env.RON_PROVIDER = "proof"
    process.env.RON_PROVIDER_API_KEY = "test-key"
    expect(ronStatus()).toBe("pending_legal")
    expect(isRonLive()).toBe(false)
  })

  it("only the explicit NY-confirmed flag makes it live", () => {
    process.env.RON_ENABLED = "true"
    process.env.RON_PROVIDER = "proof"
    process.env.RON_PROVIDER_API_KEY = "test-key"
    process.env.RON_PROVIDER_NY_CONFIRMED = "true"
    expect(ronStatus()).toBe("live")
    // ...but there's still no adapter, so nothing can actually run — fail closed.
  })
})
