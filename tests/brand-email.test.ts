import { describe, expect, it } from "vitest"
import { BRANDS, STRIPE_ACCOUNT_DESCRIPTOR_PREFIX } from "@/config/brands"
import { renderEmail } from "@/lib/email/template"

describe("brand email rendering", () => {
  it("uses the owner-approved launch identity and commercial defaults", () => {
    expect(BRANDS.gln.legalName).toBe("Gun License NYC LLC")
    expect(BRANDS.fl.supportEmail).toBe("gunlicensenyc@gmail.com")
    expect(BRANDS.fl.contact.address).toBe(
      "214 West 102nd Street, Apt 4B, New York, NY"
    )
    expect(BRANDS.fl.stripeDescriptorSuffix).toBe("APPLICATION")
    expect(
      `${STRIPE_ACCOUNT_DESCRIPTOR_PREFIX}* ${BRANDS.fl.stripeDescriptorSuffix}`
    ).toBe("GUNLICNYC* APPLICATION")
    expect(BRANDS.fl.upgradeCreditMode).toBe("credit_paid")
  })

  it("renders Firearm License NYC without Gun License NYC leakage", () => {
    const result = renderEmail({
      brand: "fl",
      heading: "Continue your application",
      paragraphs: ["Your saved progress is ready."],
      cta: { label: "Open my account", url: `${BRANDS.fl.appOrigin}/portal` },
    })

    expect(result.html).toContain("Firearm License NYC")
    expect(result.html).toContain(BRANDS.fl.legalName)
    expect(result.html).toContain(BRANDS.fl.legalLinks.privacy)
    expect(result.html).toContain(BRANDS.fl.disclaimer)
    expect(result.html).not.toContain("Gun License NYC")
    expect(result.text).not.toContain("Gun License NYC")
  })

  it("keeps Gun License NYC identity on GLN mail", () => {
    const result = renderEmail({
      brand: "gln",
      heading: "Your case update",
      paragraphs: ["A new item is available."],
    })

    expect(result.html).toContain("Gun License NYC")
    expect(result.html).not.toContain("Firearm License NYC")
  })
})
