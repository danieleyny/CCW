import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { BookCall } from "@/components/portal/concierge/book-call"
import { buildCalendlyBookingUrl } from "@/lib/calendly"

describe("buildCalendlyBookingUrl", () => {
  it("preserves existing parameters and adds the case token", () => {
    const result = new URL(
      buildCalendlyBookingUrl("https://calendly.com/gunlicensenyc/intro?month=2026-12", "case token")
    )

    expect(result.searchParams.get("month")).toBe("2026-12")
    expect(result.searchParams.get("utm_content")).toBe("case token")
  })

  it("removes iframe-only parameters for the top-level booking page", () => {
    const result = new URL(
      buildCalendlyBookingUrl(
        "https://calendly.com/gunlicensenyc/intro?embed_domain=gunlicensenyc.com&embed_type=Inline&hide_event_type_details=1&hide_gdpr_banner=1",
        "opaque-token"
      )
    )

    expect(result.searchParams.get("utm_content")).toBe("opaque-token")
    expect(result.searchParams.has("embed_domain")).toBe(false)
    expect(result.searchParams.has("embed_type")).toBe(false)
    expect(result.searchParams.has("hide_event_type_details")).toBe(false)
    expect(result.searchParams.has("hide_gdpr_banner")).toBe(false)
  })

  it("renders a top-level booking link instead of an iframe", () => {
    const html = renderToStaticMarkup(
      BookCall({
        calendlyUrl: "https://calendly.com/gunlicensenyc/intro",
        introToken: "case-token",
        introCall: null,
      })
    )

    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain("utm_content=case-token")
    expect(html).not.toContain("<iframe")
  })
})
