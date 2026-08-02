/**
 * SEC-17 — the same-site redirect guard. `next`/`redirect` params must never be
 * able to steer the browser off-site.
 */
import { describe, expect, it } from "vitest"
import { safeInternalPath } from "@/lib/safe-redirect"

describe("safeInternalPath", () => {
  it("passes a normal internal path through", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard")
    expect(safeInternalPath("/admin/cases/123?tab=docs")).toBe("/admin/cases/123?tab=docs")
  })

  it("rejects protocol-relative and backslash tricks", () => {
    for (const evil of ["//evil.com", "/\\evil.com", "/\tevil"]) {
      expect(safeInternalPath(evil)).toBe("/dashboard")
    }
  })

  it("rejects absolute URLs and authority injection", () => {
    for (const evil of ["https://evil.com", "http://evil.com", "@evil.com", ".evil.com", "javascript:alert(1)"]) {
      expect(safeInternalPath(evil)).toBe("/dashboard")
    }
  })

  it("rejects CRLF header-injection and empty/non-string input", () => {
    expect(safeInternalPath("/foo\r\nSet-Cookie: x=1")).toBe("/dashboard")
    expect(safeInternalPath("")).toBe("/dashboard")
    expect(safeInternalPath(null)).toBe("/dashboard")
    expect(safeInternalPath(undefined)).toBe("/dashboard")
  })

  it("honors a custom fallback", () => {
    expect(safeInternalPath("//evil.com", "/auth/login")).toBe("/auth/login")
  })
})
