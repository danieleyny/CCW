import { describe, expect, it } from "vitest"
import { packagesForBrand, PUBLIC_PACKAGE_FALLBACK } from "@/lib/packages"

describe("brand package ownership", () => {
  it("sells Full Concierge only on GLN", () => {
    expect(packagesForBrand(PUBLIC_PACKAGE_FALLBACK, "gln").map((pkg) => pkg.key)).toEqual(["full_concierge"])
  })

  it("sells Self-Guided only on FL", () => {
    expect(packagesForBrand(PUBLIC_PACKAGE_FALLBACK, "fl").map((pkg) => pkg.key)).toEqual(["self_guided"])
  })

  it("requires database and registry ownership to agree", () => {
    const incorrectlyTagged = PUBLIC_PACKAGE_FALLBACK.map((pkg) => ({
      ...pkg,
      soldBy: ["gln", "fl"] as ("gln" | "fl")[],
    }))
    expect(packagesForBrand(incorrectlyTagged, "gln").map((pkg) => pkg.key)).toEqual(["full_concierge"])
    expect(packagesForBrand(incorrectlyTagged, "fl").map((pkg) => pkg.key)).toEqual(["self_guided"])
  })
})
