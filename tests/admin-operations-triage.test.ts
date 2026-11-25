import { describe, expect, it } from "vitest"
import { inboxThreadMatchesTab, type InboxThread } from "@/lib/admin/inbox-model"
import { isOperationalCase, isVisibleCase } from "@/lib/admin/today"

describe("admin operational triage", () => {
  it("only treats paid, non-test, non-duplicate cases as operational cases", () => {
    expect(isOperationalCase({ paid: true, isDemo: false, hiddenDuplicate: false })).toBe(true)
    expect(isOperationalCase({ paid: false, isDemo: false, hiddenDuplicate: false })).toBe(false)
    expect(isOperationalCase({ paid: true, isDemo: true, hiddenDuplicate: false })).toBe(false)
    expect(isOperationalCase({ paid: true, isDemo: false, hiddenDuplicate: true })).toBe(false)
  })

  it("keeps unpaid real leads visible while hiding test and duplicate records", () => {
    expect(isVisibleCase({ isDemo: false, hiddenDuplicate: false })).toBe(true)
    expect(isVisibleCase({ isDemo: true, hiddenDuplicate: false })).toBe(false)
    expect(isVisibleCase({ isDemo: false, hiddenDuplicate: true })).toBe(false)
  })

  it("keeps a replied conversation in All after it leaves Needs reply", () => {
    const replied = { needsReply: false, unread: 0 } as InboxThread
    expect(inboxThreadMatchesTab(replied, "needs")).toBe(false)
    expect(inboxThreadMatchesTab(replied, "waiting")).toBe(true)
    expect(inboxThreadMatchesTab(replied, "all")).toBe(true)
  })
})
