/**
 * CONCIERGE Phase 3 — the vault ask list. Pure logic over the real requirement
 * registry: only "obtain"-mode document requirements surface, the ID family
 * collapses to one card (so the applicant is never asked for the same document
 * twice), N/A items drop, and the core asks lead in a sensible order.
 */
import { describe, expect, it } from "vitest"
import { buildVaultItems } from "@/lib/concierge/vault"
import type { ReqChecklistItem } from "@/components/portal/requirements-checklist"

function item(reqCode: string, status = "pending"): ReqChecklistItem {
  return {
    id: `id-${reqCode}`,
    reqCode,
    status,
    title: reqCode,
    description: null,
    authority: null,
    severity: "high",
    documentType: null,
    ladder: "todo" as ReqChecklistItem["ladder"],
    reviewNote: null,
    reviewerKind: null,
    legalStatus: "enforced",
    legalCitation: null,
  }
}

describe("buildVaultItems", () => {
  it("collapses the ID family when IDN-01 is present", () => {
    const items = [item("IDN-01"), item("IDN-02"), item("IDN-03"), item("RES-01")]
    const vault = buildVaultItems(items, {})
    const codes = vault.map((v) => v.reqCode)
    expect(codes).toContain("IDN-01")
    expect(codes).not.toContain("IDN-02")
    expect(codes).not.toContain("IDN-03")
    expect(codes).toContain("RES-01")
  })

  it("keeps IDN-02 when IDN-01 is NOT on the case", () => {
    const vault = buildVaultItems([item("IDN-02"), item("RES-01")], {})
    expect(vault.map((v) => v.reqCode)).toContain("IDN-02")
  })

  it("excludes non-upload and N/A requirements", () => {
    // ELG-01 is an attest/eligibility item (no document upload); a N/A RES-01 drops.
    const vault = buildVaultItems([item("ELG-01"), item("RES-01", "na")], {})
    expect(vault).toHaveLength(0)
  })

  it("leads with the core asks in order and carries smart kinds", () => {
    const vault = buildVaultItems([item("RES-01"), item("IDN-01")], {})
    expect(vault[0].reqCode).toBe("IDN-01")
    expect(vault[0].smartKinds.length).toBeGreaterThan(0)
    expect(vault[1].reqCode).toBe("RES-01")
  })
})
