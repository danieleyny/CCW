import { describe, expect, it } from "vitest"
import { brandOrigin, brandUrl } from "@/lib/brand/origin"

describe("brand origins", () => {
  it("uses fixed brand origins in production", () => {
    expect(brandOrigin("gln", { vercelEnv: "production" })).toBe("https://gunlicensenyc.com")
    expect(brandOrigin("fl", { vercelEnv: "production" })).toBe(
      "https://app.firearmlicensenyc.com"
    )
  })

  it("keeps preview links on the active preview origin", () => {
    expect(
      brandUrl("fl", "/portal", {
        vercelEnv: "preview",
        currentOrigin: "https://preview.example/",
      })
    ).toBe("https://preview.example/portal")
  })

  it("builds normalized absolute production links", () => {
    expect(brandUrl("fl", "auth/login", { vercelEnv: "production" })).toBe(
      "https://app.firearmlicensenyc.com/auth/login"
    )
  })
})
