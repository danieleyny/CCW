import { describe, expect, it } from "vitest"
import { GET } from "@/app/review/route"
import { GOOGLE_REVIEW_URL } from "@/lib/reviews"

describe("customer review shortcut", () => {
  it("redirects the branded URL to the verified Google Business Profile", () => {
    const response = GET()

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(GOOGLE_REVIEW_URL)
  })
})
