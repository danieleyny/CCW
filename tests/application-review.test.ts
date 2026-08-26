/**
 * CONCIERGE UX Phase 3 — the read-only application review. Groups the whole
 * application, says WHO HAS IT, and links a genuinely-theirs item back into the
 * vault — never actionable in place. Grouping is applicantGroup, independent of
 * concierge_scope.
 */
import { describe, expect, it } from "vitest"
import { buildApplicationReview } from "@/lib/concierge/application-review"
import { sectionFor } from "@/lib/requirements/sections"
import type { RequirementView } from "@/lib/portal/requirement-view"

function item(reqCode: string, status = "pending") {
  return { reqCode, status, title: reqCode } as RequirementView["items"][number]
}

function view(partial: Partial<RequirementView>): RequirementView {
  return {
    items: [],
    currentByReq: {},
    generated: {},
    referenceProgress: null,
    cohabitantProgress: null,
    ...partial,
  } as unknown as RequirementView
}

describe("the shared section taxonomy drives the review", () => {
  it("maps req codes to registry sections", () => {
    expect(sectionFor("IDN-01")).toBe("identity")
    expect(sectionFor("RES-01")).toBe("residence")
    expect(sectionFor("TRN-01")).toBe("training")
    expect(sectionFor("DSC-01")).toBe("prepared")
    expect(sectionFor("REF-01")).toBe("people")
    expect(sectionFor("SPN-01")).toBe("sponsor")
    expect(sectionFor("FEE-01")).toBe("admin") // hidden
  })
})

describe("buildApplicationReview", () => {
  it("groups rows by section, in registry order, dropping empty groups", () => {
    const groups = buildApplicationReview(view({ items: [item("TRN-01"), item("IDN-01")] }), {})
    // identity comes before training in the fixed section order, regardless of input order.
    expect(groups.map((g) => g.key)).toEqual(["identity", "training"])
  })

  it("an outstanding document is theirs to do → 'You' + a per-item link into the vault", () => {
    const [g] = buildApplicationReview(view({ items: [item("RES-01")] }), {})
    const row = g.rows[0]
    expect(row.whoHasIt).toBe("You")
    expect(row.actionHref).toBe("/portal/concierge#RES-01") // deep-links to THIS card, not the whole vault
    expect(row.tone).toBe("todo")
  })

  it("a received document sits with the concierge, no action for the applicant", () => {
    const v = view({ items: [item("RES-01")], currentByReq: { "RES-01": { status: "pending" } as never } })
    const row = buildApplicationReview(v, {})[0].rows[0]
    expect(row.whoHasIt).toBe("Your concierge")
    expect(row.actionHref).toBeNull()
  })

  it("the collapsed ID family points at the photo-ID card, not its own", () => {
    // IDN-02/03 are covered by the IDN-01 vault card, so their Go targets IDN-01.
    const rows = buildApplicationReview(view({ items: [item("IDN-02"), item("IDN-03")] }), {}).flatMap((g) => g.rows)
    for (const r of rows) expect(r.actionHref).toBe("/portal/concierge#IDN-01")
  })

  it("admin / system-verified items are hidden from the review entirely", () => {
    const groups = buildApplicationReview(view({ items: [item("ELG-01"), item("FEE-01"), item("FMT-01")] }), {})
    expect(groups).toEqual([]) // the whole 'admin' section is hidden
  })

  it("names the sponsor section from the company", () => {
    const groups = buildApplicationReview(view({ items: [item("SPN-01")] }), {}, "ISS Action")
    expect(groups[0].key).toBe("sponsor")
    expect(groups[0].label).toBe("From ISS Action")
  })

  it("references belong to the references, shown as progress", () => {
    const v = view({
      items: [item("REF-01")],
      referenceProgress: { required: 4, notarizedCount: 1, invitedCount: 2, people: [] },
    })
    const row = buildApplicationReview(v, {})[0].rows[0]
    expect(row.whoHasIt).toBe("Your references")
    expect(row.status).toContain("1 of 4")
  })

  it("carries the last-activity stamp", () => {
    const groups = buildApplicationReview(view({ items: [item("IDN-01")] }), { "IDN-01": "2026-08-20T00:00:00Z" })
    expect(groups[0].rows[0].lastActivity).toBe("2026-08-20T00:00:00Z")
  })
})
