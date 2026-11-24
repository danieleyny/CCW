import { describe, expect, it } from "vitest"
import { resolveBrandFromHost } from "@/lib/brand/resolve"

describe("resolveBrandFromHost", () => {
  it("fails closed to GLN while the feature is disabled", () => {
    expect(resolveBrandFromHost("app.firearmlicensenyc.com", { enabled: false })).toBe("gln")
  })

  it.each([
    "app.firearmlicensenyc.com",
    "APP.FIREARMLICENSENYC.COM",
    "app.firearmlicensenyc.com:443",
    "fl.localhost",
    "fl.localhost:3000",
  ])("resolves the exact FL application host %s", (host) => {
    expect(resolveBrandFromHost(host, { enabled: true })).toBe("fl")
  })

  it.each([
    "firearmlicensenyc.com",
    "www.firearmlicensenyc.com",
    "gunlicensenyc.com",
    "ccw-redesign-preview.vercel.app",
    "evil-app.firearmlicensenyc.com",
    null,
  ])("does not infer FL from an unapproved host %s", (host) => {
    expect(resolveBrandFromHost(host, { enabled: true })).toBe("gln")
  })

  it("accepts the preview override outside production", () => {
    expect(
      resolveBrandFromHost("preview.vercel.app", {
        enabled: true,
        vercelEnv: "preview",
        override: "fl",
      })
    ).toBe("fl")
  })

  it("ignores the preview override in production", () => {
    expect(
      resolveBrandFromHost("gunlicensenyc.com", {
        enabled: true,
        vercelEnv: "production",
        override: "fl",
      })
    ).toBe("gln")
  })
})
