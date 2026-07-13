"use client"

import { useEffect } from "react"
import { markCaseMessagesRead } from "@/app/admin/actions"

/** V3-P2.5 — opening a case file clears its unread-message state for the inbox. */
export function MarkMessagesRead({ caseId }: { caseId: string }) {
  useEffect(() => {
    void markCaseMessagesRead(caseId)
  }, [caseId])
  return null
}
