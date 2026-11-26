import { describe, expect, it } from "vitest"
import {
  analyticsLocation,
  analyticsPageGroup,
  analyticsBrandForHost,
  isCanonicalAnalyticsHost,
  isStripeReferrer,
  shouldLoadAnalytics,
  shouldTrackPath,
} from "@/lib/analytics-config"

describe("analytics collection policy", () => {
  it("collects only on the canonical host", () => {
    expect(isCanonicalAnalyticsHost("gunlicensenyc.com")).toBe(true)
    expect(isCanonicalAnalyticsHost("www.gunlicensenyc.com")).toBe(true)
    expect(isCanonicalAnalyticsHost("app.firearmlicensenyc.com", "fl")).toBe(true)
    expect(isCanonicalAnalyticsHost("app.firearmlicensenyc.com", "gln")).toBe(false)
    expect(isCanonicalAnalyticsHost("ccw-redesign-preview.vercel.app")).toBe(false)
    expect(shouldLoadAnalytics("localhost", "/pricing")).toBe(false)
    expect(analyticsBrandForHost("app.firearmlicensenyc.com")).toBe("fl")
  })

  it("uses stable, low-cardinality page groups", () => {
    expect(analyticsPageGroup("/")).toBe("home")
    expect(analyticsPageGroup("/eligibility")).toBe("eligibility")
    expect(analyticsPageGroup("/portal/enroll")).toBe("portal_onboarding")
    expect(analyticsPageGroup("/guides/nyc-carry")).toBe("content")
  })

  it("keeps public acquisition steps and excludes private product traffic", () => {
    expect(shouldTrackPath("/pricing")).toBe(true)
    expect(shouldTrackPath("/auth/sign-up")).toBe(true)
    expect(shouldTrackPath("/portal/choose-path")).toBe(true)
    expect(shouldTrackPath("/portal/enroll")).toBe(true)
    expect(shouldTrackPath("/portal/concierge")).toBe(false)
    expect(shouldTrackPath("/admin/cases/opaque-id")).toBe(false)
    expect(shouldTrackPath("/r/private-token")).toBe(false)
    expect(shouldTrackPath("/visual-test")).toBe(false)
  })

  it("preserves attribution but removes sensitive and operational query values", () => {
    const clean = analyticsLocation(
      new URL(
        "https://gunlicensenyc.com/eligibility?utm_source=google&utm_campaign=carry&redirect=%2Fadmin&session_id=cs_secret&code=AVA250"
      )
    )
    expect(clean).toBe(
      "https://gunlicensenyc.com/eligibility?utm_source=google&utm_campaign=carry"
    )
  })

  it("recognizes Stripe-hosted return traffic", () => {
    expect(isStripeReferrer("https://checkout.stripe.com/c/pay/cs_test")).toBe(true)
    expect(isStripeReferrer("https://dashboard.stripe.com/test/payments")).toBe(true)
    expect(isStripeReferrer("https://google.com/")).toBe(false)
  })
})
