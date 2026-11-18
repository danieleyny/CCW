import { describe, expect, it } from "vitest"
import { adminSearchPatterns, matchesAdminSearch } from "@/lib/admin/search"

const client = {
  fullName: "Pamela Test",
  email: "pamela@example.com",
  phone: "(917) 555-0142",
}

describe("admin case search", () => {
  it("matches names and email without regard to case", () => {
    expect(matchesAdminSearch(client, "PAMELA")).toBe(true)
    expect(matchesAdminSearch(client, "example.com")).toBe(true)
  })

  it("matches phone fragments regardless of formatting", () => {
    expect(matchesAdminSearch(client, "917 555")).toBe(true)
    expect(matchesAdminSearch(client, "(555)-0142")).toBe(true)
  })

  it("builds a tolerant database phone pattern for the command palette", () => {
    expect(adminSearchPatterns("917 555").phonePattern).toBe("%9%1%7%5%5%5%")
  })
})
