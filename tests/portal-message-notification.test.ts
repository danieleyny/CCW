import { beforeEach, describe, expect, it, vi } from "vitest"

const notifyFormspreeMock = vi.fn(async () => undefined)

vi.mock("@/lib/formspree", () => ({
  notifyFormspree: (...args: unknown[]) => notifyFormspreeMock(...args),
}))

import { notifyTeamOfPortalMessage } from "@/lib/messages/team-notification"

describe("portal message team notifications", () => {
  beforeEach(() => notifyFormspreeMock.mockClear())

  it("routes concierge messages to the business inbox endpoint with an admin link", async () => {
    await notifyTeamOfPortalMessage({
      caseId: "11111111-1111-4111-8111-111111111111",
      senderName: "Jordan Rivera",
      senderEmail: "jordan@example.com",
      thread: "concierge",
    })

    expect(notifyFormspreeMock).toHaveBeenCalledWith("portal_message", {
      notification: "A client sent a new portal message. Sign in to read and reply.",
      name: "Jordan Rivera",
      email: "jordan@example.com",
      case_id: "11111111-1111-4111-8111-111111111111",
      thread: "Concierge / staff",
      open_message:
        "https://gunlicensenyc.com/admin/cases/11111111-1111-4111-8111-111111111111",
    })
  })

  it("labels instructor-lane messages without including their sensitive body", async () => {
    await notifyTeamOfPortalMessage({
      caseId: "22222222-2222-4222-8222-222222222222",
      senderName: null,
      senderEmail: null,
      thread: "instructor",
    })

    const [, fields] = notifyFormspreeMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(fields).toMatchObject({
      name: "Portal client",
      thread: "Training instructor",
    })
    expect(fields).not.toHaveProperty("message")
    expect(fields).not.toHaveProperty("body")
  })
})
