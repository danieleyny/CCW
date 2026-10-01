/**
 * P0-1 — the applicant's sponsor/consent page must NEVER treat a query error as
 * "no sponsorship" and silently redirect home. That bounce made granting consent
 * impossible in production, which made the whole sponsored filing impossible.
 */
import { describe, expect, it } from "vitest"
import { decideSponsorPage } from "@/lib/portal/sponsor-routing"

describe("decideSponsorPage", () => {
  it("surfaces a card on a query ERROR — never redirects", () => {
    // Even if rowCount reads 0 alongside the error, the error wins: null data on a
    // failed query is not proof there is no sponsorship.
    expect(decideSponsorPage({ hasError: true, rowCount: 0 })).toBe("error")
    expect(decideSponsorPage({ hasError: true, rowCount: 3 })).toBe("error")
  })

  it("redirects home ONLY on a clean, genuinely empty result", () => {
    expect(decideSponsorPage({ hasError: false, rowCount: 0 })).toBe("redirect")
  })

  it("renders the consent/who-can-see screen when a sponsorship exists", () => {
    expect(decideSponsorPage({ hasError: false, rowCount: 1 })).toBe("render")
    expect(decideSponsorPage({ hasError: false, rowCount: 2 })).toBe("render")
  })
})
