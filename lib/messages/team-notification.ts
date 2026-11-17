import "server-only"

import { brand } from "@/config/brand"
import { notifyFormspree } from "@/lib/formspree"

export type PortalMessageThread = "concierge" | "instructor"

export interface TeamPortalMessageNotification {
  caseId: string
  senderName: string | null
  senderEmail: string | null
  thread: PortalMessageThread
}

/**
 * Notify the business inbox that an applicant sent a portal message.
 *
 * Message bodies are intentionally excluded: applicants may discuss arrests,
 * health history, or other sensitive facts. The email identifies the case and
 * links staff back to the authenticated admin file where the message belongs.
 * Formspree already delivers this endpoint to brand.contact.email.
 */
export async function notifyTeamOfPortalMessage(input: TeamPortalMessageNotification): Promise<void> {
  await notifyFormspree("portal_message", {
    notification: "A client sent a new portal message. Sign in to read and reply.",
    name: input.senderName || "Portal client",
    email: input.senderEmail,
    case_id: input.caseId,
    thread: input.thread === "concierge" ? "Concierge / staff" : "Training instructor",
    open_message: `${brand.url}/admin/cases/${input.caseId}`,
  })
}
